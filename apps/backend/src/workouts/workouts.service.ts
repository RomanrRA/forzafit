import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { eq, and, gte, lte, desc, asc, count, sql, isNull, isNotNull, inArray } from 'drizzle-orm';
import { DrizzleService } from '../db/db.service';
import {
  workoutSessions,
  workoutExercises,
  workoutSets,
  exercises,
} from '../db/schema';
import {
  CreateWorkoutDto,
  UpdateWorkoutDto,
  WorkoutQueryDto,
  AddExerciseToWorkoutDto,
  AddSetDto,
} from './dto/workout.dto';

@Injectable()
export class WorkoutsService {
  constructor(private drizzle: DrizzleService) {}

  // ─── Sessions ──────────────────────────────────────────────────────────────

  async findAll(userId: string, query: WorkoutQueryDto) {
    const db = this.drizzle.db;
    const conditions = [eq(workoutSessions.userId, userId)];

    if (query.from) {
      conditions.push(gte(workoutSessions.startedAt, new Date(query.from)));
    }
    if (query.to) {
      conditions.push(lte(workoutSessions.startedAt, new Date(query.to)));
    }
    if (query.status === 'planned') {
      conditions.push(isNull(workoutSessions.finishedAt));
    } else if (query.status === 'completed') {
      conditions.push(isNotNull(workoutSessions.finishedAt));
    }

    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const offset = (page - 1) * limit;

    const [{ total }] = await db
      .select({ total: count() })
      .from(workoutSessions)
      .where(and(...conditions));

    const rows = await db
      .select({
        id: workoutSessions.id,
        userId: workoutSessions.userId,
        title: workoutSessions.title,
        startedAt: workoutSessions.startedAt,
        finishedAt: workoutSessions.finishedAt,
        notes: workoutSessions.notes,
        createdAt: workoutSessions.createdAt,
        updatedAt: workoutSessions.updatedAt,
        exerciseCount: count(workoutExercises.id),
      })
      .from(workoutSessions)
      .leftJoin(workoutExercises, eq(workoutExercises.sessionId, workoutSessions.id))
      .where(and(...conditions))
      .groupBy(workoutSessions.id)
      .orderBy(
        query.order === 'asc'
          ? asc(workoutSessions.startedAt)
          : desc(workoutSessions.startedAt)
      )
      .limit(limit)
      .offset(offset);

    return { items: rows, total, page, limit };
  }

  async findOne(id: string, userId: string) {
    const [session] = await this.drizzle.db
      .select()
      .from(workoutSessions)
      .where(and(eq(workoutSessions.id, id), eq(workoutSessions.userId, userId)))
      .limit(1);

    if (!session) throw new NotFoundException('Тренировка не найдена');

    // Load exercises with their details in one JOIN query
    const wExercisesWithDetails = await this.drizzle.db
      .select({
        id: workoutExercises.id,
        sessionId: workoutExercises.sessionId,
        exerciseId: workoutExercises.exerciseId,
        orderIndex: workoutExercises.orderIndex,
        restTimerSec: workoutExercises.restTimerSec,
        notes: workoutExercises.notes,
        createdAt: workoutExercises.createdAt,
        exercise: exercises,
      })
      .from(workoutExercises)
      .leftJoin(exercises, eq(exercises.id, workoutExercises.exerciseId))
      .where(eq(workoutExercises.sessionId, id))
      .orderBy(asc(workoutExercises.orderIndex), asc(workoutExercises.createdAt));

    // Load all sets for this session in one query (avoids N+1)
    const weIds = wExercisesWithDetails.map((we) => we.id);
    const allSets =
      weIds.length > 0
        ? await this.drizzle.db
            .select()
            .from(workoutSets)
            .where(inArray(workoutSets.workoutExerciseId, weIds))
            .orderBy(asc(workoutSets.createdAt), asc(workoutSets.id))
        : [];

    // Group sets by workoutExerciseId
    const setsByWeId = new Map<string, typeof allSets>();
    for (const set of allSets) {
      const existing = setsByWeId.get(set.workoutExerciseId) ?? [];
      existing.push(set);
      setsByWeId.set(set.workoutExerciseId, existing);
    }

    const result = wExercisesWithDetails.map((we) => ({
      ...we,
      sets: setsByWeId.get(we.id) ?? [],
    }));

    return { ...session, exercises: result };
  }

  async create(userId: string, dto: CreateWorkoutDto) {
    const [session] = await this.drizzle.db
      .insert(workoutSessions)
      .values({
        userId,
        title: dto.title,
        startedAt: dto.startedAt ? new Date(dto.startedAt) : new Date(),
        finishedAt: dto.finishedAt ? new Date(dto.finishedAt) : null,
        notes: dto.notes,
      })
      .returning();

    return session;
  }

  async update(id: string, userId: string, dto: UpdateWorkoutDto) {
    await this.assertOwner(id, userId);

    const [session] = await this.drizzle.db
      .update(workoutSessions)
      .set({
        ...dto,
        startedAt: dto.startedAt ? new Date(dto.startedAt) : undefined,
        finishedAt: dto.finishedAt ? new Date(dto.finishedAt) : undefined,
        updatedAt: new Date(),
      })
      .where(eq(workoutSessions.id, id))
      .returning();

    return session;
  }

  async delete(id: string, userId: string): Promise<void> {
    await this.assertOwner(id, userId);
    await this.drizzle.db
      .delete(workoutSessions)
      .where(eq(workoutSessions.id, id));
  }

  // ─── Exercises within session ──────────────────────────────────────────────

  async addExercise(
    sessionId: string,
    userId: string,
    dto: AddExerciseToWorkoutDto,
  ) {
    await this.assertOwner(sessionId, userId);

    const [we] = await this.drizzle.db
      .insert(workoutExercises)
      .values({
        sessionId,
        exerciseId: dto.exerciseId,
        orderIndex: dto.orderIndex ?? 0,
        restTimerSec: dto.restTimerSec ?? null,
        notes: dto.notes,
      })
      .returning();

    const [exercise] = await this.drizzle.db
      .select()
      .from(exercises)
      .where(eq(exercises.id, dto.exerciseId))
      .limit(1);

    return { ...we, exercise: exercise ?? null, sets: [] };
  }

  async updateExercise(
    sessionId: string,
    workoutExerciseId: string,
    userId: string,
    dto: { restTimerSec?: number; notes?: string },
  ) {
    await this.assertOwner(sessionId, userId);

    const [we] = await this.drizzle.db
      .update(workoutExercises)
      .set({
        ...(dto.restTimerSec !== undefined ? { restTimerSec: dto.restTimerSec } : {}),
        ...(dto.notes !== undefined ? { notes: dto.notes } : {}),
      })
      .where(eq(workoutExercises.id, workoutExerciseId))
      .returning();

    return we;
  }

  async removeExercise(
    sessionId: string,
    workoutExerciseId: string,
    userId: string,
  ): Promise<void> {
    await this.assertOwner(sessionId, userId);
    await this.drizzle.db
      .delete(workoutExercises)
      .where(eq(workoutExercises.id, workoutExerciseId));
  }

  // ─── Sets ──────────────────────────────────────────────────────────────────

  async addSet(
    sessionId: string,
    workoutExerciseId: string,
    userId: string,
    dto: AddSetDto,
  ) {
    await this.assertOwner(sessionId, userId);

    const [set] = await this.drizzle.db
      .insert(workoutSets)
      .values({
        workoutExerciseId,
        weightKg: dto.weightKg,
        reps: dto.reps,
        completed: dto.completed ?? false,
        restTimerSec: dto.restTimerSec,
      })
      .returning();

    return set;
  }

  async updateSet(
    sessionId: string,
    setId: string,
    userId: string,
    dto: AddSetDto,
  ) {
    await this.assertOwner(sessionId, userId);

    const [set] = await this.drizzle.db
      .update(workoutSets)
      .set(dto)
      .where(eq(workoutSets.id, setId))
      .returning();

    return set;
  }

  async deleteSet(
    sessionId: string,
    setId: string,
    userId: string,
  ): Promise<void> {
    await this.assertOwner(sessionId, userId);
    await this.drizzle.db
      .delete(workoutSets)
      .where(eq(workoutSets.id, setId));
  }

  // ─── Progress & Stats ─────────────────────────────────────────────────────

  async getProgress(userId: string, exerciseId: string) {
    const rows = await this.drizzle.db.execute(sql`
      SELECT
        ws.id as session_id,
        ws.started_at as date,
        MAX(wset.weight_kg) as max_weight_kg,
        SUM(COALESCE(wset.weight_kg, 0) * COALESCE(wset.reps, 0)) as total_volume,
        SUM(COALESCE(wset.reps, 0)) as total_reps
      FROM workout_sets wset
      JOIN workout_exercises we ON wset.workout_exercise_id = we.id
      JOIN workout_sessions ws ON we.session_id = ws.id
      WHERE ws.user_id = ${userId}
        AND we.exercise_id = ${exerciseId}
        AND wset.completed = true
      GROUP BY ws.id, ws.started_at
      ORDER BY ws.started_at ASC
    `);
    return rows.rows.map((r: any) => ({
      sessionId: r.session_id,
      date: r.date,
      maxWeightKg: r.max_weight_kg ? Number(r.max_weight_kg) : null,
      totalVolume: r.total_volume ? Number(r.total_volume) : 0,
      totalReps: r.total_reps ? Number(r.total_reps) : 0,
    }));
  }

  async getPersonalRecords(userId: string) {
    const rows = await this.drizzle.db.execute(sql`
      SELECT
        e.id as exercise_id,
        e.name as exercise_name,
        MAX(wset.weight_kg) as max_weight_kg,
        MAX(wset.reps) FILTER (WHERE wset.weight_kg = (
          SELECT MAX(s2.weight_kg) FROM workout_sets s2
          JOIN workout_exercises we2 ON s2.workout_exercise_id = we2.id
          WHERE we2.exercise_id = e.id
            AND EXISTS (SELECT 1 FROM workout_sessions ws2 WHERE ws2.id = we2.session_id AND ws2.user_id = ${userId})
        )) as reps_at_max,
        COUNT(DISTINCT ws.id) as session_count,
        (SELECT ws2.started_at FROM workout_sets wset2
          JOIN workout_exercises we2 ON wset2.workout_exercise_id = we2.id
          JOIN workout_sessions ws2 ON we2.session_id = ws2.id
          WHERE we2.exercise_id = e.id
            AND ws2.user_id = ${userId}
            AND wset2.completed = true
          ORDER BY wset2.weight_kg DESC NULLS LAST, ws2.started_at DESC
          LIMIT 1) as achieved_at
      FROM workout_sets wset
      JOIN workout_exercises we ON wset.workout_exercise_id = we.id
      JOIN workout_sessions ws ON we.session_id = ws.id
      JOIN exercises e ON we.exercise_id = e.id
      WHERE ws.user_id = ${userId}
        AND wset.completed = true
        AND wset.weight_kg IS NOT NULL
      GROUP BY e.id, e.name
      ORDER BY max_weight_kg DESC
      LIMIT 20
    `);
    return rows.rows.map((r: any) => ({
      exerciseId: r.exercise_id,
      exerciseName: r.exercise_name,
      maxWeightKg: r.max_weight_kg ? Number(r.max_weight_kg) : null,
      repsAtMax: r.reps_at_max ? Number(r.reps_at_max) : null,
      sessionCount: Number(r.session_count),
      achievedAt: r.achieved_at ? (r.achieved_at instanceof Date ? r.achieved_at.toISOString() : r.achieved_at) : null,
    }));
  }

  async getMuscleStats(userId: string, period: '7days' | 'month' | 'all' = '7days') {
    const intervalClause =
      period === '7days' ? sql`AND ws.started_at >= NOW() - INTERVAL '7 days'` :
      period === 'month'  ? sql`AND ws.started_at >= NOW() - INTERVAL '30 days'` :
      sql``;

    const rows = await this.drizzle.db.execute(sql`
      SELECT
        unnest(e.muscle_groups) as muscle,
        COUNT(DISTINCT ws.id) as session_count
      FROM workout_sessions ws
      JOIN workout_exercises we ON we.session_id = ws.id
      JOIN exercises e ON we.exercise_id = e.id
      WHERE ws.user_id = ${userId}
        ${intervalClause}
        AND ws.finished_at IS NOT NULL
        AND array_length(e.muscle_groups, 1) > 0
      GROUP BY muscle
      ORDER BY session_count DESC
    `);
    return rows.rows.map((r: any) => ({
      muscle: r.muscle,
      sessionCount: Number(r.session_count),
    }));
  }

  // ─── Last sets for exercise ────────────────────────────────────────────────

  async getLastSetsForExercise(userId: string, exerciseId: string) {
    const rows = await this.drizzle.db.execute(sql`
      SELECT wset.weight_kg, wset.reps, wset.rest_timer_sec
      FROM workout_sets wset
      JOIN workout_exercises we ON wset.workout_exercise_id = we.id
      JOIN workout_sessions ws ON we.session_id = ws.id
      WHERE ws.user_id = ${userId}
        AND we.exercise_id = ${exerciseId}
        AND ws.finished_at IS NOT NULL
        AND we.id = (
          SELECT we2.id FROM workout_exercises we2
          JOIN workout_sessions ws2 ON we2.session_id = ws2.id
          WHERE ws2.user_id = ${userId}
            AND we2.exercise_id = ${exerciseId}
            AND ws2.finished_at IS NOT NULL
          ORDER BY ws2.started_at DESC
          LIMIT 1
        )
      ORDER BY wset.created_at ASC
    `);
    return rows.rows.map((r: any) => ({
      weightKg: r.weight_kg != null ? Number(r.weight_kg) : null,
      reps: r.reps != null ? Number(r.reps) : null,
      restTimerSec: r.rest_timer_sec != null ? Number(r.rest_timer_sec) : null,
    }));
  }

  // ─── Helpers ───────────────────────────────────────────────────────────────

  private async assertOwner(sessionId: string, userId: string) {
    const [session] = await this.drizzle.db
      .select({ id: workoutSessions.id, userId: workoutSessions.userId })
      .from(workoutSessions)
      .where(eq(workoutSessions.id, sessionId))
      .limit(1);

    if (!session) throw new NotFoundException('Тренировка не найдена');
    if (session.userId !== userId) throw new ForbiddenException('Нет доступа');
  }
}

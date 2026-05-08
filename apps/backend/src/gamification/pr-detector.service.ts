import { Injectable } from '@nestjs/common';
import { and, asc, eq, inArray, sql } from 'drizzle-orm';
import { DrizzleService } from '../db/db.service';
import {
  exercises,
  personalRecords,
  prHistory,
  workoutExercises,
  workoutSessions,
  workoutSets,
} from '../db/schema';

export type PrType = 'one_rm' | 'working_weight' | 'volume_session';

export interface DetectedPr {
  exerciseId: string;
  exerciseName: string | null;
  type: PrType;
  previousValueKg: number | null;
  valueKg: number;
  reps: number | null;
}

@Injectable()
export class PrDetectorService {
  constructor(private drizzle: DrizzleService) {}

  /**
   * Анализирует завершённую сессию: считает 1ПМ (Эпли) и рабочий вес по каждому упражнению
   * + общий объём сессии. Сравнивает с текущими PR из personal_records, записывает новые,
   * пишет хронологию в pr_history.
   */
  async detectAndPersistForSession(
    sessionId: string,
    userId: string,
  ): Promise<DetectedPr[]> {
    const db = this.drizzle.db;

    const setRows = await db
      .select({
        exerciseId: workoutExercises.exerciseId,
        weightKg: workoutSets.weightKg,
        reps: workoutSets.reps,
      })
      .from(workoutSets)
      .innerJoin(
        workoutExercises,
        eq(workoutExercises.id, workoutSets.workoutExerciseId),
      )
      .where(
        and(
          eq(workoutExercises.sessionId, sessionId),
          eq(workoutSets.completed, true),
        ),
      );

    if (setRows.length === 0) return [];

    type AggExercise = {
      best1Rm: number;
      best1RmReps: number | null;
      bestWorking: number;
      bestWorkingReps: number | null;
    };
    const perExercise = new Map<string, AggExercise>();
    let sessionVolume = 0;

    for (const r of setRows) {
      const w = r.weightKg ?? 0;
      const reps = r.reps ?? 0;
      if (reps > 0) sessionVolume += w * reps;
      if (w <= 0 || reps <= 0) continue;

      const oneRm = epley1Rm(w, reps);
      const agg = perExercise.get(r.exerciseId) ?? {
        best1Rm: 0,
        best1RmReps: null,
        bestWorking: 0,
        bestWorkingReps: null,
      };
      if (oneRm > agg.best1Rm) {
        agg.best1Rm = oneRm;
        agg.best1RmReps = reps;
      }
      if (w > agg.bestWorking) {
        agg.bestWorking = w;
        agg.bestWorkingReps = reps;
      }
      perExercise.set(r.exerciseId, agg);
    }

    const exerciseIds = Array.from(perExercise.keys());
    const existingPrs =
      exerciseIds.length > 0
        ? await db
            .select()
            .from(personalRecords)
            .where(
              and(
                eq(personalRecords.userId, userId),
                inArray(personalRecords.exerciseId, exerciseIds),
              ),
            )
        : [];

    const existingByKey = new Map<string, number>();
    for (const pr of existingPrs) {
      existingByKey.set(`${pr.exerciseId}:${pr.type}`, pr.valueKg);
    }

    const exerciseNamesMap = new Map<string, string>();
    if (exerciseIds.length > 0) {
      const exRows = await db
        .select({ id: exercises.id, name: exercises.name })
        .from(exercises)
        .where(inArray(exercises.id, exerciseIds));
      for (const e of exRows) exerciseNamesMap.set(e.id, e.name);
    }

    const detected: DetectedPr[] = [];

    for (const [exerciseId, agg] of perExercise.entries()) {
      const candidates: Array<{ type: PrType; value: number; reps: number | null }> = [
        { type: 'one_rm', value: round1(agg.best1Rm), reps: agg.best1RmReps },
        { type: 'working_weight', value: agg.bestWorking, reps: agg.bestWorkingReps },
      ];

      for (const c of candidates) {
        if (c.value <= 0) continue;
        const prev = existingByKey.get(`${exerciseId}:${c.type}`) ?? null;
        if (prev !== null && c.value <= prev) continue;

        await db
          .insert(personalRecords)
          .values({
            userId,
            exerciseId,
            type: c.type,
            valueKg: c.value,
            reps: c.reps,
            workoutSessionId: sessionId,
          })
          .onConflictDoUpdate({
            target: [
              personalRecords.userId,
              personalRecords.exerciseId,
              personalRecords.type,
            ],
            set: {
              valueKg: c.value,
              reps: c.reps,
              achievedAt: new Date(),
              workoutSessionId: sessionId,
            },
          });

        await db.insert(prHistory).values({
          userId,
          exerciseId,
          type: c.type,
          previousValueKg: prev,
          valueKg: c.value,
          reps: c.reps,
          workoutSessionId: sessionId,
        });

        detected.push({
          exerciseId,
          exerciseName: exerciseNamesMap.get(exerciseId) ?? null,
          type: c.type,
          previousValueKg: prev,
          valueKg: c.value,
          reps: c.reps,
        });
      }
    }

    return detected;
  }

  async getAllForUser(userId: string) {
    const rows = await this.drizzle.db
      .select({
        id: personalRecords.id,
        exerciseId: personalRecords.exerciseId,
        exerciseName: exercises.name,
        type: personalRecords.type,
        valueKg: personalRecords.valueKg,
        reps: personalRecords.reps,
        achievedAt: personalRecords.achievedAt,
      })
      .from(personalRecords)
      .leftJoin(exercises, eq(exercises.id, personalRecords.exerciseId))
      .where(eq(personalRecords.userId, userId))
      .orderBy(asc(exercises.name), asc(personalRecords.type));
    return rows;
  }

  async getHistoryForExercise(userId: string, exerciseId: string) {
    return this.drizzle.db
      .select()
      .from(prHistory)
      .where(
        and(eq(prHistory.userId, userId), eq(prHistory.exerciseId, exerciseId)),
      )
      .orderBy(asc(prHistory.achievedAt));
  }

  /** Объём сессии — нужен снаружи для движка ачивок. */
  async getSessionVolume(sessionId: string): Promise<number> {
    const [row] = await this.drizzle.db.execute(sql`
      SELECT COALESCE(SUM(COALESCE(s.weight_kg, 0) * COALESCE(s.reps, 0)), 0) AS total
      FROM workout_sets s
      JOIN workout_exercises we ON we.id = s.workout_exercise_id
      WHERE we.session_id = ${sessionId} AND s.completed = true
    `).then((r: any) => r.rows);
    return row?.total ? Number(row.total) : 0;
  }
}

function epley1Rm(weight: number, reps: number): number {
  if (reps === 1) return weight;
  return weight * (1 + reps / 30);
}

function round1(n: number): number {
  return Math.round(n * 10) / 10;
}

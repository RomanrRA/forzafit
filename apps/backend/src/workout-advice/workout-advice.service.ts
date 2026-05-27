import {
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { and, desc, eq, sql } from 'drizzle-orm';
import { DrizzleService } from '../db/db.service';
import {
  exercises,
  users,
  workoutAdvice,
  workoutExercises,
  workoutSessions,
  workoutSets,
} from '../db/schema';
import { WorkoutAdviceAiService } from './workout-advice-ai.service';
import {
  AdviceContext,
  AdviceDraft,
  ExerciseHistorySummary,
} from './workout-advice.types';

const HISTORY_SETS_LIMIT = 8;

export interface AdviceRow {
  exerciseId: string;
  exerciseName: string;
  suggestedWeightKg: number | null;
  suggestedReps: number | null;
  suggestedSets: number | null;
  reason: string;
  generatedAt: Date;
}

@Injectable()
export class WorkoutAdviceService {
  private readonly logger = new Logger(WorkoutAdviceService.name);

  constructor(
    private drizzle: DrizzleService,
    private ai: WorkoutAdviceAiService,
  ) {}

  /**
   * Возвращает советы по всем упражнениям сессии. Если в БД уже есть кэш —
   * отдаёт его. Иначе один раз дёргает AI и сохраняет.
   */
  async getOrGenerate(sessionId: string, userId: string): Promise<AdviceRow[]> {
    await this.assertSessionOwner(sessionId, userId);

    const sessionExercises = await this.drizzle.db
      .select({
        exerciseId: workoutExercises.exerciseId,
        name: exercises.name,
      })
      .from(workoutExercises)
      .innerJoin(exercises, eq(exercises.id, workoutExercises.exerciseId))
      .where(eq(workoutExercises.sessionId, sessionId));

    if (sessionExercises.length === 0) return [];

    const existing = await this.drizzle.db
      .select()
      .from(workoutAdvice)
      .where(eq(workoutAdvice.sessionId, sessionId));

    const cached = new Map(existing.map((a) => [a.exerciseId, a]));
    const missing = sessionExercises.filter((e) => !cached.has(e.exerciseId));

    if (missing.length > 0) {
      try {
        const context = await this.buildContext(userId, sessionExercises);
        const drafts = await this.ai.generate(context);
        await this.persistDrafts(sessionId, drafts);
        // Перечитаем — берём из БД, чтобы вернуть generated_at и нормализованные значения.
        const refreshed = await this.drizzle.db
          .select()
          .from(workoutAdvice)
          .where(eq(workoutAdvice.sessionId, sessionId));
        for (const row of refreshed) cached.set(row.exerciseId, row);
      } catch (err) {
        // Не валим запрос если AI недоступен — возвращаем то, что закэшировано.
        this.logger.error(
          `AI advice generation failed for session ${sessionId}`,
          err as Error,
        );
      }
    }

    const out: AdviceRow[] = [];
    for (const ex of sessionExercises) {
      const a = cached.get(ex.exerciseId);
      if (!a) continue;
      out.push({
        exerciseId: ex.exerciseId,
        exerciseName: ex.name,
        suggestedWeightKg: a.suggestedWeightKg,
        suggestedReps: a.suggestedReps,
        suggestedSets: a.suggestedSets,
        reason: a.reason,
        generatedAt: a.generatedAt,
      });
    }
    return out;
  }

  // ─── Helpers ──────────────────────────────────────────────────────────────

  private async assertSessionOwner(sessionId: string, userId: string) {
    const [s] = await this.drizzle.db
      .select({ userId: workoutSessions.userId })
      .from(workoutSessions)
      .where(eq(workoutSessions.id, sessionId))
      .limit(1);
    if (!s) throw new NotFoundException('Сессия не найдена');
    if (s.userId !== userId) throw new ForbiddenException('Нет доступа');
  }

  private async buildContext(
    userId: string,
    sessionExercises: Array<{ exerciseId: string; name: string }>,
  ): Promise<AdviceContext> {
    const db = this.drizzle.db;

    const [user] = await db
      .select({
        gender: users.gender,
        weightKg: users.weightKg,
        goal: users.goal,
      })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    const history: ExerciseHistorySummary[] = [];
    for (const ex of sessionExercises) {
      const rows = await db
        .select({
          weightKg: workoutSets.weightKg,
          reps: workoutSets.reps,
          rpe: workoutSets.rpe,
          startedAt: workoutSessions.startedAt,
        })
        .from(workoutSets)
        .innerJoin(
          workoutExercises,
          eq(workoutExercises.id, workoutSets.workoutExerciseId),
        )
        .innerJoin(
          workoutSessions,
          eq(workoutSessions.id, workoutExercises.sessionId),
        )
        .where(
          and(
            eq(workoutSessions.userId, userId),
            eq(workoutExercises.exerciseId, ex.exerciseId),
            eq(workoutSets.completed, true),
          ),
        )
        .orderBy(desc(workoutSessions.startedAt))
        .limit(HISTORY_SETS_LIMIT);

      const rpes = rows.map((r) => r.rpe).filter((v): v is number => v != null);
      const avgRpe = rpes.length
        ? +(rpes.reduce((a, b) => a + b, 0) / rpes.length).toFixed(1)
        : null;

      const prRows = await db.execute(sql`
        SELECT MAX(s.weight_kg) AS pr
        FROM workout_sets s
        JOIN workout_exercises we ON we.id = s.workout_exercise_id
        JOIN workout_sessions ws ON ws.id = we.session_id
        WHERE ws.user_id = ${userId}
          AND we.exercise_id = ${ex.exerciseId}
          AND s.completed = true
      `);
      const prRow = (prRows as unknown as { rows: Array<{ pr: number | null }> })
        .rows[0];
      const prWeightKg = prRow?.pr ?? null;

      history.push({
        exerciseId: ex.exerciseId,
        exerciseName: ex.name,
        lastSessionDate: rows[0]?.startedAt
          ? new Date(rows[0].startedAt).toISOString().split('T')[0]
          : null,
        lastSets: rows.map((r) => ({
          weightKg: r.weightKg,
          reps: r.reps,
          rpe: r.rpe,
        })),
        avgRpe,
        prWeightKg,
      });
    }

    return {
      userProfile: {
        gender: user?.gender ?? null,
        weightKg: user?.weightKg ?? null,
        goal: user?.goal ?? null,
      },
      exercises: history,
    };
  }

  private async persistDrafts(
    sessionId: string,
    drafts: AdviceDraft[],
  ): Promise<void> {
    if (drafts.length === 0) return;
    // Upsert по (session_id, exercise_id) — повторный вызов перезапишет.
    await this.drizzle.db
      .insert(workoutAdvice)
      .values(
        drafts.map((d) => ({
          sessionId,
          exerciseId: d.exerciseId,
          suggestedWeightKg: d.suggestedWeightKg,
          suggestedReps: d.suggestedReps,
          suggestedSets: d.suggestedSets,
          reason: d.reason,
        })),
      )
      .onConflictDoUpdate({
        target: [workoutAdvice.sessionId, workoutAdvice.exerciseId],
        set: {
          suggestedWeightKg: sql`excluded.suggested_weight_kg`,
          suggestedReps: sql`excluded.suggested_reps`,
          suggestedSets: sql`excluded.suggested_sets`,
          reason: sql`excluded.reason`,
          generatedAt: new Date(),
        },
      });
  }

  // For future: invalidate cache after workout completion or exercise change.
  // Сейчас кэш живёт до удаления сессии (cascade).
  async invalidate(sessionId: string): Promise<void> {
    await this.drizzle.db
      .delete(workoutAdvice)
      .where(eq(workoutAdvice.sessionId, sessionId));
  }
}

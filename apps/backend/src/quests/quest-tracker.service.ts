import { Injectable } from '@nestjs/common';
import { and, eq } from 'drizzle-orm';
import { DrizzleService } from '../db/db.service';
import { userQuests, workoutExercises } from '../db/schema';
import { QuestsService } from './quests.service';
import { QuestProgress, QuestTarget } from './quests.types';
import type { DetectedPr } from '../gamification/pr-detector.service';

export interface WorkoutCompletedInput {
  userId: string;
  sessionId: string;
  sessionStartedAt: Date | null;
  sessionVolume: number;
  newPrs: DetectedPr[];
  currentStreak: number;
}

export interface CompletedQuestNotification {
  questId: string;
  title: string;
  type: string;
  rewardPoints: number;
}

@Injectable()
export class QuestTrackerService {
  constructor(
    private drizzle: DrizzleService,
    private quests: QuestsService,
  ) {}

  /**
   * Вызывается из GamificationService.onWorkoutCompleted после расчёта PR/streak.
   * Обновляет прогресс активного квеста (если есть). Возвращает массив завершённых
   * квестов, чтобы caller записал событие в ленту.
   */
  async onWorkoutCompleted(
    input: WorkoutCompletedInput,
  ): Promise<CompletedQuestNotification[]> {
    const active = await this.quests.findActiveForUser(input.userId);
    if (!active) return [];

    // expired квест помечен как failed внутри quests.markOverdueAsFailed — но
    // на всякий случай защитимся здесь тоже:
    if (active.expiresAt && active.expiresAt.getTime() < Date.now()) {
      return [];
    }

    const target = active.target as unknown as QuestTarget;
    const progress = (active.progress ?? { current: 0 }) as QuestProgress;

    const next = await this.computeNextProgress(
      target,
      progress,
      active.startedAt,
      input,
    );

    if (!next) return []; // нечего обновлять — событие не релевантно типу квеста

    const goal = this.goalValue(target);
    const isCompleted = goal > 0 && next.current >= goal;

    const updated = await this.quests.applyProgressUpdate(
      active.id,
      next,
      isCompleted,
    );

    if (!isCompleted) return [];

    return [
      {
        questId: updated.id,
        title: updated.title,
        type: updated.type,
        rewardPoints: updated.rewardPoints,
      },
    ];
  }

  /**
   * Возвращает обновлённый progress в зависимости от типа квеста.
   * null = событие не релевантно (например, у активного квеста тип
   * pr_in_exercise по жиму, а пользователь сделал тренировку без жима).
   */
  private async computeNextProgress(
    target: QuestTarget,
    progress: QuestProgress,
    questStartedAt: Date | null,
    input: WorkoutCompletedInput,
  ): Promise<QuestProgress | null> {
    const event = {
      sessionId: input.sessionId,
      at: (input.sessionStartedAt ?? new Date()).toISOString(),
    };

    switch (target.type) {
      case 'workout_count': {
        const current = progress.current + 1;
        return {
          ...progress,
          current,
          events: [...(progress.events ?? []), { ...event, delta: 1 }],
        };
      }

      case 'streak_keep': {
        // current отслеживает «дни без пропуска с момента старта квеста».
        // Берём текущий streak напрямую от StreakService (передан в input).
        return {
          ...progress,
          current: input.currentStreak,
        };
      }

      case 'pr_in_exercise': {
        const hit = input.newPrs.some(
          (pr) => pr.exerciseId === target.exerciseId,
        );
        if (!hit) return null;
        return {
          ...progress,
          current: 1,
          events: [...(progress.events ?? []), { ...event, delta: 1 }],
        };
      }

      case 'total_volume': {
        if (input.sessionVolume <= 0) return null;
        return {
          ...progress,
          current: progress.current + input.sessionVolume,
          events: [
            ...(progress.events ?? []),
            { ...event, delta: input.sessionVolume },
          ],
        };
      }

      case 'exercise_frequency': {
        const containsExercise = await this.sessionHasExercise(
          input.sessionId,
          target.exerciseId,
        );
        if (!containsExercise) return null;
        return {
          ...progress,
          current: progress.current + 1,
          events: [...(progress.events ?? []), { ...event, delta: 1 }],
        };
      }

      case 'weekday_consistency': {
        const at = input.sessionStartedAt ?? new Date();
        const dow = at.getDay(); // 0=вс..6=сб
        if (!target.weekdays.includes(dow)) return null;

        // Считаем уникальные «дни недели цели», которые юзер сделал ПОСЛЕ начала квеста.
        const startTs =
          questStartedAt?.getTime() ??
          (progress.startedAt
            ? new Date(progress.startedAt).getTime()
            : at.getTime());

        const events = [
          ...(progress.events ?? []),
          { ...event, delta: 1 },
        ];

        const uniqueWeekdays = new Set(
          events
            .filter((e) => new Date(e.at).getTime() >= startTs)
            .map((e) => new Date(e.at).getDay())
            .filter((d) => target.weekdays.includes(d)),
        );

        return {
          ...progress,
          current: uniqueWeekdays.size,
          events,
        };
      }
    }
  }

  private async sessionHasExercise(
    sessionId: string,
    exerciseId: string,
  ): Promise<boolean> {
    const [row] = await this.drizzle.db
      .select({ id: workoutExercises.id })
      .from(workoutExercises)
      .where(
        and(
          eq(workoutExercises.sessionId, sessionId),
          eq(workoutExercises.exerciseId, exerciseId),
        ),
      )
      .limit(1);
    return Boolean(row);
  }

  private goalValue(target: QuestTarget): number {
    switch (target.type) {
      case 'workout_count':
      case 'streak_keep':
      case 'exercise_frequency':
        return target.value;
      case 'total_volume':
        return target.valueKg;
      case 'pr_in_exercise':
        return 1;
      case 'weekday_consistency':
        return target.weekdays.length;
    }
  }

  /** Сумма очков по всем completed квестам. Используется в gamification.getOverview. */
  async getTotalRewardPoints(userId: string): Promise<number> {
    const rows = await this.drizzle.db
      .select({ rewardPoints: userQuests.rewardPoints })
      .from(userQuests)
      .where(
        and(
          eq(userQuests.userId, userId),
          eq(userQuests.status, 'completed'),
        ),
      );
    return rows.reduce((sum, r) => sum + r.rewardPoints, 0);
  }
}

import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { and, asc, eq, isNotNull } from 'drizzle-orm';
import { DrizzleService } from '../db/db.service';
import { workoutSessions } from '../db/schema';
import { StreakService } from './streak.service';
import { PrDetectorService, DetectedPr } from './pr-detector.service';
import {
  AchievementsService,
  UnlockedAchievement,
} from './achievements.service';
import { FeedService } from '../feed/feed.service';

export interface WorkoutCompletedResult {
  streak: { current: number; longest: number; isNewLongest: boolean };
  newPrs: DetectedPr[];
  newAchievements: UnlockedAchievement[];
}

@Injectable()
export class GamificationService {
  private readonly logger = new Logger(GamificationService.name);

  constructor(
    private drizzle: DrizzleService,
    private streaks: StreakService,
    private prs: PrDetectorService,
    private achievements: AchievementsService,
    private feed: FeedService,
  ) {}

  /** Точка входа — вызывается из WorkoutsService после установки finishedAt. */
  async onWorkoutCompleted(
    sessionId: string,
    userId: string,
    options: { writeFeed?: boolean } = { writeFeed: true },
  ): Promise<WorkoutCompletedResult> {
    const [session] = await this.drizzle.db
      .select()
      .from(workoutSessions)
      .where(
        and(
          eq(workoutSessions.id, sessionId),
          eq(workoutSessions.userId, userId),
        ),
      )
      .limit(1);

    if (!session) throw new NotFoundException('Тренировка не найдена');

    const activityDate = session.startedAt ?? session.finishedAt ?? new Date();

    const streakUpdate = await this.streaks.updateForActivity(
      userId,
      activityDate,
    );

    const newPrs = await this.prs.detectAndPersistForSession(sessionId, userId);
    const sessionVolume = await this.prs.getSessionVolume(sessionId);

    const newAchievements = await this.achievements.checkAndUnlock({
      userId,
      sessionId,
      sessionStartedAt: session.startedAt ?? null,
      sessionVolume,
      sessionPrCount: newPrs.length,
      streakCurrent: streakUpdate.currentCount,
      daysSincePreviousActivity: streakUpdate.daysSincePrevious,
    });

    if (options.writeFeed) {
      try {
        await this.feed.writeEvent(userId, 'workout_completed', {
          sessionId: session.id,
          title: session.title ?? null,
        });
        for (const pr of newPrs) {
          await this.feed.writeEvent(userId, 'pr_set', {
            exerciseId: pr.exerciseId,
            exerciseName: pr.exerciseName ?? undefined,
            prType: pr.type,
            valueKg: pr.valueKg,
            reps: pr.reps,
            previousValueKg: pr.previousValueKg,
          });
        }
        for (const ach of newAchievements) {
          await this.feed.writeEvent(userId, 'achievement_unlocked', {
            achievementId: ach.id,
            achievementCode: ach.code,
            achievementTitle: ach.title,
            achievementEmoji: ach.emoji,
          });
        }
      } catch (e) {
        this.logger.warn(
          `Не удалось записать события в feed: ${(e as Error).message}`,
        );
      }
    }

    return {
      streak: {
        current: streakUpdate.currentCount,
        longest: streakUpdate.longestCount,
        isNewLongest: streakUpdate.isNewLongest,
      },
      newPrs,
      newAchievements,
    };
  }

  /**
   * Запускает backfill один раз — если у юзера ещё не считался streak,
   * но есть завершённые тренировки. Безопасно вызывать перед любым GET.
   */
  async ensureBackfilled(userId: string): Promise<void> {
    const streak = await this.streaks.getOrInit(userId);
    if (streak.lastActivityDate) return;

    const [hasFinished] = await this.drizzle.db
      .select({ id: workoutSessions.id })
      .from(workoutSessions)
      .where(
        and(
          eq(workoutSessions.userId, userId),
          isNotNull(workoutSessions.finishedAt),
        ),
      )
      .limit(1);

    if (hasFinished) {
      await this.backfillForUser(userId);
    }
  }

  /**
   * Прогоняет все завершённые тренировки пользователя через `onWorkoutCompleted`,
   * чтобы посчитать streak, выявить PR и выдать ачивки задним числом.
   * Идемпотентно: streak в один день не инкрементится, PR-детектор сверяется с текущими,
   * проверка ачивок отбрасывает уже разблокированные.
   */
  async backfillForUser(userId: string): Promise<{ processed: number }> {
    const sessions = await this.drizzle.db
      .select({ id: workoutSessions.id })
      .from(workoutSessions)
      .where(
        and(
          eq(workoutSessions.userId, userId),
          isNotNull(workoutSessions.finishedAt),
        ),
      )
      .orderBy(asc(workoutSessions.finishedAt));

    let processed = 0;
    for (const s of sessions) {
      try {
        // Backfill — без записи в feed (иначе лента залипнет историей).
        await this.onWorkoutCompleted(s.id, userId, { writeFeed: false });
        processed++;
      } catch (e) {
        this.logger.warn(
          `Не удалось обработать сессию ${s.id} в backfill: ${(e as Error).message}`,
        );
      }
    }
    this.logger.log(`Backfill для ${userId}: обработано ${processed} сессий`);
    return { processed };
  }

  async getOverview(userId: string) {
    await this.ensureBackfilled(userId);

    const streakAfter = await this.streaks.getOrInit(userId);
    const prs = await this.prs.getAllForUser(userId);
    const achievements = await this.achievements.getMineWithProgress(userId);
    const unlockedCount = achievements.filter((a) => a.unlocked).length;
    const totalPoints = achievements
      .filter((a) => a.unlocked)
      .reduce((sum, a) => sum + a.points, 0);

    return {
      streak: {
        current: streakAfter.currentCount,
        longest: streakAfter.longestCount,
        lastActivityDate: streakAfter.lastActivityDate,
      },
      prCount: prs.length,
      recentPrs: prs.slice(0, 3),
      achievementsUnlocked: unlockedCount,
      achievementsTotal: achievements.length,
      points: totalPoints,
      recentAchievements: achievements
        .filter((a) => a.unlocked)
        .sort(
          (a, b) =>
            (b.unlockedAt?.getTime() ?? 0) - (a.unlockedAt?.getTime() ?? 0),
        )
        .slice(0, 3),
    };
  }
}

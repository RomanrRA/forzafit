import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { and, asc, eq, inArray, isNotNull, sql } from 'drizzle-orm';
import { DrizzleService } from '../db/db.service';
import {
  achievementsCatalog,
  userAchievements,
  workoutExercises,
  workoutSessions,
  workoutSets,
  personalRecords,
} from '../db/schema';
import {
  ACHIEVEMENT_SEEDS,
  AchievementCondition,
  AchievementSeed,
} from './achievements-seed';

export interface AchievementCheckContext {
  userId: string;
  sessionId: string;
  sessionStartedAt: Date | null;
  sessionVolume: number;
  sessionPrCount: number;
  streakCurrent: number;
  daysSincePreviousActivity: number | null;
}

export interface UnlockedAchievement {
  id: string;
  code: string;
  title: string;
  description: string;
  emoji: string;
  category: string;
  points: number;
}

@Injectable()
export class AchievementsService implements OnModuleInit {
  private readonly logger = new Logger(AchievementsService.name);

  constructor(private drizzle: DrizzleService) {}

  async onModuleInit() {
    try {
      await this.seedCatalog();
    } catch (e) {
      this.logger.warn(
        `Не удалось засидать каталог ачивок (БД может быть недоступна): ${(e as Error).message}`,
      );
    }
  }

  async seedCatalog() {
    const db = this.drizzle.db;
    for (const seed of ACHIEVEMENT_SEEDS) {
      await db
        .insert(achievementsCatalog)
        .values({
          code: seed.code,
          title: seed.title,
          description: seed.description,
          emoji: seed.emoji,
          category: seed.category,
          points: seed.points,
          threshold: seed.threshold ?? null,
          condition: seed.condition,
          sortOrder: seed.sortOrder,
        })
        .onConflictDoUpdate({
          target: achievementsCatalog.code,
          set: {
            title: seed.title,
            description: seed.description,
            emoji: seed.emoji,
            category: seed.category,
            points: seed.points,
            threshold: seed.threshold ?? null,
            condition: seed.condition,
            sortOrder: seed.sortOrder,
          },
        });
    }
    this.logger.log(`Засидано ${ACHIEVEMENT_SEEDS.length} ачивок`);
  }

  async checkAndUnlock(
    ctx: AchievementCheckContext,
  ): Promise<UnlockedAchievement[]> {
    const db = this.drizzle.db;

    const catalog = await db.select().from(achievementsCatalog);
    const alreadyUnlocked = await db
      .select({ achievementId: userAchievements.achievementId })
      .from(userAchievements)
      .where(eq(userAchievements.userId, ctx.userId));

    const unlockedIds = new Set(alreadyUnlocked.map((r) => r.achievementId));
    const candidates = catalog.filter((a) => !unlockedIds.has(a.id));
    if (candidates.length === 0) return [];

    const stats = new LazyStats(this.drizzle, ctx);
    const newlyUnlocked: UnlockedAchievement[] = [];

    for (const a of candidates) {
      const cond = a.condition as AchievementCondition;
      const ok = await this.evaluate(cond, ctx, stats);
      if (!ok) continue;

      try {
        await db.insert(userAchievements).values({
          userId: ctx.userId,
          achievementId: a.id,
          workoutSessionId: ctx.sessionId,
        });
      } catch (e) {
        continue;
      }

      newlyUnlocked.push({
        id: a.id,
        code: a.code,
        title: a.title,
        description: a.description,
        emoji: a.emoji,
        category: a.category,
        points: a.points,
      });
    }

    return newlyUnlocked;
  }

  private async evaluate(
    cond: AchievementCondition,
    ctx: AchievementCheckContext,
    stats: LazyStats,
  ): Promise<boolean> {
    switch (cond.type) {
      case 'workout_count':
        return (await stats.workoutCount()) >= cond.value;
      case 'streak':
        return ctx.streakCurrent >= cond.value;
      case 'pr_count':
        return (await stats.prCount()) >= cond.value;
      case 'session_pr_count':
        return ctx.sessionPrCount >= cond.value;
      case 'session_volume':
        return ctx.sessionVolume >= cond.value;
      case 'workout_set_count':
        return (await stats.completedSetCount()) >= cond.value;
      case 'time_before_hour':
        if (!ctx.sessionStartedAt) return false;
        return ctx.sessionStartedAt.getHours() < cond.value;
      case 'time_after_hour':
        if (!ctx.sessionStartedAt) return false;
        return ctx.sessionStartedAt.getHours() >= cond.value;
      case 'comeback':
        return (
          ctx.daysSincePreviousActivity !== null &&
          ctx.daysSincePreviousActivity >= cond.value
        );
      default:
        return false;
    }
  }

  async getMineWithProgress(userId: string) {
    const db = this.drizzle.db;
    const catalog = await db
      .select()
      .from(achievementsCatalog)
      .orderBy(asc(achievementsCatalog.sortOrder));
    const unlocked = await db
      .select()
      .from(userAchievements)
      .where(eq(userAchievements.userId, userId));
    const unlockedById = new Map(unlocked.map((u) => [u.achievementId, u]));

    const stats = new LazyStats(this.drizzle, {
      userId,
      sessionId: '',
      sessionStartedAt: null,
      sessionVolume: 0,
      sessionPrCount: 0,
      streakCurrent: 0,
      daysSincePreviousActivity: null,
    });

    const result: Array<{
      id: string;
      code: string;
      title: string;
      description: string;
      emoji: string;
      category: string;
      points: number;
      threshold: number | null;
      unlocked: boolean;
      unlockedAt: Date | null;
      progressCurrent: number | null;
      progressTarget: number | null;
    }> = [];
    for (const a of catalog) {
      const u = unlockedById.get(a.id);
      const cond = a.condition as AchievementCondition;
      const progress = await this.computeProgress(cond, stats);
      result.push({
        id: a.id,
        code: a.code,
        title: a.title,
        description: a.description,
        emoji: a.emoji,
        category: a.category,
        points: a.points,
        threshold: a.threshold,
        unlocked: !!u,
        unlockedAt: u?.unlockedAt ?? null,
        progressCurrent: progress.current,
        progressTarget: progress.target,
      });
    }
    return result;
  }

  private async computeProgress(
    cond: AchievementCondition,
    stats: LazyStats,
  ): Promise<{ current: number | null; target: number | null }> {
    switch (cond.type) {
      case 'workout_count':
        return { current: await stats.workoutCount(), target: cond.value };
      case 'streak': {
        const s = await stats.currentStreak();
        return { current: s, target: cond.value };
      }
      case 'pr_count':
        return { current: await stats.prCount(), target: cond.value };
      case 'workout_set_count':
        return {
          current: await stats.completedSetCount(),
          target: cond.value,
        };
      default:
        return { current: null, target: null };
    }
  }
}

class LazyStats {
  private cache: Record<string, number> = {};

  constructor(
    private drizzle: DrizzleService,
    private ctx: AchievementCheckContext,
  ) {}

  async workoutCount(): Promise<number> {
    if (this.cache.workoutCount !== undefined) return this.cache.workoutCount;
    const [row] = await this.drizzle.db
      .select({ c: sql<number>`count(*)::int` })
      .from(workoutSessions)
      .where(
        and(
          eq(workoutSessions.userId, this.ctx.userId),
          isNotNull(workoutSessions.finishedAt),
        ),
      );
    return (this.cache.workoutCount = row?.c ?? 0);
  }

  async prCount(): Promise<number> {
    if (this.cache.prCount !== undefined) return this.cache.prCount;
    const [row] = await this.drizzle.db
      .select({ c: sql<number>`count(*)::int` })
      .from(personalRecords)
      .where(eq(personalRecords.userId, this.ctx.userId));
    return (this.cache.prCount = row?.c ?? 0);
  }

  async completedSetCount(): Promise<number> {
    if (this.cache.setCount !== undefined) return this.cache.setCount;
    const r = await this.drizzle.db.execute(sql`
      SELECT COUNT(*)::int AS c
      FROM workout_sets s
      JOIN workout_exercises we ON we.id = s.workout_exercise_id
      JOIN workout_sessions ws ON ws.id = we.session_id
      WHERE ws.user_id = ${this.ctx.userId} AND s.completed = true
    `);
    const c = (r.rows[0] as any)?.c ?? 0;
    return (this.cache.setCount = Number(c));
  }

  async currentStreak(): Promise<number> {
    return this.ctx.streakCurrent;
  }
}

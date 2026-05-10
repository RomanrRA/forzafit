import { Injectable } from '@nestjs/common';
import { sql, desc, lt, and, inArray } from 'drizzle-orm';
import { DrizzleService } from '../db/db.service';
import { activityFeed, users } from '../db/schema';
import { FriendsService } from '../friends/friends.service';

export type FeedEventType =
  | 'workout_completed'
  | 'pr_set'
  | 'achievement_unlocked';

export interface FeedEventData {
  // workout_completed
  sessionId?: string;
  title?: string | null;
  exerciseCount?: number;
  setCount?: number;
  // pr_set
  exerciseId?: string;
  exerciseName?: string;
  prType?: 'one_rm' | 'working_weight' | 'volume_session';
  valueKg?: number;
  reps?: number | null;
  previousValueKg?: number | null;
  // achievement_unlocked
  achievementId?: string;
  achievementCode?: string;
  achievementTitle?: string;
  achievementEmoji?: string;
}

@Injectable()
export class FeedService {
  constructor(
    private drizzle: DrizzleService,
    private friends: FriendsService,
  ) {}

  /** Записать событие в ленту. Вызывается из gamification на event-ы. */
  async writeEvent(userId: string, type: FeedEventType, data: FeedEventData) {
    await this.drizzle.db.insert(activityFeed).values({
      userId,
      type,
      data: data as unknown as Record<string, unknown>,
    });
  }

  /**
   * Лента: события самого юзера + его принятых друзей.
   * cursor — `created_at` последнего события из предыдущей страницы (ISO).
   */
  async getFeed(
    userId: string,
    options: { limit?: number; cursor?: string } = {},
  ) {
    const limit = Math.max(1, Math.min(options.limit ?? 30, 100));
    const friendIds = await this.friends.getAcceptedFriendIds(userId);
    const visibleUserIds = [userId, ...friendIds];

    const conditions = [inArray(activityFeed.userId, visibleUserIds)];
    if (options.cursor) {
      const t = new Date(options.cursor);
      if (!isNaN(t.getTime())) {
        conditions.push(lt(activityFeed.createdAt, t));
      }
    }

    const rows = await this.drizzle.db
      .select({
        id: activityFeed.id,
        userId: activityFeed.userId,
        type: activityFeed.type,
        data: activityFeed.data,
        createdAt: activityFeed.createdAt,
        username: users.username,
        displayName: users.displayName,
        name: users.name,
        avatarUrl: users.avatarUrl,
      })
      .from(activityFeed)
      .leftJoin(users, sql`${users.id} = ${activityFeed.userId}`)
      .where(and(...conditions))
      .orderBy(desc(activityFeed.createdAt))
      .limit(limit + 1);

    const hasMore = rows.length > limit;
    const items = (hasMore ? rows.slice(0, limit) : rows).map((r) => ({
      id: r.id,
      type: r.type as FeedEventType,
      data: r.data as FeedEventData,
      createdAt: r.createdAt,
      author: {
        id: r.userId,
        username: r.username,
        displayName: r.displayName,
        name: r.name,
        avatarUrl: r.avatarUrl,
      },
    }));

    const nextCursor = hasMore
      ? items[items.length - 1].createdAt.toISOString()
      : null;

    return { items, nextCursor };
  }
}

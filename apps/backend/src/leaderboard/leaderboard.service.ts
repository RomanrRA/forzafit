import { Injectable } from '@nestjs/common';
import { sql, eq, desc, inArray, count } from 'drizzle-orm';
import { DrizzleService } from '../db/db.service';
import {
  users,
  streaks,
  userAchievements,
  personalRecords,
} from '../db/schema';
import { FriendsService } from '../friends/friends.service';

export type LeaderboardMetric = 'streak' | 'achievements' | 'prCount';
export type LeaderboardScope = 'friends' | 'all';

@Injectable()
export class LeaderboardService {
  constructor(
    private drizzle: DrizzleService,
    private friends: FriendsService,
  ) {}

  async getLeaderboard(
    userId: string,
    metric: LeaderboardMetric,
    scope: LeaderboardScope,
    limit = 50,
  ) {
    const db = this.drizzle.db;
    const friendIds = await this.friends.getAcceptedFriendIds(userId);
    const allowedIds = scope === 'friends' ? [userId, ...friendIds] : null;

    // Базовая выборка пользователей
    const visibilityFilter =
      scope === 'all'
        ? eq(users.isProfilePublic, true)
        : inArray(users.id, allowedIds!);

    if (metric === 'streak') {
      const rows = await db
        .select({
          userId: users.id,
          username: users.username,
          displayName: users.displayName,
          name: users.name,
          avatarUrl: users.avatarUrl,
          value: streaks.currentCount,
          longest: streaks.longestCount,
        })
        .from(users)
        .innerJoin(streaks, eq(streaks.userId, users.id))
        .where(visibilityFilter)
        .orderBy(desc(streaks.currentCount), desc(streaks.longestCount))
        .limit(limit);
      return rows.map((r, i) => ({
        rank: i + 1,
        userId: r.userId,
        username: r.username,
        displayName: r.displayName,
        name: r.name,
        avatarUrl: r.avatarUrl,
        metric: 'streak' as const,
        value: r.value,
        longest: r.longest,
      }));
    }

    if (metric === 'achievements') {
      const rows = await db
        .select({
          userId: users.id,
          username: users.username,
          displayName: users.displayName,
          name: users.name,
          avatarUrl: users.avatarUrl,
          value: count(userAchievements.id).as('value'),
        })
        .from(users)
        .innerJoin(userAchievements, eq(userAchievements.userId, users.id))
        .where(visibilityFilter)
        .groupBy(users.id)
        .orderBy(desc(sql`value`))
        .limit(limit);
      return rows.map((r, i) => ({
        rank: i + 1,
        userId: r.userId,
        username: r.username,
        displayName: r.displayName,
        name: r.name,
        avatarUrl: r.avatarUrl,
        metric: 'achievements' as const,
        value: Number(r.value),
      }));
    }

    if (metric === 'prCount') {
      const rows = await db
        .select({
          userId: users.id,
          username: users.username,
          displayName: users.displayName,
          name: users.name,
          avatarUrl: users.avatarUrl,
          value: count(personalRecords.id).as('value'),
        })
        .from(users)
        .innerJoin(personalRecords, eq(personalRecords.userId, users.id))
        .where(visibilityFilter)
        .groupBy(users.id)
        .orderBy(desc(sql`value`))
        .limit(limit);
      return rows.map((r, i) => ({
        rank: i + 1,
        userId: r.userId,
        username: r.username,
        displayName: r.displayName,
        name: r.name,
        avatarUrl: r.avatarUrl,
        metric: 'prCount' as const,
        value: Number(r.value),
      }));
    }

    return [];
  }
}


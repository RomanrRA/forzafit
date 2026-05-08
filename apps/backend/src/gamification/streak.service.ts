import { Injectable } from '@nestjs/common';
import { eq, sql } from 'drizzle-orm';
import { DrizzleService } from '../db/db.service';
import { streaks } from '../db/schema';

export interface StreakUpdate {
  currentCount: number;
  longestCount: number;
  isNewLongest: boolean;
  daysSincePrevious: number | null;
}

@Injectable()
export class StreakService {
  constructor(private drizzle: DrizzleService) {}

  async getOrInit(userId: string) {
    const [row] = await this.drizzle.db
      .select()
      .from(streaks)
      .where(eq(streaks.userId, userId))
      .limit(1);

    if (row) return row;

    const [created] = await this.drizzle.db
      .insert(streaks)
      .values({ userId, currentCount: 0, longestCount: 0 })
      .returning();
    return created;
  }

  async updateForActivity(
    userId: string,
    activityDate: Date,
  ): Promise<StreakUpdate> {
    const today = startOfDay(activityDate);
    const existing = await this.getOrInit(userId);

    const last = existing.lastActivityDate
      ? startOfDay(existing.lastActivityDate)
      : null;

    let nextCurrent = existing.currentCount;
    let daysSincePrevious: number | null = null;

    if (!last) {
      nextCurrent = 1;
    } else {
      const diffDays = Math.round(
        (today.getTime() - last.getTime()) / (1000 * 60 * 60 * 24),
      );
      daysSincePrevious = diffDays;

      if (diffDays === 0) {
        return {
          currentCount: existing.currentCount,
          longestCount: existing.longestCount,
          isNewLongest: false,
          daysSincePrevious: 0,
        };
      } else if (diffDays === 1) {
        nextCurrent = existing.currentCount + 1;
      } else {
        nextCurrent = 1;
      }
    }

    const nextLongest = Math.max(existing.longestCount, nextCurrent);
    const isNewLongest = nextLongest > existing.longestCount;

    await this.drizzle.db
      .update(streaks)
      .set({
        currentCount: nextCurrent,
        longestCount: nextLongest,
        lastActivityDate: today,
        updatedAt: new Date(),
      })
      .where(eq(streaks.userId, userId));

    return {
      currentCount: nextCurrent,
      longestCount: nextLongest,
      isNewLongest,
      daysSincePrevious,
    };
  }
}

function startOfDay(d: Date): Date {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

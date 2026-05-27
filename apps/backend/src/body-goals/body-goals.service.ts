import { Injectable } from '@nestjs/common';
import { eq, desc } from 'drizzle-orm';
import { DrizzleService } from '../db/db.service';
import { bodyGoals, bodyMeasurements, users } from '../db/schema';
import { UpsertBodyGoalDto } from './dto/body-goal.dto';
import {
  BodyGoalAiService,
  BodyGoalIntent,
} from './body-goal-ai.service';

function yearsBetween(d: Date | null): number | null {
  if (!d) return null;
  const now = new Date();
  let y = now.getFullYear() - d.getFullYear();
  const m = now.getMonth() - d.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < d.getDate())) y--;
  return y;
}

@Injectable()
export class BodyGoalsService {
  constructor(
    private drizzle: DrizzleService,
    private ai: BodyGoalAiService,
  ) {}

  async findMine(userId: string) {
    const [goal] = await this.drizzle.db
      .select()
      .from(bodyGoals)
      .where(eq(bodyGoals.userId, userId))
      .limit(1);

    return goal ?? null;
  }

  async upsert(userId: string, dto: UpsertBodyGoalDto) {
    const values = {
      userId,
      weightKg: dto.weightKg ?? null,
      bodyFatPct: dto.bodyFatPct ?? null,
      chestCm: dto.chestCm ?? null,
      waistCm: dto.waistCm ?? null,
      hipsCm: dto.hipsCm ?? null,
      armCm: dto.armCm ?? null,
      thighCm: dto.thighCm ?? null,
      targetDate: dto.targetDate ? new Date(dto.targetDate) : null,
      updatedAt: new Date(),
    };

    const [goal] = await this.drizzle.db
      .insert(bodyGoals)
      .values(values)
      .onConflictDoUpdate({
        target: bodyGoals.userId,
        set: {
          weightKg: values.weightKg,
          bodyFatPct: values.bodyFatPct,
          chestCm: values.chestCm,
          waistCm: values.waistCm,
          hipsCm: values.hipsCm,
          armCm: values.armCm,
          thighCm: values.thighCm,
          targetDate: values.targetDate,
          updatedAt: values.updatedAt,
        },
      })
      .returning();

    return goal;
  }

  async delete(userId: string): Promise<void> {
    await this.drizzle.db.delete(bodyGoals).where(eq(bodyGoals.userId, userId));
  }

  async aiSuggestAndSave(
    userId: string,
    intents: BodyGoalIntent[],
    targetMonths: number | null,
  ) {
    const db = this.drizzle.db;

    const [user] = await db
      .select({
        gender: users.gender,
        dob: users.dob,
        heightCm: users.heightCm,
      })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    const [latest] = await db
      .select()
      .from(bodyMeasurements)
      .where(eq(bodyMeasurements.userId, userId))
      .orderBy(desc(bodyMeasurements.date))
      .limit(1);

    const gender =
      user?.gender === 'male' || user?.gender === 'female' ? user.gender : null;

    const suggestion = await this.ai.generate({
      gender,
      ageYears: yearsBetween(user?.dob ?? null),
      heightCm: user?.heightCm ?? null,
      intents,
      targetMonths,
      currentMeasurement: latest
        ? {
            weightKg: latest.weightKg,
            bodyFatPct: latest.bodyFatPct,
            chestCm: latest.chestCm,
            waistCm: latest.waistCm,
            hipsCm: latest.hipsCm,
            armCm: latest.armCm,
            thighCm: latest.thighCm,
            calfCm: latest.calfCm,
            forearmCm: latest.forearmCm,
            neckCm: latest.neckCm,
          }
        : null,
    });

    const saved = await this.upsert(userId, {
      weightKg: suggestion.weightKg,
      bodyFatPct: suggestion.bodyFatPct,
      chestCm: suggestion.chestCm,
      waistCm: suggestion.waistCm,
      hipsCm: suggestion.hipsCm,
      armCm: suggestion.armCm,
      thighCm: suggestion.thighCm,
      targetDate: suggestion.targetDate,
    });

    return { goal: saved, rationale: suggestion.rationale };
  }
}

import { Injectable } from '@nestjs/common';
import { eq } from 'drizzle-orm';
import { DrizzleService } from '../db/db.service';
import { bodyGoals } from '../db/schema';
import { UpsertBodyGoalDto } from './dto/body-goal.dto';

@Injectable()
export class BodyGoalsService {
  constructor(private drizzle: DrizzleService) {}

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
}

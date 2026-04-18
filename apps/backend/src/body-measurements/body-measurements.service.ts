import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { eq, and, gte, lte, desc, count } from 'drizzle-orm';
import { DrizzleService } from '../db/db.service';
import { bodyMeasurements } from '../db/schema';
import {
  CreateBodyMeasurementDto,
  UpdateBodyMeasurementDto,
  BodyMeasurementQueryDto,
} from './dto/body-measurement.dto';

@Injectable()
export class BodyMeasurementsService {
  constructor(private drizzle: DrizzleService) {}

  async findAll(userId: string, query: BodyMeasurementQueryDto) {
    const db = this.drizzle.db;
    const conditions = [eq(bodyMeasurements.userId, userId)];

    if (query.from) {
      conditions.push(gte(bodyMeasurements.date, new Date(query.from)));
    }
    if (query.to) {
      conditions.push(lte(bodyMeasurements.date, new Date(query.to)));
    }

    const page = query.page ?? 1;
    const limit = query.limit ?? 50;
    const offset = (page - 1) * limit;

    const [{ total }] = await db
      .select({ total: count() })
      .from(bodyMeasurements)
      .where(and(...conditions));

    const items = await db
      .select()
      .from(bodyMeasurements)
      .where(and(...conditions))
      .orderBy(desc(bodyMeasurements.date))
      .limit(limit)
      .offset(offset);

    return { items, total, page, limit };
  }

  async findOne(id: string, userId: string) {
    const [entry] = await this.drizzle.db
      .select()
      .from(bodyMeasurements)
      .where(and(eq(bodyMeasurements.id, id), eq(bodyMeasurements.userId, userId)))
      .limit(1);

    if (!entry) throw new NotFoundException('Замер не найден');
    return entry;
  }

  async create(userId: string, dto: CreateBodyMeasurementDto) {
    const [entry] = await this.drizzle.db
      .insert(bodyMeasurements)
      .values({
        userId,
        date: new Date(dto.date),
        weightKg: dto.weightKg ?? null,
        bodyFatPct: dto.bodyFatPct ?? null,
        chestCm: dto.chestCm ?? null,
        waistCm: dto.waistCm ?? null,
        hipsCm: dto.hipsCm ?? null,
        armCm: dto.armCm ?? null,
        custom: dto.custom ?? null,
      })
      .returning();

    return entry;
  }

  async update(id: string, userId: string, dto: UpdateBodyMeasurementDto) {
    await this.assertOwner(id, userId);

    const [entry] = await this.drizzle.db
      .update(bodyMeasurements)
      .set({
        ...(dto.date !== undefined ? { date: new Date(dto.date) } : {}),
        ...(dto.weightKg !== undefined ? { weightKg: dto.weightKg } : {}),
        ...(dto.bodyFatPct !== undefined ? { bodyFatPct: dto.bodyFatPct } : {}),
        ...(dto.chestCm !== undefined ? { chestCm: dto.chestCm } : {}),
        ...(dto.waistCm !== undefined ? { waistCm: dto.waistCm } : {}),
        ...(dto.hipsCm !== undefined ? { hipsCm: dto.hipsCm } : {}),
        ...(dto.armCm !== undefined ? { armCm: dto.armCm } : {}),
        ...(dto.custom !== undefined ? { custom: dto.custom } : {}),
        updatedAt: new Date(),
      })
      .where(eq(bodyMeasurements.id, id))
      .returning();

    return entry;
  }

  async delete(id: string, userId: string): Promise<void> {
    await this.assertOwner(id, userId);
    await this.drizzle.db
      .delete(bodyMeasurements)
      .where(eq(bodyMeasurements.id, id));
  }

  private async assertOwner(id: string, userId: string) {
    const [entry] = await this.drizzle.db
      .select({ id: bodyMeasurements.id, userId: bodyMeasurements.userId })
      .from(bodyMeasurements)
      .where(eq(bodyMeasurements.id, id))
      .limit(1);

    if (!entry) throw new NotFoundException('Замер не найден');
    if (entry.userId !== userId) throw new ForbiddenException('Нет доступа');
  }
}

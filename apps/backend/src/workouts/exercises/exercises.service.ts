import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { eq, and, or, ilike, sql } from 'drizzle-orm';
import { DrizzleService } from '../../db/db.service';
import { exercises } from '../../db/schema';
import { CreateExerciseDto, ExerciseFilterDto } from './dto/exercise.dto';

@Injectable()
export class ExercisesService {
  constructor(private drizzle: DrizzleService) {}

  async findAll(userId: string, filters: ExerciseFilterDto) {
    const db = this.drizzle.db;

    const conditions = [
      or(eq(exercises.isCustom, false), eq(exercises.userId, userId)),
    ];

    if (filters.search) {
      conditions.push(ilike(exercises.name, `%${filters.search}%`));
    }

    if (filters.equipment) {
      conditions.push(ilike(exercises.equipment, filters.equipment));
    }

    if (filters.difficulty) {
      conditions.push(eq(exercises.difficulty, filters.difficulty));
    }

    if (filters.custom !== undefined) {
      conditions.push(eq(exercises.isCustom, filters.custom));
    }

    if (filters.muscleGroup) {
      const mg = `%${filters.muscleGroup.toLowerCase()}%`;
      conditions.push(
        sql`array_to_string(${exercises.muscleGroups}, ',') ILIKE ${mg}`,
      );
    }

    const result = await db
      .select()
      .from(exercises)
      .where(and(...conditions))
      .orderBy(exercises.name);

    return { items: result, total: result.length };
  }

  async findById(id: string) {
    const [exercise] = await this.drizzle.db
      .select()
      .from(exercises)
      .where(eq(exercises.id, id))
      .limit(1);

    if (!exercise) throw new NotFoundException('Упражнение не найдено');
    return exercise;
  }

  async create(userId: string, dto: CreateExerciseDto) {
    const [exercise] = await this.drizzle.db
      .insert(exercises)
      .values({
        ...dto,
        muscleGroups: dto.muscleGroups ?? [],
        isCustom: true,
        userId,
      })
      .returning();

    return exercise;
  }

  /**
   * Найти упражнение по имени (case-insensitive) среди публичных + кастомных юзера.
   * Если не найдено — создать custom от имени юзера, чтобы AI-сгенерированные имена
   * не «терялись» при scheduling/Start Day. Возвращает id или null, если имя пустое.
   */
  async resolveByName(userId: string, name: string): Promise<string | null> {
    const trimmed = (name ?? '').trim().replace(/\s+/g, ' ');
    if (!trimmed) return null;

    const [found] = await this.drizzle.db
      .select({ id: exercises.id })
      .from(exercises)
      .where(
        and(
          or(eq(exercises.isCustom, false), eq(exercises.userId, userId)),
          sql`lower(${exercises.name}) = lower(${trimmed})`,
        ),
      )
      .limit(1);

    if (found) return found.id;

    const [created] = await this.drizzle.db
      .insert(exercises)
      .values({
        name: trimmed,
        muscleGroups: [],
        isCustom: true,
        userId,
      })
      .returning({ id: exercises.id });

    return created.id;
  }

  async delete(id: string, userId: string): Promise<void> {
    const exercise = await this.findById(id);

    if (!exercise.isCustom || exercise.userId !== userId) {
      throw new ForbiddenException(
        'Можно удалять только свои пользовательские упражнения',
      );
    }

    await this.drizzle.db.delete(exercises).where(eq(exercises.id, id));
  }
}

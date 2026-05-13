import { Injectable, NotFoundException, ForbiddenException, OnModuleInit, Logger } from '@nestjs/common';
import { eq, and, or, ilike, sql } from 'drizzle-orm';
import { DrizzleService } from '../../db/db.service';
import { exercises } from '../../db/schema';
import { CreateExerciseDto, ExerciseFilterDto } from './dto/exercise.dto';
import { SEED_PUBLIC_EXERCISES } from './seed-data';

@Injectable()
export class ExercisesService implements OnModuleInit {
  private readonly logger = new Logger(ExercisesService.name);

  constructor(private drizzle: DrizzleService) {}

  async onModuleInit() {
    await this.seedPublicExercises();
  }

  /**
   * Идемпотентно досевает публичные упражнения (crossfit, swimming и т.п.).
   * Для каждого из SEED_PUBLIC_EXERCISES проверяет наличие по lower(name)
   * среди isCustom=false и вставляет недостающие.
   */
  private async seedPublicExercises() {
    let inserted = 0;
    for (const seed of SEED_PUBLIC_EXERCISES) {
      const [existing] = await this.drizzle.db
        .select({ id: exercises.id })
        .from(exercises)
        .where(
          and(
            eq(exercises.isCustom, false),
            sql`lower(${exercises.name}) = lower(${seed.name})`,
          ),
        )
        .limit(1);
      if (existing) continue;

      await this.drizzle.db.insert(exercises).values({
        name: seed.name,
        muscleGroups: seed.muscleGroups,
        equipment: seed.equipment,
        difficulty: seed.difficulty as any,
        description: seed.description ?? null,
        isCustom: false,
        userId: null,
      });
      inserted++;
    }
    if (inserted > 0) {
      this.logger.log(`Посеяно ${inserted} публичных упражнений`);
    }
  }

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

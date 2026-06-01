import { Injectable, NotFoundException, ForbiddenException, OnModuleInit, Logger } from '@nestjs/common';
import { eq, and, or, ilike, sql } from 'drizzle-orm';
import { DrizzleService } from '../../db/db.service';
import { exercises } from '../../db/schema';
import { CreateExerciseDto, ExerciseFilterDto } from './dto/exercise.dto';
import { SEED_PUBLIC_EXERCISES } from './seed-data';
import { loadFreeDbSeed } from './free-db-loader';
import { bestMatch, type MatchCandidate } from './exercise-match';

@Injectable()
export class ExercisesService implements OnModuleInit {
  private readonly logger = new Logger(ExercisesService.name);

  // Кэш публичных упражнений для fuzzy-резолва имён (resolveByName).
  // Каталог меняется только при сидинге, поэтому короткого TTL достаточно.
  private publicCache: { at: number; items: MatchCandidate[] } | null = null;
  private static readonly PUBLIC_CACHE_TTL_MS = 5 * 60 * 1000;

  constructor(private drizzle: DrizzleService) {}

  private async getPublicCandidates(): Promise<MatchCandidate[]> {
    const now = Date.now();
    if (this.publicCache && now - this.publicCache.at < ExercisesService.PUBLIC_CACHE_TTL_MS) {
      return this.publicCache.items;
    }
    const rows = await this.drizzle.db
      .select({
        id: exercises.id,
        name: exercises.name,
        equipment: exercises.equipment,
        imageUrls: exercises.imageUrls,
      })
      .from(exercises)
      .where(eq(exercises.isCustom, false));

    const items: MatchCandidate[] = rows.map((r) => ({
      id: r.id,
      name: r.name,
      equipment: r.equipment,
      hasImages: (r.imageUrls?.length ?? 0) > 0,
    }));
    this.publicCache = { at: now, items };
    return items;
  }

  async onModuleInit() {
    await this.seedPublicExercises();
    await this.seedFromFreeDb();
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

  /**
   * Идемпотентный импорт free-exercise-db (873 упр., инструкции + 2 кадра).
   * Ключ — sourceId; при втором запуске обновляет существующие записи
   * (имя/инструкции/картинки), чтобы свежий перевод подхватывался без миграции.
   */
  private async seedFromFreeDb() {
    const seeds = loadFreeDbSeed();
    if (seeds.length === 0) {
      this.logger.warn(
        'free-exercise-db.json не найден или пуст — пропускаю импорт расширенной базы',
      );
      return;
    }

    let inserted = 0;
    let updated = 0;

    for (const s of seeds) {
      const [existing] = await this.drizzle.db
        .select({ id: exercises.id })
        .from(exercises)
        .where(eq(exercises.sourceId, s.sourceId))
        .limit(1);

      if (existing) {
        await this.drizzle.db
          .update(exercises)
          .set({
            name: s.name,
            muscleGroups: s.muscleGroups,
            primaryMuscles: s.primaryMuscles,
            secondaryMuscles: s.secondaryMuscles,
            equipment: s.equipment,
            difficulty: s.difficulty as any,
            category: s.category,
            force: s.force,
            mechanic: s.mechanic,
            instructions: s.instructions,
            imageUrls: s.imageUrls,
          })
          .where(eq(exercises.id, existing.id));
        updated++;
      } else {
        await this.drizzle.db.insert(exercises).values({
          sourceId: s.sourceId,
          name: s.name,
          muscleGroups: s.muscleGroups,
          primaryMuscles: s.primaryMuscles,
          secondaryMuscles: s.secondaryMuscles,
          equipment: s.equipment,
          difficulty: s.difficulty as any,
          category: s.category,
          force: s.force,
          mechanic: s.mechanic,
          instructions: s.instructions,
          imageUrls: s.imageUrls,
          isCustom: false,
          userId: null,
        });
        inserted++;
      }
    }

    if (inserted > 0 || updated > 0) {
      this.logger.log(
        `free-exercise-db: вставлено ${inserted}, обновлено ${updated} (всего ${seeds.length})`,
      );
    }

    // Phase 2: «подцепляем» старые AI-сгенерированные упражнения без sourceId, имя
    // которых совпадает с английским или русским эквивалентом из free-db. Заменяем
    // имя на русское, дописываем инструкции/картинки. sourceId не трогаем (unique
    // index), чтобы не конфликтовать с уже вставленными записями.
    let attached = 0;
    for (const s of seeds) {
      const candidates = await this.drizzle.db
        .select({ id: exercises.id, name: exercises.name })
        .from(exercises)
        .where(
          and(
            eq(exercises.isCustom, false),
            sql`${exercises.sourceId} IS NULL`,
            sql`lower(${exercises.name}) IN (${sql.raw(`'${s.name.toLowerCase().replace(/'/g, "''")}'`)}, ${sql.raw(`'${s.sourceName.toLowerCase().replace(/'/g, "''")}'`)})`,
          ),
        );

      for (const c of candidates) {
        await this.drizzle.db
          .update(exercises)
          .set({
            name: s.name,
            muscleGroups: s.muscleGroups,
            primaryMuscles: s.primaryMuscles,
            secondaryMuscles: s.secondaryMuscles,
            equipment: s.equipment,
            difficulty: s.difficulty as any,
            category: s.category,
            force: s.force,
            mechanic: s.mechanic,
            instructions: s.instructions,
            imageUrls: s.imageUrls,
          })
          .where(eq(exercises.id, c.id));
        attached++;
      }
    }
    if (attached > 0) {
      this.logger.log(`free-exercise-db: подцеплено ${attached} старых записей (RU имя + медиа)`);
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

    // Дедупликация по lower(name): после phase-2 импорта free-db могут существовать
    // обе записи (старая без sourceId, новая с sourceId+медиа). Приоритет — у той,
    // у которой больше контента (есть imageUrls). Для кастомных — не сливаем.
    const map = new Map<string, (typeof result)[number]>();
    for (const ex of result) {
      if (ex.isCustom) {
        map.set(`__c__${ex.id}`, ex);
        continue;
      }
      const key = ex.name.trim().toLowerCase();
      const cur = map.get(key);
      if (!cur) {
        map.set(key, ex);
        continue;
      }
      const curScore = (cur.imageUrls?.length ?? 0) + (cur.instructions?.length ?? 0);
      const newScore = (ex.imageUrls?.length ?? 0) + (ex.instructions?.length ?? 0);
      if (newScore > curScore) map.set(key, ex);
    }
    const deduped = Array.from(map.values()).sort((a, b) =>
      a.name.localeCompare(b.name, 'ru'),
    );

    return { items: deduped, total: deduped.length };
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
   * Найти упражнение по имени среди публичных + кастомных юзера.
   * Сначала точное совпадение (case-insensitive), затем fuzzy-матч к публичным
   * упражнениям с приоритетом тех, что с картинками — чтобы AI-сгенерированные
   * названия цеплялись за упражнение из базы (с фото/инструкциями), а не плодили
   * «голые» кастомы. Только если ничего похожего нет — создаём custom.
   * Возвращает id или null, если имя пустое.
   */
  async resolveByName(userId: string, name: string): Promise<string | null> {
    const trimmed = (name ?? '').trim().replace(/\s+/g, ' ');
    if (!trimmed) return null;

    // 1. Точное совпадение (публичные + кастомы юзера). Среди публичных приоритет
    //    у записи с картинками — на случай дублей одного имени.
    const exact = await this.drizzle.db
      .select({ id: exercises.id, imageUrls: exercises.imageUrls })
      .from(exercises)
      .where(
        and(
          or(eq(exercises.isCustom, false), eq(exercises.userId, userId)),
          sql`lower(${exercises.name}) = lower(${trimmed})`,
        ),
      );
    if (exact.length > 0) {
      const withImg = exact.find((e) => (e.imageUrls?.length ?? 0) > 0);
      return (withImg ?? exact[0]).id;
    }

    // 2. Fuzzy-матч к публичным упражнениям (порог 0.72, приоритет с картинками).
    const match = bestMatch(trimmed, await this.getPublicCandidates(), {
      minScore: 0.72,
      preferImages: true,
    });
    if (match) {
      this.logger.debug(
        `resolveByName: «${trimmed}» → «${match.candidate.name}» (score ${match.score.toFixed(2)})`,
      );
      return match.candidate.id;
    }

    // 3. Ничего похожего — создаём custom.
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

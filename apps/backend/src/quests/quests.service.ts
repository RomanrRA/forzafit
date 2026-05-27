import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { and, desc, eq, lt } from 'drizzle-orm';
import { DrizzleService } from '../db/db.service';
import { userQuests } from '../db/schema';
import {
  CreateManualQuestDto,
  QuestDraftDto,
  QuestResponseDto,
  QuestsOverviewDto,
} from './dto/quest.dto';
import {
  QuestProgress,
  QuestSource,
  QuestTarget,
  QuestType,
} from './quests.types';

const MAX_ACTIVE = 1;
const MAX_SUGGESTIONS = 3;
const RECENT_LIMIT = 10;

@Injectable()
export class QuestsService {
  constructor(private drizzle: DrizzleService) {}

  // ─── Чтение ─────────────────────────────────────────────────────────────────

  async getOverview(userId: string): Promise<QuestsOverviewDto> {
    await this.markOverdueAsFailed(userId);

    const rows = await this.drizzle.db
      .select()
      .from(userQuests)
      .where(eq(userQuests.userId, userId))
      .orderBy(desc(userQuests.createdAt));

    const active =
      rows.find((q) => q.status === 'active') ?? null;
    const suggestions = rows.filter((q) => q.status === 'suggested');
    const recent = rows
      .filter((q) =>
        ['completed', 'failed', 'abandoned'].includes(q.status),
      )
      .slice(0, RECENT_LIMIT);

    return {
      active: active ? this.toDto(active) : null,
      suggestions: suggestions.map((q) => this.toDto(q)),
      recent: recent.map((q) => this.toDto(q)),
    };
  }

  async findById(questId: string, userId: string) {
    const [row] = await this.drizzle.db
      .select()
      .from(userQuests)
      .where(and(eq(userQuests.id, questId), eq(userQuests.userId, userId)))
      .limit(1);
    if (!row) throw new NotFoundException('Квест не найден');
    return row;
  }

  // ─── Запись ─────────────────────────────────────────────────────────────────

  /** Создаёт квест в статусе `suggested`. Используется AI и manual API. */
  async createSuggested(
    userId: string,
    draft: QuestDraftDto,
    source: QuestSource = 'manual',
  ) {
    this.validateTargetForType(draft.type, draft.target);

    const [row] = await this.drizzle.db
      .insert(userQuests)
      .values({
        userId,
        title: draft.title,
        description: draft.description,
        type: draft.type,
        target: draft.target,
        progress: { current: 0 } as QuestProgress,
        rewardPoints: draft.rewardPoints,
        durationDays: draft.durationDays,
        status: 'suggested',
        source,
        aiReason: draft.aiReason ?? null,
      })
      .returning();
    return row;
  }

  async createManual(userId: string, dto: CreateManualQuestDto) {
    return this.createSuggested(userId, dto, 'manual');
  }

  /**
   * Пакетная замена suggestions. Удаляет старые `suggested` и вставляет новые.
   * Активный квест не трогает.
   */
  async replaceSuggestions(
    userId: string,
    drafts: QuestDraftDto[],
    source: QuestSource = 'ai',
  ) {
    for (const d of drafts) this.validateTargetForType(d.type, d.target);

    return this.drizzle.db.transaction(async (tx) => {
      await tx
        .delete(userQuests)
        .where(
          and(
            eq(userQuests.userId, userId),
            eq(userQuests.status, 'suggested'),
          ),
        );

      if (!drafts.length) return [];

      const rows = await tx
        .insert(userQuests)
        .values(
          drafts.slice(0, MAX_SUGGESTIONS).map((d) => ({
            userId,
            title: d.title,
            description: d.description,
            type: d.type,
            target: d.target,
            progress: { current: 0 } as QuestProgress,
            rewardPoints: d.rewardPoints,
            durationDays: d.durationDays,
            status: 'suggested' as const,
            source,
            aiReason: d.aiReason ?? null,
          })),
        )
        .returning();
      return rows;
    });
  }

  async accept(questId: string, userId: string) {
    const quest = await this.findById(questId, userId);

    if (quest.status !== 'suggested') {
      throw new BadRequestException(
        'Принять можно только квест в статусе suggested',
      );
    }

    const [existing] = await this.drizzle.db
      .select({ id: userQuests.id })
      .from(userQuests)
      .where(
        and(
          eq(userQuests.userId, userId),
          eq(userQuests.status, 'active'),
        ),
      )
      .limit(MAX_ACTIVE);

    if (existing) {
      throw new ConflictException(
        `Уже есть активный квест. Заверши или откажись от него прежде чем брать новый.`,
      );
    }

    const now = new Date();
    const expiresAt = new Date(
      now.getTime() + quest.durationDays * 24 * 60 * 60 * 1000,
    );

    const [updated] = await this.drizzle.db
      .update(userQuests)
      .set({
        status: 'active',
        startedAt: now,
        expiresAt,
        progress: { current: 0, startedAt: now.toISOString() } as QuestProgress,
        updatedAt: now,
      })
      .where(eq(userQuests.id, questId))
      .returning();
    return updated;
  }

  async abandon(questId: string, userId: string) {
    const quest = await this.findById(questId, userId);
    if (quest.status !== 'active' && quest.status !== 'suggested') {
      throw new BadRequestException(
        'Отказаться можно только от активного или предложенного квеста',
      );
    }

    const now = new Date();
    const [updated] = await this.drizzle.db
      .update(userQuests)
      .set({
        status: 'abandoned',
        completedAt: now,
        updatedAt: now,
      })
      .where(eq(userQuests.id, questId))
      .returning();
    return updated;
  }

  // ─── Внутреннее API для quest-tracker ──────────────────────────────────────

  /** Возвращает текущий активный квест (или null). */
  async findActiveForUser(userId: string) {
    const [row] = await this.drizzle.db
      .select()
      .from(userQuests)
      .where(
        and(
          eq(userQuests.userId, userId),
          eq(userQuests.status, 'active'),
        ),
      )
      .limit(1);
    return row ?? null;
  }

  /**
   * Обновляет прогресс активного квеста.
   * Если current >= target — переводит в completed.
   */
  async applyProgressUpdate(
    questId: string,
    progress: QuestProgress,
    isCompleted: boolean,
  ) {
    const now = new Date();
    const [updated] = await this.drizzle.db
      .update(userQuests)
      .set({
        progress,
        status: isCompleted ? 'completed' : 'active',
        completedAt: isCompleted ? now : null,
        updatedAt: now,
      })
      .where(eq(userQuests.id, questId))
      .returning();
    return updated;
  }

  /** Лениво помечает active-квесты с истёкшим expiresAt как failed. */
  async markOverdueAsFailed(userId: string): Promise<number> {
    const now = new Date();
    const result = await this.drizzle.db
      .update(userQuests)
      .set({
        status: 'failed',
        completedAt: now,
        updatedAt: now,
      })
      .where(
        and(
          eq(userQuests.userId, userId),
          eq(userQuests.status, 'active'),
          lt(userQuests.expiresAt, now),
        ),
      )
      .returning({ id: userQuests.id });
    return result.length;
  }

  // ─── Mapping ────────────────────────────────────────────────────────────────

  private toDto(row: typeof userQuests.$inferSelect): QuestResponseDto {
    const target = row.target as QuestTarget;
    const progress = (row.progress ?? {}) as QuestProgress;
    const progressRatio = this.computeProgressRatio(target, progress);

    return {
      id: row.id,
      title: row.title,
      description: row.description,
      type: row.type as QuestType,
      target: target as unknown as Record<string, unknown>,
      progress: progress as unknown as Record<string, unknown>,
      rewardPoints: row.rewardPoints,
      status: row.status,
      source: row.source,
      durationDays: row.durationDays,
      startedAt: row.startedAt?.toISOString() ?? null,
      expiresAt: row.expiresAt?.toISOString() ?? null,
      completedAt: row.completedAt?.toISOString() ?? null,
      aiReason: row.aiReason ?? null,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
      progressRatio,
    };
  }

  private computeProgressRatio(
    target: QuestTarget,
    progress: QuestProgress,
  ): number {
    const goal = this.targetGoalValue(target);
    if (!goal || goal <= 0) return 0;
    return Math.min(1, progress.current / goal);
  }

  private targetGoalValue(target: QuestTarget): number {
    switch (target.type) {
      case 'workout_count':
      case 'streak_keep':
      case 'exercise_frequency':
        return target.value;
      case 'total_volume':
        return target.valueKg;
      case 'pr_in_exercise':
        return 1;
      case 'weekday_consistency':
        return target.weekdays.length;
    }
  }

  private validateTargetForType(
    type: QuestType,
    target: Record<string, unknown>,
  ) {
    const t = target as QuestTarget;
    if ((t as { type?: string }).type !== type) {
      throw new BadRequestException(
        `target.type должен совпадать с type квеста (${type})`,
      );
    }
    switch (type) {
      case 'workout_count':
      case 'streak_keep':
        if (typeof (t as { value?: number }).value !== 'number') {
          throw new BadRequestException(`target.value обязателен для ${type}`);
        }
        return;
      case 'pr_in_exercise':
        if (!(t as { exerciseId?: string }).exerciseId) {
          throw new BadRequestException(
            'target.exerciseId обязателен для pr_in_exercise',
          );
        }
        return;
      case 'total_volume':
        if (typeof (t as { valueKg?: number }).valueKg !== 'number') {
          throw new BadRequestException(
            'target.valueKg обязателен для total_volume',
          );
        }
        return;
      case 'exercise_frequency':
        if (
          !(t as { exerciseId?: string }).exerciseId ||
          typeof (t as { value?: number }).value !== 'number'
        ) {
          throw new BadRequestException(
            'target.exerciseId и target.value обязательны для exercise_frequency',
          );
        }
        return;
      case 'weekday_consistency':
        if (
          !Array.isArray((t as { weekdays?: number[] }).weekdays) ||
          (t as { weekdays: number[] }).weekdays.length === 0
        ) {
          throw new BadRequestException(
            'target.weekdays (массив 0..6) обязателен для weekday_consistency',
          );
        }
        return;
    }
  }

  toDtoPublic(row: typeof userQuests.$inferSelect) {
    return this.toDto(row);
  }
}

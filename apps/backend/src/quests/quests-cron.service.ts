import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { and, eq, inArray, isNotNull } from 'drizzle-orm';
import { DrizzleService } from '../db/db.service';
import { userQuests, users, workoutSessions } from '../db/schema';
import { QuestsService } from './quests.service';
import { QuestAiService } from './quest-ai.service';

@Injectable()
export class QuestsCronService {
  private readonly logger = new Logger(QuestsCronService.name);

  constructor(
    private drizzle: DrizzleService,
    private quests: QuestsService,
    private questAi: QuestAiService,
  ) {}

  /**
   * Каждый понедельник в 06:00 серверного времени:
   * для каждого пользователя без активного квеста и без suggested
   * генерим 3 новых предложения через AI.
   * Пропускаем юзеров без единой завершённой тренировки (AI нечего анализировать).
   */
  @Cron('0 6 * * MON', { name: 'quests-weekly-regenerate' })
  async regenerateWeekly(): Promise<void> {
    this.logger.log('Запуск понедельничной авто-генерации квестов');
    const result = await this.regenerateForEligibleUsers();
    this.logger.log(
      `Авто-генерация завершена: обработано=${result.processed}, успешно=${result.succeeded}, ошибок=${result.failed}, пропущено=${result.skipped}`,
    );
  }

  /**
   * Публичный метод — можно вызвать из dev-эндпоинта,
   * чтобы протестировать прогон без ожидания понедельника.
   */
  async regenerateForEligibleUsers(): Promise<{
    processed: number;
    succeeded: number;
    failed: number;
    skipped: number;
  }> {
    const db = this.drizzle.db;

    const allUsers = await db.select({ id: users.id }).from(users);

    // Юзеры, у которых уже есть active или suggested — не трогаем.
    const busyRows = await db
      .select({ userId: userQuests.userId })
      .from(userQuests)
      .where(inArray(userQuests.status, ['active', 'suggested']));
    const busyIds = new Set(busyRows.map((r) => r.userId));

    let processed = 0;
    let succeeded = 0;
    let failed = 0;
    let skipped = 0;

    for (const u of allUsers) {
      if (busyIds.has(u.id)) {
        skipped++;
        continue;
      }

      // Юзер без единой завершённой тренировки — AI нечего анализировать.
      const [hasFinished] = await db
        .select({ id: workoutSessions.id })
        .from(workoutSessions)
        .where(
          and(
            eq(workoutSessions.userId, u.id),
            isNotNull(workoutSessions.finishedAt),
          ),
        )
        .limit(1);
      if (!hasFinished?.id) {
        skipped++;
        continue;
      }

      processed++;
      try {
        const drafts = await this.questAi.generateForUser(u.id);
        await this.quests.replaceSuggestions(u.id, drafts, 'ai');
        succeeded++;
      } catch (e) {
        failed++;
        this.logger.warn(
          `Не удалось сгенерировать квесты для ${u.id}: ${(e as Error).message}`,
        );
      }
    }

    return { processed, succeeded, failed, skipped };
  }
}

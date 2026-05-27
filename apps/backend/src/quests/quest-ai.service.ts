import {
  BadGatewayException,
  Injectable,
  Logger,
} from '@nestjs/common';
import { and, desc, eq, gte, sql } from 'drizzle-orm';
import { DrizzleService } from '../db/db.service';
import {
  OpenRouterService,
  OpenRouterTool,
  ChatMessage,
} from '../ai/openrouter.service';
import {
  bodyGoals,
  exercises,
  personalRecords,
  streaks,
  userQuests,
  users,
  workoutSessions,
} from '../db/schema';
import { QuestDraftDto } from './dto/quest.dto';
import { QuestType } from './quests.types';

const CONTEXT_DAYS = 28;
const QUEST_MODEL = 'anthropic/claude-sonnet-4.6';

interface UserContext {
  profile: {
    name: string | null;
    age: number | null;
    gender: string | null;
    heightCm: number | null;
    weightKg: number | null;
    goal: string | null;
  };
  bodyGoal: {
    weightKg: number | null;
    waistCm: number | null;
    targetDate: string | null;
  } | null;
  streak: {
    current: number;
    longest: number;
    lastActivityDate: string | null;
  };
  workoutsLast28d: {
    count: number;
    perWeek: number;
    weekdayBreakdown: Record<string, number>; // mon..sun
    avgVolumeKg: number;
    avgRpe: number | null; // 1..10, null если RPE не отмечен
  };
  topExercises: Array<{
    id: string;
    name: string;
    sessionCount: number;
    avgRpe: number | null;
  }>;
  recentPrs: Array<{
    exerciseId: string;
    exerciseName: string | null;
    type: string;
    valueKg: number;
    reps: number | null;
    achievedAt: string;
  }>;
  recentQuests: Array<{
    title: string;
    type: string;
    status: string;
  }>;
}

@Injectable()
export class QuestAiService {
  private readonly logger = new Logger(QuestAiService.name);

  constructor(
    private drizzle: DrizzleService,
    private openRouter: OpenRouterService,
  ) {}

  /** Генерирует 3 предложения квестов для юзера. Не пишет в БД — это делает caller. */
  async generateForUser(userId: string): Promise<QuestDraftDto[]> {
    const context = await this.buildContext(userId);

    const tool: OpenRouterTool = {
      type: 'function',
      function: {
        name: 'suggest_quests',
        description:
          'Предложи 3 квеста на 1-2 недели на основе истории пользователя.',
        parameters: this.buildToolSchema(context.topExercises),
      },
      // Кэшируем system + tools — самая жирная часть запроса.
      cache_control: { type: 'ephemeral' },
    };

    const messages: ChatMessage[] = [
      {
        role: 'system',
        content: [
          {
            type: 'text',
            text: this.buildSystemPrompt(),
            cache_control: { type: 'ephemeral' },
          },
        ],
      },
      {
        role: 'user',
        content: this.buildUserPrompt(context),
      },
    ];

    const response = await this.openRouter.completion({
      model: QUEST_MODEL,
      messages,
      tools: [tool],
      toolChoice: { type: 'function', function: { name: 'suggest_quests' } },
      temperature: 0.7,
      maxTokens: 1500,
    });

    const toolCall = response.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall || toolCall.function.name !== 'suggest_quests') {
      throw new BadGatewayException('AI не вернул tool_call suggest_quests');
    }

    let parsed: { quests?: unknown };
    try {
      parsed = JSON.parse(toolCall.function.arguments);
    } catch {
      throw new BadGatewayException('AI вернул невалидный JSON в tool_call');
    }

    const drafts = this.normalizeDrafts(parsed.quests, context.topExercises);
    if (drafts.length === 0) {
      throw new BadGatewayException('AI не вернул валидных квестов');
    }
    return drafts;
  }

  // ─── Контекст пользователя ────────────────────────────────────────────────

  private async buildContext(userId: string): Promise<UserContext> {
    const db = this.drizzle.db;
    const since = new Date(Date.now() - CONTEXT_DAYS * 24 * 60 * 60 * 1000);

    const [user] = await db
      .select({
        name: users.name,
        gender: users.gender,
        dob: users.dob,
        heightCm: users.heightCm,
        weightKg: users.weightKg,
        goal: users.goal,
      })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    const [goal] = await db
      .select()
      .from(bodyGoals)
      .where(eq(bodyGoals.userId, userId))
      .limit(1);

    const [streak] = await db
      .select()
      .from(streaks)
      .where(eq(streaks.userId, userId))
      .limit(1);

    const recentSessions = await db
      .select({
        id: workoutSessions.id,
        startedAt: workoutSessions.startedAt,
        finishedAt: workoutSessions.finishedAt,
      })
      .from(workoutSessions)
      .where(
        and(
          eq(workoutSessions.userId, userId),
          gte(workoutSessions.startedAt, since),
        ),
      );

    const finishedSessions = recentSessions.filter((s) => s.finishedAt);

    // Объём + средний RPE за 28 дней
    const volumeRows = await db.execute(sql`
      SELECT COALESCE(SUM(COALESCE(s.weight_kg, 0) * COALESCE(s.reps, 0)), 0) AS total,
             COUNT(DISTINCT we.session_id) AS sessions,
             AVG(s.rpe) FILTER (WHERE s.rpe IS NOT NULL) AS avg_rpe
      FROM workout_sets s
      JOIN workout_exercises we ON we.id = s.workout_exercise_id
      JOIN workout_sessions ws ON ws.id = we.session_id
      WHERE ws.user_id = ${userId}
        AND ws.started_at >= ${since}
        AND s.completed = true
    `);
    const volRow = (
      volumeRows as unknown as {
        rows: Array<{
          total: string | number;
          sessions: string | number;
          avg_rpe: string | number | null;
        }>;
      }
    ).rows[0];
    const totalVol = volRow ? Number(volRow.total) : 0;
    const volSessions = volRow ? Number(volRow.sessions) : 0;
    const avgVolume = volSessions ? totalVol / volSessions : 0;
    const avgRpe =
      volRow?.avg_rpe != null ? +Number(volRow.avg_rpe).toFixed(1) : null;

    // Топ упражнений + RPE по каждому
    const topRows = await db.execute(sql`
      SELECT e.id, e.name,
             COUNT(DISTINCT we.session_id) AS sessions,
             AVG(s.rpe) FILTER (WHERE s.rpe IS NOT NULL) AS avg_rpe
      FROM workout_exercises we
      JOIN workout_sessions ws ON ws.id = we.session_id
      JOIN exercises e ON e.id = we.exercise_id
      LEFT JOIN workout_sets s ON s.workout_exercise_id = we.id AND s.completed = true
      WHERE ws.user_id = ${userId}
        AND ws.started_at >= ${since}
      GROUP BY e.id, e.name
      ORDER BY sessions DESC
      LIMIT 5
    `);
    const topExercises = (
      topRows as unknown as {
        rows: Array<{
          id: string;
          name: string;
          sessions: string | number;
          avg_rpe: string | number | null;
        }>;
      }
    ).rows.map((r) => ({
      id: r.id,
      name: r.name,
      sessionCount: Number(r.sessions),
      avgRpe: r.avg_rpe != null ? +Number(r.avg_rpe).toFixed(1) : null,
    }));

    const recentPrRows = await db
      .select({
        exerciseId: personalRecords.exerciseId,
        exerciseName: exercises.name,
        type: personalRecords.type,
        valueKg: personalRecords.valueKg,
        reps: personalRecords.reps,
        achievedAt: personalRecords.achievedAt,
      })
      .from(personalRecords)
      .leftJoin(exercises, eq(exercises.id, personalRecords.exerciseId))
      .where(eq(personalRecords.userId, userId))
      .orderBy(desc(personalRecords.achievedAt))
      .limit(5);

    const recentQuestRows = await db
      .select({
        title: userQuests.title,
        type: userQuests.type,
        status: userQuests.status,
      })
      .from(userQuests)
      .where(eq(userQuests.userId, userId))
      .orderBy(desc(userQuests.createdAt))
      .limit(10);

    const weekdayBreakdown: Record<string, number> = {
      mon: 0, tue: 0, wed: 0, thu: 0, fri: 0, sat: 0, sun: 0,
    };
    const weekdayKeys = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];
    for (const s of finishedSessions) {
      if (!s.startedAt) continue;
      const k = weekdayKeys[s.startedAt.getDay()];
      weekdayBreakdown[k] = (weekdayBreakdown[k] ?? 0) + 1;
    }

    return {
      profile: {
        name: user?.name ?? null,
        age: user?.dob ? this.ageFromDob(user.dob) : null,
        gender: user?.gender ?? null,
        heightCm: user?.heightCm ?? null,
        weightKg: user?.weightKg ?? null,
        goal: user?.goal ?? null,
      },
      bodyGoal: goal
        ? {
            weightKg: goal.weightKg,
            waistCm: goal.waistCm,
            targetDate: goal.targetDate?.toISOString() ?? null,
          }
        : null,
      streak: {
        current: streak?.currentCount ?? 0,
        longest: streak?.longestCount ?? 0,
        lastActivityDate: streak?.lastActivityDate?.toISOString() ?? null,
      },
      workoutsLast28d: {
        count: finishedSessions.length,
        perWeek: +(finishedSessions.length / 4).toFixed(1),
        weekdayBreakdown,
        avgVolumeKg: Math.round(avgVolume),
        avgRpe,
      },
      topExercises,
      recentPrs: recentPrRows.map((p) => ({
        exerciseId: p.exerciseId,
        exerciseName: p.exerciseName,
        type: p.type,
        valueKg: p.valueKg,
        reps: p.reps,
        achievedAt: p.achievedAt.toISOString(),
      })),
      recentQuests: recentQuestRows,
    };
  }

  private ageFromDob(dob: Date): number {
    const diff = Date.now() - dob.getTime();
    return Math.floor(diff / (365.25 * 24 * 60 * 60 * 1000));
  }

  // ─── Промпты ──────────────────────────────────────────────────────────────

  private buildSystemPrompt(): string {
    return `Ты — AI-тренер фитнес-приложения ForzaFit. Твоя задача — предложить пользователю ровно 3 коротких персональных квеста (целей) длительностью 1-2 недели, которые помогут ему быть консистентным в тренировках и расти.

ПРИНЦИПЫ:
- Цели должны быть реалистичны для текущего темпа пользователя. Если он тренируется 3 раза в неделю — не предлагай 7. Закрепляй текущий темп или подталкивай чуть-чуть выше (+1-2).
- 3 разных типа квестов (по возможности): один про частоту, один про конкретное упражнение или PR, один про закрепление дисциплины (streak или weekday).
- Не дублируй квесты из истории, которые он недавно проваливал — он не справится снова.
- Формулировки на «ты», мотивирующие, но без панибратства и инфоцыганщины.
- title: короткий, 3-6 слов, без эмодзи.
- description: 1-2 предложения. Скажи что делать и почему именно это (опираясь на его историю — «у тебя серия 5 дней, добавим ещё неделю» и т.п.).
- aiReason: 1 короткое предложение — почему ты выбрал именно эту цель для этого пользователя. Это покажется в UI ниже карточки.
- rewardPoints: 20-30 за лёгкие, 50-80 за средние, 100-150 за сложные/недельные челленджи.
- durationDays: 7 для основных, 14 для streak/долгих.
- target должен соответствовать выбранному type — см. tool schema.

ИСПОЛЬЗУЙ RPE (оценку тяжести 1-10) из контекста:
- avgRpe >= 8 в целом или по конкретному упражнению — он перегружается. Не предлагай pr_in_exercise по такому упражнению; предложи разгрузочную неделю — например, total_volume чуть НИЖЕ обычного, или workout_count = текущий темп без роста.
- avgRpe <= 6 — есть запас. Можно мягко поднять нагрузку: +1 тренировка в неделю или pr_in_exercise.
- avgRpe = null или мало данных — не делай выводов по RPE, опирайся только на частоту и объём.
- Упомяни RPE в aiReason явно, если он повлиял на выбор: «У тебя жим стабильно идёт на 8-9 — даём неделю на восстановление силы».

ВАЖНО:
- Используй ТОЛЬКО те exerciseId, которые есть в topExercises контекста. Не выдумывай.
- Если у пользователя 0 тренировок за 28 дней — предложи мягкий старт (1-2 тренировки за неделю).
- Всё на русском.`;
  }

  private buildUserPrompt(context: UserContext): string {
    return `Контекст пользователя:\n\n${JSON.stringify(context, null, 2)}\n\nПредложи 3 квеста через инструмент suggest_quests.`;
  }

  private buildToolSchema(
    topExercises: UserContext['topExercises'],
  ): Record<string, unknown> {
    const exerciseIds = topExercises.map((e) => e.id);
    const exerciseEnum =
      exerciseIds.length > 0
        ? { type: 'string', enum: exerciseIds }
        : { type: 'string' };

    return {
      type: 'object',
      properties: {
        quests: {
          type: 'array',
          minItems: 3,
          maxItems: 3,
          items: {
            type: 'object',
            properties: {
              title: { type: 'string', minLength: 4, maxLength: 80 },
              description: { type: 'string', minLength: 10, maxLength: 400 },
              type: {
                type: 'string',
                enum: [
                  'workout_count',
                  'streak_keep',
                  'pr_in_exercise',
                  'total_volume',
                  'exercise_frequency',
                  'weekday_consistency',
                ],
              },
              target: {
                type: 'object',
                description:
                  'Параметры цели. Структура зависит от type:\n' +
                  '- workout_count: {type, value: число (1-14)}\n' +
                  '- streak_keep: {type, value: дней (3-21)}\n' +
                  '- pr_in_exercise: {type, exerciseId, exerciseName}\n' +
                  '- total_volume: {type, valueKg (число, разумный недельный объём)}\n' +
                  '- exercise_frequency: {type, exerciseId, exerciseName, value (раз)}\n' +
                  '- weekday_consistency: {type, weekdays: массив 0..6 (0=вс)}',
                properties: {
                  type: { type: 'string' },
                  value: { type: 'number' },
                  valueKg: { type: 'number' },
                  exerciseId: exerciseEnum,
                  exerciseName: { type: 'string' },
                  weekdays: {
                    type: 'array',
                    items: { type: 'integer', minimum: 0, maximum: 6 },
                  },
                },
                required: ['type'],
              },
              durationDays: { type: 'integer', minimum: 3, maximum: 21 },
              rewardPoints: { type: 'integer', minimum: 10, maximum: 200 },
              aiReason: { type: 'string', maxLength: 400 },
            },
            required: [
              'title',
              'description',
              'type',
              'target',
              'durationDays',
              'rewardPoints',
              'aiReason',
            ],
          },
        },
      },
      required: ['quests'],
    };
  }

  // ─── Парсинг ответа ───────────────────────────────────────────────────────

  private normalizeDrafts(
    raw: unknown,
    topExercises: UserContext['topExercises'],
  ): QuestDraftDto[] {
    if (!Array.isArray(raw)) return [];
    const idSet = new Set(topExercises.map((e) => e.id));
    const nameById = new Map(topExercises.map((e) => [e.id, e.name]));

    const drafts: QuestDraftDto[] = [];
    for (const item of raw) {
      if (!item || typeof item !== 'object') continue;
      const q = item as Record<string, unknown>;
      const type = q.type as QuestType;
      const target = (q.target ?? {}) as Record<string, unknown>;

      // Подставим название упражнения, если AI его пропустил, но id известный.
      const exId = target.exerciseId as string | undefined;
      if (exId && idSet.has(exId) && !target.exerciseName) {
        target.exerciseName = nameById.get(exId) ?? '';
      }
      // Если AI прислал левый id — отбрасываем такой квест.
      if (
        (type === 'pr_in_exercise' || type === 'exercise_frequency') &&
        (!exId || !idSet.has(exId))
      ) {
        this.logger.warn(`Skip quest with unknown exerciseId: ${exId}`);
        continue;
      }
      target.type = type;

      drafts.push({
        title: String(q.title ?? '').slice(0, 80),
        description: String(q.description ?? '').slice(0, 400),
        type,
        target,
        durationDays: this.clampInt(q.durationDays, 3, 21, 7),
        rewardPoints: this.clampInt(q.rewardPoints, 10, 200, 30),
        aiReason: q.aiReason ? String(q.aiReason).slice(0, 400) : undefined,
      });
    }
    return drafts;
  }

  private clampInt(
    v: unknown,
    min: number,
    max: number,
    fallback: number,
  ): number {
    const n = typeof v === 'number' ? Math.floor(v) : Number(v);
    if (!Number.isFinite(n)) return fallback;
    return Math.max(min, Math.min(max, n));
  }
}

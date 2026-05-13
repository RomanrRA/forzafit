import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  ConflictException,
} from '@nestjs/common';
import { eq, and, sql } from 'drizzle-orm';
import * as fs from 'fs';
import * as path from 'path';
import { DrizzleService } from '../db/db.service';
import { aiConversations, planTemplates, users } from '../db/schema';
import { PlanTemplatesService } from '../plan-templates/plan-templates.service';
import { ExercisesService } from '../workouts/exercises/exercises.service';
import { OpenRouterService, ChatMessage, ToolCall } from './openrouter.service';
import { GENERATE_PLAN_TOOL, GeneratePlanArgs } from './tools/generate-plan.tool';
import {
  ADJUST_PLAN_TOOL,
  AdjustPlanArgs,
  PlanAdjustment,
} from './tools/adjust-plan.tool';
import { SseEvent } from './dto/ai.dto';

const GENDER_LABEL: Record<string, string> = {
  male: 'мужской',
  female: 'женский',
  other: 'другой',
};

// Canonical distributions: day numbers evenly spaced across the week (1=Mon..7=Sun).
// Used to force a valid schedule even when the model outputs consecutive days.
const CANONICAL_DAYS: Record<number, number[]> = {
  1: [1],
  2: [1, 4],
  3: [1, 3, 5],
  4: [1, 2, 4, 5],
  5: [1, 2, 3, 5, 6],
  6: [1, 2, 3, 4, 5, 6],
  7: [1, 2, 3, 4, 5, 6, 7],
};

function buildProfileContext(user: {
  gender: string | null;
  dob: Date | null;
  heightCm: number | null;
  weightKg: number | null;
  goal: string | null;
}): string | null {
  const lines: string[] = [];
  if (user.gender) lines.push(`- Пол: ${GENDER_LABEL[user.gender] ?? user.gender}`);
  if (user.dob) {
    const age = Math.floor((Date.now() - user.dob.getTime()) / (365.25 * 24 * 3600 * 1000));
    lines.push(`- Возраст: ${age} лет`);
  }
  if (user.heightCm) lines.push(`- Рост: ${user.heightCm} см`);
  if (user.weightKg) lines.push(`- Вес: ${user.weightKg} кг`);
  if (user.goal) lines.push(`- Цель из профиля: ${user.goal}`);
  if (lines.length === 0) return null;
  return `## Что уже известно о пользователе (из профиля)\n${lines.join('\n')}\n\nЭти данные не переспрашивай.`;
}

@Injectable()
export class AiService {
  private readonly systemPrompt: string;
  private readonly adjustPrompt: string;

  constructor(
    private drizzle: DrizzleService,
    private openRouter: OpenRouterService,
    private planTemplatesService: PlanTemplatesService,
    private exercisesService: ExercisesService,
  ) {
    const promptPath = path.join(__dirname, 'prompts', 'plan-wizard.md');
    this.systemPrompt = fs.readFileSync(promptPath, 'utf-8').trim();
    const adjustPath = path.join(__dirname, 'prompts', 'plan-adjust.md');
    this.adjustPrompt = fs.readFileSync(adjustPath, 'utf-8').trim();
  }

  async *startConversation(userId: string): AsyncIterable<SseEvent> {
    const systemMessage: ChatMessage = { role: 'system', content: this.systemPrompt };

    // Create conversation row with system message pre-seeded
    const [conversation] = await this.drizzle.db
      .insert(aiConversations)
      .values({
        userId,
        messages: [systemMessage],
      })
      .returning();

    // First SSE event: meta with conversationId
    yield { type: 'meta', conversationId: conversation.id };

    // Stream the opening assistant message
    const assistantMessage = await this.streamAndCollect(
      [systemMessage],
      (event) => event,
    );

    // Persist assistant opening message
    const updatedMessages: ChatMessage[] = [systemMessage, assistantMessage];
    await this.drizzle.db
      .update(aiConversations)
      .set({ messages: updatedMessages, updatedAt: new Date() })
      .where(eq(aiConversations.id, conversation.id));

    yield { type: 'done' };
  }

  async *startConversationStream(
    userId: string,
    initialMessage?: string,
  ): AsyncIterable<SseEvent> {
    const [user] = await this.drizzle.db
      .select({
        gender: users.gender,
        dob: users.dob,
        heightCm: users.heightCm,
        weightKg: users.weightKg,
        goal: users.goal,
      })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    const profileContext = user ? buildProfileContext(user) : null;
    const systemContent = profileContext
      ? `${this.systemPrompt}\n\n${profileContext}`
      : this.systemPrompt;
    const systemMessage: ChatMessage = { role: 'system', content: systemContent };

    const seedMessages: ChatMessage[] = initialMessage
      ? [systemMessage, { role: 'user', content: initialMessage }]
      : [systemMessage];

    const [conversation] = await this.drizzle.db
      .insert(aiConversations)
      .values({
        userId,
        messages: seedMessages,
      })
      .returning();

    yield { type: 'meta', conversationId: conversation.id };

    let assistantContent = '';
    let toolCallResult: ToolCall | null = null;

    for await (const event of this.openRouter.streamCompletion({
      messages: seedMessages,
      tools: [GENERATE_PLAN_TOOL as any],
    })) {
      if (event.type === 'token') {
        assistantContent += event.content;
        yield { type: 'token', content: event.content };
      } else if (event.type === 'tool_call') {
        toolCallResult = event.toolCall;
        yield { type: 'tool_call', name: event.toolCall.function.name, args: JSON.parse(event.toolCall.function.arguments || '{}') };
      } else if (event.type === 'done') {
        break;
      }
    }

    const assistantMessage: ChatMessage = {
      role: 'assistant',
      content: assistantContent || null,
      ...(toolCallResult ? { tool_calls: [toolCallResult] } : {}),
    };

    const updatedMessages: ChatMessage[] = [...seedMessages, assistantMessage];
    await this.drizzle.db
      .update(aiConversations)
      .set({ messages: updatedMessages, updatedAt: new Date() })
      .where(eq(aiConversations.id, conversation.id));

    yield { type: 'done' };
  }

  async *sendMessage(conversationId: string, userId: string, content: string): AsyncIterable<SseEvent> {
    const conversation = await this.getOwnedActiveConversation(conversationId, userId);
    const messages = (conversation.messages as ChatMessage[]) ?? [];

    const userMessage: ChatMessage = { role: 'user', content };
    const messagesWithUser = [...messages, userMessage];

    let assistantContent = '';
    let toolCallResult: ToolCall | null = null;

    for await (const event of this.openRouter.streamCompletion({
      messages: messagesWithUser,
      tools: [GENERATE_PLAN_TOOL as any],
    })) {
      if (event.type === 'token') {
        assistantContent += event.content;
        yield { type: 'token', content: event.content };
      } else if (event.type === 'tool_call') {
        toolCallResult = event.toolCall;
        yield { type: 'tool_call', name: event.toolCall.function.name, args: JSON.parse(event.toolCall.function.arguments || '{}') };
      } else if (event.type === 'done') {
        break;
      }
    }

    const assistantMessage: ChatMessage = {
      role: 'assistant',
      content: assistantContent || null,
      ...(toolCallResult ? { tool_calls: [toolCallResult] } : {}),
    };

    const updatedMessages = [...messagesWithUser, assistantMessage];
    await this.drizzle.db
      .update(aiConversations)
      .set({ messages: updatedMessages, updatedAt: new Date() })
      .where(eq(aiConversations.id, conversationId));

    yield { type: 'done' };
  }

  async finalizeConversation(conversationId: string, userId: string): Promise<{ planTemplateId: string }> {
    const conversation = await this.getOwnedActiveConversation(conversationId, userId);
    const messages = (conversation.messages as ChatMessage[]) ?? [];

    // Find last assistant message with a generate_plan tool call
    const lastAssistant = [...messages].reverse().find(
      (m) => m.role === 'assistant' && m.tool_calls?.some((tc) => tc.function.name === 'generate_plan'),
    );

    if (!lastAssistant || !lastAssistant.tool_calls) {
      throw new ConflictException('Агент ещё не сгенерировал план');
    }

    const toolCall = lastAssistant.tool_calls.find((tc) => tc.function.name === 'generate_plan');
    if (!toolCall) {
      throw new ConflictException('Агент ещё не сгенерировал план');
    }

    let args: GeneratePlanArgs;
    try {
      args = JSON.parse(toolCall.function.arguments);
    } catch {
      throw new ConflictException('Не удалось разобрать аргументы плана');
    }

    // Map tool args → PlanBuilder/plan_templates.days shape (name/focus/note keys differ from tool schema)
    // Ordering: keep the model's relative ordering of training days, but remap
    // dayNumber to a canonical evenly-spaced schedule so consecutive days are impossible.
    const trainingDays = args.days
      .filter((d) => !d.isRest)
      .sort((a, b) => a.dayNumber - b.dayNumber);

    const canonical =
      CANONICAL_DAYS[Math.min(trainingDays.length, 7)] ?? trainingDays.map((d) => d.dayNumber);

    // AI обычно не знает UUID существующих упражнений и присылает только exerciseName.
    // Резолвим имя → id (находим в БД или создаём custom), чтобы scheduling и Start Day
    // не получали пустые тренировки. Игнорируем ex.exerciseId от AI как ненадёжный.
    const planDays = await Promise.all(
      trainingDays.map(async (d, idx) => ({
        dayNumber: canonical[idx] ?? d.dayNumber,
        focus: d.name,
        exercises: await Promise.all(
          (d.exercises ?? []).map(async (ex) => ({
            exerciseId:
              (await this.exercisesService.resolveByName(userId, ex.exerciseName)) ?? undefined,
            name: ex.exerciseName,
            sets: ex.targetSets,
            reps: ex.targetReps,
            weightKg: ex.weightKg,
            note: ex.notes ?? '',
            rest: '60 сек',
          })),
        ),
      })),
    );

    const plan = await this.planTemplatesService.create(userId, {
      name: args.name,
      description: args.description,
      goal: args.goal,
      difficulty: args.difficulty,
      type: args.type,
      daysPerWeek: args.daysPerWeek,
      duration: args.weeksDuration ? `${args.weeksDuration} нед.` : undefined,
      days: planDays,
    });

    await this.drizzle.db
      .update(aiConversations)
      .set({
        status: 'finalized',
        planTemplateId: plan.id,
        updatedAt: new Date(),
      })
      .where(eq(aiConversations.id, conversationId));

    return { planTemplateId: plan.id };
  }

  // ─── Plan adjustment (step 2) ──────────────────────────────────────────────

  async *adjustPlanStream(
    userId: string,
    planTemplateId: string,
  ): AsyncIterable<SseEvent> {
    // Load plan and ownership
    const [plan] = await this.drizzle.db
      .select()
      .from(planTemplates)
      .where(and(eq(planTemplates.id, planTemplateId), eq(planTemplates.userId, userId)))
      .limit(1);

    if (!plan) throw new NotFoundException('План не найден');

    // Build history context: last 4 weeks of finished workouts, aggregated per exercise per plan day
    const history = await this.buildAdjustmentContext(userId, plan);

    const systemMessage: ChatMessage = { role: 'system', content: this.adjustPrompt };
    const userMessage: ChatMessage = { role: 'user', content: history };
    const seedMessages: ChatMessage[] = [systemMessage, userMessage];

    const [conversation] = await this.drizzle.db
      .insert(aiConversations)
      .values({
        userId,
        messages: seedMessages,
        planTemplateId,
        context: { kind: 'adjust' },
      })
      .returning();

    yield { type: 'meta', conversationId: conversation.id };

    let assistantContent = '';
    let toolCallResult: ToolCall | null = null;

    for await (const event of this.openRouter.streamCompletion({
      messages: seedMessages,
      tools: [ADJUST_PLAN_TOOL as any],
    })) {
      if (event.type === 'token') {
        assistantContent += event.content;
        yield { type: 'token', content: event.content };
      } else if (event.type === 'tool_call') {
        toolCallResult = event.toolCall;
        yield {
          type: 'tool_call',
          name: event.toolCall.function.name,
          args: JSON.parse(event.toolCall.function.arguments || '{}'),
        };
      } else if (event.type === 'done') {
        break;
      }
    }

    const assistantMessage: ChatMessage = {
      role: 'assistant',
      content: assistantContent || null,
      ...(toolCallResult ? { tool_calls: [toolCallResult] } : {}),
    };

    await this.drizzle.db
      .update(aiConversations)
      .set({ messages: [...seedMessages, assistantMessage], updatedAt: new Date() })
      .where(eq(aiConversations.id, conversation.id));

    yield { type: 'done' };
  }

  async applyAdjustments(
    conversationId: string,
    userId: string,
    indices: number[],
  ): Promise<{ planTemplateId: string; applied: number }> {
    const conversation = await this.getOwnedActiveConversation(conversationId, userId);
    if (!conversation.planTemplateId) {
      throw new ConflictException('Беседа не привязана к плану');
    }

    const messages = (conversation.messages as ChatMessage[]) ?? [];
    const lastAssistant = [...messages]
      .reverse()
      .find(
        (m) =>
          m.role === 'assistant' &&
          m.tool_calls?.some((tc) => tc.function.name === 'adjust_plan'),
      );

    if (!lastAssistant || !lastAssistant.tool_calls) {
      throw new ConflictException('AI ещё не предложил правки');
    }

    const toolCall = lastAssistant.tool_calls.find(
      (tc) => tc.function.name === 'adjust_plan',
    );
    if (!toolCall) throw new ConflictException('Нет правок для применения');

    let args: AdjustPlanArgs;
    try {
      args = JSON.parse(toolCall.function.arguments);
    } catch {
      throw new ConflictException('Не удалось разобрать правки');
    }

    const picked = indices
      .map((i) => args.adjustments?.[i])
      .filter((a): a is PlanAdjustment => !!a);

    if (picked.length === 0) {
      throw new ConflictException('Не выбрано ни одной правки');
    }

    const plan = await this.planTemplatesService.findOne(
      conversation.planTemplateId,
      userId,
    );

    const days = Array.isArray(plan.days) ? (plan.days as any[]) : [];
    let appliedCount = 0;

    const updatedDays = await Promise.all(
      days.map(async (day) => {
        const dayAdjustments = picked.filter(
          (a) => Number(a.dayNumber) === Number(day.dayNumber),
        );
        if (dayAdjustments.length === 0) return day;

        const exs = Array.isArray(day.exercises) ? [...day.exercises] : [];
        for (const adj of dayAdjustments) {
          const idx = exs.findIndex(
            (ex: any) =>
              typeof ex?.name === 'string' &&
              ex.name.trim().toLowerCase() === adj.exerciseName.trim().toLowerCase(),
          );
          if (idx === -1) continue;

          const current = exs[idx] ?? {};
          const next: Record<string, any> = { ...current };

          if (adj.action === 'replace' && adj.newExerciseName) {
            next.name = adj.newExerciseName;
            // Резолвим новое имя в реальный exerciseId — иначе тренировка из этого
            // плана создастся пустой (см. plan-templates.schedule + Start Day).
            next.exerciseId =
              (await this.exercisesService.resolveByName(userId, adj.newExerciseName)) ?? undefined;
          }
          if (adj.newSets != null) next.sets = adj.newSets;
          if (adj.newReps != null) next.reps = adj.newReps;
          if (adj.newWeightKg != null) next.weightKg = adj.newWeightKg;

          exs[idx] = next;
          appliedCount++;
        }

        return { ...day, exercises: exs };
      }),
    );

    await this.planTemplatesService.update(plan.id, userId, { days: updatedDays });

    await this.drizzle.db
      .update(aiConversations)
      .set({ status: 'finalized', updatedAt: new Date() })
      .where(eq(aiConversations.id, conversationId));

    return { planTemplateId: plan.id, applied: appliedCount };
  }

  private async buildAdjustmentContext(
    userId: string,
    plan: { id: string; name: string; days: unknown },
  ): Promise<string> {
    const days = Array.isArray(plan.days) ? (plan.days as any[]) : [];

    // List of plan exercises (name per day) for matching
    const planExerciseLines: string[] = [];
    for (const d of days) {
      if (d?.isRest) continue;
      const exs = Array.isArray(d?.exercises) ? d.exercises : [];
      for (const ex of exs) {
        const setsReps = `${ex?.sets ?? '?'}×${ex?.reps ?? '?'}`;
        const weight =
          ex?.weightKg === 0
            ? 'свой вес'
            : ex?.weightKg != null
              ? `${ex.weightKg} кг`
              : '—';
        planExerciseLines.push(
          `  - День ${d.dayNumber} (${d.name ?? d.focus ?? ''}): ${ex?.name ?? '?'} — ${setsReps}, ${weight}`,
        );
      }
    }

    // Last 4 weeks of finished workouts, grouped per exercise (by name, case-insensitive).
    // We filter by user and finishedAt NOT NULL, look at last ~6 sessions per exercise.
    const rows = await this.drizzle.db.execute(sql`
      SELECT
        ws.id as session_id,
        ws.started_at as session_date,
        e.name as exercise_name,
        wset.weight_kg,
        wset.reps,
        wset.completed
      FROM workout_sets wset
      JOIN workout_exercises we ON wset.workout_exercise_id = we.id
      JOIN workout_sessions ws ON we.session_id = ws.id
      JOIN exercises e ON we.exercise_id = e.id
      WHERE ws.user_id = ${userId}
        AND ws.finished_at IS NOT NULL
        AND ws.started_at >= NOW() - INTERVAL '28 days'
      ORDER BY e.name ASC, ws.started_at ASC, wset.created_at ASC
    `);

    type Row = {
      session_id: string;
      session_date: Date | string;
      exercise_name: string;
      weight_kg: string | number | null;
      reps: number | null;
      completed: boolean | null;
    };
    const byExercise = new Map<string, Map<string, Row[]>>();
    for (const r of rows.rows as Row[]) {
      const nameKey = (r.exercise_name || '').trim().toLowerCase();
      if (!byExercise.has(nameKey)) byExercise.set(nameKey, new Map());
      const sessions = byExercise.get(nameKey)!;
      if (!sessions.has(r.session_id)) sessions.set(r.session_id, []);
      sessions.get(r.session_id)!.push(r);
    }

    const historyLines: string[] = [];
    for (const [nameKey, sessions] of byExercise) {
      const originalName = [...sessions.values()][0]?.[0]?.exercise_name ?? nameKey;
      const sessionList = [...sessions.entries()].slice(-6); // keep last 6 sessions
      const sessionSummaries = sessionList.map(([_sid, sets]) => {
        const d = sets[0].session_date;
        const dateStr =
          d instanceof Date ? d.toISOString().slice(0, 10) : String(d).slice(0, 10);
        const setStrs = sets.map((s) => {
          const w = s.weight_kg != null ? Number(s.weight_kg) : null;
          const wLabel = w === 0 ? 'bw' : w != null ? `${w}` : '—';
          const r = s.reps != null ? s.reps : '—';
          const c = s.completed ? '✓' : '✗';
          return `${wLabel}×${r}${c}`;
        });
        return `${dateStr}: ${setStrs.join(', ')}`;
      });
      historyLines.push(`  - ${originalName}:\n    ${sessionSummaries.join('\n    ')}`);
    }

    const historyBlock =
      historyLines.length > 0
        ? historyLines.join('\n')
        : '  (нет завершённых тренировок за последние 4 недели)';

    const planBlock =
      planExerciseLines.length > 0
        ? planExerciseLines.join('\n')
        : '  (в плане нет упражнений)';

    return [
      `## Текущий план «${plan.name}»`,
      planBlock,
      '',
      '## История за последние 28 дней',
      'Формат сета: `вес×повторы✓` (✓ = выполнен, ✗ = не выполнен). `bw` = свой вес.',
      historyBlock,
      '',
      'Проанализируй историю и вызови tool `adjust_plan`.',
    ].join('\n');
  }

  private async getOwnedActiveConversation(id: string, userId: string) {
    const [conversation] = await this.drizzle.db
      .select()
      .from(aiConversations)
      .where(and(eq(aiConversations.id, id), eq(aiConversations.userId, userId)))
      .limit(1);

    if (!conversation) throw new NotFoundException('Беседа не найдена');
    if (conversation.userId !== userId) throw new ForbiddenException('Нет доступа');
    if (conversation.status !== 'active') throw new ConflictException('Беседа уже завершена');

    return conversation;
  }

  // Helper: stream to collect full assistant message (not used in current SSE flow, kept for tests)
  private async streamAndCollect(
    messages: ChatMessage[],
    _onEvent: (e: SseEvent) => SseEvent,
  ): Promise<ChatMessage> {
    let content = '';
    let toolCallResult: ToolCall | null = null;

    for await (const event of this.openRouter.streamCompletion({
      messages,
      tools: [GENERATE_PLAN_TOOL as any],
    })) {
      if (event.type === 'token') content += event.content;
      else if (event.type === 'tool_call') toolCallResult = event.toolCall;
    }

    return {
      role: 'assistant',
      content: content || null,
      ...(toolCallResult ? { tool_calls: [toolCallResult] } : {}),
    };
  }
}

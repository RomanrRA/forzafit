import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  ConflictException,
} from '@nestjs/common';
import { eq, and } from 'drizzle-orm';
import * as fs from 'fs';
import * as path from 'path';
import { DrizzleService } from '../db/db.service';
import { aiConversations, users } from '../db/schema';
import { PlanTemplatesService } from '../plan-templates/plan-templates.service';
import { OpenRouterService, ChatMessage, ToolCall } from './openrouter.service';
import { GENERATE_PLAN_TOOL, GeneratePlanArgs } from './tools/generate-plan.tool';
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

  constructor(
    private drizzle: DrizzleService,
    private openRouter: OpenRouterService,
    private planTemplatesService: PlanTemplatesService,
  ) {
    const promptPath = path.join(__dirname, 'prompts', 'plan-wizard.md');
    this.systemPrompt = fs.readFileSync(promptPath, 'utf-8').trim();
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

    const planDays = trainingDays.map((d, idx) => ({
      dayNumber: canonical[idx] ?? d.dayNumber,
      focus: d.name,
      exercises: (d.exercises ?? []).map((ex) => ({
        exerciseId: ex.exerciseId,
        name: ex.exerciseName,
        sets: ex.targetSets,
        reps: ex.targetReps,
        weightKg: ex.weightKg,
        note: ex.notes ?? '',
        rest: '60 сек',
      })),
    }));

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

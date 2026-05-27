import { BadGatewayException, Injectable } from '@nestjs/common';
import {
  OpenRouterService,
  OpenRouterTool,
  ChatMessage,
} from '../ai/openrouter.service';

const GOAL_MODEL = 'anthropic/claude-sonnet-4.6';

export type BodyGoalIntent = 'lose' | 'gain' | 'maintain' | 'strength';

export interface AiGoalContext {
  gender: 'male' | 'female' | null;
  ageYears: number | null;
  heightCm: number | null;
  intents: BodyGoalIntent[];
  targetMonths: number | null;
  currentMeasurement: {
    weightKg: number | null;
    bodyFatPct: number | null;
    chestCm: number | null;
    waistCm: number | null;
    hipsCm: number | null;
    armCm: number | null;
    thighCm: number | null;
    calfCm: number | null;
    forearmCm: number | null;
    neckCm: number | null;
  } | null;
}

export interface AiGoalSuggestion {
  weightKg: number | null;
  bodyFatPct: number | null;
  chestCm: number | null;
  waistCm: number | null;
  hipsCm: number | null;
  armCm: number | null;
  thighCm: number | null;
  targetDate: string;
  rationale: string;
}

@Injectable()
export class BodyGoalAiService {
  constructor(private openRouter: OpenRouterService) {}

  async generate(ctx: AiGoalContext): Promise<AiGoalSuggestion> {
    const tool: OpenRouterTool = {
      type: 'function',
      function: {
        name: 'suggest_body_goal',
        description:
          'Подобрать целевые показатели тела (вес, % жира, обхваты) и срок исходя из текущего состояния и намерения.',
        parameters: this.buildToolSchema(),
      },
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
      { role: 'user', content: this.buildUserPrompt(ctx) },
    ];

    const response = await this.openRouter.completion({
      model: GOAL_MODEL,
      messages,
      tools: [tool],
      toolChoice: {
        type: 'function',
        function: { name: 'suggest_body_goal' },
      },
      temperature: 0.4,
      maxTokens: 800,
    });

    const toolCall = response.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall || toolCall.function.name !== 'suggest_body_goal') {
      throw new BadGatewayException(
        'AI не вернул tool_call suggest_body_goal',
      );
    }

    let parsed: Record<string, unknown>;
    try {
      parsed = JSON.parse(toolCall.function.arguments);
    } catch {
      throw new BadGatewayException('AI вернул невалидный JSON в tool_call');
    }

    return this.normalize(parsed, ctx);
  }

  private buildSystemPrompt(): string {
    return [
      'Ты — AI-тренер ForzaFit. Подбираешь реалистичную и здоровую цель по составу тела.',
      '',
      'Правила:',
      '- BMI 18.5-25 = здоровая зона. НЕ предлагай цели ниже 18.5 BMI.',
      '- % жира: мужчины 10-20%, женщины 18-28% — здоровая норма. Атлетичный низ: 8% М / 16% Ж — пограничный, не уходи ниже.',
      '- Темп: похудение 0.5-0.7 кг/неделю, набор массы 0.2-0.4 кг/неделю максимум.',
      '- Срок (targetDate) рассчитывай от веса: если юзер не указал targetMonths — посчитай реалистичный по дельте веса.',
      '- Если намерение "maintain" — оставь текущий вес и слегка улучши композицию (% жира -2-3%, обхваты талии -1-2 см).',
      '- Обхваты талии всегда уменьшаются при похудении и почти не растут при наборе. Грудь/плечо/бедро растут при наборе массы.',
      '- rationale — 1-2 фразы на русском почему именно такие цифры. Без markdown, без воды.',
      '- Если каких-то текущих замеров нет — соответствующие целевые поля оставь null. Не выдумывай.',
      '- targetDate в формате YYYY-MM-DD, в будущем минимум 2 месяца от сегодня, максимум 12 месяцев.',
    ].join('\n');
  }

  private buildUserPrompt(ctx: AiGoalContext): string {
    const today = new Date().toISOString().slice(0, 10);
    const lines: string[] = [`Сегодня: ${today}`, ''];
    lines.push('Профиль:');
    lines.push(`- пол: ${ctx.gender ?? 'не указан'}`);
    lines.push(`- возраст: ${ctx.ageYears ?? 'не указан'}`);
    lines.push(`- рост: ${ctx.heightCm ?? 'не указан'} см`);
    lines.push('');
    if (ctx.intents.length > 1) {
      lines.push('Намерения (комбинировать):');
      for (const it of ctx.intents) lines.push(`- ${this.intentLabel(it)}`);
    } else if (ctx.intents.length === 1) {
      lines.push(`Намерение: ${this.intentLabel(ctx.intents[0])}`);
    }
    if (ctx.targetMonths != null) {
      lines.push(`Желаемый срок: ${ctx.targetMonths} мес.`);
    }
    lines.push('');
    lines.push('Текущий замер:');
    const m = ctx.currentMeasurement;
    if (!m) {
      lines.push('- замеров нет — опирайся на пол/рост/возраст и здоровую норму.');
    } else {
      lines.push(`- вес: ${m.weightKg ?? '—'} кг`);
      lines.push(`- % жира: ${m.bodyFatPct ?? '—'}`);
      lines.push(`- грудь: ${m.chestCm ?? '—'} см`);
      lines.push(`- талия: ${m.waistCm ?? '—'} см`);
      lines.push(`- бёдра: ${m.hipsCm ?? '—'} см`);
      lines.push(`- плечо: ${m.armCm ?? '—'} см`);
      lines.push(`- бедро: ${m.thighCm ?? '—'} см`);
      lines.push(`- икра: ${m.calfCm ?? '—'} см`);
      lines.push(`- предплечье: ${m.forearmCm ?? '—'} см`);
      lines.push(`- шея: ${m.neckCm ?? '—'} см`);
    }
    return lines.join('\n');
  }

  private intentLabel(intent: BodyGoalIntent): string {
    if (intent === 'lose') return 'сбросить вес и/или жир';
    if (intent === 'gain') return 'набрать мышечную массу';
    if (intent === 'strength')
      return 'нарастить силу — вес близко к текущему, лёгкий прирост обхватов спины/рук/ног';
    return 'поддерживать форму, улучшить композицию';
  }

  private buildToolSchema(): Record<string, unknown> {
    return {
      type: 'object',
      required: ['targetDate', 'rationale'],
      properties: {
        weightKg: { type: ['number', 'null'], minimum: 30, maximum: 250 },
        bodyFatPct: { type: ['number', 'null'], minimum: 5, maximum: 50 },
        chestCm: { type: ['number', 'null'], minimum: 50, maximum: 200 },
        waistCm: { type: ['number', 'null'], minimum: 40, maximum: 200 },
        hipsCm: { type: ['number', 'null'], minimum: 50, maximum: 200 },
        armCm: { type: ['number', 'null'], minimum: 15, maximum: 70 },
        thighCm: { type: ['number', 'null'], minimum: 30, maximum: 100 },
        targetDate: {
          type: 'string',
          pattern: '^\\d{4}-\\d{2}-\\d{2}$',
          description: 'YYYY-MM-DD, в будущем',
        },
        rationale: { type: 'string', minLength: 10, maxLength: 400 },
      },
    };
  }

  private normalize(
    raw: Record<string, unknown>,
    ctx: AiGoalContext,
  ): AiGoalSuggestion {
    const num = (v: unknown): number | null =>
      typeof v === 'number' && Number.isFinite(v) ? v : null;
    const str = typeof raw.rationale === 'string' ? raw.rationale.trim() : '';
    const date = typeof raw.targetDate === 'string' ? raw.targetDate : '';

    const targetDate = /^\d{4}-\d{2}-\d{2}$/.test(date)
      ? date
      : this.fallbackDate();

    if (!str) {
      throw new BadGatewayException('AI не дал rationale');
    }

    // Если намерение "сбросить" входит в список — игнорируем рост груди/плеча от AI
    // (юзер на дефиците, не должен ждать +5 см к плечу).
    const m = ctx.currentMeasurement;
    const isLose = ctx.intents.includes('lose');
    const clampGrow = (target: number | null, current: number | null) =>
      isLose && target != null && current != null && target > current
        ? current
        : target;

    return {
      weightKg: num(raw.weightKg),
      bodyFatPct: num(raw.bodyFatPct),
      chestCm: clampGrow(num(raw.chestCm), m?.chestCm ?? null),
      waistCm: num(raw.waistCm),
      hipsCm: num(raw.hipsCm),
      armCm: clampGrow(num(raw.armCm), m?.armCm ?? null),
      thighCm: clampGrow(num(raw.thighCm), m?.thighCm ?? null),
      targetDate,
      rationale: str.slice(0, 400),
    };
  }

  private fallbackDate(): string {
    const d = new Date();
    d.setMonth(d.getMonth() + 3);
    return d.toISOString().slice(0, 10);
  }
}

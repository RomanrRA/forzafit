import { BadGatewayException, Injectable } from '@nestjs/common';
import {
  OpenRouterService,
  OpenRouterTool,
  ChatMessage,
} from '../ai/openrouter.service';
import { AdviceContext, AdviceDraft } from './workout-advice.types';

const ADVICE_MODEL = 'anthropic/claude-sonnet-4.6';

@Injectable()
export class WorkoutAdviceAiService {
  constructor(private openRouter: OpenRouterService) {}

  async generate(context: AdviceContext): Promise<AdviceDraft[]> {
    if (context.exercises.length === 0) return [];

    const tool: OpenRouterTool = {
      type: 'function',
      function: {
        name: 'suggest_workout_advice',
        description:
          'Подобрать рабочий вес и количество повторов на каждое упражнение в текущей тренировке. Опирайся на последние подходы и RPE.',
        parameters: this.buildToolSchema(context),
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
      {
        role: 'user',
        content: this.buildUserPrompt(context),
      },
    ];

    const response = await this.openRouter.completion({
      model: ADVICE_MODEL,
      messages,
      tools: [tool],
      toolChoice: {
        type: 'function',
        function: { name: 'suggest_workout_advice' },
      },
      temperature: 0.4,
      maxTokens: 1500,
    });

    const toolCall = response.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall || toolCall.function.name !== 'suggest_workout_advice') {
      throw new BadGatewayException('AI не вернул tool_call suggest_workout_advice');
    }

    let parsed: { advice?: unknown };
    try {
      parsed = JSON.parse(toolCall.function.arguments);
    } catch {
      throw new BadGatewayException('AI вернул невалидный JSON в tool_call');
    }

    return this.normalizeDrafts(parsed.advice, context);
  }

  private buildSystemPrompt(): string {
    return [
      'Ты — AI-тренер ForzaFit. Подсказываешь рабочий вес и количество повторов на каждое упражнение текущей тренировки.',
      '',
      'Правила:',
      '- На каждое упражнение даёшь ОДНО предложение (вес × повторы × подходы).',
      '- Если RPE прошлой тренировки 8-10 (тяжело) — снижай вес на 5-10% ИЛИ уменьшай повторы на 1-2.',
      '- Если RPE 5-6 (легко) — поднимай вес на 2.5-5% ИЛИ +1 повтор.',
      '- Если RPE 7 — оставь как было (рабочий диапазон).',
      '- Если истории нет — предложи разумный starting weight исходя из веса/пола юзера, и пометь reason как "первый раз".',
      '- reason — ОДНА фраза 5-12 слов, на русском. Без markdown.',
      '- Если упражнение со своим весом (отжимания, подтягивания) — suggestedWeightKg = null, ставь только повторы.',
      '- Веса округляй до ближайших 2.5 кг (стандарт штанг/гантелей).',
    ].join('\n');
  }

  private buildUserPrompt(ctx: AdviceContext): string {
    const lines: string[] = [];
    lines.push('Профиль:');
    lines.push(`- пол: ${ctx.userProfile.gender ?? 'не указан'}`);
    lines.push(`- вес: ${ctx.userProfile.weightKg ?? 'не указан'} кг`);
    lines.push(`- цель: ${ctx.userProfile.goal ?? 'не указана'}`);
    lines.push('');
    lines.push('Упражнения в тренировке:');
    for (const ex of ctx.exercises) {
      lines.push(`\n[${ex.exerciseId}] ${ex.exerciseName}`);
      if (ex.lastSets.length === 0) {
        lines.push('  история: нет предыдущих подходов');
      } else {
        lines.push(`  последняя дата: ${ex.lastSessionDate ?? '?'}`);
        lines.push(`  последние подходы:`);
        for (const s of ex.lastSets) {
          const w = s.weightKg != null ? `${s.weightKg}кг` : '—';
          const r = s.reps != null ? `${s.reps}×` : '?';
          const rpe = s.rpe != null ? `RPE ${s.rpe}` : '';
          lines.push(`    - ${r} ${w} ${rpe}`);
        }
        if (ex.avgRpe != null) lines.push(`  средний RPE: ${ex.avgRpe}`);
        if (ex.prWeightKg != null) lines.push(`  личный рекорд: ${ex.prWeightKg} кг`);
      }
    }
    return lines.join('\n');
  }

  private buildToolSchema(ctx: AdviceContext): Record<string, unknown> {
    return {
      type: 'object',
      properties: {
        advice: {
          type: 'array',
          minItems: ctx.exercises.length,
          maxItems: ctx.exercises.length,
          items: {
            type: 'object',
            required: ['exerciseId', 'suggestedSets', 'reason'],
            properties: {
              exerciseId: {
                type: 'string',
                enum: ctx.exercises.map((e) => e.exerciseId),
              },
              suggestedWeightKg: {
                type: ['number', 'null'],
                description:
                  'Рабочий вес в кг. null если упражнение без отягощения.',
              },
              suggestedReps: {
                type: ['integer', 'null'],
                minimum: 1,
                maximum: 50,
                description: 'Повторов в одном подходе.',
              },
              suggestedSets: {
                type: 'integer',
                minimum: 1,
                maximum: 10,
                description: 'Количество рабочих подходов.',
              },
              reason: {
                type: 'string',
                minLength: 5,
                maxLength: 120,
                description: 'Одна фраза почему именно так.',
              },
            },
          },
        },
      },
      required: ['advice'],
    };
  }

  private normalizeDrafts(raw: unknown, ctx: AdviceContext): AdviceDraft[] {
    if (!Array.isArray(raw)) return [];
    const out: AdviceDraft[] = [];
    const known = new Set(ctx.exercises.map((e) => e.exerciseId));
    for (const item of raw) {
      const r = item as {
        exerciseId?: unknown;
        suggestedWeightKg?: unknown;
        suggestedReps?: unknown;
        suggestedSets?: unknown;
        reason?: unknown;
      };
      if (typeof r.exerciseId !== 'string' || !known.has(r.exerciseId)) continue;
      if (typeof r.reason !== 'string' || r.reason.trim().length < 3) continue;
      out.push({
        exerciseId: r.exerciseId,
        suggestedWeightKg:
          typeof r.suggestedWeightKg === 'number' ? r.suggestedWeightKg : null,
        suggestedReps:
          typeof r.suggestedReps === 'number' ? Math.round(r.suggestedReps) : null,
        suggestedSets:
          typeof r.suggestedSets === 'number' ? Math.round(r.suggestedSets) : null,
        reason: r.reason.trim().slice(0, 200),
      });
    }
    return out;
  }
}

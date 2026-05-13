// OpenAI function-calling tool schema for AI plan generation.
// The parameters shape mirrors plan_templates.days JSONB structure.

export const GENERATE_PLAN_TOOL = {
  type: 'function' as const,
  function: {
    name: 'generate_plan',
    description:
      'Сгенерировать структурированный тренировочный план на основе ответов пользователя и сохранить его как шаблон.',
    parameters: {
      type: 'object',
      required: ['name', 'weeksDuration', 'daysPerWeek', 'days'],
      properties: {
        name: {
          type: 'string',
          description: 'Название плана, например «Программа на массу 3×в неделю»',
        },
        description: {
          type: 'string',
          description: 'Краткое описание плана (1–3 предложения)',
        },
        goal: {
          type: 'string',
          description: 'Цель плана: масса, сила, похудение или тонус',
        },
        difficulty: {
          type: 'string',
          enum: ['beginner', 'intermediate', 'advanced'],
          description: 'Уровень сложности',
        },
        type: {
          type: 'string',
          enum: ['fullbody', 'split', 'cardio', 'crossfit', 'swimming', 'hybrid', 'beginner'],
          description: 'Тип программы',
        },
        weeksDuration: {
          type: 'integer',
          minimum: 1,
          maximum: 52,
          description: 'Продолжительность плана в неделях',
        },
        daysPerWeek: {
          type: 'integer',
          minimum: 1,
          maximum: 7,
          description: 'Количество тренировочных дней в неделю',
        },
        days: {
          type: 'array',
          description: 'Список тренировочных дней в рамках недельного цикла',
          items: {
            type: 'object',
            required: ['dayNumber', 'name'],
            properties: {
              dayNumber: {
                type: 'integer',
                minimum: 1,
                maximum: 7,
                description: '1=Пн, 2=Вт, …, 7=Вс',
              },
              name: {
                type: 'string',
                description: 'Название дня, например «День А — Грудь/Трицепс»',
              },
              isRest: {
                type: 'boolean',
                description: 'true если день отдыха',
              },
              exercises: {
                type: 'array',
                description: 'Упражнения в этом тренировочном дне',
                items: {
                  type: 'object',
                  required: ['exerciseName', 'targetSets', 'targetReps'],
                  properties: {
                    exerciseName: {
                      type: 'string',
                      description: 'Название упражнения',
                    },
                    exerciseId: {
                      type: 'string',
                      description: 'UUID упражнения из базы (если известен)',
                    },
                    targetSets: {
                      type: 'integer',
                      minimum: 1,
                      description: 'Количество подходов',
                    },
                    targetReps: {
                      type: 'string',
                      description: 'Диапазон повторений, например «8-12» или «5»',
                    },
                    weightKg: {
                      type: 'number',
                      description:
                        'Рекомендуемый вес в кг. Для упражнений со своим весом (подтягивания, отжимания, планка, приседания без веса) — ставь 0 (специальный маркер «свой вес»). Иначе не оставляй 0 и не ставь null — укажи оценочный стартовый вес.',
                    },
                    notes: {
                      type: 'string',
                      description: 'Дополнительные заметки по технике или темпу',
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
  },
} as const;

export type GeneratePlanArgs = {
  name: string;
  description?: string;
  goal?: string;
  difficulty?: 'beginner' | 'intermediate' | 'advanced';
  type?: 'fullbody' | 'split' | 'cardio' | 'crossfit' | 'swimming' | 'hybrid' | 'beginner';
  weeksDuration: number;
  daysPerWeek: number;
  days: Array<{
    dayNumber: number;
    name: string;
    isRest?: boolean;
    exercises?: Array<{
      exerciseName: string;
      exerciseId?: string;
      targetSets: number;
      targetReps: string;
      weightKg?: number;
      notes?: string;
    }>;
  }>;
};

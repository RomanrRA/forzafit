// OpenAI function-calling tool schema для подбора целевых показателей тела.
// Используется в связке с generate_plan: сначала AI подбирает цель,
// потом план под эту цель.

export const SUGGEST_BODY_GOAL_TOOL = {
  type: 'function' as const,
  function: {
    name: 'suggest_body_goal',
    description:
      'Подобрать целевые показатели тела (вес, % жира, обхваты) и срок исходя из текущего состояния и намерения пользователя.',
    parameters: {
      type: 'object',
      required: ['targetDate', 'rationale'],
      properties: {
        weightKg: {
          type: ['number', 'null'],
          minimum: 30,
          maximum: 250,
          description: 'Целевой вес в кг',
        },
        bodyFatPct: {
          type: ['number', 'null'],
          minimum: 5,
          maximum: 50,
          description: 'Целевой % жира',
        },
        chestCm: {
          type: ['number', 'null'],
          minimum: 50,
          maximum: 200,
        },
        waistCm: {
          type: ['number', 'null'],
          minimum: 40,
          maximum: 200,
        },
        hipsCm: {
          type: ['number', 'null'],
          minimum: 50,
          maximum: 200,
        },
        armCm: {
          type: ['number', 'null'],
          minimum: 15,
          maximum: 70,
        },
        thighCm: {
          type: ['number', 'null'],
          minimum: 30,
          maximum: 100,
        },
        targetDate: {
          type: 'string',
          pattern: '^\\d{4}-\\d{2}-\\d{2}$',
          description: 'YYYY-MM-DD, в будущем минимум 2 месяца, максимум 12',
        },
        rationale: {
          type: 'string',
          minLength: 10,
          maxLength: 400,
          description: '1-2 фразы на русском: почему именно такие цифры',
        },
      },
    },
  },
} as const;

export type SuggestBodyGoalArgs = {
  weightKg?: number | null;
  bodyFatPct?: number | null;
  chestCm?: number | null;
  waistCm?: number | null;
  hipsCm?: number | null;
  armCm?: number | null;
  thighCm?: number | null;
  targetDate: string;
  rationale: string;
};

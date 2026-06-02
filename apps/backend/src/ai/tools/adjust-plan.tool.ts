// OpenAI function-calling tool for AI plan adjustment based on workout history.

export const ADJUST_PLAN_TOOL = {
  type: 'function' as const,
  function: {
    name: 'adjust_plan',
    description:
      'Предложить точечные правки текущего плана на основе истории тренировок и пожеланий пользователя. Возвращай ТОЛЬКО упражнения, которые требуют изменений (update/replace), плюс новые упражнения, которые нужно добавить (add). Если упражнение идёт нормально и его не просили трогать — не включай его в массив adjustments.',
    parameters: {
      type: 'object',
      required: ['summary', 'adjustments'],
      properties: {
        summary: {
          type: 'string',
          description: 'Краткое резюме анализа (1–3 предложения на русском). Что заметил в истории, что меняем и почему.',
        },
        adjustments: {
          type: 'array',
          description: 'Список правок. Пустой массив = менять ничего не надо.',
          items: {
            type: 'object',
            required: ['dayNumber', 'exerciseName', 'action', 'reason'],
            properties: {
              dayNumber: {
                type: 'integer',
                minimum: 1,
                maximum: 7,
                description: 'День плана (1=Пн…7=Вс), в котором находится упражнение',
              },
              exerciseName: {
                type: 'string',
                description:
                  'Для update/replace — точное название упражнения в ТЕКУЩЕМ плане (для матчинга). Для add — название НОВОГО упражнения, которое нужно добавить в этот день.',
              },
              action: {
                type: 'string',
                enum: ['update', 'replace', 'add'],
                description:
                  'update — изменить параметры; replace — заменить на другое упражнение; add — добавить новое упражнение в день (exerciseName = название нового упражнения).',
              },
              newExerciseName: {
                type: 'string',
                description: 'Только при action=replace — на что заменить',
              },
              newSets: {
                type: 'integer',
                minimum: 1,
                description: 'Новое количество подходов. Оставь пустым, если не меняем.',
              },
              newReps: {
                type: 'string',
                description: 'Новые повторы, например «8-10» или «6». Оставь пустым, если не меняем.',
              },
              newWeightKg: {
                type: 'number',
                description: 'Новый рабочий вес в кг. Для упражнений со своим весом — 0. Оставь пустым, если не меняем.',
              },
              reason: {
                type: 'string',
                description: 'Короткое (1 строка) обоснование на русском. Например: «3 тренировки подряд 75×8 — пора +2.5 кг».',
              },
            },
          },
        },
      },
    },
  },
} as const;

export type AdjustmentAction = 'update' | 'replace' | 'add';

export type PlanAdjustment = {
  dayNumber: number;
  exerciseName: string;
  action: AdjustmentAction;
  newExerciseName?: string;
  newSets?: number;
  newReps?: string;
  newWeightKg?: number;
  reason: string;
};

export type AdjustPlanArgs = {
  summary: string;
  adjustments: PlanAdjustment[];
};

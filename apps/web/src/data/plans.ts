export interface PlanExercise {
  exerciseId?: string
  name: string       // совпадает с именем в БД
  sets: number
  reps: string       // "8-12", "15", "30 сек"
  rest: string       // "60 сек"
  note?: string
  weightKg?: number
}

export interface PlanDay {
  dayNumber: number
  name: string
  focus: string      // Грудь, Кардио, Отдых…
  isRest: boolean
  exercises: PlanExercise[]
}

export interface WorkoutPlan {
  id: string
  name: string
  description: string
  goal: string
  daysPerWeek: number
  duration: string   // "4 недели"
  difficulty: 'beginner' | 'intermediate' | 'advanced'
  type: 'cardio' | 'fullbody' | 'split' | 'beginner'
  days: PlanDay[]
}

export const WORKOUT_PLANS: WorkoutPlan[] = [
  // ─── 1. Начинающий фул-боди 3×/нед ───────────────────────────────────────
  {
    id: 'beginner-fullbody',
    name: 'Начинающий — Фул Боди',
    description: 'Идеальный старт. Три тренировки в неделю на всё тело с базовыми движениями.',
    goal: 'Освоить технику, набрать форму',
    daysPerWeek: 3,
    duration: '6 недель',
    difficulty: 'beginner',
    type: 'beginner',
    days: [
      {
        dayNumber: 1, name: 'День A — Всё тело', focus: 'Всё тело', isRest: false,
        exercises: [
          { name: 'Приседания с гантелями', sets: 3, reps: '12', rest: '90 сек' },
          { name: 'Жим гантелей лёжа', sets: 3, reps: '12', rest: '90 сек' },
          { name: 'Тяга гантели в наклоне', sets: 3, reps: '12', rest: '90 сек' },
          { name: 'Жим гантелей сидя', sets: 3, reps: '12', rest: '60 сек' },
          { name: 'Подъём гантелей на бицепс', sets: 3, reps: '12', rest: '60 сек' },
          { name: 'Планка', sets: 3, reps: '30 сек', rest: '45 сек' },
        ],
      },
      { dayNumber: 2, name: 'День 2 — Отдых', focus: 'Отдых', isRest: true, exercises: [] },
      {
        dayNumber: 3, name: 'День B — Всё тело', focus: 'Всё тело', isRest: false,
        exercises: [
          { name: 'Выпады с гантелями', sets: 3, reps: '10 каждой', rest: '90 сек' },
          { name: 'Отжимания', sets: 3, reps: '10-15', rest: '90 сек' },
          { name: 'Тяга верхнего блока к груди', sets: 3, reps: '12', rest: '90 сек' },
          { name: 'Разводка гантелей стоя', sets: 3, reps: '12', rest: '60 сек' },
          { name: 'Молотки', sets: 3, reps: '12', rest: '60 сек' },
          { name: 'Скручивания', sets: 3, reps: '15', rest: '45 сек' },
        ],
      },
      { dayNumber: 4, name: 'День 4 — Отдых', focus: 'Отдых', isRest: true, exercises: [] },
      {
        dayNumber: 5, name: 'День A — Всё тело', focus: 'Всё тело', isRest: false,
        exercises: [
          { name: 'Приседания с гантелями', sets: 3, reps: '12', rest: '90 сек' },
          { name: 'Жим гантелей лёжа', sets: 3, reps: '12', rest: '90 сек' },
          { name: 'Тяга гантели в наклоне', sets: 3, reps: '12', rest: '90 сек' },
          { name: 'Жим гантелей сидя', sets: 3, reps: '12', rest: '60 сек' },
          { name: 'Подъём гантелей на бицепс', sets: 3, reps: '12', rest: '60 сек' },
          { name: 'Планка', sets: 3, reps: '30 сек', rest: '45 сек' },
        ],
      },
      { dayNumber: 6, name: 'День 6 — Отдых', focus: 'Отдых', isRest: true, exercises: [] },
      { dayNumber: 7, name: 'День 7 — Отдых', focus: 'Отдых', isRest: true, exercises: [] },
    ],
  },

  // ─── 2. Фул Боди 3×/нед (средний) ───────────────────────────────────────
  {
    id: 'fullbody-3',
    name: 'Фул Боди — 3 дня в неделю',
    description: 'Три интенсивных тренировки на всё тело. Базовые движения + изоляция.',
    goal: 'Сила и мышечная масса',
    daysPerWeek: 3,
    duration: '8 недель',
    difficulty: 'intermediate',
    type: 'fullbody',
    days: [
      {
        dayNumber: 1, name: 'День A — Акцент грудь/спина', focus: 'Грудь + Спина', isRest: false,
        exercises: [
          { name: 'Приседания со штангой', sets: 4, reps: '6-8', rest: '2 мин' },
          { name: 'Жим штанги лёжа', sets: 4, reps: '6-8', rest: '2 мин' },
          { name: 'Тяга штанги в наклоне', sets: 4, reps: '6-8', rest: '2 мин' },
          { name: 'Жим гантелей сидя', sets: 3, reps: '10-12', rest: '90 сек' },
          { name: 'Подъём штанги на бицепс', sets: 3, reps: '10-12', rest: '60 сек' },
          { name: 'Разгибание на блоке', sets: 3, reps: '10-12', rest: '60 сек' },
        ],
      },
      { dayNumber: 2, name: 'День 2 — Отдых', focus: 'Отдых', isRest: true, exercises: [] },
      {
        dayNumber: 3, name: 'День B — Акцент ноги/плечи', focus: 'Ноги + Плечи', isRest: false,
        exercises: [
          { name: 'Становая тяга', sets: 4, reps: '5', rest: '3 мин' },
          { name: 'Жим штанги стоя', sets: 4, reps: '6-8', rest: '2 мин' },
          { name: 'Румынская тяга', sets: 3, reps: '10-12', rest: '90 сек' },
          { name: 'Разводка гантелей стоя', sets: 3, reps: '12-15', rest: '60 сек' },
          { name: 'Подъём на носки стоя', sets: 4, reps: '15-20', rest: '60 сек' },
          { name: 'Подъём ног лёжа', sets: 3, reps: '15', rest: '45 сек' },
        ],
      },
      { dayNumber: 4, name: 'День 4 — Отдых', focus: 'Отдых', isRest: true, exercises: [] },
      {
        dayNumber: 5, name: 'День C — Всё тело (объём)', focus: 'Всё тело', isRest: false,
        exercises: [
          { name: 'Подтягивания', sets: 4, reps: 'макс', rest: '2 мин' },
          { name: 'Жим гантелей лёжа', sets: 4, reps: '10-12', rest: '90 сек' },
          { name: 'Жим ногами', sets: 4, reps: '12-15', rest: '90 сек' },
          { name: 'Тяга нижнего блока сидя', sets: 3, reps: '12', rest: '90 сек' },
          { name: 'Жим Арнольда', sets: 3, reps: '10-12', rest: '60 сек' },
          { name: 'Скручивания', sets: 3, reps: '20', rest: '45 сек' },
        ],
      },
      { dayNumber: 6, name: 'День 6 — Отдых', focus: 'Отдых', isRest: true, exercises: [] },
      { dayNumber: 7, name: 'День 7 — Отдых', focus: 'Отдых', isRest: true, exercises: [] },
    ],
  },

  // ─── 3. Сплит 5×/нед ─────────────────────────────────────────────────────
  {
    id: 'split-5',
    name: 'Сплит — 5 дней в неделю',
    description: 'Классический сплит по группам мышц. Каждая группа получает максимум нагрузки раз в неделю.',
    goal: 'Максимальная гипертрофия',
    daysPerWeek: 5,
    duration: '8 недель',
    difficulty: 'intermediate',
    type: 'split',
    days: [
      {
        dayNumber: 1, name: 'День 1 — Грудь', focus: 'Грудь', isRest: false,
        exercises: [
          { name: 'Жим штанги лёжа', sets: 4, reps: '6-8', rest: '2 мин' },
          { name: 'Жим штанги на наклонной скамье', sets: 4, reps: '8-10', rest: '90 сек' },
          { name: 'Жим гантелей лёжа', sets: 3, reps: '10-12', rest: '90 сек' },
          { name: 'Разводка гантелей лёжа', sets: 3, reps: '12-15', rest: '60 сек' },
          { name: 'Кроссовер на блоках', sets: 3, reps: '15', rest: '60 сек' },
          { name: 'Отжимания', sets: 3, reps: 'макс', rest: '60 сек' },
        ],
      },
      {
        dayNumber: 2, name: 'День 2 — Спина', focus: 'Спина', isRest: false,
        exercises: [
          { name: 'Становая тяга', sets: 4, reps: '5', rest: '3 мин' },
          { name: 'Подтягивания', sets: 4, reps: 'макс', rest: '2 мин' },
          { name: 'Тяга штанги в наклоне', sets: 4, reps: '6-8', rest: '90 сек' },
          { name: 'Тяга верхнего блока к груди', sets: 3, reps: '10-12', rest: '90 сек' },
          { name: 'Тяга нижнего блока сидя', sets: 3, reps: '12', rest: '60 сек' },
          { name: 'Шраги со штангой', sets: 3, reps: '15', rest: '60 сек' },
        ],
      },
      {
        dayNumber: 3, name: 'День 3 — Ноги', focus: 'Ноги', isRest: false,
        exercises: [
          { name: 'Приседания со штангой', sets: 5, reps: '5', rest: '3 мин' },
          { name: 'Жим ногами', sets: 4, reps: '10-12', rest: '2 мин' },
          { name: 'Румынская тяга', sets: 4, reps: '10-12', rest: '90 сек' },
          { name: 'Болгарские выпады', sets: 3, reps: '10 каждой', rest: '90 сек' },
          { name: 'Сгибание ног в тренажёре', sets: 3, reps: '12-15', rest: '60 сек' },
          { name: 'Подъём на носки стоя', sets: 4, reps: '20', rest: '60 сек' },
        ],
      },
      {
        dayNumber: 4, name: 'День 4 — Плечи', focus: 'Плечи', isRest: false,
        exercises: [
          { name: 'Жим штанги стоя', sets: 4, reps: '6-8', rest: '2 мин' },
          { name: 'Жим гантелей сидя', sets: 4, reps: '8-10', rest: '90 сек' },
          { name: 'Разводка гантелей стоя', sets: 4, reps: '12-15', rest: '60 сек' },
          { name: 'Тяга штанги к подбородку', sets: 3, reps: '12', rest: '60 сек' },
          { name: 'Подъём гантелей перед собой', sets: 3, reps: '12', rest: '60 сек' },
          { name: 'Обратная разводка в тренажёре', sets: 3, reps: '15', rest: '60 сек' },
        ],
      },
      {
        dayNumber: 5, name: 'День 5 — Руки', focus: 'Бицепс + Трицепс', isRest: false,
        exercises: [
          { name: 'Подъём штанги на бицепс', sets: 4, reps: '8-10', rest: '90 сек' },
          { name: 'Жим узким хватом', sets: 4, reps: '8-10', rest: '90 сек' },
          { name: 'Подъём гантелей на бицепс', sets: 3, reps: '10-12', rest: '60 сек' },
          { name: 'Французский жим лёжа', sets: 3, reps: '10-12', rest: '60 сек' },
          { name: 'Молотки', sets: 3, reps: '12', rest: '60 сек' },
          { name: 'Разгибание на блоке', sets: 3, reps: '12-15', rest: '60 сек' },
          { name: 'Скручивания', sets: 3, reps: '20', rest: '45 сек' },
        ],
      },
      { dayNumber: 6, name: 'День 6 — Отдых', focus: 'Отдых', isRest: true, exercises: [] },
      { dayNumber: 7, name: 'День 7 — Отдых', focus: 'Отдых', isRest: true, exercises: [] },
    ],
  },

  // ─── 4. Кардио + Сила 3×/нед ─────────────────────────────────────────────
  {
    id: 'cardio-strength',
    name: 'Кардио + Сила',
    description: 'Сочетание силовых тренировок и кардионагрузки для похудения и выносливости.',
    goal: 'Жиросжигание и выносливость',
    daysPerWeek: 4,
    duration: '6 недель',
    difficulty: 'intermediate',
    type: 'cardio',
    days: [
      {
        dayNumber: 1, name: 'День 1 — Силовая (верх)', focus: 'Грудь + Спина + Руки', isRest: false,
        exercises: [
          { name: 'Жим гантелей лёжа', sets: 3, reps: '12', rest: '90 сек' },
          { name: 'Тяга верхнего блока к груди', sets: 3, reps: '12', rest: '90 сек' },
          { name: 'Отжимания на брусьях', sets: 3, reps: '10-12', rest: '90 сек' },
          { name: 'Тяга нижнего блока сидя', sets: 3, reps: '12', rest: '60 сек' },
          { name: 'Подъём гантелей на бицепс', sets: 3, reps: '12', rest: '60 сек' },
          { name: 'Разгибание на блоке', sets: 3, reps: '12', rest: '60 сек' },
        ],
      },
      {
        dayNumber: 2, name: 'День 2 — Кардио', focus: 'Кардио', isRest: false,
        exercises: [
          { name: 'Бег на беговой дорожке', sets: 1, reps: '30 мин', rest: '-', note: 'Умеренный темп, пульс 120-140' },
          { name: 'Прыжки со скакалкой', sets: 5, reps: '2 мин', rest: '30 сек' },
          { name: 'Берпи', sets: 3, reps: '10', rest: '60 сек' },
        ],
      },
      { dayNumber: 3, name: 'День 3 — Отдых', focus: 'Отдых', isRest: true, exercises: [] },
      {
        dayNumber: 4, name: 'День 4 — Силовая (низ)', focus: 'Ноги + Ягодицы', isRest: false,
        exercises: [
          { name: 'Приседания со штангой', sets: 4, reps: '10-12', rest: '90 сек' },
          { name: 'Ягодичный мостик со штангой', sets: 4, reps: '12-15', rest: '90 сек' },
          { name: 'Выпады с гантелями', sets: 3, reps: '12 каждой', rest: '60 сек' },
          { name: 'Сгибание ног в тренажёре', sets: 3, reps: '15', rest: '60 сек' },
          { name: 'Подъём на носки стоя', sets: 4, reps: '20', rest: '45 сек' },
          { name: 'Планка', sets: 3, reps: '45 сек', rest: '30 сек' },
        ],
      },
      {
        dayNumber: 5, name: 'День 5 — Кардио HIIT', focus: 'HIIT кардио', isRest: false,
        exercises: [
          { name: 'Прыжки на месте', sets: 1, reps: '5 мин', rest: '-', note: 'Разминка' },
          { name: 'Берпи', sets: 4, reps: '15', rest: '30 сек' },
          { name: 'Прыжки со скакалкой', sets: 5, reps: '1 мин', rest: '30 сек' },
          { name: 'Прыжки на тумбу', sets: 4, reps: '10', rest: '45 сек' },
          { name: 'Велотренажёр', sets: 1, reps: '10 мин', rest: '-', note: 'Заминка' },
        ],
      },
      { dayNumber: 6, name: 'День 6 — Отдых', focus: 'Отдых', isRest: true, exercises: [] },
      { dayNumber: 7, name: 'День 7 — Отдых', focus: 'Отдых', isRest: true, exercises: [] },
    ],
  },

  // ─── 5. ПП Верх/Низ 4×/нед ──────────────────────────────────────────────
  {
    id: 'upper-lower-4',
    name: 'Верх/Низ — 4 дня в неделю',
    description: 'Каждая группа мышц тренируется дважды в неделю. Отличный баланс объёма и восстановления.',
    goal: 'Сила и гипертрофия',
    daysPerWeek: 4,
    duration: '8 недель',
    difficulty: 'intermediate',
    type: 'split',
    days: [
      {
        dayNumber: 1, name: 'День 1 — Верх (сила)', focus: 'Верх тела', isRest: false,
        exercises: [
          { name: 'Жим штанги лёжа', sets: 4, reps: '5', rest: '3 мин' },
          { name: 'Тяга штанги в наклоне', sets: 4, reps: '5', rest: '3 мин' },
          { name: 'Жим штанги стоя', sets: 3, reps: '6-8', rest: '2 мин' },
          { name: 'Подтягивания', sets: 3, reps: 'макс', rest: '2 мин' },
          { name: 'Подъём штанги на бицепс', sets: 3, reps: '10', rest: '60 сек' },
          { name: 'Жим узким хватом', sets: 3, reps: '10', rest: '60 сек' },
        ],
      },
      {
        dayNumber: 2, name: 'День 2 — Низ (сила)', focus: 'Низ тела', isRest: false,
        exercises: [
          { name: 'Приседания со штангой', sets: 4, reps: '5', rest: '3 мин' },
          { name: 'Румынская тяга', sets: 4, reps: '6-8', rest: '2 мин' },
          { name: 'Жим ногами', sets: 3, reps: '10-12', rest: '90 сек' },
          { name: 'Сгибание ног в тренажёре', sets: 3, reps: '12', rest: '60 сек' },
          { name: 'Подъём на носки стоя', sets: 4, reps: '15', rest: '60 сек' },
          { name: 'Скручивания', sets: 3, reps: '20', rest: '45 сек' },
        ],
      },
      { dayNumber: 3, name: 'День 3 — Отдых', focus: 'Отдых', isRest: true, exercises: [] },
      {
        dayNumber: 4, name: 'День 4 — Верх (объём)', focus: 'Верх тела', isRest: false,
        exercises: [
          { name: 'Жим гантелей на наклонной скамье', sets: 4, reps: '10-12', rest: '90 сек' },
          { name: 'Тяга верхнего блока к груди', sets: 4, reps: '10-12', rest: '90 сек' },
          { name: 'Жим Арнольда', sets: 3, reps: '12', rest: '60 сек' },
          { name: 'Тяга нижнего блока сидя', sets: 3, reps: '12', rest: '60 сек' },
          { name: 'Разводка гантелей лёжа', sets: 3, reps: '15', rest: '60 сек' },
          { name: 'Молотки', sets: 3, reps: '12', rest: '60 сек' },
        ],
      },
      {
        dayNumber: 5, name: 'День 5 — Низ (объём)', focus: 'Низ тела', isRest: false,
        exercises: [
          { name: 'Болгарские выпады', sets: 4, reps: '10 каждой', rest: '90 сек' },
          { name: 'Становая тяга', sets: 4, reps: '8', rest: '2 мин' },
          { name: 'Ягодичный мостик со штангой', sets: 4, reps: '12-15', rest: '90 сек' },
          { name: 'Разгибание ног в тренажёре', sets: 3, reps: '15', rest: '60 сек' },
          { name: 'Подъём на носки сидя', sets: 3, reps: '20', rest: '45 сек' },
          { name: 'Планка', sets: 3, reps: '45 сек', rest: '30 сек' },
        ],
      },
      { dayNumber: 6, name: 'День 6 — Отдых', focus: 'Отдых', isRest: true, exercises: [] },
      { dayNumber: 7, name: 'День 7 — Отдых', focus: 'Отдых', isRest: true, exercises: [] },
    ],
  },
]

// Единый словарь меток для упражнений: мышцы, оборудование, сложность, сила, механика.
// Источники терминологии — free-exercise-db (yuhonas) + наши seed-категории
// (CrossFit/swimming). Применять везде где рендерится сырое английское слово.

export const MUSCLE_LABEL: Record<string, string> = {
  abdominals: 'пресс',
  abductors: 'отводящие мышцы',
  adductors: 'приводящие мышцы',
  back: 'спина',
  biceps: 'бицепс',
  calves: 'икры',
  chest: 'грудь',
  core: 'кор',
  forearms: 'предплечья',
  full_body: 'всё тело',
  glutes: 'ягодицы',
  hamstrings: 'бицепс бедра',
  lats: 'широчайшие',
  legs: 'ноги',
  'lower back': 'поясница',
  'middle back': 'середина спины',
  neck: 'шея',
  quadriceps: 'квадрицепс',
  shoulders: 'плечи',
  traps: 'трапеция',
  triceps: 'трицепс',
}

export function muscleRu(m: string | null | undefined): string {
  if (!m) return ''
  return MUSCLE_LABEL[m.toLowerCase()] ?? m
}

export function musclesRu(list: string[] | null | undefined): string {
  if (!list || list.length === 0) return ''
  return list.map(muscleRu).join(', ')
}

export const EQUIPMENT_LABEL: Record<string, string> = {
  bodyweight: 'свой вес',
  barbell: 'штанга',
  dumbbell: 'гантели',
  kettlebell: 'гиря',
  cable: 'блок',
  bands: 'резинки',
  machine: 'тренажёр',
  exercise_ball: 'фитбол',
  foam_roll: 'ролл',
  medball: 'медбол',
  ez_bar: 'EZ-гриф',
  pullup_bar: 'турник',
  box: 'тумба',
  jump_rope: 'скакалка',
  rower: 'гребной тренажёр',
  bike: 'велоэргометр',
  pool: 'бассейн',
  wall: 'стена',
  none: '—',
  other: 'другое',
}

export function equipmentRu(e: string | null | undefined): string {
  if (!e) return ''
  return EQUIPMENT_LABEL[e.toLowerCase()] ?? e
}

export const DIFFICULTY_LABEL: Record<string, string> = {
  beginner: 'Новичок',
  intermediate: 'Средний',
  advanced: 'Продвинутый',
}

export const FORCE_LABEL: Record<string, string> = {
  push: 'Жим',
  pull: 'Тяга',
  static: 'Статика',
}

export const MECHANIC_LABEL: Record<string, string> = {
  compound: 'Базовое',
  isolation: 'Изолирующее',
}

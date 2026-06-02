import { TrendingDown, TrendingUp, Minus, Dumbbell } from 'lucide-react'
import type { CoachIntent } from '@/hooks/use-ai-plan-chat'
import type {
  MeasurementsValues,
  PlaceKey,
  WizardState,
} from './ai-plan-wizard.types'

export const GENDER_LABEL: Record<string, string> = {
  male: 'мужской',
  female: 'женский',
  other: 'другой',
}

export const INTENT_OPTIONS: Array<{
  key: CoachIntent
  label: string
  description: string
  icon: typeof TrendingDown
}> = [
  { key: 'lose', label: 'Сбросить вес', description: 'Меньше жира, талия уже', icon: TrendingDown },
  { key: 'gain', label: 'Набрать массу', description: 'Больше мышц, шире плечи', icon: TrendingUp },
  { key: 'strength', label: 'Набрать силу', description: 'Больше рабочие веса, тяжёлая база', icon: Dumbbell },
  { key: 'maintain', label: 'Поддерживать форму', description: 'Тот же вес, лучше композиция', icon: Minus },
]

export const INTENT_LABEL: Record<CoachIntent, string> = {
  lose: 'сбросить вес/жир',
  gain: 'набрать мышечную массу',
  strength: 'нарастить силовые показатели',
  maintain: 'поддерживать форму',
}

export const MONTH_OPTIONS = [2, 3, 6, 9, 12]

export const PLACE_OPTIONS: Array<{ key: PlaceKey; label: string }> = [
  { key: 'gym', label: 'Зал' },
  { key: 'home', label: 'Дом' },
  { key: 'street', label: 'Улица / площадка' },
]

export const PLACE_LABEL: Record<PlaceKey, string> = {
  gym: 'зал',
  home: 'дом',
  street: 'улица/площадка',
}

export const WISH_EXAMPLES = [
  'Бассейн 2 раза в неделю',
  'Кроссфит-комплексы по пятницам',
  'Упор на спину',
  'Беречь левое колено',
  'Не люблю кардио на дорожке',
  'Короткие тренировки (до 45 мин)',
  'Утром только разминка',
]

// Замеры тела — поля, которые показываем на шаге замеров
export const MEASUREMENT_FIELDS: Array<{
  key: 'chestCm' | 'waistCm' | 'hipsCm' | 'armCm' | 'thighCm' | 'forearmCm' | 'calfCm' | 'neckCm' | 'bodyFatPct'
  label: string
  unit: string
  placeholder: string
}> = [
  { key: 'chestCm', label: 'Грудь', unit: 'см', placeholder: '100' },
  { key: 'waistCm', label: 'Талия', unit: 'см', placeholder: '80' },
  { key: 'hipsCm', label: 'Бёдра', unit: 'см', placeholder: '95' },
  { key: 'armCm', label: 'Рука', unit: 'см', placeholder: '35' },
  { key: 'thighCm', label: 'Бедро', unit: 'см', placeholder: '58' },
  { key: 'forearmCm', label: 'Предплечье', unit: 'см', placeholder: '30' },
  { key: 'calfCm', label: 'Икра', unit: 'см', placeholder: '38' },
  { key: 'neckCm', label: 'Шея', unit: 'см', placeholder: '38' },
  { key: 'bodyFatPct', label: '% жира', unit: '%', placeholder: '15' },
]

export const EMPTY_MEASUREMENTS: MeasurementsValues = {
  chestCm: '',
  waistCm: '',
  hipsCm: '',
  armCm: '',
  thighCm: '',
  forearmCm: '',
  calfCm: '',
  neckCm: '',
  bodyFatPct: '',
}

export const INITIAL: WizardState = {
  intents: [],
  targetMonths: 3,
  ageYears: '',
  weightKg: '',
  heightCm: '',
  analyses: [],
  measurementsMode: null,
  measurements: { ...EMPTY_MEASUREMENTS },
  daysPerWeek: '',
  daysCustom: '',
  experience: '',
  experienceCustom: '',
  places: [],
  placeCustom: '',
  equipment: [],
  equipmentCustom: '',
  injuries: null,
  injuriesText: '',
  workingWeights: null,
  workingWeightsText: '',
  wishes: null,
  wishesText: '',
  programType: '',
  programTypeCustom: '',
}

export const VALID_INTENTS: CoachIntent[] = ['lose', 'gain', 'maintain', 'strength']

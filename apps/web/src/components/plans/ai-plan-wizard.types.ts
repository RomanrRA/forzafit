import type { CoachIntent } from '@/hooks/use-ai-plan-chat'

export interface UserProfile {
  id: string
  email: string
  name: string | null
  gender: 'male' | 'female' | 'other' | null
  dob: string | null
  heightCm: number | null
  weightKg: number | null
  goal: string | null
}

export type PlaceKey = 'gym' | 'home' | 'street'

export type MeasurementsValues = {
  chestCm: string
  waistCm: string
  hipsCm: string
  armCm: string
  thighCm: string
  forearmCm: string
  calfCm: string
  neckCm: string
  bodyFatPct: string
}

export type AnalysisFile = { filename: string; text: string }

export type WizardState = {
  // Step 0: намерения (AI-coach, мульти)
  intents: CoachIntent[]
  // Step 1: срок в месяцах
  targetMonths: number
  // Step 2: основные параметры (редактируем возраст/рост/вес)
  ageYears: string
  weightKg: string
  heightCm: string
  // Step 3: анализы (необязательно)
  analyses: AnalysisFile[]
  // Step 4: замеры тела
  measurementsMode: 'skip' | 'fill' | null
  measurements: MeasurementsValues
  // Остальное — как было
  daysPerWeek: string
  daysCustom: string
  experience: string
  experienceCustom: string
  places: PlaceKey[]
  placeCustom: string
  equipment: string[]
  equipmentCustom: string
  injuries: 'no' | 'yes' | null
  injuriesText: string
  workingWeights: 'no' | 'yes' | null
  workingWeightsText: string
  wishes: 'no' | 'yes' | null
  wishesText: string
  programType: string
  programTypeCustom: string
}

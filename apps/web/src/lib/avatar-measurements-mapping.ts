// Маппинг базовых параметров профиля (рост, вес, пол, возраст) → morph weights
// и масштаб модели. Применяется поверх athletic preset до того, как накладывается
// applyBodyToMorphs (детальные обхваты).
//
// Зачем отдельный файл: avatar-morphs-from-body.ts работает с замерами (обхваты,
// %жира) — это «детальный» уровень. Здесь — «грубый» уровень из 4 полей
// профиля, который доступен сразу после онбординга.

import type { AvatarGender } from './avatar-morphs'

// Базовый рост модели в GLB — приближённое значение для MakeHuman dummy.
// Используется чтобы перевести heightCm в коэффициент scale.
export const BASE_HEIGHT_CM: Record<AvatarGender, number> = {
  male: 175,
  female: 165,
}

export interface UserBodyProfile {
  heightCm?: number | null
  weightKg?: number | null
  gender: AvatarGender
  /** Возраст в годах. Если не задан — считается «среднестатистическим взрослым» (30). */
  ageYears?: number | null
}

export interface ProfileMorphResult {
  /** Морф-веса для применения поверх baseline. */
  morphs: Record<string, number>
  /** Единый коэффициент масштаба модели по Y (рост). Если рост неизвестен → 1. */
  scaleY: number
  /** BMI для отладки/UI. null если не хватает данных. */
  bmi: number | null
}

interface BmiBucket {
  /** Верхняя граница BMI (включительно). Последний бакет = Infinity. */
  maxBmi: number
  muscle: number
  bodyFat: number
  waist: number
}

// Бакеты подбирались эмпирически чтобы аватар визуально соответствовал
// типичному телосложению при данном BMI. waist двигаем тоже чтобы силуэт
// читался даже без введённых обхватов.
const BMI_BUCKETS: BmiBucket[] = [
  { maxBmi: 18.5, muscle: 0.20, bodyFat: 0.08, waist: -0.25 }, // худощавый
  { maxBmi: 22,   muscle: 0.40, bodyFat: 0.15, waist: -0.10 }, // стройный
  { maxBmi: 25,   muscle: 0.50, bodyFat: 0.25, waist:  0.05 }, // норма
  { maxBmi: 28,   muscle: 0.45, bodyFat: 0.45, waist:  0.25 }, // избыток
  { maxBmi: 32,   muscle: 0.40, bodyFat: 0.65, waist:  0.50 }, // полнота
  { maxBmi: Infinity, muscle: 0.35, bodyFat: 0.85, waist: 0.80 }, // ожирение
]

function bmiBucket(bmi: number): BmiBucket {
  for (const b of BMI_BUCKETS) {
    if (bmi <= b.maxBmi) return b
  }
  return BMI_BUCKETS[BMI_BUCKETS.length - 1]
}

/** С возрастом среднестатистически растёт жировая прослойка. Делаем мягко. */
function ageBodyFatBoost(ageYears: number): number {
  if (ageYears <= 30) return 0
  if (ageYears <= 40) return 0.03
  if (ageYears <= 55) return 0.07
  return 0.12
}

function clamp01(x: number): number {
  return x < 0 ? 0 : x > 1 ? 1 : x
}

export function computeProfileMorphs(profile: UserBodyProfile): ProfileMorphResult {
  const { heightCm, weightKg, gender, ageYears } = profile

  const baseH = BASE_HEIGHT_CM[gender]
  const scaleY = heightCm != null ? heightCm / baseH : 1

  let bmi: number | null = null
  const morphs: Record<string, number> = {}

  if (heightCm != null && weightKg != null && heightCm > 0) {
    const h = heightCm / 100
    bmi = weightKg / (h * h)
    const bucket = bmiBucket(bmi)
    morphs.muscle = bucket.muscle
    morphs.bodyFat = clamp01(
      bucket.bodyFat + (ageYears != null ? ageBodyFatBoost(ageYears) : 0),
    )
    morphs.waist = bucket.waist
  }

  return { morphs, scaleY, bmi }
}

/** Удобный merge: применяет computeProfileMorphs.morphs поверх baseline. */
export function applyProfileToMorphs(
  baseline: Record<string, number>,
  profile: UserBodyProfile,
): { morphs: Record<string, number>; scaleY: number; bmi: number | null } {
  const result = computeProfileMorphs(profile)
  return {
    morphs: { ...baseline, ...result.morphs },
    scaleY: result.scaleY,
    bmi: result.bmi,
  }
}

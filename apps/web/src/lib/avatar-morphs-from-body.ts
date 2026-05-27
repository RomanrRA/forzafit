// Маппинг замеров (см, кг, %) в morph weights [0..1].
//
// Подход: для каждого параметра задан диапазон [low, mid, high] на основе
// типичных антропометрических значений для пола. Линейная интерполяция:
//   value <= low  → 0
//   value == mid  → 0.5
//   value >= high → 1
//
// Это грубые нормы, не клинические — хватает чтобы аватар отражал тело.

import type { AvatarGender } from './avatar-morphs'
import type { BodyMeasurement } from '@/hooks/use-body-measurements'

type Range = [low: number, mid: number, high: number]

function lerpRange(value: number, [low, mid, high]: Range): number {
  if (value <= low) return 0
  if (value >= high) return 1
  if (value <= mid) {
    return 0.5 * ((value - low) / (mid - low))
  }
  return 0.5 + 0.5 * ((value - mid) / (high - mid))
}

interface RangesByGender {
  chestCm: Range
  waistCm: Range
  hipsCm: Range
  armCm: Range
  forearmCm: Range
  thighCm: Range
  calfCm: Range
  neckCm: Range
  bodyFatPct: Range
}

const MALE_RANGES: RangesByGender = {
  chestCm:    [85,  100, 120],
  waistCm:    [70,  85,  110],
  hipsCm:     [85,  95,  110],
  armCm:      [25,  32,  42],
  forearmCm:  [22,  28,  35],
  thighCm:    [50,  58,  68],
  calfCm:     [32,  38,  46],
  neckCm:     [34,  40,  48],
  bodyFatPct: [8,   18,  30],
}

const FEMALE_RANGES: RangesByGender = {
  chestCm:    [78,  88,  110],
  waistCm:    [60,  72,  95],
  hipsCm:     [85,  98,  115],
  armCm:      [22,  28,  36],
  forearmCm:  [18,  24,  30],
  thighCm:    [52,  60,  72],
  calfCm:     [30,  36,  42],
  neckCm:     [30,  34,  40],
  bodyFatPct: [15,  25,  38],
}

export interface BodyGoalsForMorphs {
  weightKg?: number | null
  bodyFatPct?: number | null
  chestCm?: number | null
  waistCm?: number | null
  hipsCm?: number | null
  armCm?: number | null
  forearmCm?: number | null
  thighCm?: number | null
  calfCm?: number | null
  neckCm?: number | null
}

/**
 * Применить замеры поверх baseline (обычно — athletic preset).
 * Только заполненные поля заменяются — пустые остаются из baseline.
 */
export function applyBodyToMorphs(
  morphs: Record<string, number>,
  source: BodyMeasurement | BodyGoalsForMorphs | null | undefined,
  gender: AvatarGender,
): Record<string, number> {
  if (!source) return morphs
  const out = { ...morphs }
  const r = gender === 'male' ? MALE_RANGES : FEMALE_RANGES

  if (source.chestCm != null)   out.chest    = lerpRange(source.chestCm,   r.chestCm)
  if (source.waistCm != null)   out.waist    = lerpRange(source.waistCm,   r.waistCm)
  if (source.hipsCm != null)    out.hips     = lerpRange(source.hipsCm,    r.hipsCm)
  if (source.armCm != null)     out.arm      = lerpRange(source.armCm,     r.armCm)
  if (source.forearmCm != null) out.forearm  = lerpRange(source.forearmCm, r.forearmCm)
  if (source.thighCm != null)   out.thigh    = lerpRange(source.thighCm,   r.thighCm)
  if (source.calfCm != null)    out.calf     = lerpRange(source.calfCm,    r.calfCm)
  if (source.neckCm != null)    out.neck     = lerpRange(source.neckCm,    r.neckCm)

  if (source.bodyFatPct != null) out.bodyFat = lerpRange(source.bodyFatPct, r.bodyFatPct)

  // muscle — производный от веса × (1 - bodyFat%). Если оба известны.
  const weight = source.weightKg
  const bodyFat = source.bodyFatPct
  if (weight != null && bodyFat != null) {
    const lean = weight * (1 - bodyFat / 100)
    const leanRange: Range = gender === 'male' ? [55, 65, 78] : [40, 48, 58]
    out.muscle = lerpRange(lean, leanRange)
  }

  return out
}

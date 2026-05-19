// Список morph targets, экспортированных в GLB (см. scripts/avatar/build_*.py).
// Если меняешь список — обнови соответствующие build_male.py / build_female.py.

export type AvatarGender = 'male' | 'female'

export interface MorphSpec {
  key: string
  label: string
  group: 'face' | 'torso' | 'limbs' | 'overall'
  // Если присутствует — морф есть только у этого пола.
  onlyFor?: AvatarGender
}

export const AVATAR_MORPHS: MorphSpec[] = [
  // Лицо
  { key: 'eyeSize',     label: 'Размер глаз',       group: 'face' },
  { key: 'eyeAlmond',   label: 'Миндалевидность',   group: 'face' },
  { key: 'noseSize',    label: 'Размер носа',       group: 'face' },
  { key: 'noseWidth',   label: 'Ширина носа',       group: 'face' },
  { key: 'noseHump',    label: 'Горбинка носа',     group: 'face' },
  { key: 'nosePoint',   label: 'Опущенный кончик',  group: 'face' },
  { key: 'lipFullness', label: 'Пухлость губ',      group: 'face' },

  // Торс
  { key: 'chest',       label: 'Грудь',             group: 'torso' },
  { key: 'waist',       label: 'Талия',             group: 'torso' },
  { key: 'hips',        label: 'Бёдра',             group: 'torso' },
  { key: 'neck',        label: 'Шея',               group: 'torso' },
  { key: 'breastSize',  label: 'Размер груди',      group: 'torso', onlyFor: 'female' },

  // Конечности
  { key: 'arm',         label: 'Плечо',             group: 'limbs' },
  { key: 'forearm',     label: 'Предплечье',        group: 'limbs' },
  { key: 'thigh',       label: 'Бедро',             group: 'limbs' },
  { key: 'calf',        label: 'Икра',              group: 'limbs' },

  // Общее
  { key: 'muscle',      label: 'Мышечность',        group: 'overall' },
  { key: 'bodyFat',     label: 'Жировая масса',     group: 'overall' },
]

export const GROUP_LABELS: Record<MorphSpec['group'], string> = {
  face: 'Лицо',
  torso: 'Торс',
  limbs: 'Конечности',
  overall: 'Общее',
}

export function getMorphsForGender(gender: AvatarGender): MorphSpec[] {
  return AVATAR_MORPHS.filter((m) => !m.onlyFor || m.onlyFor === gender)
}

export function emptyMorphState(gender: AvatarGender): Record<string, number> {
  const out: Record<string, number> = {}
  for (const m of getMorphsForGender(gender)) out[m.key] = 0
  return out
}

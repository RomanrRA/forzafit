import type { UserProfile, WizardState } from './ai-plan-wizard.types'
import {
  GENDER_LABEL,
  INTENT_LABEL,
  MEASUREMENT_FIELDS,
  MONTH_OPTIONS,
  PLACE_LABEL,
} from './ai-plan-wizard.constants'

export function calcAge(dob: string | null): number | null {
  if (!dob) return null
  const d = new Date(dob)
  if (Number.isNaN(d.getTime())) return null
  return Math.floor((Date.now() - d.getTime()) / (365.25 * 24 * 3600 * 1000))
}

// ─── Build final message for backend ──────────────────────────────────────────

export function compile(state: WizardState, profile: UserProfile | undefined): string {
  const lines: string[] = ['Ответы из анкеты:']

  // 0. Намерения и срок (AI-coach режим)
  if (state.intents.length > 0) {
    const labels = state.intents.map((i) => INTENT_LABEL[i]).join('; ')
    lines.push(`- Намерения: ${labels}`)
    lines.push(`- Срок до цели: ${state.targetMonths} мес.`)
  }

  // 1. Профиль: пол — из профиля, возраст/рост/вес — из формы (с фолбеком на профиль)
  const profileParts: string[] = []
  if (profile?.gender) profileParts.push(GENDER_LABEL[profile.gender] ?? profile.gender)
  if (profileParts.length) lines.push(`- Пол: ${profileParts.join(', ')}`)

  const ageRaw = state.ageYears.trim() || (calcAge(profile?.dob ?? null) ?? '')
  if (ageRaw) lines.push(`- Возраст: ${ageRaw} лет`)
  if (state.heightCm.trim()) lines.push(`- Рост: ${state.heightCm.trim()} см`)
  if (state.weightKg.trim()) lines.push(`- Вес: ${state.weightKg.trim()} кг`)

  // 2. Замеры тела
  if (state.measurementsMode === 'fill') {
    const m = state.measurements
    const parts: string[] = []
    for (const f of MEASUREMENT_FIELDS) {
      const v = m[f.key].trim()
      if (v) parts.push(`${f.label} ${v} ${f.unit}`)
    }
    if (parts.length) lines.push(`- Замеры тела: ${parts.join(', ')}`)
  }

  // 3. Frequency
  const days =
    state.daysPerWeek === 'custom' ? state.daysCustom.trim() : state.daysPerWeek
  if (days) lines.push(`- Тренировок в неделю: ${days}`)

  // 5. Experience
  const exp =
    state.experience === 'custom' ? state.experienceCustom.trim() : state.experience
  if (exp) lines.push(`- Стаж: ${exp}`)

  // 6. Place (мультивыбор)
  const placeLabels: string[] = []
  for (const p of state.places) placeLabels.push(PLACE_LABEL[p])
  if (state.placeCustom.trim()) placeLabels.push(state.placeCustom.trim())
  if (placeLabels.length) lines.push(`- Место тренировок: ${placeLabels.join(', ')}`)

  // 7. Equipment — зависит от выбранных мест
  const eqParts: string[] = []
  if (state.places.includes('gym')) {
    eqParts.push('в зале — полный набор (штанги, гантели, тренажёры)')
  }
  if (state.places.includes('home')) {
    const eq = [...state.equipment]
    if (state.equipmentCustom.trim()) eq.push(state.equipmentCustom.trim())
    eqParts.push(eq.length ? `дома — ${eq.join(', ')}` : 'дома — только вес тела')
  }
  if (state.places.includes('street')) {
    eqParts.push('на улице — турники, брусья, своя масса тела')
  }
  if (eqParts.length) lines.push(`- Доступное оборудование: ${eqParts.join('; ')}`)

  // 8. Injuries
  if (state.injuries === 'no') {
    lines.push('- Травм и ограничений нет')
  } else if (state.injuries === 'yes' && state.injuriesText.trim()) {
    lines.push(`- Травмы/ограничения: ${state.injuriesText.trim()}`)
  }

  // 9. Working weights
  if (state.workingWeights === 'no') {
    lines.push(
      '- Рабочие веса неизвестны — оцени консервативные стартовые веса под мой пол, вес, стаж (не ставь 0)',
    )
  } else if (state.workingWeights === 'yes' && state.workingWeightsText.trim()) {
    lines.push(`- Рабочие веса: ${state.workingWeightsText.trim()}`)
  }

  // 10. Program type
  const prog =
    state.programType === 'custom'
      ? state.programTypeCustom.trim()
      : state.programType
  if (prog) lines.push(`- Тип программы: ${prog}`)

  // 11. Анализы — отдельным блоком
  if (state.analyses.length > 0) {
    lines.push(
      '',
      '## Результаты анализов / обследований (загружены пользователем) — учитывать при подборе нагрузки',
    )
    state.analyses.forEach((a, i) => {
      lines.push(`### Файл ${i + 1}: ${a.filename}`, a.text)
    })
    lines.push(
      'При отклонениях в анализах будь осторожнее с нагрузкой и при необходимости отметь это в описании плана. Не ставь медицинских диагнозов.',
    )
  }

  // 12. Wishes — отдельным акцентным блоком, чтобы AI не игнорировал
  const wishesText = state.wishesText.trim()
  if (wishesText) {
    lines.push(
      '',
      '## Свободные пожелания пользователя — учитывать СТРОГО',
      wishesText,
    )
  }

  lines.push('', 'Составь план на основе этих данных и вызови tool generate_plan.')
  return lines.join('\n')
}

// ─── Validation ───────────────────────────────────────────────────────────────

export function isStepComplete(step: number, s: WizardState): boolean {
  switch (step) {
    case 0: // intents — хотя бы один
      return s.intents.length > 0
    case 1: // targetMonths — default есть, всегда валидно
      return MONTH_OPTIONS.includes(s.targetMonths)
    case 2: { // основные параметры — рост и вес обязательны
      const w = Number(s.weightKg)
      const h = Number(s.heightCm)
      return Number.isFinite(w) && w > 0 && Number.isFinite(h) && h > 0
    }
    case 3: // анализы — необязательно (блок на время загрузки в canProceed)
      return true
    case 4: // замеры — не давим, нужно лишь выбрать «Заполню/Пропустить»
      return s.measurementsMode !== null
    case 5: // days
      if (s.daysPerWeek === 'custom') return s.daysCustom.trim().length > 0
      return s.daysPerWeek !== ''
    case 6: // experience
      if (s.experience === 'custom') return s.experienceCustom.trim().length > 0
      return s.experience !== ''
    case 7: // place — мультивыбор или своё место
      return s.places.length > 0 || s.placeCustom.trim().length > 0
    case 8: // equipment (только если выбран «Дом»)
      if (!s.places.includes('home')) return true
      return s.equipment.length > 0 || s.equipmentCustom.trim().length > 0
    case 9: // injuries
      if (s.injuries === 'yes') return s.injuriesText.trim().length > 0
      return s.injuries !== null
    case 10: // working weights
      if (s.workingWeights === 'yes') return s.workingWeightsText.trim().length > 0
      return s.workingWeights !== null
    case 11: // program type
      if (s.programType === 'custom') return s.programTypeCustom.trim().length > 0
      return s.programType !== ''
    case 12: // wishes — необязательный, всегда completed
      return true
    default:
      return true
  }
}

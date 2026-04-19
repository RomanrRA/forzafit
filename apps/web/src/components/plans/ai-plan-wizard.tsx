'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { useAiPlanChat } from '@/hooks/use-ai-plan-chat'
import { Button } from '@/components/ui/button'
import { ArrowLeft, Check } from 'lucide-react'

interface UserProfile {
  id: string
  email: string
  name: string | null
  gender: 'male' | 'female' | 'other' | null
  dob: string | null
  heightCm: number | null
  weightKg: number | null
  goal: string | null
}

// ─── Question definitions ─────────────────────────────────────────────────────

const GENDER_LABEL: Record<string, string> = {
  male: 'мужской',
  female: 'женский',
  other: 'другой',
}

function calcAge(dob: string | null): number | null {
  if (!dob) return null
  const d = new Date(dob)
  if (Number.isNaN(d.getTime())) return null
  return Math.floor((Date.now() - d.getTime()) / (365.25 * 24 * 3600 * 1000))
}

// Returns a short string describing profile data for Q1 (or null if empty)
function profileSummary(p: UserProfile | undefined): string | null {
  if (!p) return null
  const parts: string[] = []
  if (p.gender) parts.push(GENDER_LABEL[p.gender] ?? p.gender)
  const age = calcAge(p.dob)
  if (age) parts.push(`${age} лет`)
  if (p.heightCm) parts.push(`${p.heightCm} см`)
  if (p.weightKg) parts.push(`${p.weightKg} кг`)
  return parts.length ? parts.join(', ') : null
}

// Detailed profile rows for Q1 — each field on its own line
function profileRows(p: UserProfile | undefined): Array<[string, string]> {
  if (!p) return []
  const rows: Array<[string, string]> = []
  if (p.gender) rows.push(['Пол', GENDER_LABEL[p.gender] ?? p.gender])
  const age = calcAge(p.dob)
  if (age) rows.push(['Возраст', `${age} лет`])
  if (p.heightCm) rows.push(['Рост', `${p.heightCm} см`])
  if (p.weightKg) rows.push(['Вес', `${p.weightKg} кг`])
  return rows
}

// ─── UI: option chip ──────────────────────────────────────────────────────────

function Chip({
  label,
  selected,
  onClick,
}: {
  label: string
  selected: boolean
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`relative text-left rounded-2xl px-4 py-3 text-sm font-medium transition-all border ${
        selected
          ? 'bg-primary text-primary-foreground border-primary shadow-sm'
          : 'glass-card border-transparent hover:border-primary/40'
      }`}
    >
      {selected && (
        <span className="absolute top-2 right-2 inline-flex h-4 w-4 items-center justify-center rounded-full bg-primary-foreground/25">
          <Check className="h-3 w-3" />
        </span>
      )}
      {label}
    </button>
  )
}

// ─── Wizard state ─────────────────────────────────────────────────────────────

type WizardState = {
  profileOk: 'yes' | 'custom' | null
  profileCustom: string
  weightKg: string // numeric input as string (empty = unknown)
  heightCm: string
  goals: string[] // multi
  goalCustom: string
  daysPerWeek: string // '2'|'3'|'4'|'5'|'custom'
  daysCustom: string
  experience: string
  experienceCustom: string
  place: 'gym' | 'home' | 'custom' | null
  placeCustom: string
  equipment: string[] // only if place === 'home'
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

const INITIAL: WizardState = {
  profileOk: null,
  profileCustom: '',
  weightKg: '',
  heightCm: '',
  goals: [],
  goalCustom: '',
  daysPerWeek: '',
  daysCustom: '',
  experience: '',
  experienceCustom: '',
  place: null,
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

// ─── Build final message for backend ──────────────────────────────────────────

function compile(state: WizardState, profile: UserProfile | undefined): string {
  const lines: string[] = ['Ответы из анкеты:']

  // 1. Profile
  if (state.profileOk === 'yes' && profile) {
    const s = profileSummary(profile)
    if (s) lines.push(`- Профиль подтверждён: ${s}`)
  } else if (state.profileOk === 'custom' && state.profileCustom.trim()) {
    lines.push(`- Поправки по профилю: ${state.profileCustom.trim()}`)
  }

  // 1a. Weight & height (always explicit — override profile if entered)
  if (state.weightKg.trim()) lines.push(`- Вес: ${state.weightKg.trim()} кг`)
  if (state.heightCm.trim()) lines.push(`- Рост: ${state.heightCm.trim()} см`)

  // 2. Goals (multi)
  const goals = [...state.goals]
  if (state.goalCustom.trim()) goals.push(state.goalCustom.trim())
  if (goals.length) lines.push(`- Цели: ${goals.join(', ')}`)

  // 3. Frequency
  const days =
    state.daysPerWeek === 'custom' ? state.daysCustom.trim() : state.daysPerWeek
  if (days) lines.push(`- Тренировок в неделю: ${days}`)

  // 4. Experience
  const exp =
    state.experience === 'custom' ? state.experienceCustom.trim() : state.experience
  if (exp) lines.push(`- Стаж: ${exp}`)

  // 5. Place
  let placeText = ''
  if (state.place === 'gym') placeText = 'зал'
  else if (state.place === 'home') placeText = 'дом'
  else if (state.place === 'custom') placeText = state.placeCustom.trim()
  if (placeText) lines.push(`- Место тренировок: ${placeText}`)

  // 6. Equipment (home only)
  if (state.place === 'home') {
    const eq = [...state.equipment]
    if (state.equipmentCustom.trim()) eq.push(state.equipmentCustom.trim())
    if (eq.length) lines.push(`- Доступное оборудование: ${eq.join(', ')}`)
    else lines.push('- Оборудование: не указано (только вес тела)')
  } else if (state.place === 'gym') {
    lines.push('- Оборудование: полный набор зала (штанги, гантели, тренажёры)')
  }

  // 7. Injuries
  if (state.injuries === 'no') {
    lines.push('- Травм и ограничений нет')
  } else if (state.injuries === 'yes' && state.injuriesText.trim()) {
    lines.push(`- Травмы/ограничения: ${state.injuriesText.trim()}`)
  }

  // 8. Working weights
  if (state.workingWeights === 'no') {
    lines.push(
      '- Рабочие веса неизвестны — оцени консервативные стартовые веса под мой пол, вес, стаж (не ставь 0)',
    )
  } else if (state.workingWeights === 'yes' && state.workingWeightsText.trim()) {
    lines.push(`- Рабочие веса: ${state.workingWeightsText.trim()}`)
  }

  // 9. Wishes
  if (state.wishes === 'yes' && state.wishesText.trim()) {
    lines.push(`- Пожелания: ${state.wishesText.trim()}`)
  }

  // 10. Program type
  const prog =
    state.programType === 'custom'
      ? state.programTypeCustom.trim()
      : state.programType
  if (prog) lines.push(`- Тип программы: ${prog}`)

  lines.push('', 'Составь план на основе этих данных и вызови tool generate_plan.')
  return lines.join('\n')
}

// ─── Validation ───────────────────────────────────────────────────────────────

function isStepComplete(step: number, s: WizardState, hasProfile: boolean): boolean {
  switch (step) {
    case 0: // profile
      if (!hasProfile) return true // skipped
      if (s.profileOk === 'yes') return true
      if (s.profileOk === 'custom') return s.profileCustom.trim().length > 0
      return false
    case 1: { // weight
      const n = Number(s.weightKg)
      return Number.isFinite(n) && n > 0
    }
    case 2: { // height
      const n = Number(s.heightCm)
      return Number.isFinite(n) && n > 0
    }
    case 3: // goals
      return s.goals.length > 0 || s.goalCustom.trim().length > 0
    case 4: // days
      if (s.daysPerWeek === 'custom') return s.daysCustom.trim().length > 0
      return s.daysPerWeek !== ''
    case 5: // experience
      if (s.experience === 'custom') return s.experienceCustom.trim().length > 0
      return s.experience !== ''
    case 6: // place
      if (s.place === 'custom') return s.placeCustom.trim().length > 0
      return s.place !== null
    case 7: // equipment (only when home)
      if (s.place !== 'home') return true
      return s.equipment.length > 0 || s.equipmentCustom.trim().length > 0
    case 8: // injuries
      if (s.injuries === 'yes') return s.injuriesText.trim().length > 0
      return s.injuries !== null
    case 9: // working weights
      if (s.workingWeights === 'yes') return s.workingWeightsText.trim().length > 0
      return s.workingWeights !== null
    case 10: // program type
      if (s.programType === 'custom') return s.programTypeCustom.trim().length > 0
      return s.programType !== ''
    case 11: // wishes
      if (s.wishes === 'yes') return s.wishesText.trim().length > 0
      return s.wishes !== null
    default:
      return true
  }
}

// ─── Main component ───────────────────────────────────────────────────────────

export function AiPlanWizard() {
  const router = useRouter()

  const { data: profile } = useQuery<UserProfile>({
    queryKey: ['users', 'me'],
    queryFn: async () => {
      const { data } = await api.get('/users/me')
      return data
    },
  })

  const profileSummaryStr = useMemo(() => profileSummary(profile), [profile])
  const hasProfile = profileSummaryStr !== null

  const [state, setState] = useState<WizardState>(INITIAL)
  const [step, setStep] = useState(0)
  const [submitted, setSubmitted] = useState(false)
  const [finalizing, setFinalizing] = useState(false)
  const [localError, setLocalError] = useState<string | null>(null)

  const { messages, isStreaming, toolCallReady, start, finalize, reset, error } =
    useAiPlanChat()

  // Total steps = 12, but step 7 (equipment) auto-skips when place !== 'home'
  // and step 0 auto-skips when profile is empty.
  const TOTAL = 12

  // Skip step 0 if profile is empty (jump to step 1 on mount)
  useEffect(() => {
    if (!hasProfile && step === 0 && profile) setStep(1)
  }, [hasProfile, step, profile])

  // Prefill weight/height from profile once profile loads
  const prefilledRef = useRef(false)
  useEffect(() => {
    if (!profile || prefilledRef.current) return
    prefilledRef.current = true
    setState((s) => ({
      ...s,
      weightKg: s.weightKg || (profile.weightKg != null ? String(profile.weightKg) : ''),
      heightCm: s.heightCm || (profile.heightCm != null ? String(profile.heightCm) : ''),
    }))
  }, [profile])

  // Skip step 7 (equipment) forward/back when place != 'home'
  function goNext() {
    if (step === 6 && state.place !== 'home') {
      setStep(8)
      return
    }
    setStep((s) => Math.min(s + 1, TOTAL - 1))
  }
  function goBack() {
    if (step === 8 && state.place !== 'home') {
      setStep(6)
      return
    }
    if (step === 1 && !hasProfile) {
      return // can't go back below 1 when profile step is skipped
    }
    setStep((s) => Math.max(s - 1, 0))
  }

  const canProceed = isStepComplete(step, state, hasProfile)
  const isLastStep = step === TOTAL - 1

  async function handleSubmit() {
    const compiled = compile(state, profile)
    setSubmitted(true)
    await start(compiled)
  }

  // Auto-finalize as soon as the model emits the generate_plan tool_call
  // and the stream finishes. Guarded so it runs only once.
  useEffect(() => {
    if (!submitted || !toolCallReady || isStreaming || finalizing) return
    setFinalizing(true)
    setLocalError(null)
    void (async () => {
      try {
        const planTemplateId = await finalize()
        router.push(`/plans/${planTemplateId}/edit`)
      } catch (err) {
        setLocalError(err instanceof Error ? err.message : 'Не удалось создать план')
        setFinalizing(false)
      }
    })()
  }, [submitted, toolCallReady, isStreaming, finalizing, finalize, router])

  // ─── Submission screen: show AI progress + CTA ──────────────────────────────

  if (submitted) {
    const streamEndedEmpty = !isStreaming && !toolCallReady && !finalizing
    const fallbackError =
      streamEndedEmpty && !error && !localError
        ? 'AI не смог составить план. Попробуйте ещё раз или поправьте ответы.'
        : null
    const combinedError = error ?? localError ?? fallbackError
    const lastAssistant = [...messages].reverse().find((m) => m.role === 'assistant')
    const aiText = lastAssistant?.content ?? ''
    const canRetry = !isStreaming && !finalizing && !!combinedError

    const handleRetry = () => {
      reset()
      setLocalError(null)
      setFinalizing(false)
      setSubmitted(false)
    }

    return (
      <div className="glass-card p-6 space-y-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-primary/15 flex items-center justify-center text-sm font-bold text-primary shrink-0">
            AI
          </div>
          <div>
            <p className="font-semibold">AI-тренер работает над планом</p>
            <p className="text-xs text-muted-foreground">
              {isStreaming
                ? 'Анализируем ответы и подбираем упражнения...'
                : finalizing
                  ? 'Сохраняем план...'
                  : toolCallReady
                    ? 'План готов, открываем редактор...'
                    : combinedError
                      ? 'Не удалось сгенерировать план'
                      : 'Ожидание...'}
            </p>
          </div>
        </div>

        {aiText && (
          <div className="text-sm leading-relaxed whitespace-pre-wrap text-foreground/90 border-l-2 border-primary/30 pl-3">
            {aiText}
          </div>
        )}

        {isStreaming && !aiText && (
          <div className="flex gap-1.5 py-3 justify-center">
            {[0, 1, 2].map((i) => (
              <span
                key={i}
                className="w-2 h-2 rounded-full bg-primary/60 animate-bounce"
                style={{ animationDelay: `${i * 0.15}s` }}
              />
            ))}
          </div>
        )}

        {combinedError && (
          <div className="rounded-xl bg-destructive/10 border border-destructive/30 px-4 py-2.5 text-sm text-destructive">
            {combinedError}
          </div>
        )}

        {canRetry && (
          <div className="flex justify-end">
            <Button onClick={handleRetry}>Попробовать ещё раз</Button>
          </div>
        )}

      </div>
    )
  }

  // ─── Step UI ────────────────────────────────────────────────────────────────

  const progressCurrent = step + 1
  const progressTotal = TOTAL

  return (
    <div className="glass-card p-6 space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-xs font-medium text-muted-foreground">
            Вопрос {progressCurrent} из {progressTotal}
          </p>
          <div className="mt-2 h-1.5 w-48 rounded-full bg-primary/10 overflow-hidden">
            <div
              className="h-full bg-primary transition-all"
              style={{ width: `${(progressCurrent / progressTotal) * 100}%` }}
            />
          </div>
        </div>
      </div>

      {/* Step 0: Profile confirmation */}
      {step === 0 && hasProfile && (
        <StepContainer title="Ваши данные верны?">
          <div className="rounded-xl bg-primary/5 border border-primary/20 px-4 py-3">
            <p className="text-xs font-medium text-muted-foreground mb-2">
              Из профиля
            </p>
            <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5">
              {profileRows(profile).map(([label, value]) => (
                <div key={label} className="contents">
                  <dt className="text-sm font-medium text-foreground/70">{label}:</dt>
                  <dd className="text-sm font-semibold text-foreground">{value}</dd>
                </div>
              ))}
            </dl>
          </div>
          <div className="grid grid-cols-1 gap-2">
            <Chip
              label="Да, всё верно"
              selected={state.profileOk === 'yes'}
              onClick={() => setState((s) => ({ ...s, profileOk: 'yes' }))}
            />
            <Chip
              label="Поправить"
              selected={state.profileOk === 'custom'}
              onClick={() => setState((s) => ({ ...s, profileOk: 'custom' }))}
            />
          </div>
          {state.profileOk === 'custom' && (
            <textarea
              value={state.profileCustom}
              onChange={(e) =>
                setState((s) => ({ ...s, profileCustom: e.target.value }))
              }
              placeholder="Например: мне 32, не 28, вес 82"
              rows={2}
              className="w-full resize-none rounded-xl border border-input bg-background/70 px-3 py-2.5 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            />
          )}
        </StepContainer>
      )}

      {/* Step 1: Weight */}
      {step === 1 && (
        <StepContainer title="Ваш вес" hint="В килограммах">
          <input
            type="number"
            inputMode="decimal"
            min={20}
            max={300}
            step={0.1}
            value={state.weightKg}
            onChange={(e) =>
              setState((s) => ({ ...s, weightKg: e.target.value }))
            }
            placeholder="Например: 78"
            className="w-full rounded-xl border border-input bg-background/70 px-4 py-3 text-base focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          />
        </StepContainer>
      )}

      {/* Step 2: Height */}
      {step === 2 && (
        <StepContainer title="Ваш рост" hint="В сантиметрах">
          <input
            type="number"
            inputMode="numeric"
            min={100}
            max={250}
            step={1}
            value={state.heightCm}
            onChange={(e) =>
              setState((s) => ({ ...s, heightCm: e.target.value }))
            }
            placeholder="Например: 180"
            className="w-full rounded-xl border border-input bg-background/70 px-4 py-3 text-base focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          />
        </StepContainer>
      )}

      {/* Step 3: Goals (multi) */}
      {step === 3 && (
        <StepContainer title="Главная цель" hint="Можно выбрать несколько">
          <div className="grid grid-cols-1 gap-2">
            {['Масса', 'Сила', 'Похудение', 'Тонус'].map((g) => (
              <Chip
                key={g}
                label={g}
                selected={state.goals.includes(g)}
                onClick={() =>
                  setState((s) => ({
                    ...s,
                    goals: s.goals.includes(g)
                      ? s.goals.filter((x) => x !== g)
                      : [...s.goals, g],
                  }))
                }
              />
            ))}
          </div>
          <textarea
            value={state.goalCustom}
            onChange={(e) =>
              setState((s) => ({ ...s, goalCustom: e.target.value }))
            }
            placeholder="Другое (свой вариант)..."
            rows={1}
            className="w-full resize-none rounded-xl border border-input bg-background/70 px-3 py-2.5 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          />
        </StepContainer>
      )}

      {/* Step 4: Days per week */}
      {step === 4 && (
        <StepContainer title="Сколько раз в неделю готовы тренироваться?">
          <div className="grid grid-cols-1 gap-2">
            {['2', '3', '4', '5'].map((n) => (
              <Chip
                key={n}
                label={n}
                selected={state.daysPerWeek === n}
                onClick={() => setState((s) => ({ ...s, daysPerWeek: n }))}
              />
            ))}
          </div>
          <Chip
            label="Другое"
            selected={state.daysPerWeek === 'custom'}
            onClick={() => setState((s) => ({ ...s, daysPerWeek: 'custom' }))}
          />
          {state.daysPerWeek === 'custom' && (
            <input
              value={state.daysCustom}
              onChange={(e) =>
                setState((s) => ({ ...s, daysCustom: e.target.value }))
              }
              placeholder="Например: 1 или 6"
              className="w-full rounded-xl border border-input bg-background/70 px-3 py-2.5 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            />
          )}
        </StepContainer>
      )}

      {/* Step 5: Experience */}
      {step === 5 && (
        <StepContainer title="Стаж силовых тренировок">
          <div className="grid grid-cols-1 gap-2">
            {['Новичок (до 6 мес)', '6–12 месяцев', '1–3 года', '3+ лет'].map(
              (opt) => (
                <Chip
                  key={opt}
                  label={opt}
                  selected={state.experience === opt}
                  onClick={() =>
                    setState((s) => ({ ...s, experience: opt }))
                  }
                />
              ),
            )}
          </div>
          <Chip
            label="Другое"
            selected={state.experience === 'custom'}
            onClick={() => setState((s) => ({ ...s, experience: 'custom' }))}
          />
          {state.experience === 'custom' && (
            <input
              value={state.experienceCustom}
              onChange={(e) =>
                setState((s) => ({ ...s, experienceCustom: e.target.value }))
              }
              placeholder="Свой вариант..."
              className="w-full rounded-xl border border-input bg-background/70 px-3 py-2.5 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            />
          )}
        </StepContainer>
      )}

      {/* Step 6: Place */}
      {step === 6 && (
        <StepContainer title="Где тренируетесь?">
          <div className="grid grid-cols-1 gap-2">
            <Chip
              label="Зал"
              selected={state.place === 'gym'}
              onClick={() =>
                setState((s) => ({ ...s, place: 'gym', equipment: [] }))
              }
            />
            <Chip
              label="Дом"
              selected={state.place === 'home'}
              onClick={() => setState((s) => ({ ...s, place: 'home' }))}
            />
          </div>
          <Chip
            label="Другое"
            selected={state.place === 'custom'}
            onClick={() =>
              setState((s) => ({ ...s, place: 'custom', equipment: [] }))
            }
          />
          {state.place === 'custom' && (
            <input
              value={state.placeCustom}
              onChange={(e) =>
                setState((s) => ({ ...s, placeCustom: e.target.value }))
              }
              placeholder="Например: улица, парк, отель"
              className="w-full rounded-xl border border-input bg-background/70 px-3 py-2.5 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            />
          )}
        </StepContainer>
      )}

      {/* Step 7: Equipment (home only) */}
      {step === 7 && state.place === 'home' && (
        <StepContainer
          title="Что есть дома?"
          hint="Можно выбрать несколько вариантов"
        >
          <div className="grid grid-cols-1 gap-2">
            {[
              'Резинки',
              'Гантели',
              'Штанга + блины',
              'Турник',
              'Скамья',
            ].map((eq) => (
              <Chip
                key={eq}
                label={eq}
                selected={state.equipment.includes(eq)}
                onClick={() =>
                  setState((s) => ({
                    ...s,
                    equipment: s.equipment.includes(eq)
                      ? s.equipment.filter((x) => x !== eq)
                      : [...s.equipment, eq],
                  }))
                }
              />
            ))}
          </div>
          <textarea
            value={state.equipmentCustom}
            onChange={(e) =>
              setState((s) => ({ ...s, equipmentCustom: e.target.value }))
            }
            placeholder="Другое оборудование..."
            rows={1}
            className="w-full resize-none rounded-xl border border-input bg-background/70 px-3 py-2.5 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          />
        </StepContainer>
      )}

      {/* Step 8: Injuries */}
      {step === 8 && (
        <StepContainer title="Есть ли травмы или ограничения?">
          <div className="grid grid-cols-1 gap-2">
            <Chip
              label="Нет"
              selected={state.injuries === 'no'}
              onClick={() =>
                setState((s) => ({ ...s, injuries: 'no', injuriesText: '' }))
              }
            />
            <Chip
              label="Да"
              selected={state.injuries === 'yes'}
              onClick={() => setState((s) => ({ ...s, injuries: 'yes' }))}
            />
          </div>
          {state.injuries === 'yes' && (
            <textarea
              value={state.injuriesText}
              onChange={(e) =>
                setState((s) => ({ ...s, injuriesText: e.target.value }))
              }
              placeholder="Опишите — что беречь, что не делать..."
              rows={2}
              className="w-full resize-none rounded-xl border border-input bg-background/70 px-3 py-2.5 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            />
          )}
        </StepContainer>
      )}

      {/* Step 9: Working weights */}
      {step === 9 && (
        <StepContainer title="Знаете свои рабочие веса в базе?">
          <div className="grid grid-cols-1 gap-2">
            <Chip
              label="Не знаю"
              selected={state.workingWeights === 'no'}
              onClick={() =>
                setState((s) => ({
                  ...s,
                  workingWeights: 'no',
                  workingWeightsText: '',
                }))
              }
            />
            <Chip
              label="Знаю"
              selected={state.workingWeights === 'yes'}
              onClick={() =>
                setState((s) => ({ ...s, workingWeights: 'yes' }))
              }
            />
          </div>
          {state.workingWeights === 'yes' && (
            <textarea
              value={state.workingWeightsText}
              onChange={(e) =>
                setState((s) => ({
                  ...s,
                  workingWeightsText: e.target.value,
                }))
              }
              placeholder="Например: присед 100 кг, жим 70 кг, тяга 120 кг"
              rows={2}
              className="w-full resize-none rounded-xl border border-input bg-background/70 px-3 py-2.5 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            />
          )}
        </StepContainer>
      )}

      {/* Step 11: Wishes */}
      {step === 11 && (
        <StepContainer title="Есть ли особые пожелания по тренировкам?">
          <div className="grid grid-cols-1 gap-2">
            <Chip
              label="Нет"
              selected={state.wishes === 'no'}
              onClick={() =>
                setState((s) => ({ ...s, wishes: 'no', wishesText: '' }))
              }
            />
            <Chip
              label="Да"
              selected={state.wishes === 'yes'}
              onClick={() => setState((s) => ({ ...s, wishes: 'yes' }))}
            />
          </div>
          {state.wishes === 'yes' && (
            <textarea
              value={state.wishesText}
              onChange={(e) =>
                setState((s) => ({ ...s, wishesText: e.target.value }))
              }
              placeholder="Например: больше работы на спину, короче тренировки, кардио..."
              rows={2}
              className="w-full resize-none rounded-xl border border-input bg-background/70 px-3 py-2.5 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            />
          )}
        </StepContainer>
      )}

      {/* Step 10: Program type */}
      {step === 10 && (
        <StepContainer title="Тип программы">
          <div className="grid grid-cols-1 gap-2">
            {[
              'На усмотрение AI',
              'Full body',
              'Upper/Lower (верх/низ)',
              'Push-Pull-Legs',
              'Сплит по группам мышц',
            ].map((opt) => (
              <Chip
                key={opt}
                label={opt}
                selected={state.programType === opt}
                onClick={() =>
                  setState((s) => ({ ...s, programType: opt }))
                }
              />
            ))}
          </div>
          <Chip
            label="Другое"
            selected={state.programType === 'custom'}
            onClick={() =>
              setState((s) => ({ ...s, programType: 'custom' }))
            }
          />
          {state.programType === 'custom' && (
            <input
              value={state.programTypeCustom}
              onChange={(e) =>
                setState((s) => ({ ...s, programTypeCustom: e.target.value }))
              }
              placeholder="Свой вариант..."
              className="w-full rounded-xl border border-input bg-background/70 px-3 py-2.5 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            />
          )}
        </StepContainer>
      )}

      {/* Nav */}
      <div className="flex items-center justify-between pt-2">
        <Button
          variant="ghost"
          onClick={goBack}
          disabled={step === 0 || (step === 1 && !hasProfile)}
        >
          <ArrowLeft className="h-4 w-4 mr-1" />
          Назад
        </Button>
        {isLastStep ? (
          <Button onClick={handleSubmit} disabled={!canProceed}>
            Составить план
          </Button>
        ) : (
          <Button onClick={goNext} disabled={!canProceed}>
            Далее
          </Button>
        )}
      </div>
    </div>
  )
}

// ─── Layout helper ────────────────────────────────────────────────────────────

function StepContainer({
  title,
  hint,
  children,
}: {
  title: string
  hint?: string
  children: React.ReactNode
}) {
  return (
    <div className="space-y-3">
      <div>
        <h2 className="text-lg font-semibold leading-snug">{title}</h2>
        {hint && <p className="text-xs text-muted-foreground mt-1">{hint}</p>}
      </div>
      {children}
    </div>
  )
}

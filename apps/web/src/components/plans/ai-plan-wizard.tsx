'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { useAiPlanChat, type CoachIntent } from '@/hooks/use-ai-plan-chat'
import { useBodyMeasurements } from '@/hooks/use-body-measurements'
import { Button } from '@/components/ui/button'
import {
  ArrowLeft,
  Check,
  Sparkles,
  Upload,
  FileText,
  X,
  Loader2,
  ChevronDown,
  ChevronUp,
} from 'lucide-react'
import type {
  UserProfile,
  MeasurementsValues,
  AnalysisFile,
  WizardState,
} from './ai-plan-wizard.types'
import {
  GENDER_LABEL,
  INTENT_OPTIONS,
  MONTH_OPTIONS,
  PLACE_OPTIONS,
  WISH_EXAMPLES,
  MEASUREMENT_FIELDS,
  EMPTY_MEASUREMENTS,
  INITIAL,
  VALID_INTENTS,
} from './ai-plan-wizard.constants'
import { calcAge, compile, isStepComplete } from './ai-plan-wizard.utils'

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

// ─── Main component ───────────────────────────────────────────────────────────

export function AiPlanWizard() {
  const router = useRouter()
  const searchParams = useSearchParams()

  const { data: profile } = useQuery<UserProfile>({
    queryKey: ['users', 'me'],
    queryFn: async () => {
      const { data } = await api.get('/users/me')
      return data
    },
  })

  // Последний замер тела — для предзаполнения шага замеров
  const { data: measurementsData } = useBodyMeasurements({ limit: 1, page: 1 })
  const lastMeasurement = measurementsData?.items?.[0] ?? null

  const [state, setState] = useState<WizardState>(INITIAL)
  const [step, setStep] = useState(0)
  const [submitted, setSubmitted] = useState(false)
  const [finalizing, setFinalizing] = useState(false)
  const [localError, setLocalError] = useState<string | null>(null)
  const [analysesUploading, setAnalysesUploading] = useState(false)

  const { messages, isStreaming, toolCallReady, goalSuggestion, start, finalize, reset, error } =
    useAiPlanChat()

  const TOTAL = 13

  // Prefill intents/months из query (?intent=lose,strength&months=3) — приходит из AiGoalDialog
  const prefilledFromQueryRef = useRef(false)
  useEffect(() => {
    if (prefilledFromQueryRef.current) return
    const intentParam = searchParams.get('intent')
    const monthsParam = searchParams.get('months')
    if (!intentParam && !monthsParam) return
    prefilledFromQueryRef.current = true

    const parsedIntents = (intentParam ?? '')
      .split(',')
      .map((s) => s.trim())
      .filter((s): s is CoachIntent => (VALID_INTENTS as string[]).includes(s))
    const parsedMonths = monthsParam ? Number(monthsParam) : null

    setState((s) => ({
      ...s,
      intents: parsedIntents.length > 0 ? parsedIntents : s.intents,
      targetMonths:
        parsedMonths != null && MONTH_OPTIONS.includes(parsedMonths)
          ? parsedMonths
          : s.targetMonths,
    }))
  }, [searchParams])

  // Prefill height/weight from profile once profile loads
  const prefilledProfileRef = useRef(false)
  useEffect(() => {
    if (!profile || prefilledProfileRef.current) return
    prefilledProfileRef.current = true
    const profileAgeVal = calcAge(profile.dob ?? null)
    setState((s) => ({
      ...s,
      ageYears: s.ageYears || (profileAgeVal != null ? String(profileAgeVal) : ''),
      weightKg: s.weightKg || (profile.weightKg != null ? String(profile.weightKg) : ''),
      heightCm: s.heightCm || (profile.heightCm != null ? String(profile.heightCm) : ''),
    }))
  }, [profile])

  // Prefill measurements from last record once available (и только если пользователь ещё не редактировал)
  const prefilledMeasurementsRef = useRef(false)
  useEffect(() => {
    if (!lastMeasurement || prefilledMeasurementsRef.current) return
    prefilledMeasurementsRef.current = true
    setState((s) => {
      const next: MeasurementsValues = { ...s.measurements }
      for (const f of MEASUREMENT_FIELDS) {
        const v = lastMeasurement[f.key]
        if (next[f.key] === '' && v != null) next[f.key] = String(v)
      }
      return { ...s, measurements: next }
    })
  }, [lastMeasurement])

  // Skip equipment (step 8) forward/back when «Дом» не выбран
  function goNext() {
    if (step === 7 && !state.places.includes('home')) {
      setStep(9)
      return
    }
    setStep((s) => Math.min(s + 1, TOTAL - 1))
  }
  function goBack() {
    if (step === 9 && !state.places.includes('home')) {
      setStep(7)
      return
    }
    setStep((s) => Math.max(s - 1, 0))
  }

  const canProceed =
    isStepComplete(step, state) && !(step === 3 && analysesUploading)
  const isLastStep = step === TOTAL - 1

  async function handleSubmit() {
    const compiled = compile(state, profile)
    setSubmitted(true)
    await start({
      initialMessage: compiled,
      intent: state.intents.length > 0 ? state.intents : undefined,
      targetMonths: state.intents.length > 0 ? state.targetMonths : undefined,
    })
  }

  // Auto-finalize as soon as the model emits the generate_plan tool_call
  useEffect(() => {
    if (!submitted || !toolCallReady || isStreaming || finalizing) return
    setFinalizing(true)
    setLocalError(null)
    void (async () => {
      try {
        const result = await finalize()
        // Если цель подобрана — даём показать карточку пару секунд, потом редирект
        if (result.bodyGoal && result.bodyGoal.rationale) {
          setTimeout(() => {
            router.push(`/plans/${result.planTemplateId}`)
          }, 2500)
        } else {
          router.push(`/plans/${result.planTemplateId}`)
        }
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
            <p className="font-semibold">
              {state.intents.length > 0 ? 'AI-тренер: подбираем цель и план' : 'AI-тренер работает над планом'}
            </p>
            <p className="text-xs text-muted-foreground">
              {isStreaming
                ? 'Анализируем ответы и подбираем упражнения...'
                : finalizing
                  ? 'Сохраняем цель и план...'
                  : toolCallReady
                    ? 'Готово, открываем план...'
                    : combinedError
                      ? 'Не удалось сгенерировать'
                      : 'Ожидание...'}
            </p>
          </div>
        </div>

        {goalSuggestion && (
          <div
            className="rounded-2xl border p-4 space-y-2"
            style={{
              background: 'color-mix(in oklab, var(--c-accent) 8%, transparent)',
              borderColor: 'color-mix(in oklab, var(--c-accent) 35%, var(--gl-border))',
            }}
          >
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--c-accent)' }}>
              <Sparkles className="h-3.5 w-3.5" />
              Целевые показатели
            </div>
            <div className="text-sm leading-snug">
              {goalSuggestion.rationale}
            </div>
            <div className="flex flex-wrap gap-2 pt-1">
              {goalSuggestion.weightKg != null && (
                <span className="text-xs px-2 py-1 rounded-full bg-background/60 border border-border">
                  Вес: {goalSuggestion.weightKg} кг
                </span>
              )}
              {goalSuggestion.bodyFatPct != null && (
                <span className="text-xs px-2 py-1 rounded-full bg-background/60 border border-border">
                  Жир: {goalSuggestion.bodyFatPct}%
                </span>
              )}
              {goalSuggestion.waistCm != null && (
                <span className="text-xs px-2 py-1 rounded-full bg-background/60 border border-border">
                  Талия: {goalSuggestion.waistCm} см
                </span>
              )}
              {goalSuggestion.chestCm != null && (
                <span className="text-xs px-2 py-1 rounded-full bg-background/60 border border-border">
                  Грудь: {goalSuggestion.chestCm} см
                </span>
              )}
              {goalSuggestion.targetDate && (
                <span className="text-xs px-2 py-1 rounded-full bg-background/60 border border-border">
                  Срок: {new Date(goalSuggestion.targetDate).toLocaleDateString('ru-RU')}
                </span>
              )}
            </div>
          </div>
        )}

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

  const profileGender = profile?.gender ? GENDER_LABEL[profile.gender] ?? profile.gender : null

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

      {/* Step 0: намерения (AI-coach, мульти) */}
      {step === 0 && (
        <StepContainer
          title="Что хотите достичь?"
          hint="Можно выбрать несколько — AI совместит цели в одной программе."
        >
          <div className="grid grid-cols-1 gap-2">
            {INTENT_OPTIONS.map(({ key, label, description, icon: Icon }) => {
              const selected = state.intents.includes(key)
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() =>
                    setState((s) => ({
                      ...s,
                      intents: s.intents.includes(key)
                        ? s.intents.filter((x) => x !== key)
                        : [...s.intents, key],
                    }))
                  }
                  className={`relative flex items-center gap-3 text-left rounded-2xl px-4 py-3 transition-all border ${
                    selected
                      ? 'bg-primary text-primary-foreground border-primary shadow-sm'
                      : 'glass-card border-transparent hover:border-primary/40'
                  }`}
                >
                  <div className={`grid place-items-center shrink-0 w-9 h-9 rounded-xl ${
                    selected ? 'bg-primary-foreground/20' : 'bg-primary/10'
                  }`}>
                    <Icon className="h-4 w-4" strokeWidth={2.4} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-semibold">{label}</div>
                    <div className={`text-xs mt-0.5 ${
                      selected ? 'text-primary-foreground/80' : 'text-muted-foreground'
                    }`}>
                      {description}
                    </div>
                  </div>
                  {selected && (
                    <Check className="h-4 w-4 shrink-0" />
                  )}
                </button>
              )
            })}
          </div>
        </StepContainer>
      )}

      {/* Step 1: срок до цели */}
      {step === 1 && (
        <StepContainer
          title="За какой срок хотите достичь цели?"
          hint="Реалистичный темп — 0.5-0.7 кг/нед на сброс, 0.2-0.4 кг/нед на набор."
        >
          <div className="grid grid-cols-1 gap-2">
            {MONTH_OPTIONS.map((m) => (
              <Chip
                key={m}
                label={`${m} месяцев`}
                selected={state.targetMonths === m}
                onClick={() => setState((s) => ({ ...s, targetMonths: m }))}
              />
            ))}
          </div>
        </StepContainer>
      )}

      {/* Step 2: основные параметры */}
      {step === 2 && (
        <StepContainer
          title="Ваши основные параметры"
          hint="Все поля можно поправить — данные из профиля предзаполнены."
        >
          {profileGender && (
            <div className="rounded-xl bg-primary/5 border border-primary/20 px-4 py-3">
              <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5">
                <div className="contents">
                  <dt className="text-sm font-medium text-foreground/70">Пол:</dt>
                  <dd className="text-sm font-semibold text-foreground">{profileGender}</dd>
                </div>
              </dl>
            </div>
          )}

          <div className="grid grid-cols-3 gap-3">
            <label className="space-y-1.5">
              <span className="text-xs font-medium text-muted-foreground">Возраст</span>
              <input
                type="number"
                inputMode="numeric"
                min={10}
                max={100}
                step={1}
                value={state.ageYears}
                onChange={(e) =>
                  setState((s) => ({ ...s, ageYears: e.target.value }))
                }
                placeholder="32"
                className="w-full rounded-xl border border-input bg-background/70 px-4 py-3 text-base focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              />
            </label>
            <label className="space-y-1.5">
              <span className="text-xs font-medium text-muted-foreground">Рост, см</span>
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
                placeholder="180"
                className="w-full rounded-xl border border-input bg-background/70 px-4 py-3 text-base focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              />
            </label>
            <label className="space-y-1.5">
              <span className="text-xs font-medium text-muted-foreground">Вес, кг</span>
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
                placeholder="78"
                className="w-full rounded-xl border border-input bg-background/70 px-4 py-3 text-base focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              />
            </label>
          </div>
        </StepContainer>
      )}

      {/* Step 3: анализы (необязательно) */}
      {step === 3 && (
        <StepContainer
          title="Анализы и обследования"
          hint="Необязательно. Загрузите свежие анализы или заключения — AI учтёт их при подборе нагрузки. PDF, DOCX, TXT или фото."
        >
          <AnalysesUploader
            analyses={state.analyses}
            uploading={analysesUploading}
            onUploadingChange={setAnalysesUploading}
            onChange={(next) => setState((s) => ({ ...s, analyses: next }))}
          />
        </StepContainer>
      )}

      {/* Step 4: замеры тела */}
      {step === 4 && (
        <StepContainer
          title="Замеры тела"
          hint="Помогут точнее подобрать нагрузку и упражнения. Если не знаете — спокойно пропускайте."
        >
          <div className="grid grid-cols-1 gap-2">
            <Chip
              label="Заполню замеры"
              selected={state.measurementsMode === 'fill'}
              onClick={() =>
                setState((s) => ({ ...s, measurementsMode: 'fill' }))
              }
            />
            <Chip
              label="Пропустить"
              selected={state.measurementsMode === 'skip'}
              onClick={() =>
                setState((s) => ({
                  ...s,
                  measurementsMode: 'skip',
                  measurements: { ...EMPTY_MEASUREMENTS },
                }))
              }
            />
          </div>

          {state.measurementsMode === 'fill' && (
            <div className="space-y-3">
              {lastMeasurement && (
                <p className="text-xs text-muted-foreground">
                  Подтянули последний замер от {new Date(lastMeasurement.date).toLocaleDateString('ru-RU')}. Можно поправить.
                </p>
              )}
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                {MEASUREMENT_FIELDS.map((f) => (
                  <label key={f.key} className="space-y-1">
                    <span className="text-xs font-medium text-muted-foreground">
                      {f.label}, {f.unit}
                    </span>
                    <input
                      type="number"
                      inputMode="decimal"
                      step={0.1}
                      min={0}
                      value={state.measurements[f.key]}
                      onChange={(e) =>
                        setState((s) => ({
                          ...s,
                          measurements: { ...s.measurements, [f.key]: e.target.value },
                        }))
                      }
                      placeholder={f.placeholder}
                      className="w-full rounded-xl border border-input bg-background/70 px-3 py-2.5 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                    />
                  </label>
                ))}
              </div>
              <p className="text-xs text-muted-foreground">
                Любое поле можно оставить пустым — пришлём AI только заполненное.
              </p>
            </div>
          )}
        </StepContainer>
      )}

      {/* Step 5: Days per week */}
      {step === 5 && (
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

      {/* Step 6: Experience */}
      {step === 6 && (
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

      {/* Step 7: Place (мультивыбор) */}
      {step === 7 && (
        <StepContainer
          title="Где тренируетесь?"
          hint="Можно выбрать несколько мест — AI совместит (например, база в зале + турники на улице)."
        >
          <div className="grid grid-cols-1 gap-2">
            {PLACE_OPTIONS.map(({ key, label }) => (
              <Chip
                key={key}
                label={label}
                selected={state.places.includes(key)}
                onClick={() =>
                  setState((s) => ({
                    ...s,
                    places: s.places.includes(key)
                      ? s.places.filter((x) => x !== key)
                      : [...s.places, key],
                  }))
                }
              />
            ))}
          </div>
          <input
            value={state.placeCustom}
            onChange={(e) =>
              setState((s) => ({ ...s, placeCustom: e.target.value }))
            }
            placeholder="Другое место (необязательно): отель, парк..."
            className="w-full rounded-xl border border-input bg-background/70 px-3 py-2.5 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          />
        </StepContainer>
      )}

      {/* Step 8: Equipment (только если выбран «Дом») */}
      {step === 8 && state.places.includes('home') && (
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

      {/* Step 9: Injuries */}
      {step === 9 && (
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

      {/* Step 10: Working weights */}
      {step === 10 && (
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

      {/* Step 11: Program type */}
      {step === 11 && (
        <StepContainer title="Тип программы">
          <div className="grid grid-cols-1 gap-2">
            {[
              'На усмотрение AI',
              'Full body',
              'Upper/Lower (верх/низ)',
              'Push-Pull-Legs',
              'Сплит по группам мышц',
              'Кроссфит / функционалка',
              'Плавание / бассейн',
              'Гибрид (силовая + кардио)',
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

      {/* Step 12: Wishes (свободный промпт — необязательный) */}
      {step === 12 && (
        <StepContainer
          title="Свободные пожелания тренеру"
          hint="Необязательно — но всё, что напишешь, AI учтёт строго. Можно пропустить."
        >
          <textarea
            value={state.wishesText}
            onChange={(e) =>
              setState((s) => ({
                ...s,
                wishes: e.target.value.trim() ? 'yes' : 'no',
                wishesText: e.target.value,
              }))
            }
            placeholder="Например: бассейн 2 раза в неделю, упор на спину, беречь колено..."
            rows={6}
            className="w-full resize-y rounded-xl border border-input bg-background/70 px-3 py-2.5 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring leading-relaxed"
          />
          <div>
            <p className="text-xs text-muted-foreground mb-2">Можно нажать на пример — добавится в поле:</p>
            <div className="flex flex-wrap gap-1.5">
              {WISH_EXAMPLES.map((ex) => (
                <button
                  key={ex}
                  type="button"
                  onClick={() =>
                    setState((s) => {
                      const sep = s.wishesText.trim() ? '\n' : ''
                      const next = `${s.wishesText}${sep}${ex}`
                      return { ...s, wishes: 'yes', wishesText: next }
                    })
                  }
                  className="text-xs rounded-full border border-border bg-background/60 px-2.5 py-1 hover:border-primary/60 hover:text-primary transition-colors"
                >
                  + {ex}
                </button>
              ))}
            </div>
          </div>
        </StepContainer>
      )}

      {/* Nav */}
      <div className="flex items-center justify-between pt-2">
        <Button
          variant="ghost"
          onClick={goBack}
          disabled={step === 0}
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

// ─── Analyses uploader ────────────────────────────────────────────────────────

function AnalysesUploader({
  analyses,
  uploading,
  onUploadingChange,
  onChange,
}: {
  analyses: AnalysisFile[]
  uploading: boolean
  onUploadingChange: (v: boolean) => void
  onChange: (next: AnalysisFile[]) => void
}) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [error, setError] = useState<string | null>(null)
  const [expanded, setExpanded] = useState<Set<number>>(new Set())

  function toggleExpand(i: number) {
    setExpanded((prev) => {
      const next = new Set(prev)
      if (next.has(i)) next.delete(i)
      else next.add(i)
      return next
    })
  }

  async function handleFiles(files: FileList | null) {
    if (!files || files.length === 0) return
    setError(null)
    onUploadingChange(true)
    const added: AnalysisFile[] = []
    try {
      for (const file of Array.from(files)) {
        const form = new FormData()
        form.append('file', file)
        const { data } = await api.post('/ai/plans/analyses/extract', form)
        if (data?.text) added.push({ filename: data.filename ?? file.name, text: data.text })
      }
      if (added.length) onChange([...analyses, ...added])
    } catch (e: any) {
      setError(e?.response?.data?.message ?? 'Не удалось обработать файл')
    } finally {
      onUploadingChange(false)
      if (inputRef.current) inputRef.current.value = ''
    }
  }

  function remove(i: number) {
    onChange(analyses.filter((_, idx) => idx !== i))
  }

  return (
    <div className="space-y-3">
      <input
        ref={inputRef}
        type="file"
        multiple
        accept=".pdf,.docx,.txt,image/*,application/pdf"
        className="hidden"
        onChange={(e) => void handleFiles(e.target.files)}
      />

      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        disabled={uploading}
        className="flex w-full items-center justify-center gap-2 rounded-2xl border border-dashed border-input bg-background/50 px-4 py-6 text-sm font-medium text-muted-foreground transition-colors hover:border-primary/50 hover:text-primary disabled:opacity-60"
      >
        {uploading ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            Распознаём файл…
          </>
        ) : (
          <>
            <Upload className="h-4 w-4" />
            Загрузить анализы (PDF, DOCX, TXT, фото)
          </>
        )}
      </button>

      {error && <p className="text-xs text-destructive">{error}</p>}

      {analyses.length > 0 && (
        <ul className="space-y-2">
          {analyses.map((a, i) => {
            const isOpen = expanded.has(i)
            return (
              <li
                key={i}
                className="rounded-xl border border-border bg-background/60 px-3 py-2.5"
              >
                <div className="flex items-start gap-2">
                  <FileText className="h-4 w-4 mt-0.5 shrink-0 text-primary" />
                  <button
                    type="button"
                    onClick={() => toggleExpand(i)}
                    className="min-w-0 flex-1 text-left"
                    aria-expanded={isOpen}
                  >
                    <p className="text-sm font-medium truncate">{a.filename}</p>
                    {!isOpen && (
                      <p className="text-xs text-muted-foreground line-clamp-2">{a.text}</p>
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={() => toggleExpand(i)}
                    className="shrink-0 rounded-lg p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
                    aria-label={isOpen ? 'Свернуть' : 'Показать распознанный текст'}
                  >
                    {isOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                  </button>
                  <button
                    type="button"
                    onClick={() => remove(i)}
                    className="shrink-0 rounded-lg p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
                    aria-label="Убрать файл"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
                {isOpen && (
                  <div className="mt-2 max-h-64 overflow-y-auto rounded-lg bg-muted/50 px-3 py-2">
                    <p className="text-xs text-foreground/80 whitespace-pre-wrap leading-relaxed">
                      {a.text}
                    </p>
                  </div>
                )}
              </li>
            )
          })}
        </ul>
      )}

      <p className="text-xs text-muted-foreground">
        Распознанный текст пойдёт AI как контекст. Фото и сканы читает модель — это занимает несколько секунд.
      </p>
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

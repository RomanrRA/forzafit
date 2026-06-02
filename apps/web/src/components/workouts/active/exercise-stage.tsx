'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  Check,
  Trash2,
  Edit3,
  User,
  Flag,
  Info,
} from 'lucide-react'
import {
  WorkoutExercise,
  WorkoutSet,
  useAddSet,
  useUpdateSet,
  useDeleteSet,
  useLastSetsForExercise,
  useRemoveExerciseFromWorkout,
} from '@/hooks/use-workouts'
import { ExerciseHowToDialog } from '@/components/exercises/exercise-how-to-dialog'
import { muscleRu } from '@/lib/exercise-labels'
import { toast } from '@/hooks/use-toast'
import { BigStepper } from './big-stepper'
import { RestTimer } from './rest-timer'
import { fmtKg, WEIGHT_STEP } from './active-workout.utils'

// ─── Exercise stage ─────────────────────────────────────────────────────────

interface StageProps {
  workoutId: string
  ex: WorkoutExercise
  isFirst: boolean
  isLast: boolean
  onPrev: () => void
  onNext: () => void
  onFinish: () => void
  isFinishing?: boolean
  onPrCheck: (weight: number, reps: number) => void
}

export function ExerciseStage({
  workoutId,
  ex,
  isFirst,
  isLast,
  onPrev,
  onNext,
  onFinish,
  isFinishing,
  onPrCheck,
}: StageProps) {
  const addSet = useAddSet(workoutId, ex.id)
  const updateSet = useUpdateSet(workoutId, ex.id)
  const removeExercise = useRemoveExerciseFromWorkout(workoutId)
  const { data: lastSets } = useLastSetsForExercise(ex.exerciseId)

  const sets = ex.sets
  const doneSets = useMemo(() => sets.filter((s) => s.completed), [sets])
  const nextPlanned = useMemo(() => sets.find((s) => !s.completed), [sets])
  const allDone = sets.length > 0 && doneSets.length === sets.length

  // Initial weight/reps: planned set → last session → 0/0
  const initial = useMemo(() => {
    if (nextPlanned) {
      return {
        weight: nextPlanned.weightKg ?? 0,
        reps: nextPlanned.reps ?? 0,
        bodyweight: nextPlanned.weightKg === 0,
      }
    }
    const ls = lastSets?.[doneSets.length] ?? lastSets?.[lastSets.length - 1]
    if (ls) {
      return {
        weight: ls.weightKg ?? 0,
        reps: ls.reps ?? 0,
        bodyweight: ls.weightKg === 0,
      }
    }
    const lastDone = doneSets[doneSets.length - 1]
    if (lastDone) {
      return {
        weight: lastDone.weightKg ?? 0,
        reps: lastDone.reps ?? 0,
        bodyweight: lastDone.weightKg === 0,
      }
    }
    return { weight: 0, reps: 0, bodyweight: false }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ex.id, sets.length])

  const [weight, setWeight] = useState<number>(initial.weight)
  const [reps, setReps] = useState<number>(initial.reps)
  const [bodyweight, setBodyweight] = useState<boolean>(initial.bodyweight)
  const [rpe, setRpe] = useState<number | null>(null)
  const [restAt, setRestAt] = useState<number | null>(null)
  const [justDoneId, setJustDoneId] = useState<string | null>(null)
  const [showHowTo, setShowHowTo] = useState(false)

  // Reset on exercise change
  useEffect(() => {
    setWeight(initial.weight)
    setReps(initial.reps)
    setBodyweight(initial.bodyweight)
    setRpe(null)
    setRestAt(null)
    setJustDoneId(null)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ex.id])

  // Hint: prev set delta
  const lastTopSet = useMemo(() => {
    if (!doneSets.length) return null
    const top = doneSets.reduce((a, b) =>
      (b.weightKg ?? 0) >= (a.weightKg ?? 0) ? b : a,
    )
    return {
      weight: top.weightKg ?? 0,
      reps: top.reps ?? 0,
      delta: weight - (top.weightKg ?? 0),
    }
  }, [doneSets, weight])

  const completeSet = useCallback(async () => {
    const finalWeight = bodyweight ? 0 : weight
    try {
      let newSet: WorkoutSet
      if (nextPlanned) {
        const result = await updateSet.mutateAsync({
          setId: nextPlanned.id,
          weightKg: finalWeight,
          reps,
          rpe: rpe ?? undefined,
          completed: true,
        })
        newSet = result.data
      } else {
        newSet = await addSet.mutateAsync({
          weightKg: finalWeight,
          reps,
          rpe: rpe ?? undefined,
          completed: true,
        })
      }
      setJustDoneId(newSet.id)
      setRpe(null)
      const restSec = ex.restTimerSec && ex.restTimerSec > 0 ? ex.restTimerSec : 90
      setRestAt(restSec)
      onPrCheck(finalWeight, reps)
    } catch {
      toast({ variant: 'destructive', title: 'Не удалось сохранить подход' })
    }
  }, [addSet, updateSet, nextPlanned, bodyweight, weight, reps, rpe, ex.restTimerSec, onPrCheck])

  // Keyboard shortcuts
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName
      if (tag === 'INPUT' || tag === 'TEXTAREA') return
      if (e.key === 'ArrowUp') {
        e.preventDefault()
        setWeight((w) => +(w + WEIGHT_STEP).toFixed(2))
      } else if (e.key === 'ArrowDown') {
        e.preventDefault()
        setWeight((w) => Math.max(0, +(w - WEIGHT_STEP).toFixed(2)))
      } else if (e.key === 'ArrowRight') {
        e.preventDefault()
        setReps((r) => r + 1)
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault()
        setReps((r) => Math.max(0, r - 1))
      } else if (e.code === 'Space') {
        e.preventDefault()
        if (!allDone) completeSet()
      } else if (/^[1-9]$/.test(e.key) || e.key === '0') {
        const v = e.key === '0' ? 10 : Number(e.key)
        setRpe((cur) => (cur === v ? null : v))
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [completeSet, allDone])

  return (
    <div className="space-y-4">
      {/* Hero */}
      <div className="glass-card" style={{ padding: 20 }}>
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <div className="mb-2 flex flex-wrap items-center gap-1.5">
              {ex.exercise.muscleGroups?.[0] && <Chip>{muscleRu(ex.exercise.muscleGroups[0])}</Chip>}
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <h2
                className="leading-tight"
                style={{
                  fontSize: 'clamp(22px, 4vw, 30px)',
                  fontWeight: 800,
                  letterSpacing: -0.5,
                  color: 'var(--txt-1)',
                }}
              >
                {ex.exercise.name}
              </h2>
              <button
                type="button"
                onClick={() => setShowHowTo(true)}
                className="glass-btn inline-flex items-center gap-1 shrink-0"
                style={{
                  padding: '5px 10px',
                  fontSize: 12,
                  fontWeight: 700,
                  borderRadius: 10,
                  color: 'var(--c-accent)',
                  border: '1px solid color-mix(in oklab, var(--c-accent) 35%, var(--gl-border))',
                }}
                aria-label="Как делать упражнение"
              >
                <Info className="h-3.5 w-3.5" strokeWidth={2.4} />
                Как делать
              </button>
            </div>
          </div>
          {lastTopSet && (
            <div className="text-right">
              <div className="eyebrow">Прошлый</div>
              <div
                className="tnum"
                style={{
                  fontSize: 16,
                  fontWeight: 700,
                  color: 'var(--txt-2)',
                  marginTop: 2,
                }}
              >
                {fmtKg(lastTopSet.weight)} × {lastTopSet.reps}
              </div>
              {lastTopSet.delta !== 0 && (
                <div
                  className="tnum"
                  style={{
                    fontSize: 12,
                    fontWeight: 700,
                    color: lastTopSet.delta > 0 ? 'var(--c-green)' : 'var(--c-red)',
                  }}
                >
                  {lastTopSet.delta > 0 ? '+' : ''}
                  {lastTopSet.delta} кг к цели
                </div>
              )}
            </div>
          )}
        </div>

        {/* Set dots */}
        <div className="mt-4 flex items-center gap-1.5">
          {sets.map((s) => {
            const done = s.completed
            const isNext = !done && nextPlanned?.id === s.id
            return (
              <div
                key={s.id}
                style={{
                  flex: 1,
                  height: 8,
                  borderRadius: 999,
                  background: done
                    ? 'color-mix(in oklab, var(--c-green) 60%, transparent)'
                    : 'var(--gl-bg)',
                  outline: isNext ? '1.5px solid var(--c-accent)' : 'none',
                  outlineOffset: 2,
                }}
              />
            )
          })}
          {sets.length === 0 && (
            <div
              className="flex-1 text-center"
              style={{ fontSize: 12, color: 'var(--txt-3)', fontWeight: 600 }}
            >
              ещё нет подходов
            </div>
          )}
          {sets.length > 0 && (
            <span
              className="tnum ml-2"
              style={{
                fontSize: 12,
                color: 'var(--txt-3)',
                fontWeight: 700,
              }}
            >
              {doneSets.length}/{sets.length}
            </span>
          )}
        </div>

        {/* Steppers */}
        <div className="mt-5 flex flex-col sm:flex-row gap-3">
          <div className="flex-1">
            {bodyweight ? (
              <BodyweightToggle onClear={() => setBodyweight(false)} />
            ) : (
              <BigStepper
                label="Вес"
                unit="кг"
                hint="↑↓ ±2.5"
                value={fmtKg(weight)}
                onDec={() => setWeight((w) => Math.max(0, +(w - WEIGHT_STEP).toFixed(2)))}
                onInc={() => setWeight((w) => +(w + WEIGHT_STEP).toFixed(2))}
              />
            )}
            <button
              type="button"
              onClick={() => setBodyweight((b) => !b)}
              className="mt-1 inline-flex items-center gap-1 text-xs font-semibold"
              style={{ color: bodyweight ? 'var(--c-accent)' : 'var(--txt-3)' }}
            >
              <User className="h-3 w-3" />
              {bodyweight ? 'свой вес — выкл.' : 'свой вес'}
            </button>
          </div>
          <BigStepper
            label="Повторы"
            hint="←→ ±1"
            value={reps}
            onDec={() => setReps((r) => Math.max(0, r - 1))}
            onInc={() => setReps((r) => r + 1)}
          />
        </div>

        {/* RPE */}
        <div className="mt-5">
          <div className="mb-2 flex items-baseline justify-between">
            <span className="eyebrow">RPE</span>
            <span style={{ fontSize: 11, color: 'var(--txt-3)' }}>
              как тяжело · 1—10 на клавиатуре
            </span>
          </div>
          <div className="grid grid-cols-10 gap-1">
            {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((v) => {
              const active = rpe === v
              const tone =
                v >= 9 ? 'var(--c-red)' : v >= 7 ? 'var(--c-orange)' : 'var(--c-accent)'
              return (
                <button
                  key={v}
                  type="button"
                  onClick={() => setRpe(active ? null : v)}
                  className="tnum"
                  style={{
                    height: 36,
                    borderRadius: 10,
                    background: active
                      ? `color-mix(in oklab, ${tone} 28%, transparent)`
                      : 'var(--gl-bg)',
                    border: `1px solid ${
                      active
                        ? `color-mix(in oklab, ${tone} 50%, transparent)`
                        : 'var(--gl-border)'
                    }`,
                    color: active ? tone : 'var(--txt-2)',
                    fontWeight: 700,
                    fontSize: 14,
                    cursor: 'pointer',
                  }}
                >
                  {v}
                </button>
              )
            })}
          </div>
        </div>

        {/* CTA */}
        {(() => {
          const inFlight = addSet.isPending || updateSet.isPending || (allDone && !!isFinishing)
          const ctaAction = allDone ? (isLast ? onFinish : onNext) : completeSet
          const ctaLabel = allDone
            ? isLast
              ? 'Все подходы сделаны · завершить тренировку'
              : 'Все подходы сделаны · следующее упражнение'
            : 'Подход выполнен'
          return (
            <button
              type="button"
              onClick={ctaAction}
              disabled={inFlight}
              className="glass-btn-primary mt-5 flex w-full items-center justify-center gap-2"
              style={{
                minHeight: 60,
                borderRadius: 18,
                fontSize: 17,
                fontWeight: 800,
                letterSpacing: 0.1,
                cursor: inFlight ? 'wait' : 'pointer',
                opacity: inFlight ? 0.6 : 1,
              }}
            >
              <Check className="h-[22px] w-[22px]" strokeWidth={2.4} />
              <span>{ctaLabel}</span>
              {!allDone && (
                <kbd
                  className="ml-2 hidden sm:inline-block"
                  style={{
                    padding: '2px 8px',
                    borderRadius: 6,
                    background: 'rgba(0,0,0,0.18)',
                    color: 'rgba(255,255,255,0.85)',
                    fontSize: 11,
                    fontWeight: 600,
                    fontFamily: 'ui-monospace, "SF Mono", Menlo, monospace',
                  }}
                >
                  Space
                </kbd>
              )}
              {allDone && (
                isLast ? (
                  <Flag className="h-[20px] w-[20px]" strokeWidth={2.4} />
                ) : (
                  <ChevronRight className="h-[22px] w-[22px]" strokeWidth={2.4} />
                )
              )}
            </button>
          )
        })()}
      </div>

      {/* Rest timer */}
      {restAt !== null && (
        <RestTimer key={restAt + '-' + justDoneId} totalSec={restAt} onClose={() => setRestAt(null)} />
      )}

      {/* Done sets */}
      {doneSets.length > 0 && (
        <div>
          <div className="mb-2 flex items-center justify-between px-1">
            <div className="flex items-center gap-2">
              <Check className="h-3.5 w-3.5" stroke="var(--c-green)" />
              <span className="eyebrow">Сделано</span>
              <span
                className="tnum"
                style={{
                  padding: '2px 8px',
                  borderRadius: 999,
                  background: 'var(--gl-bg)',
                  fontSize: 11,
                  fontWeight: 700,
                  color: 'var(--txt-2)',
                }}
              >
                {doneSets.length}
              </span>
            </div>
          </div>
          <DoneSetsTable
            workoutId={workoutId}
            workoutExerciseId={ex.id}
            sets={doneSets}
            justDoneId={justDoneId}
            onCopy={(s) => {
              setWeight(s.weightKg ?? 0)
              setReps(s.reps ?? 0)
              setBodyweight(s.weightKg === 0)
              setRpe(s.rpe ?? null)
              toast({ title: 'Подход скопирован в ввод' })
            }}
          />
        </div>
      )}

      {/* Nav between exercises */}
      <div className="flex items-center justify-between gap-2 pt-2">
        <button
          type="button"
          onClick={onPrev}
          disabled={isFirst}
          className="glass-btn inline-flex items-center gap-1.5"
          style={{
            padding: '0 14px',
            height: 40,
            borderRadius: 12,
            opacity: isFirst ? 0.4 : 1,
            cursor: isFirst ? 'not-allowed' : 'pointer',
            color: 'var(--txt-1)',
            fontWeight: 600,
            fontSize: 13,
          }}
        >
          <ChevronLeft className="h-4 w-4" />
          Предыдущее
        </button>
        <button
          type="button"
          onClick={() => removeExercise.mutate(ex.id)}
          className="glass-btn inline-flex items-center gap-1.5"
          style={{
            padding: '0 12px',
            height: 40,
            borderRadius: 12,
            color: 'var(--c-red)',
            fontWeight: 600,
            fontSize: 13,
          }}
          title="Убрать упражнение из тренировки"
        >
          <Trash2 className="h-4 w-4" />
          <span className="hidden sm:inline">Убрать</span>
        </button>
        <button
          type="button"
          onClick={onNext}
          disabled={isLast}
          className="glass-btn-primary inline-flex items-center gap-1.5"
          style={{
            padding: '0 16px',
            height: 40,
            borderRadius: 12,
            opacity: isLast ? 0.4 : 1,
            cursor: isLast ? 'not-allowed' : 'pointer',
            fontSize: 13,
          }}
        >
          Следующее
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>
      <ExerciseHowToDialog
        exerciseId={ex.exerciseId}
        open={showHowTo}
        onOpenChange={setShowHowTo}
      />
    </div>
  )
}

function Chip({ children }: { children: React.ReactNode }) {
  return (
    <span
      className="inline-flex items-center"
      style={{
        height: 22,
        padding: '0 8px',
        borderRadius: 999,
        fontSize: 11,
        fontWeight: 700,
        letterSpacing: 0.3,
        textTransform: 'uppercase',
        background: 'var(--gl-bg)',
        color: 'var(--txt-2)',
        border: '0.5px solid var(--gl-border)',
        whiteSpace: 'nowrap',
      }}
    >
      {children}
    </span>
  )
}

function BodyweightToggle({ onClear }: { onClear: () => void }) {
  return (
    <div className="flex flex-1 flex-col gap-2">
      <div className="flex items-baseline justify-between">
        <span className="eyebrow">Вес</span>
        <span style={{ fontSize: 11, color: 'var(--c-accent)' }}>свой вес</span>
      </div>
      <button
        type="button"
        onClick={onClear}
        className="grid place-items-center"
        style={{
          height: 76,
          borderRadius: 18,
          background:
            'color-mix(in oklab, var(--c-accent) 14%, var(--in-bg))',
          border: '1px solid color-mix(in oklab, var(--c-accent) 40%, var(--in-border))',
          color: 'var(--c-accent)',
          cursor: 'pointer',
          fontWeight: 700,
        }}
      >
        <div className="flex items-center gap-2">
          <User className="h-5 w-5" />
          <span style={{ fontSize: 16 }}>Свой вес</span>
        </div>
      </button>
    </div>
  )
}

// ─── Done sets table ────────────────────────────────────────────────────────

function DoneSetsTable({
  workoutId,
  workoutExerciseId,
  sets,
  justDoneId,
  onCopy,
}: {
  workoutId: string
  workoutExerciseId: string
  sets: WorkoutSet[]
  justDoneId: string | null
  onCopy: (s: WorkoutSet) => void
}) {
  const deleteSet = useDeleteSet(workoutId, workoutExerciseId)
  return (
    <div className="flex flex-col gap-1">
      {/* desktop header */}
      <div
        className="hidden sm:grid sm:[grid-template-columns:34px_1fr_80px_70px_60px_64px]"
        style={{
          padding: '4px 12px',
          gap: 12,
        }}
      >
        <span className="eyebrow">#</span>
        <span className="eyebrow">Подход</span>
        <span className="eyebrow text-right">Вес</span>
        <span className="eyebrow text-right">Повт</span>
        <span className="eyebrow text-right">RPE</span>
        <span></span>
      </div>
      {sets.map((s, i) => (
        <div
          key={s.id}
          className={`glass-card grid items-center [grid-template-columns:34px_minmax(0,1fr)_64px] sm:[grid-template-columns:34px_minmax(0,1fr)_80px_70px_60px_64px] ${
            s.id === justDoneId ? 'fz-rise' : ''
          }`}
          style={{
            padding: '10px 12px',
            gap: 12,
          }}
        >
          <div
            className="tnum"
            style={{
              width: 28,
              height: 28,
              borderRadius: 9,
              display: 'grid',
              placeItems: 'center',
              background: 'var(--gl-bg)',
              color: 'var(--txt-2)',
              fontSize: 12,
              fontWeight: 800,
            }}
          >
            {i + 1}
          </div>
          <div
            className="hidden sm:flex items-center gap-2"
            style={{ fontSize: 12, color: 'var(--txt-3)' }}
          >
            рабочий
          </div>
          {/* mobile compact */}
          <div className="sm:hidden tnum" style={{ fontSize: 16, fontWeight: 700 }}>
            {s.weightKg === 0 ? 'СВ' : fmtKg(s.weightKg ?? 0)}
            <span style={{ color: 'var(--txt-3)', margin: '0 6px', fontWeight: 500 }}>
              ×
            </span>
            {s.reps}
            {s.weightKg !== 0 && (
              <span
                style={{
                  fontSize: 11,
                  color: 'var(--txt-3)',
                  fontWeight: 600,
                  marginLeft: 4,
                }}
              >
                кг
              </span>
            )}
          </div>
          <div
            className="tnum hidden sm:block text-right"
            style={{
              fontSize: 18,
              fontWeight: 800,
              color: 'var(--txt-1)',
              letterSpacing: -0.3,
            }}
          >
            {s.weightKg === 0 ? 'СВ' : fmtKg(s.weightKg ?? 0)}
            {s.weightKg !== 0 && (
              <span
                style={{
                  fontSize: 11,
                  color: 'var(--txt-3)',
                  fontWeight: 600,
                  marginLeft: 4,
                }}
              >
                кг
              </span>
            )}
          </div>
          <div
            className="tnum hidden sm:block text-right"
            style={{
              fontSize: 18,
              fontWeight: 800,
              color: 'var(--txt-1)',
              letterSpacing: -0.3,
            }}
          >
            {s.reps ?? '—'}
          </div>
          <div
            className="tnum hidden sm:block text-right"
            style={{
              fontSize: 13,
              fontWeight: 600,
              color: s.rpe
                ? s.rpe >= 9
                  ? 'var(--c-red)'
                  : s.rpe >= 7
                  ? 'var(--c-orange)'
                  : 'var(--txt-2)'
                : 'var(--txt-3)',
            }}
          >
            {s.rpe ?? '—'}
          </div>
          <div className="flex justify-end gap-1">
            <button
              type="button"
              onClick={() => onCopy(s)}
              title="Скопировать в ввод"
              className="grid place-items-center"
              style={{
                width: 28,
                height: 28,
                borderRadius: 8,
                background: 'transparent',
                color: 'var(--txt-3)',
                cursor: 'pointer',
              }}
            >
              <Edit3 className="h-3.5 w-3.5" />
            </button>
            <button
              type="button"
              onClick={() => deleteSet.mutate(s.id)}
              title="Удалить"
              className="grid place-items-center"
              style={{
                width: 28,
                height: 28,
                borderRadius: 8,
                background: 'transparent',
                color: 'var(--c-red)',
                cursor: 'pointer',
              }}
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      ))}
    </div>
  )
}


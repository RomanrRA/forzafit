'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  Check,
  Pause,
  Play,
  Timer,
  Trash2,
  Edit3,
  User,
  Flag,
} from 'lucide-react'
import {
  WorkoutSession,
  WorkoutExercise,
  WorkoutSet,
  useAddSet,
  useUpdateSet,
  useDeleteSet,
  useUpdateWorkout,
  useLastSetsForExercise,
  useRemoveExerciseFromWorkout,
  useReorderWorkoutExercises,
  usePersonalRecords,
} from '@/hooks/use-workouts'
import type { WorkoutCompletedGamification } from '@/hooks/use-gamification'
import { CelebrationDialog } from '@/components/gamification/celebration-dialog'
import { AddExerciseDialog } from '@/components/workouts/add-exercise-dialog'
import { SortableExerciseList } from '@/components/workouts/sortable-exercise-list'
import { toast } from '@/hooks/use-toast'
import { BigStepper } from './big-stepper'
import { RestTimer } from './rest-timer'

const WEIGHT_STEP = 2.5

function fmtClock(totalSec: number): string {
  const h = Math.floor(totalSec / 3600)
  const m = Math.floor((totalSec % 3600) / 60)
  const s = totalSec % 60
  if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
  return `${m}:${String(s).padStart(2, '0')}`
}

function fmtKg(k: number): string {
  return Number.isInteger(k) ? `${k}` : k.toFixed(1)
}

interface Props {
  workout: WorkoutSession
}

export function ActiveWorkout({ workout }: Props) {
  const router = useRouter()
  const exercises = workout.exercises ?? []

  const [exIdx, setExIdx] = useState(() => {
    const firstIncomplete = exercises.findIndex(
      (ex) => ex.sets.length === 0 || ex.sets.some((s) => !s.completed),
    )
    return firstIncomplete >= 0 ? firstIncomplete : 0
  })

  const ex = exercises[exIdx]

  // Workout-level
  const updateWorkout = useUpdateWorkout(workout.id)
  const reorder = useReorderWorkoutExercises(workout.id)
  const { data: personalRecords } = usePersonalRecords()
  const [now, setNow] = useState(() => Date.now())
  const [paused, setPaused] = useState(false)
  const [celebration, setCelebration] = useState<WorkoutCompletedGamification | null>(null)
  // Сколько кг уже показывали как PR в этой активной сессии — чтобы не дублировать toast
  const [prShown, setPrShown] = useState<Map<string, number>>(new Map())

  const prMaxByExercise = useMemo(() => {
    const map = new Map<string, number>()
    for (const r of personalRecords ?? []) {
      if (r.maxWeightKg != null) map.set(r.exerciseId, r.maxWeightKg)
    }
    return map
  }, [personalRecords])

  const handlePrCheck = useCallback(
    (exerciseId: string, exerciseName: string, weight: number, reps: number) => {
      if (weight <= 0) return
      const prevMax = prMaxByExercise.get(exerciseId) ?? 0
      const lastShown = prShown.get(exerciseId) ?? 0
      if (weight > prevMax && weight > lastShown) {
        toast({
          title: '🏆 Новый рекорд!',
          description: `${exerciseName} · ${weight % 1 === 0 ? weight : weight.toFixed(1)} кг × ${reps}`,
          duration: 4500,
        })
        setPrShown((m) => {
          const next = new Map(m)
          next.set(exerciseId, weight)
          return next
        })
      }
    },
    [prMaxByExercise, prShown],
  )

  useEffect(() => {
    if (workout.finishedAt || paused) return
    const id = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(id)
  }, [workout.finishedAt, paused])

  const elapsedSec = Math.max(
    0,
    Math.floor((now - new Date(workout.startedAt).getTime()) / 1000),
  )
  const totalEx = exercises.length
  const completedEx = exercises.filter(
    (e) => e.sets.length > 0 && e.sets.every((s) => s.completed),
  ).length

  async function handleFinish() {
    try {
      const result = await updateWorkout.mutateAsync({
        finishedAt: new Date().toISOString(),
      })
      const g = result.gamification
      const hasSomething =
        !!g &&
        (g.newPrs.length > 0 ||
          g.newAchievements.length > 0 ||
          g.streak.isNewLongest ||
          g.streak.current >= 1)
      if (hasSomething && g) {
        setCelebration(g)
      } else {
        toast({ title: 'Тренировка завершена' })
        router.push('/workouts')
      }
    } catch {
      toast({
        variant: 'destructive',
        title: 'Ошибка',
        description: 'Не удалось сохранить тренировку',
      })
    }
  }

  return (
    <div className="fz-rise w-full max-w-3xl space-y-4">
      {/* Top bar */}
      <div
        className="glass-card strong flex items-center gap-2 sm:gap-3"
        style={{ padding: '12px 14px' }}
      >
        <Link
          href={`/workouts/${workout.id}`}
          className="glass-btn grid shrink-0 place-items-center"
          style={{ width: 36, height: 36, borderRadius: 11 }}
          title="Назад в обычный режим"
        >
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <div className="min-w-0 flex-1">
          <div className="eyebrow" style={{ color: 'var(--c-accent)' }}>
            Активная тренировка
          </div>
          <div className="mt-0.5 flex items-baseline gap-2 flex-wrap">
            <h1
              className="truncate"
              style={{
                fontSize: 'clamp(16px, 2.6vw, 20px)',
                fontWeight: 800,
                letterSpacing: -0.3,
                lineHeight: 1.15,
                color: 'var(--txt-1)',
              }}
            >
              {workout.title}
            </h1>
            {totalEx > 0 && (
              <span
                style={{ fontSize: 13, fontWeight: 600, color: 'var(--txt-2)' }}
              >
                <span className="tnum">{exIdx + 1}</span>
                <span style={{ color: 'var(--txt-3)', margin: '0 3px' }}>/</span>
                <span className="tnum">{totalEx}</span>
                <span className="ml-1 hidden sm:inline" style={{ color: 'var(--txt-3)' }}>
                  ({completedEx} закрыто)
                </span>
              </span>
            )}
          </div>
        </div>

        {/* Timer */}
        <div
          className="hidden sm:flex shrink-0 items-center gap-2"
          style={{
            padding: '8px 14px',
            borderRadius: 12,
            background: 'var(--gl-bg)',
            border: '1px solid var(--gl-border)',
          }}
        >
          <Timer className="h-4 w-4" style={{ color: 'var(--txt-2)' }} />
          <span
            className="tnum"
            style={{
              fontSize: 18,
              fontWeight: 800,
              color: 'var(--txt-1)',
              letterSpacing: -0.4,
            }}
          >
            {fmtClock(elapsedSec)}
          </span>
        </div>

        <button
          type="button"
          onClick={() => setPaused((p) => !p)}
          title="Пауза таймера"
          className="glass-btn grid shrink-0 place-items-center"
          style={{ width: 36, height: 36, borderRadius: 11 }}
        >
          {paused ? <Play className="h-4 w-4" /> : <Pause className="h-4 w-4" />}
        </button>

        <button
          type="button"
          onClick={handleFinish}
          disabled={updateWorkout.isPending}
          className="shrink-0 inline-flex items-center gap-1.5"
          style={{
            padding: '0 14px',
            height: 36,
            borderRadius: 12,
            background: 'color-mix(in oklab, var(--c-red) 18%, transparent)',
            border: '1px solid color-mix(in oklab, var(--c-red) 32%, transparent)',
            color: 'var(--c-red)',
            fontWeight: 700,
            fontSize: 13,
            cursor: updateWorkout.isPending ? 'wait' : 'pointer',
            opacity: updateWorkout.isPending ? 0.6 : 1,
          }}
        >
          <Check className="h-4 w-4" strokeWidth={2.4} />
          <span className="hidden sm:inline">Завершить</span>
        </button>
      </div>

      {/* Mobile timer */}
      <div className="sm:hidden flex items-center gap-2 px-1">
        <Timer className="h-4 w-4" style={{ color: 'var(--txt-2)' }} />
        <span
          className="tnum"
          style={{
            fontSize: 22,
            fontWeight: 800,
            color: 'var(--txt-1)',
            letterSpacing: -0.5,
          }}
        >
          {fmtClock(elapsedSec)}
        </span>
        <span className="ml-2 eyebrow">в работе</span>
      </div>

      {exercises.length === 0 ? (
        <div className="glass-card text-center py-10 txt-muted">
          <p>Сначала добавьте упражнение</p>
          <div className="mt-3 inline-block">
            <AddExerciseDialog workoutId={workout.id} currentCount={0} />
          </div>
        </div>
      ) : ex ? (
        <ExerciseStage
          key={ex.id}
          workoutId={workout.id}
          ex={ex}
          isFirst={exIdx === 0}
          isLast={exIdx === exercises.length - 1}
          onPrev={() => setExIdx((i) => Math.max(0, i - 1))}
          onNext={() => setExIdx((i) => Math.min(exercises.length - 1, i + 1))}
          onFinish={handleFinish}
          isFinishing={updateWorkout.isPending}
          onPrCheck={(w, r) => handlePrCheck(ex.exerciseId, ex.exercise.name, w, r)}
        />
      ) : null}

      {exercises.length > 0 && (
        <div className="space-y-2">
          <div className="px-1">
            <span className="eyebrow">Упражнения тренировки</span>
          </div>
          <SortableExerciseList
            items={exercises.map((e, i) => ({
              id: e.id,
              name: e.exercise.name,
              muscleGroup: e.exercise.muscleGroups?.[0] ?? null,
              totalSets: e.sets.length,
              doneSets: e.sets.filter((s) => s.completed).length,
              isActive: i === exIdx,
            }))}
            onReorder={(ids) => {
              const newIdx = ids.indexOf(exercises[exIdx]?.id ?? '')
              if (newIdx >= 0) setExIdx(newIdx)
              reorder.mutate(ids)
            }}
            onSelect={(id) => {
              const idx = exercises.findIndex((e) => e.id === id)
              if (idx >= 0) setExIdx(idx)
            }}
          />
        </div>
      )}

      <div className="flex flex-wrap gap-3 pt-1">
        <AddExerciseDialog
          workoutId={workout.id}
          currentCount={exercises.length}
        />
      </div>

      <CelebrationDialog
        open={!!celebration}
        onOpenChange={(v) => {
          if (!v) setCelebration(null)
        }}
        data={celebration}
        onClose={() => router.push('/workouts')}
      />
    </div>
  )
}

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

function ExerciseStage({
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
              {ex.exercise.muscleGroups?.[0] && <Chip>{ex.exercise.muscleGroups[0]}</Chip>}
            </div>
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
          {sets.map((s, i) => {
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
              <BodyweightToggle
                onClear={() => setBodyweight(false)}
                weight={weight}
              />
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

function BodyweightToggle({
  weight,
  onClear,
}: {
  weight: number
  onClear: () => void
}) {
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


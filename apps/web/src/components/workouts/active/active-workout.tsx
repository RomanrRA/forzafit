'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  ArrowLeft,
  Check,
  Pause,
  Play,
  Timer,
} from 'lucide-react'
import {
  WorkoutSession,
  useUpdateWorkout,
  useReorderWorkoutExercises,
  usePersonalRecords,
} from '@/hooks/use-workouts'
import type { WorkoutCompletedGamification } from '@/hooks/use-gamification'
import { CelebrationDialog } from '@/components/gamification/celebration-dialog'
import { AddExerciseDialog } from '@/components/workouts/add-exercise-dialog'
import { SortableExerciseList } from '@/components/workouts/sortable-exercise-list'
import { muscleRu } from '@/lib/exercise-labels'
import { toast } from '@/hooks/use-toast'
import { ExerciseStage } from './exercise-stage'
import { fmtClock } from './active-workout.utils'

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
              muscleGroup: e.exercise.muscleGroups?.[0]
                ? muscleRu(e.exercise.muscleGroups[0])
                : null,
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

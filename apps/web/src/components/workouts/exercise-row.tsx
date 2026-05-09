'use client'

import { useState } from 'react'
import { WorkoutExercise, useAddSet, useRemoveExerciseFromWorkout, useUpdateWorkoutExercise, useLastSetsForExercise } from '@/hooks/use-workouts'
import { SetRow } from './set-row'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Plus, ChevronDown, ChevronUp, Trash2, Timer } from 'lucide-react'
import { toast } from '@/hooks/use-toast'

const REST_OPTIONS = [
  { label: '30с', value: 30 },
  { label: '1м', value: 60 },
  { label: '1м 30с', value: 90 },
  { label: '2м', value: 120 },
  { label: '3м', value: 180 },
  { label: '5м', value: 300 },
]

function formatRest(sec: number) {
  if (sec >= 60) {
    const m = Math.floor(sec / 60)
    const s = sec % 60
    return s ? `${m}м ${s}с` : `${m}м`
  }
  return `${sec}с`
}

interface Props {
  workoutId: string
  workoutExercise: WorkoutExercise
}

export function ExerciseRow({ workoutId, workoutExercise }: Props) {
  const addSet = useAddSet(workoutId, workoutExercise.id)
  const removeExercise = useRemoveExerciseFromWorkout(workoutId)
  const updateExercise = useUpdateWorkoutExercise(workoutId)
  const { data: lastSets } = useLastSetsForExercise(workoutExercise.exerciseId)
  const [adding, setAdding] = useState(false)
  const [showDescription, setShowDescription] = useState(false)
  const [showRestPicker, setShowRestPicker] = useState(false)

  const restSec = workoutExercise.restTimerSec
  const restLabel = restSec ? formatRest(restSec) : null

  async function handleAddSet() {
    setAdding(true)
    try {
      const lastSet = workoutExercise.sets[workoutExercise.sets.length - 1]
      await addSet.mutateAsync({
        reps: lastSet?.reps ?? undefined,
        weightKg: lastSet?.weightKg ?? undefined,
      })
    } catch {
      toast({ variant: 'destructive', title: 'Ошибка', description: 'Не удалось добавить подход' })
    } finally {
      setAdding(false)
    }
  }

  async function handleSetRest(sec: number | null) {
    try {
      await updateExercise.mutateAsync({
        workoutExerciseId: workoutExercise.id,
        restTimerSec: sec ?? 0,
      })
      setShowRestPicker(false)
    } catch {
      toast({ variant: 'destructive', title: 'Ошибка' })
    }
  }

  const totalSets = workoutExercise.sets.length
  const doneSets = workoutExercise.sets.filter((s) => s.completed).length
  const nextSetIdx = workoutExercise.sets.findIndex((s) => !s.completed)
  const allDone = totalSets > 0 && doneSets === totalSets

  return (
    <Card className={allDone ? 'strong' : ''}>
      <CardHeader className="pb-2 pt-3 sm:pt-4 px-3 sm:px-4">
        <div className="flex items-start justify-between gap-2">
          {/* Название + группа мышц + set dots */}
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              {workoutExercise.exercise.muscleGroups?.[0] && (
                <span
                  style={{
                    fontSize: 10,
                    fontWeight: 800,
                    letterSpacing: 0.5,
                    textTransform: 'uppercase',
                    padding: '3px 8px',
                    borderRadius: 'var(--r-pill)',
                    background: 'var(--gl-bg)',
                    border: '1px solid var(--gl-border)',
                    color: 'var(--txt-2)',
                  }}
                >
                  {workoutExercise.exercise.muscleGroups[0]}
                </span>
              )}
              {allDone && (
                <span
                  style={{
                    fontSize: 10,
                    fontWeight: 800,
                    letterSpacing: 0.5,
                    textTransform: 'uppercase',
                    padding: '3px 8px',
                    borderRadius: 'var(--r-pill)',
                    background: 'color-mix(in oklab, var(--c-green) 22%, transparent)',
                    border: '1px solid color-mix(in oklab, var(--c-green) 36%, transparent)',
                    color: 'var(--c-green)',
                  }}
                >
                  ✓ закрыто
                </span>
              )}
            </div>
            <div
              className="mt-1.5 leading-tight truncate"
              style={{
                fontSize: 'clamp(15px, 2.4vw, 18px)',
                fontWeight: 800,
                letterSpacing: -0.2,
                color: 'var(--txt-1)',
              }}
            >
              {workoutExercise.exercise.name}
            </div>
            {/* Set dots */}
            {totalSets > 0 && (
              <div className="flex gap-1 mt-2 items-center">
                {workoutExercise.sets.map((s, i) => (
                  <div
                    key={s.id}
                    style={{
                      flex: 1,
                      maxWidth: 40,
                      height: 6,
                      borderRadius: 999,
                      background: s.completed
                        ? 'color-mix(in oklab, var(--c-green) 60%, transparent)'
                        : 'var(--gl-bg)',
                      outline: !s.completed && i === nextSetIdx ? '1.5px solid var(--c-accent)' : 'none',
                      outlineOffset: 2,
                    }}
                  />
                ))}
                <span
                  className="tnum ml-1.5 text-[11px] font-bold"
                  style={{ color: 'var(--txt-3)' }}
                >
                  {doneSets}/{totalSets}
                </span>
              </div>
            )}
          </div>
          {/* Правые кнопки */}
          <div className="flex items-center gap-1 shrink-0">
            <button
              onClick={() => setShowRestPicker((v) => !v)}
              className={`text-xs flex items-center gap-0.5 transition-colors ${
                restLabel
                  ? 'text-primary hover:text-primary/80'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <Timer className="h-3.5 w-3.5" />
              {restLabel && <span className="hidden min-[360px]:inline">{restLabel}</span>}
            </button>
            {workoutExercise.exercise.description && (
              <button
                onClick={() => setShowDescription((v) => !v)}
                className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-0.5 transition-colors"
              >
                {showDescription ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
              </button>
            )}
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6 text-muted-foreground hover:text-destructive"
              onClick={() => removeExercise.mutate(workoutExercise.id)}
              disabled={removeExercise.isPending}
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="px-3 sm:px-4 pb-3 sm:pb-4 space-y-0.5 sm:space-y-1">
        {/* Выбор времени отдыха */}
        {showRestPicker && (
          <div className="flex flex-wrap gap-1.5 pb-2">
            {REST_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                onClick={() => handleSetRest(opt.value)}
                className={`px-2.5 py-1 rounded-md text-xs border transition-colors ${
                  restSec === opt.value
                    ? 'bg-primary text-primary-foreground border-primary'
                    : 'bg-muted/50 border-border hover:bg-muted'
                }`}
              >
                {opt.label}
              </button>
            ))}
            {restSec && (
              <button
                onClick={() => handleSetRest(null)}
                className="px-2.5 py-1 rounded-md text-xs border border-border text-muted-foreground hover:text-destructive hover:border-destructive transition-colors"
              >
                Убрать
              </button>
            )}
          </div>
        )}

        {showDescription && workoutExercise.exercise.description && (
          <p className="text-sm text-muted-foreground bg-muted/50 rounded-md px-3 py-2 mb-2 leading-relaxed">
            {workoutExercise.exercise.description}
          </p>
        )}
        {workoutExercise.sets.length > 0 && (
          <div className="flex gap-1 sm:gap-1.5 text-[10px] sm:text-xs text-muted-foreground mb-0.5 pl-6 pr-[68px] sm:pr-[62px]">
            <span className="flex-1 text-center">Вес</span>
            <span className="text-transparent select-none">×</span>
            <span className="flex-1 text-center">Повт.</span>
          </div>
        )}
        {workoutExercise.sets.map((set, i) => (
          <div key={set.id}>
            <SetRow
              workoutId={workoutId}
              workoutExerciseId={workoutExercise.id}
              set={set}
              index={i}
              prevSet={lastSets?.[i] ?? null}
            />
            {/* Разделитель с отдыхом между выполненными подходами */}
            {set.completed && i < workoutExercise.sets.length - 1 && restLabel && (
              <div className="flex items-center gap-2 py-0.5 pl-6 pr-[68px] sm:pr-[62px]">
                <div className="flex-1 border-t border-dashed border-muted-foreground/20" />
                <span className="text-[10px] text-muted-foreground flex items-center gap-0.5">
                  <Timer className="h-2.5 w-2.5" />
                  {restLabel}
                </span>
                <div className="flex-1 border-t border-dashed border-muted-foreground/20" />
              </div>
            )}
          </div>
        ))}
        <Button
          variant="ghost"
          size="sm"
          className="mt-2 text-muted-foreground"
          onClick={handleAddSet}
          disabled={adding}
        >
          <Plus className="h-3 w-3 mr-1" />
          Добавить подход
        </Button>
      </CardContent>
    </Card>
  )
}

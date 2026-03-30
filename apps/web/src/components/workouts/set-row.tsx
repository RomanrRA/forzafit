'use client'

import { useState } from 'react'
import { WorkoutSet, useUpdateSet, useDeleteSet, LastSet } from '@/hooks/use-workouts'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Check, Trash2, User } from 'lucide-react'
import { cn } from '@/lib/utils'

interface Props {
  workoutId: string
  workoutExerciseId: string
  set: WorkoutSet
  index: number
  prevSet?: LastSet | null
}

export function SetRow({ workoutId, workoutExerciseId, set, index, prevSet }: Props) {
  const [weight, setWeight] = useState(set.weightKg?.toString() ?? '')
  const [reps, setReps] = useState(set.reps?.toString() ?? '')
  const [bodyweight, setBodyweight] = useState(set.weightKg === 0)
  const updateSet = useUpdateSet(workoutId, workoutExerciseId)
  const deleteSet = useDeleteSet(workoutId, workoutExerciseId)

  async function handleToggle() {
    await updateSet.mutateAsync({
      setId: set.id,
      completed: !set.completed,
      weightKg: bodyweight ? 0 : (weight ? parseFloat(weight) : undefined),
      reps: reps ? parseInt(reps) : undefined,
    })
  }

  async function handleBlur() {
    if (weight !== (set.weightKg?.toString() ?? '') || reps !== (set.reps?.toString() ?? '')) {
      await updateSet.mutateAsync({
        setId: set.id,
        weightKg: bodyweight ? 0 : (weight ? parseFloat(weight) : undefined),
        reps: reps ? parseInt(reps) : undefined,
        _silent: true,
      })
    }
  }

  async function toggleBodyweight() {
    const next = !bodyweight
    setBodyweight(next)
    if (next) {
      setWeight('')
      await updateSet.mutateAsync({
        setId: set.id,
        weightKg: 0,
        reps: reps ? parseInt(reps) : undefined,
        _silent: true,
      })
    }
  }

  const prevLabel = prevSet && (prevSet.weightKg != null || prevSet.reps != null)
    ? `${prevSet.weightKg === 0 ? 'СВ' : (prevSet.weightKg ?? '—') + 'кг'} × ${prevSet.reps ?? '—'}`
    : null

  return (
    <div className={cn('py-1', set.completed && 'opacity-60')}>
      {/* Подсказка «прошлый раз» — отдельная строка */}
      {prevLabel && (
        <div className="flex items-center gap-1 ml-6 mb-0.5">
          <span className="text-[10px] text-muted-foreground/60 select-none">
            прошлый: {prevLabel}
          </span>
        </div>
      )}
      {/* Основная строка */}
      <div className="flex items-center gap-1 sm:gap-1.5">
        <span className="text-xs text-muted-foreground w-5 shrink-0 text-center">{index + 1}</span>

        {/* Вес */}
        {bodyweight ? (
          <button
            onClick={toggleBodyweight}
            className="h-8 sm:h-7 flex-1 min-w-0 rounded-md border border-primary/50 bg-primary/10 text-xs font-medium text-primary flex items-center justify-center gap-1"
            title="Свой вес — нажмите для ввода кг"
          >
            <User className="h-3 w-3 shrink-0" />
            <span className="hidden min-[360px]:inline">свой вес</span>
            <span className="inline min-[360px]:hidden">СВ</span>
          </button>
        ) : (
          <div className="flex-1 min-w-0 flex gap-0.5">
            <Input
              type="number"
              inputMode="decimal"
              min={0}
              step={0.5}
              placeholder="кг"
              className="h-8 sm:h-7 w-full text-sm py-0 text-center"
              value={weight}
              onChange={(e) => setWeight(e.target.value)}
              onBlur={handleBlur}
            />
            <button
              onClick={toggleBodyweight}
              className="h-8 sm:h-7 w-8 sm:w-7 shrink-0 rounded-md border border-border text-muted-foreground hover:text-primary hover:border-primary/50 flex items-center justify-center transition-colors"
              title="Свой вес"
            >
              <User className="h-3 w-3" />
            </button>
          </div>
        )}

        <span className="text-muted-foreground text-xs shrink-0">×</span>

        {/* Повторения */}
        <Input
          type="number"
          inputMode="numeric"
          min={1}
          placeholder="повт"
          className="h-8 sm:h-7 flex-1 min-w-0 text-sm py-0 text-center"
          value={reps}
          onChange={(e) => setReps(e.target.value)}
          onBlur={handleBlur}
        />

        {/* Выполнено */}
        <Button
          size="icon"
          variant={set.completed ? 'default' : 'outline'}
          className="h-8 w-8 sm:h-7 sm:w-7 shrink-0"
          onClick={handleToggle}
          disabled={updateSet.isPending}
        >
          <Check className="h-3 w-3" />
        </Button>

        {/* Удалить */}
        <Button
          size="icon"
          variant="ghost"
          className="h-8 w-8 sm:h-7 sm:w-7 shrink-0 text-muted-foreground hover:text-destructive"
          onClick={() => deleteSet.mutate(set.id)}
          disabled={deleteSet.isPending}
        >
          <Trash2 className="h-3 w-3" />
        </Button>
      </div>
    </div>
  )
}

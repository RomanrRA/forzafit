'use client'

import { useState } from 'react'
import { WorkoutSet, useUpdateSet, useDeleteSet, LastSet } from '@/hooks/use-workouts'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Check, Trash2 } from 'lucide-react'
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
  const updateSet = useUpdateSet(workoutId, workoutExerciseId)
  const deleteSet = useDeleteSet(workoutId, workoutExerciseId)

  async function handleToggle() {
    await updateSet.mutateAsync({
      setId: set.id,
      completed: !set.completed,
      weightKg: weight ? parseFloat(weight) : undefined,
      reps: reps ? parseInt(reps) : undefined,
    })
  }

  async function handleBlur() {
    if (weight !== (set.weightKg?.toString() ?? '') || reps !== (set.reps?.toString() ?? '')) {
      await updateSet.mutateAsync({
        setId: set.id,
        weightKg: weight ? parseFloat(weight) : undefined,
        reps: reps ? parseInt(reps) : undefined,
        _silent: true,
      })
    }
  }

  const prevLabel = prevSet && (prevSet.weightKg != null || prevSet.reps != null)
    ? `${prevSet.weightKg ?? '—'}кг × ${prevSet.reps ?? '—'}`
    : null

  return (
    <div className={cn('flex items-center gap-1.5 py-1', set.completed && 'opacity-60')}>
      <span className="text-xs text-muted-foreground w-5 shrink-0 text-center">{index + 1}</span>
      <Input
        type="number"
        min={0}
        step={0.5}
        placeholder="кг"
        className="h-7 flex-1 min-w-0 text-sm py-0 text-center"
        value={weight}
        onChange={(e) => setWeight(e.target.value)}
        onBlur={handleBlur}
      />
      <span className="text-muted-foreground text-xs shrink-0">×</span>
      <Input
        type="number"
        min={1}
        placeholder="повт."
        className="h-7 flex-1 min-w-0 text-sm py-0 text-center"
        value={reps}
        onChange={(e) => setReps(e.target.value)}
        onBlur={handleBlur}
      />
      <Button
        size="icon"
        variant={set.completed ? 'default' : 'outline'}
        className="h-7 w-7 shrink-0"
        onClick={handleToggle}
        disabled={updateSet.isPending}
      >
        <Check className="h-3 w-3" />
      </Button>
      <Button
        size="icon"
        variant="ghost"
        className="h-7 w-7 shrink-0 text-muted-foreground hover:text-destructive"
        onClick={() => deleteSet.mutate(set.id)}
        disabled={deleteSet.isPending}
      >
        <Trash2 className="h-3 w-3" />
      </Button>
      {prevLabel && (
        <span className="text-[10px] text-muted-foreground/40 shrink-0 select-none">
          {prevLabel}
        </span>
      )}
    </div>
  )
}

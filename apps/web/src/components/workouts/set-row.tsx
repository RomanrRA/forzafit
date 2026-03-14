'use client'

import { useState } from 'react'
import { WorkoutSet, useUpdateSet, useDeleteSet } from '@/hooks/use-workouts'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Check, Trash2 } from 'lucide-react'
import { cn } from '@/lib/utils'

interface Props {
  workoutId: string
  workoutExerciseId: string
  set: WorkoutSet
  index: number
}

export function SetRow({ workoutId, workoutExerciseId, set, index }: Props) {
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

  return (
    <div className={cn('flex items-center gap-2 py-1', set.completed && 'opacity-60')}>
      <span className="text-xs text-muted-foreground w-5 text-center">{index + 1}</span>
      <Input
        type="number"
        min={0}
        step={0.5}
        placeholder="кг"
        className="h-7 w-20 text-sm py-0 text-center"
        value={weight}
        onChange={(e) => setWeight(e.target.value)}
        onBlur={handleBlur}
      />
      <span className="text-muted-foreground text-xs">×</span>
      <Input
        type="number"
        min={1}
        placeholder="повт."
        className="h-7 w-20 text-sm py-0 text-center"
        value={reps}
        onChange={(e) => setReps(e.target.value)}
        onBlur={handleBlur}
      />
      <Button
        size="icon"
        variant={set.completed ? 'default' : 'outline'}
        className="h-7 w-7"
        onClick={handleToggle}
        disabled={updateSet.isPending}
      >
        <Check className="h-3 w-3" />
      </Button>
      <Button
        size="icon"
        variant="ghost"
        className="h-7 w-7 text-muted-foreground hover:text-destructive"
        onClick={() => deleteSet.mutate(set.id)}
        disabled={deleteSet.isPending}
      >
        <Trash2 className="h-3 w-3" />
      </Button>
    </div>
  )
}

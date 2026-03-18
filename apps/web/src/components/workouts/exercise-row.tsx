'use client'

import { useState } from 'react'
import { WorkoutExercise, useAddSet, useRemoveExerciseFromWorkout, useLastSetsForExercise } from '@/hooks/use-workouts'
import { SetRow } from './set-row'
import { RestTimer } from './rest-timer'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Plus, ChevronDown, ChevronUp, Trash2 } from 'lucide-react'
import { toast } from '@/hooks/use-toast'

interface Props {
  workoutId: string
  workoutExercise: WorkoutExercise
}

export function ExerciseRow({ workoutId, workoutExercise }: Props) {
  const addSet = useAddSet(workoutId, workoutExercise.id)
  const removeExercise = useRemoveExerciseFromWorkout(workoutId)
  const { data: lastSets } = useLastSetsForExercise(workoutExercise.exerciseId)
  const [adding, setAdding] = useState(false)
  const [showDescription, setShowDescription] = useState(false)

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

  return (
    <Card>
      <CardHeader className="pb-2 pt-4 px-4">
        <div className="flex items-start justify-between gap-2">
          {/* Название + группа мышц — занимает оставшееся место */}
          <div className="min-w-0 flex-1">
            <span className="font-medium leading-snug">{workoutExercise.exercise.name}</span>
            {workoutExercise.exercise.muscleGroups?.[0] && (
              <Badge variant="secondary" className="text-xs ml-2 align-middle">
                {workoutExercise.exercise.muscleGroups[0]}
              </Badge>
            )}
          </div>
          {/* Правые кнопки — фиксированная ширина, не сжимаются */}
          <div className="flex items-center gap-1.5 shrink-0">
            <span className="text-xs text-muted-foreground whitespace-nowrap">
              {workoutExercise.sets.filter((s) => s.completed).length}/{workoutExercise.sets.length}
            </span>
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
      <CardContent className="px-4 pb-4 space-y-1">
        {showDescription && workoutExercise.exercise.description && (
          <p className="text-sm text-muted-foreground bg-muted/50 rounded-md px-3 py-2 mb-2 leading-relaxed">
            {workoutExercise.exercise.description}
          </p>
        )}
        {workoutExercise.sets.length > 0 && (
          <div className="flex gap-1.5 text-xs text-muted-foreground mb-1 pl-[26px] pr-[62px]">
            <span className="flex-1 text-center">Вес</span>
            <span className="text-transparent select-none">×</span>
            <span className="flex-1 text-center">Повт.</span>
            {lastSets && lastSets.length > 0 && (
              <span className="text-[10px] opacity-40 shrink-0 ml-auto">прошлый раз</span>
            )}
          </div>
        )}
        {workoutExercise.sets.map((set, i) => (
          <SetRow
            key={set.id}
            workoutId={workoutId}
            workoutExerciseId={workoutExercise.id}
            set={set}
            index={i}
            prevSet={lastSets?.[i] ?? null}
          />
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
        <RestTimer />
      </CardContent>
    </Card>
  )
}

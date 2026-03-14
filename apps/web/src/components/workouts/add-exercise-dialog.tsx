'use client'

import { useState } from 'react'
import { useExercises } from '@/hooks/use-exercises'
import { useAddExerciseToWorkout } from '@/hooks/use-workouts'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Plus, Search } from 'lucide-react'
import { toast } from '@/hooks/use-toast'

interface Props {
  workoutId: string
  currentCount: number
}

export function AddExerciseDialog({ workoutId, currentCount }: Props) {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')

  const { data } = useExercises({ search: search || undefined })
  const addExercise = useAddExerciseToWorkout(workoutId)

  const exercises = data?.items ?? []

  async function handleAdd(exerciseId: string) {
    try {
      await addExercise.mutateAsync({ exerciseId, orderIndex: currentCount })
      setOpen(false)
      setSearch('')
    } catch {
      toast({ variant: 'destructive', title: 'Ошибка', description: 'Не удалось добавить упражнение' })
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline">
          <Plus className="h-4 w-4 mr-2" />
          Добавить упражнение
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Добавить упражнение</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Поиск упражнения..."
              className="pl-9"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <div className="max-h-80 overflow-y-auto space-y-1">
            {exercises.length === 0 && (
              <p className="text-center text-sm text-muted-foreground py-4">Упражнения не найдены</p>
            )}
            {exercises.map((ex) => (
              <button
                key={ex.id}
                onClick={() => handleAdd(ex.id)}
                disabled={addExercise.isPending}
                className="w-full text-left rounded-md px-3 py-2 hover:bg-accent transition-colors flex items-center justify-between"
              >
                <div>
                  <p className="text-sm font-medium">{ex.name}</p>
                  {ex.muscleGroups?.[0] && (
                    <p className="text-xs text-muted-foreground">{ex.muscleGroups[0]}</p>
                  )}
                </div>
                {ex.isCustom && <Badge variant="secondary">Своё</Badge>}
              </button>
            ))}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

'use client'

import { use, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { format, formatDistanceStrict } from 'date-fns'
import { ru } from 'date-fns/locale'
import { useWorkout, useUpdateWorkout, useDeleteWorkout } from '@/hooks/use-workouts'
import { AddExerciseDialog } from '@/components/workouts/add-exercise-dialog'
import { ExerciseRow } from '@/components/workouts/exercise-row'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogFooter,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { toast } from '@/hooks/use-toast'
import { ArrowLeft, Dumbbell, CheckCircle2, Clock, Trash2 } from 'lucide-react'

interface Props {
  params: Promise<{ id: string }>
}

export default function WorkoutDetailPage({ params }: Props) {
  const { id } = use(params)
  const router = useRouter()
  const { data: workout, isLoading } = useWorkout(id)
  const updateWorkout = useUpdateWorkout(id)
  const deleteWorkout = useDeleteWorkout()
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)

  async function handleFinish() {
    try {
      await updateWorkout.mutateAsync({ finishedAt: new Date().toISOString() })
      toast({ title: 'Тренировка завершена' })
      router.push('/workouts')
    } catch {
      toast({ variant: 'destructive', title: 'Ошибка', description: 'Не удалось сохранить тренировку' })
    }
  }

  async function handleDelete() {
    try {
      await deleteWorkout.mutateAsync(id)
      toast({ title: 'Тренировка удалена' })
      router.push('/workouts')
    } catch {
      toast({ variant: 'destructive', title: 'Ошибка', description: 'Не удалось удалить тренировку' })
    }
  }

  if (isLoading) return <div className="text-muted-foreground">Загрузка...</div>
  if (!workout) return <div className="text-muted-foreground">Тренировка не найдена</div>

  const duration = workout.finishedAt
    ? formatDistanceStrict(new Date(workout.finishedAt), new Date(workout.startedAt), { locale: ru })
    : null

  return (
    <div className="w-full max-w-2xl space-y-5">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/workouts"><ArrowLeft className="h-4 w-4" /></Link>
        </Button>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold">{workout.title}</h1>
            {workout.finishedAt && (
              <Badge variant="secondary" className="text-xs">
                <CheckCircle2 className="h-3 w-3 mr-1" />
                Завершена
              </Badge>
            )}
          </div>
          <p className="text-sm text-muted-foreground flex items-center gap-1">
            <Clock className="h-3 w-3" />
            {format(new Date(workout.startedAt), 'd MMMM yyyy, HH:mm', { locale: ru })}
            {workout.finishedAt && <> — {format(new Date(workout.finishedAt), 'HH:mm')} ({duration})</>}
          </p>
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="text-muted-foreground hover:text-destructive"
          onClick={() => setShowDeleteDialog(true)}
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>

      {workout.notes && (
        <p className="text-sm text-muted-foreground bg-muted rounded-md px-3 py-2">
          {workout.notes}
        </p>
      )}

      <div className="space-y-3">
        {workout.exercises?.length === 0 && (
          <div className="text-center py-10 text-muted-foreground">
            <Dumbbell className="h-10 w-10 mx-auto mb-2 opacity-30" />
            <p>Добавьте первое упражнение</p>
          </div>
        )}
        {workout.exercises?.map((ex) => (
          <ExerciseRow key={ex.id} workoutId={workout.id} workoutExercise={ex} />
        ))}
      </div>

      <div className="flex gap-3 pt-2 flex-wrap">
        <AddExerciseDialog workoutId={workout.id} currentCount={workout.exercises?.length ?? 0} />
        {!workout.finishedAt && (
          <Button
            onClick={handleFinish}
            disabled={updateWorkout.isPending}
            className="flex-1"
          >
            <CheckCircle2 className="h-4 w-4 mr-2" />
            {updateWorkout.isPending ? 'Сохранение...' : 'Завершить тренировку'}
          </Button>
        )}
      </div>

      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Удалить тренировку?</DialogTitle>
            <DialogDescription>
              Тренировка «{workout.title}» будет удалена безвозвратно вместе со всеми упражнениями и подходами.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDeleteDialog(false)}>
              Отмена
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={deleteWorkout.isPending}
            >
              {deleteWorkout.isPending ? 'Удаление...' : 'Удалить'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

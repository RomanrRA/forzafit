'use client'

import { use, useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { format, formatDistanceStrict } from 'date-fns'
import { ru } from 'date-fns/locale'
import { useWorkout, useUpdateWorkout, useDeleteWorkout } from '@/hooks/use-workouts'
import type { WorkoutCompletedGamification } from '@/hooks/use-gamification'
import { AddExerciseDialog } from '@/components/workouts/add-exercise-dialog'
import { ExerciseRow } from '@/components/workouts/exercise-row'
import { SortableWorkoutExercises } from '@/components/workouts/sortable-workout-exercises'
import { WorkoutAdvicePanel } from '@/components/workouts/workout-advice-panel'
import { CelebrationDialog } from '@/components/gamification/celebration-dialog'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogFooter,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { toast } from '@/hooks/use-toast'
import { ArrowLeft, Dumbbell, CheckCircle2, Timer, Trash2, Play } from 'lucide-react'

function fmtClock(totalSec: number): string {
  const h = Math.floor(totalSec / 3600)
  const m = Math.floor((totalSec % 3600) / 60)
  const s = totalSec % 60
  if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
  return `${m}:${String(s).padStart(2, '0')}`
}

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
  const [celebration, setCelebration] = useState<WorkoutCompletedGamification | null>(null)

  async function handleFinish() {
    try {
      const result = await updateWorkout.mutateAsync({ finishedAt: new Date().toISOString() })
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

  // Live elapsed counter for unfinished sessions
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    if (!workout || workout.finishedAt) return
    const id = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(id)
  }, [workout])

  if (isLoading) return <div className="text-muted-foreground">Загрузка...</div>
  if (!workout) return <div className="text-muted-foreground">Тренировка не найдена</div>

  const isActive = !workout.finishedAt
  const exercises = workout.exercises ?? []
  const totalEx = exercises.length
  const completedEx = exercises.filter(
    (ex) => ex.sets.length > 0 && ex.sets.every((s) => s.completed),
  ).length
  const elapsedSec = Math.max(
    0,
    Math.floor(((isActive ? now : new Date(workout.finishedAt!).getTime()) - new Date(workout.startedAt).getTime()) / 1000),
  )
  const finalDuration = workout.finishedAt
    ? formatDistanceStrict(new Date(workout.finishedAt), new Date(workout.startedAt), { locale: ru })
    : null

  return (
    <div className="w-full max-w-3xl space-y-5 fz-rise">
      {/* ── Active workout header ──────────────────────── */}
      <div className="glass-card strong p-4 sm:p-5">
        <div className="flex items-center gap-2 sm:gap-3">
          <Link
            href="/workouts"
            className="glass-btn grid place-items-center shrink-0"
            style={{ width: 36, height: 36, borderRadius: 11 }}
            title="Назад"
          >
            <ArrowLeft className="h-4 w-4" />
          </Link>

          <div className="min-w-0 flex-1">
            <div className="eyebrow" style={{ color: isActive ? 'var(--c-accent)' : 'var(--txt-3)' }}>
              {isActive ? 'Активная тренировка' : 'Тренировка завершена'}
            </div>
            <div className="flex items-center gap-2 mt-0.5 flex-wrap">
              <h1
                className="truncate"
                style={{
                  fontSize: 'clamp(20px, 3.6vw, 26px)',
                  fontWeight: 800,
                  letterSpacing: -0.4,
                  lineHeight: 1.1,
                  color: 'var(--txt-1)',
                }}
              >
                {workout.title}
              </h1>
              {totalEx > 0 && (
                <span className="text-[13px] font-semibold txt-muted">
                  <span className="tnum">{completedEx}</span>
                  <span className="txt-soft mx-0.5">/</span>
                  <span className="tnum">{totalEx}</span>
                  <span className="ml-1 txt-soft">упр.</span>
                </span>
              )}
            </div>
          </div>

          {/* Timer pill */}
          <div
            className="hidden sm:flex items-center gap-2 shrink-0"
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

          {/* Finish / delete */}
          {isActive ? (
            <button
              onClick={handleFinish}
              disabled={updateWorkout.isPending}
              className="shrink-0 inline-flex items-center gap-1.5"
              style={{
                padding: '0 14px',
                height: 40,
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
              <CheckCircle2 className="h-4 w-4" strokeWidth={2.4} />
              <span className="hidden sm:inline">Завершить</span>
            </button>
          ) : (
            <button
              onClick={() => setShowDeleteDialog(true)}
              className="glass-btn grid place-items-center shrink-0"
              style={{ width: 36, height: 36, borderRadius: 11, color: 'var(--c-red)' }}
              title="Удалить"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          )}
        </div>

        {/* Meta row */}
        <div className="mt-3 flex items-center gap-3 flex-wrap text-xs txt-soft">
          <span>
            {format(new Date(workout.startedAt), 'd MMMM yyyy, HH:mm', { locale: ru })}
          </span>
          {workout.finishedAt && (
            <>
              <span>·</span>
              <span>завершена в {format(new Date(workout.finishedAt), 'HH:mm')}</span>
              <span>·</span>
              <span className="font-bold" style={{ color: 'var(--c-green)' }}>
                {finalDuration}
              </span>
            </>
          )}
        </div>

        {/* Mobile timer below the header row */}
        {isActive && (
          <div className="sm:hidden mt-3 flex items-center gap-2">
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
            <span className="txt-soft text-[11px] uppercase font-bold tracking-wider ml-2">
              в работе
            </span>
          </div>
        )}
      </div>

      {isActive && totalEx > 0 && (() => {
        const hasStarted = exercises.some((ex) => ex.sets.some((s) => s.completed))
        return (
          <Link
            href={`/workouts/${workout.id}/active`}
            className="glass-btn-primary inline-flex items-center justify-center gap-2"
            style={{
              padding: '14px 22px',
              minHeight: 52,
              borderRadius: 16,
              fontSize: 15,
              fontWeight: 800,
              width: '100%',
            }}
          >
            <Play className="h-4 w-4" strokeWidth={2.4} />
            {hasStarted ? 'Продолжить тренировку' : 'Начать тренировку'}
          </Link>
        )
      })()}

      {workout.notes && (
        <p className="glass-card p-3 text-sm txt-muted">{workout.notes}</p>
      )}

      {isActive && exercises.length > 0 && (
        <WorkoutAdvicePanel sessionId={workout.id} />
      )}

      {exercises.length === 0 ? (
        <div className="glass-card text-center py-10 txt-muted">
          <Dumbbell className="h-10 w-10 mx-auto mb-2 opacity-30" />
          <p>Добавьте первое упражнение</p>
        </div>
      ) : isActive ? (
        <SortableWorkoutExercises workoutId={workout.id} exercises={exercises} />
      ) : (
        <div className="space-y-3">
          {exercises.map((ex) => (
            <ExerciseRow key={ex.id} workoutId={workout.id} workoutExercise={ex} />
          ))}
        </div>
      )}

      <div className="flex gap-3 pt-2 flex-wrap">
        <AddExerciseDialog workoutId={workout.id} currentCount={exercises.length} />
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

      <CelebrationDialog
        open={!!celebration}
        onOpenChange={(v) => { if (!v) setCelebration(null) }}
        data={celebration}
        onClose={() => router.push('/workouts')}
      />
    </div>
  )
}

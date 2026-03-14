'use client'

import { use, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { notFound } from 'next/navigation'
import { addDays } from 'date-fns'
import { WORKOUT_PLANS } from '@/data/plans'
import { usePlanTemplate, useDeletePlanTemplate, useSchedulePlan } from '@/hooks/use-plan-templates'
import { api } from '@/lib/api'
import { useExercises } from '@/hooks/use-exercises'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { toast } from '@/hooks/use-toast'
import { ArrowLeft, Play, Dumbbell, Coffee, ChevronDown, ChevronUp, Pencil, Trash2, CalendarPlus } from 'lucide-react'
import { cn } from '@/lib/utils'

const DIFFICULTY_LABEL = { beginner: 'Начинающий', intermediate: 'Средний', advanced: 'Продвинутый' }

// UUID regex to distinguish user plans from static plan IDs
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

interface PlanDay {
  dayNumber: number
  name: string
  focus?: string
  isRest: boolean
  exercises: { exerciseId?: string; name: string; sets: number; reps: string; rest: string; note?: string; weightKg?: number }[]
}

interface PlanLike {
  id: string
  name: string
  description?: string | null
  goal?: string | null
  difficulty?: 'beginner' | 'intermediate' | 'advanced' | null
  daysPerWeek: number
  duration?: string | null
  days: PlanDay[]
}

interface Props {
  params: Promise<{ id: string }>
}

// ─── Days renderer (shared) ───────────────────────────────────────────────────

function PlanDays({ plan, exercises, onWorkoutCreated }: {
  plan: PlanLike
  exercises: { id: string; name: string }[]
  onWorkoutCreated: (workoutId: string) => void
}) {
  const [expandedDay, setExpandedDay] = useState<number | null>(1)
  const [startingDay, setStartingDay] = useState<number | null>(null)

  async function handleStartDay(dayNumber: number) {
    const day = plan.days.find((d) => d.dayNumber === dayNumber)
    if (!day || day.isRest) return

    setStartingDay(dayNumber)
    try {
      const { data: workout } = await api.post('/workouts', {
        title: `${plan.name} — ${day.name}`,
        startedAt: new Date().toISOString(),
      })

      const lastSetsCache = new Map<string, { weightKg: number | null; reps: number | null; restTimerSec: number | null }[]>()

      for (let i = 0; i < (day.exercises ?? []).length; i++) {
        const planEx = (day.exercises ?? [])[i]
        const foundId = planEx.exerciseId
          ?? exercises.find((e) => e.name.toLowerCase() === planEx.name.toLowerCase())?.id
        if (foundId) {
          const { data: we } = await api.post(`/workouts/${workout.id}/exercises`, {
            exerciseId: foundId,
            orderIndex: i,
          })

          if (!lastSetsCache.has(foundId)) {
            try {
              const { data: lastSets } = await api.get(`/workouts/last-sets/${foundId}`)
              lastSetsCache.set(foundId, lastSets ?? [])
            } catch {
              lastSetsCache.set(foundId, [])
            }
          }
          const lastSets = lastSetsCache.get(foundId)!

          if (lastSets.length > 0) {
            for (const s of lastSets) {
              await api.post(`/workouts/${workout.id}/exercises/${we.id}/sets`, {
                weightKg: s.weightKg,
                reps: s.reps,
                restTimerSec: s.restTimerSec,
              })
            }
          } else {
            const setsCount = typeof planEx.sets === 'number' ? planEx.sets : 3
            const planReps = planEx.reps ? parseInt(planEx.reps) || undefined : undefined
            const planWeight = planEx.weightKg != null ? planEx.weightKg : undefined
            for (let s = 0; s < setsCount; s++) {
              const body: Record<string, unknown> = {}
              if (planWeight !== undefined) body.weightKg = planWeight
              if (planReps !== undefined) body.reps = planReps
              await api.post(`/workouts/${workout.id}/exercises/${we.id}/sets`, body)
            }
          }
        }
      }

      toast({ title: 'Тренировка создана', description: day.name })
      onWorkoutCreated(workout.id)
    } catch {
      toast({ variant: 'destructive', title: 'Ошибка', description: 'Не удалось создать тренировку' })
    } finally {
      setStartingDay(null)
    }
  }

  return (
    <div className="space-y-2">
      <h2 className="text-lg font-semibold">Расписание</h2>
      {plan.days.map((day, i) => {
        const isExpanded = expandedDay === day.dayNumber
        return (
          <Card key={`day-${day.dayNumber ?? i}`} className={cn(day.isRest && 'opacity-60')}>
            <CardHeader
              className="py-3 px-4 cursor-pointer"
              onClick={() => !day.isRest && setExpandedDay(isExpanded ? null : day.dayNumber)}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {day.isRest
                    ? <Coffee className="h-4 w-4 text-muted-foreground" />
                    : <Dumbbell className="h-4 w-4 text-primary" />
                  }
                  <CardTitle className="text-sm font-medium">{day.name}</CardTitle>
                  {!day.isRest && (
                    <Badge variant="secondary" className="text-xs">{day.exercises?.length ?? 0} упр.</Badge>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  {!day.isRest && (
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-7 text-xs"
                      disabled={startingDay === day.dayNumber}
                      onClick={(e) => { e.stopPropagation(); handleStartDay(day.dayNumber) }}
                    >
                      <Play className="h-3 w-3 mr-1" />
                      {startingDay === day.dayNumber ? 'Создание...' : 'Начать'}
                    </Button>
                  )}
                  {!day.isRest && (
                    isExpanded
                      ? <ChevronUp className="h-4 w-4 text-muted-foreground" />
                      : <ChevronDown className="h-4 w-4 text-muted-foreground" />
                  )}
                </div>
              </div>
            </CardHeader>

            {isExpanded && !day.isRest && (
              <CardContent className="px-4 pb-4 pt-0">
                <div className="border-t pt-3 space-y-2">
                  <div className="grid grid-cols-4 text-xs text-muted-foreground font-medium mb-1">
                    <span className="col-span-2">Упражнение</span>
                    <span>Подходы × Повт.</span>
                    <span>Отдых</span>
                  </div>
                  {(day.exercises ?? []).map((ex, i) => (
                    <div key={i} className="grid grid-cols-4 text-sm py-1 border-b last:border-0">
                      <span className="col-span-2 font-medium">{ex.name}</span>
                      <span className="text-muted-foreground">{ex.sets} × {ex.reps}</span>
                      <span className="text-muted-foreground">{ex.rest}</span>
                      {ex.note && (
                        <span className="col-span-4 text-xs text-muted-foreground mt-0.5 italic">{ex.note}</span>
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            )}
          </Card>
        )
      })}
    </div>
  )
}

// ─── Static plan page ─────────────────────────────────────────────────────────

function StaticPlanPage({ id }: { id: string }) {
  const router = useRouter()
  const plan = WORKOUT_PLANS.find((p) => p.id === id)
  const { data: exercisesData } = useExercises()
  const exercises = exercisesData?.items ?? []
  const [scheduling, setScheduling] = useState(false)

  if (!plan) return notFound()

  const fullPlanWeeks = parseDurationWeeks(plan.duration)

  async function handleSchedule(weeks: number) {
    const trainingDays = plan!.days.filter((d) => !d.isRest)
    const trainingDayNums = new Set(trainingDays.map((d) => d.dayNumber))
    setScheduling(true)
    let created = 0
    try {
      // Fetch user gender for default weights fallback
      const { data: profile } = await api.get('/users/me')
      const gender: string | null = profile?.gender ?? null
      const defaultWeight = gender === 'male' ? 20 : gender === 'female' ? 10 : null

      // Cache last sets per exerciseId to avoid repeat requests
      const lastSetsCache = new Map<string, { weightKg: number | null; reps: number | null; restTimerSec: number | null }[]>()

      const today = new Date()
      for (let i = 0; i < weeks * 7; i++) {
        const date = addDays(today, i)
        const jsDay = date.getDay()
        const planDayNum = jsDay === 0 ? 7 : jsDay
        if (trainingDayNums.has(planDayNum)) {
          const day = trainingDays.find((d) => d.dayNumber === planDayNum)!
          const { data: workout } = await api.post('/workouts', {
            title: `${plan!.name} — ${day.name}`,
            startedAt: date.toISOString(),
          })
          for (let j = 0; j < (day.exercises ?? []).length; j++) {
            const planEx = (day.exercises ?? [])[j]
            const foundId = planEx.exerciseId
              ?? exercises.find((e) => e.name.toLowerCase() === planEx.name.toLowerCase())?.id
            if (foundId) {
              const { data: we } = await api.post(`/workouts/${workout.id}/exercises`, { exerciseId: foundId, orderIndex: j })

              // Get last sets (cache per exercise)
              if (!lastSetsCache.has(foundId)) {
                try {
                  const { data: lastSets } = await api.get(`/workouts/last-sets/${foundId}`)
                  lastSetsCache.set(foundId, lastSets ?? [])
                } catch {
                  lastSetsCache.set(foundId, [])
                }
              }
              const lastSets = lastSetsCache.get(foundId)!

              if (lastSets.length > 0) {
                // Copy weight/reps from last completed workout
                for (const s of lastSets) {
                  await api.post(`/workouts/${workout.id}/exercises/${we.id}/sets`, {
                    weightKg: s.weightKg,
                    reps: s.reps,
                    restTimerSec: s.restTimerSec,
                  })
                }
              } else {
                // No history — create sets from plan data
                const setsCount = typeof planEx.sets === 'number' ? planEx.sets : 3
                const planReps = planEx.reps ? parseInt(planEx.reps) || undefined : undefined
                const planWeight = planEx.weightKg != null ? planEx.weightKg : (defaultWeight ?? undefined)
                for (let s = 0; s < setsCount; s++) {
                  const body: Record<string, unknown> = {}
                  if (planWeight !== undefined) body.weightKg = planWeight
                  if (planReps !== undefined) body.reps = planReps
                  await api.post(`/workouts/${workout.id}/exercises/${we.id}/sets`, body)
                }
              }
            }
          }
          created++
        }
      }
      toast({ title: 'Тренировки запланированы', description: `Создано ${created} тренировок` })
    } catch {
      toast({ variant: 'destructive', title: 'Ошибка', description: 'Не удалось запланировать тренировки' })
    } finally {
      setScheduling(false)
    }
  }

  return (
    <div className="max-w-2xl space-y-5">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/plans"><ArrowLeft className="h-4 w-4" /></Link>
        </Button>
        <div>
          <h1 className="text-2xl font-bold">{plan.name}</h1>
          <p className="text-sm text-muted-foreground">{plan.description}</p>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <Badge variant="outline">{DIFFICULTY_LABEL[plan.difficulty]}</Badge>
        <Badge variant="outline">{plan.daysPerWeek} дн/нед</Badge>
        <Badge variant="outline">{plan.duration}</Badge>
        <Badge variant="secondary">{plan.goal}</Badge>
      </div>

      {/* Schedule buttons */}
      <div className="flex flex-wrap gap-2 p-3 bg-muted/50 rounded-lg border">
        <div className="flex items-center gap-1.5 w-full mb-1">
          <CalendarPlus className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-medium">Запланировать тренировки</span>
        </div>
        <Button variant="outline" size="sm" disabled={scheduling} onClick={() => handleSchedule(2)}>
          2 недели
        </Button>
        <Button variant="outline" size="sm" disabled={scheduling} onClick={() => handleSchedule(4)}>
          4 недели
        </Button>
        <Button variant="outline" size="sm" disabled={scheduling} onClick={() => handleSchedule(fullPlanWeeks)}>
          Весь план ({fullPlanWeeks} нед.)
        </Button>
      </div>

      <PlanDays plan={plan as PlanLike} exercises={exercises} onWorkoutCreated={(wid) => router.push(`/workouts/${wid}`)} />
    </div>
  )
}

// ─── User plan page ───────────────────────────────────────────────────────────

function parseDurationWeeks(duration: string | null | undefined): number {
  if (!duration) return 8
  const match = duration.match(/(\d+)/)
  return match ? parseInt(match[1]) : 8
}

function UserPlanPage({ id }: { id: string }) {
  const router = useRouter()
  const { data: plan, isLoading } = usePlanTemplate(id)
  const deleteMutation = useDeletePlanTemplate()
  const scheduleMutation = useSchedulePlan(id)
  const { data: exercisesData } = useExercises()
  const exercises = exercisesData?.items ?? []

  async function handleDelete() {
    if (!plan) return
    if (!confirm(`Удалить план «${plan.name}»?`)) return
    try {
      await deleteMutation.mutateAsync(id)
      toast({ title: 'План удалён' })
      router.push('/plans')
    } catch {
      toast({ variant: 'destructive', title: 'Ошибка', description: 'Не удалось удалить план' })
    }
  }

  async function handleSchedule(weeks: number) {
    try {
      const result = await scheduleMutation.mutateAsync(weeks)
      toast({ title: 'Тренировки запланированы', description: `Создано ${result.created} тренировок` })
    } catch {
      toast({ variant: 'destructive', title: 'Ошибка', description: 'Не удалось запланировать тренировки' })
    }
  }

  if (isLoading) return <div className="text-muted-foreground text-sm p-4">Загрузка...</div>
  if (!plan) return notFound()

  const fullPlanWeeks = parseDurationWeeks(plan.duration)

  return (
    <div className="max-w-2xl space-y-5">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/plans"><ArrowLeft className="h-4 w-4" /></Link>
        </Button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold">{plan.name}</h1>
          {plan.description && <p className="text-sm text-muted-foreground">{plan.description}</p>}
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" asChild>
            <Link href={`/plans/${id}/edit`}>
              <Pencil className="h-3.5 w-3.5 mr-1" />
              Редактировать
            </Link>
          </Button>
          <Button variant="outline" size="sm" onClick={handleDelete} className="text-destructive hover:text-destructive">
            <Trash2 className="h-3.5 w-3.5 mr-1" />
            Удалить
          </Button>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        {plan.difficulty && <Badge variant="outline">{DIFFICULTY_LABEL[plan.difficulty]}</Badge>}
        <Badge variant="outline">{plan.daysPerWeek} дн/нед</Badge>
        {plan.duration && <Badge variant="outline">{plan.duration}</Badge>}
        {plan.goal && <Badge variant="secondary">{plan.goal}</Badge>}
      </div>

      {/* Schedule buttons */}
      <div className="flex flex-wrap gap-2 p-3 bg-muted/50 rounded-lg border">
        <div className="flex items-center gap-1.5 w-full mb-1">
          <CalendarPlus className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-medium">Запланировать тренировки</span>
        </div>
        <Button
          variant="outline" size="sm"
          disabled={scheduleMutation.isPending}
          onClick={() => handleSchedule(2)}
        >
          2 недели
        </Button>
        <Button
          variant="outline" size="sm"
          disabled={scheduleMutation.isPending}
          onClick={() => handleSchedule(4)}
        >
          4 недели
        </Button>
        <Button
          variant="outline" size="sm"
          disabled={scheduleMutation.isPending}
          onClick={() => handleSchedule(fullPlanWeeks)}
        >
          Весь план ({fullPlanWeeks} нед.)
        </Button>
      </div>

      <PlanDays plan={plan as PlanLike} exercises={exercises} onWorkoutCreated={(wid) => router.push(`/workouts/${wid}`)} />
    </div>
  )
}

// ─── Router ───────────────────────────────────────────────────────────────────

export default function PlanDetailPage({ params }: Props) {
  const { id } = use(params)

  if (UUID_RE.test(id)) {
    return <UserPlanPage id={id} />
  }

  return <StaticPlanPage id={id} />
}

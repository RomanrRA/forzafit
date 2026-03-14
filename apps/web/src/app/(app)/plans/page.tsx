'use client'

import Link from 'next/link'
import { WORKOUT_PLANS } from '@/data/plans'
import { usePlanTemplates, useDeletePlanTemplate } from '@/hooks/use-plan-templates'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Calendar, Clock, Dumbbell, Flame, ChevronRight, Plus, Trash2, Pencil } from 'lucide-react'
import { toast } from '@/hooks/use-toast'

const DIFFICULTY_LABEL = { beginner: 'Начинающий', intermediate: 'Средний', advanced: 'Продвинутый' }
const DIFFICULTY_COLOR = { beginner: 'bg-green-100 text-green-800', intermediate: 'bg-yellow-100 text-yellow-800', advanced: 'bg-red-100 text-red-800' }
const TYPE_ICON = { cardio: Flame, fullbody: Dumbbell, split: Dumbbell, beginner: Dumbbell }

export default function PlansPage() {
  const { data, isLoading } = usePlanTemplates()
  const deleteMutation = useDeletePlanTemplate()
  const myPlans = data?.items ?? []

  async function handleDelete(id: string, name: string) {
    if (!confirm(`Удалить план «${name}»?`)) return
    try {
      await deleteMutation.mutateAsync(id)
      toast({ title: 'План удалён' })
    } catch {
      toast({ variant: 'destructive', title: 'Ошибка', description: 'Не удалось удалить план' })
    }
  }

  return (
    <div className="space-y-8">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Планы тренировок</h1>
          <p className="text-muted-foreground mt-1">Готовые программы и ваши собственные</p>
        </div>
        <Button asChild>
          <Link href="/plans/new">
            <Plus className="h-4 w-4 mr-1" />
            Создать план
          </Link>
        </Button>
      </div>

      {/* Мои планы */}
      <section className="space-y-3">
        <h2 className="text-xl font-semibold">Мои планы</h2>

        {isLoading && (
          <p className="text-sm text-muted-foreground">Загрузка...</p>
        )}

        {!isLoading && myPlans.length === 0 && (
          <div className="border-2 border-dashed rounded-lg p-8 text-center">
            <Dumbbell className="h-10 w-10 mx-auto mb-3 text-muted-foreground opacity-40" />
            <p className="font-medium">У вас пока нет своих планов</p>
            <p className="text-sm text-muted-foreground mt-1 mb-4">Создайте первый план тренировок под свои цели</p>
            <Button asChild variant="outline">
              <Link href="/plans/new">
                <Plus className="h-4 w-4 mr-1" />
                Создать первый план
              </Link>
            </Button>
          </div>
        )}

        {myPlans.length > 0 && (
          <div className="grid gap-4 md:grid-cols-2">
            {myPlans.map((plan) => (
              <Card key={plan.id} className="flex flex-col hover:border-primary transition-colors">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                        <Dumbbell className="h-5 w-5 text-primary" />
                      </div>
                      <CardTitle className="text-lg leading-tight">{plan.name}</CardTitle>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      {plan.difficulty && (
                        <span className={`text-xs px-2 py-1 rounded-full font-medium ${DIFFICULTY_COLOR[plan.difficulty]}`}>
                          {DIFFICULTY_LABEL[plan.difficulty]}
                        </span>
                      )}
                      <Link
                        href={`/plans/${plan.id}/edit`}
                        className="text-muted-foreground hover:text-foreground transition-colors ml-1 p-1"
                      >
                        <Pencil className="h-4 w-4" />
                      </Link>
                      <button
                        type="button"
                        onClick={() => handleDelete(plan.id, plan.name)}
                        className="text-muted-foreground hover:text-destructive transition-colors p-1"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                  {plan.description && (
                    <p className="text-sm text-muted-foreground mt-2">{plan.description}</p>
                  )}
                </CardHeader>
                <CardContent className="flex flex-col flex-1 justify-between gap-4">
                  <div className="flex flex-wrap gap-3 text-sm text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Calendar className="h-4 w-4" />
                      {plan.daysPerWeek} дн/нед
                    </span>
                    {plan.duration && (
                      <span className="flex items-center gap-1">
                        <Clock className="h-4 w-4" />
                        {plan.duration}
                      </span>
                    )}
                    {plan.goal && <Badge variant="outline" className="text-xs">{plan.goal}</Badge>}
                  </div>
                  <Button asChild className="w-full">
                    <Link href={`/plans/${plan.id}`}>
                      Открыть план
                      <ChevronRight className="h-4 w-4 ml-1" />
                    </Link>
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </section>

      {/* Готовые планы */}
      <section className="space-y-3">
        <h2 className="text-xl font-semibold">Готовые планы</h2>
        <div className="grid gap-4 md:grid-cols-2">
          {WORKOUT_PLANS.map((plan) => {
            const Icon = TYPE_ICON[plan.type]
            return (
              <Card key={plan.id} className="flex flex-col hover:border-primary transition-colors">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                        <Icon className="h-5 w-5 text-primary" />
                      </div>
                      <CardTitle className="text-lg leading-tight">{plan.name}</CardTitle>
                    </div>
                    <span className={`text-xs px-2 py-1 rounded-full font-medium shrink-0 ${DIFFICULTY_COLOR[plan.difficulty]}`}>
                      {DIFFICULTY_LABEL[plan.difficulty]}
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground mt-2">{plan.description}</p>
                </CardHeader>
                <CardContent className="flex flex-col flex-1 justify-between gap-4">
                  <div className="flex flex-wrap gap-3 text-sm text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Calendar className="h-4 w-4" />
                      {plan.daysPerWeek} дн/нед
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock className="h-4 w-4" />
                      {plan.duration}
                    </span>
                    <Badge variant="outline" className="text-xs">{plan.goal}</Badge>
                  </div>
                  <Button asChild className="w-full">
                    <Link href={`/plans/${plan.id}`}>
                      Открыть план
                      <ChevronRight className="h-4 w-4 ml-1" />
                    </Link>
                  </Button>
                </CardContent>
              </Card>
            )
          })}
        </div>
      </section>
    </div>
  )
}

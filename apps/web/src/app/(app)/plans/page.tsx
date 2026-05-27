'use client'

import Link from 'next/link'
import { WORKOUT_PLANS } from '@/data/plans'
import { usePlanTemplates, useDeletePlanTemplate } from '@/hooks/use-plan-templates'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Calendar, Clock, Dumbbell, Flame, ChevronRight, Trash2, Pencil, Sparkles, Plus } from 'lucide-react'
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
    <div className="space-y-8 fz-rise">
      <div className="min-w-0">
        <h1 className="text-2xl sm:text-3xl font-bold">Планы тренировок</h1>
        <p className="text-sm text-muted-foreground mt-0.5 hidden sm:block">Готовые программы и ваши собственные</p>
      </div>

      {/* ── Hero: создать план (manual / AI) ─────────────────── */}
      <div className="grid gap-3 sm:gap-4 sm:grid-cols-2">
        {/* AI — акцентная */}
        <Link
          href="/plans/new?ai=1&from=/plans"
          className="glass-card strong p-5 sm:p-6 flex flex-col gap-3 hover:scale-[1.01] transition-transform cursor-pointer fz-rise"
          style={{
            background: 'color-mix(in oklab, var(--c-accent) 10%, transparent)',
            border: '1px solid color-mix(in oklab, var(--c-accent) 35%, var(--gl-border))',
          }}
        >
          <div className="flex items-center gap-3">
            <div
              className="grid place-items-center shrink-0"
              style={{
                width: 48,
                height: 48,
                borderRadius: 14,
                background:
                  'linear-gradient(135deg, var(--c-accent), color-mix(in oklab, var(--c-accent) 60%, black))',
                boxShadow: '0 6px 18px var(--c-accent-glow)',
                color: 'white',
              }}
            >
              <Sparkles className="h-5 w-5" strokeWidth={2.4} />
            </div>
            <div className="min-w-0">
              <div className="eyebrow" style={{ color: 'var(--c-accent)' }}>
                AI-тренер
              </div>
              <div
                className="mt-0.5"
                style={{
                  fontSize: 18,
                  fontWeight: 800,
                  letterSpacing: -0.2,
                  color: 'var(--txt-1)',
                }}
              >
                Цель тела + программа
              </div>
            </div>
          </div>
          <p className="text-sm txt-muted leading-snug">
            AI подберёт целевые показатели по фигуре и тренировочный план под них
          </p>
          <span
            className="mt-auto inline-flex items-center gap-1 text-sm font-semibold"
            style={{ color: 'var(--c-accent)' }}
          >
            Начать диалог →
          </span>
        </Link>

        {/* Manual */}
        <Link
          href="/plans/new?mode=manual&from=/plans"
          className="glass-card p-5 sm:p-6 flex flex-col gap-3 hover:scale-[1.01] transition-transform cursor-pointer fz-rise"
        >
          <div className="flex items-center gap-3">
            <div
              className="grid place-items-center shrink-0"
              style={{
                width: 48,
                height: 48,
                borderRadius: 14,
                background: 'var(--gl-bg)',
                border: '1px solid var(--gl-border)',
                color: 'var(--txt-1)',
              }}
            >
              <Pencil className="h-5 w-5" strokeWidth={2.2} />
            </div>
            <div className="min-w-0">
              <div className="eyebrow">Конструктор</div>
              <div
                className="mt-0.5"
                style={{
                  fontSize: 18,
                  fontWeight: 800,
                  letterSpacing: -0.2,
                  color: 'var(--txt-1)',
                }}
              >
                Создать вручную
              </div>
            </div>
          </div>
          <p className="text-sm txt-muted leading-snug">
            Выберите дни и упражнения сами — полный контроль над программой
          </p>
          <span className="mt-auto inline-flex items-center gap-1 text-sm font-semibold txt-muted">
            Открыть конструктор →
          </span>
        </Link>
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
              <Link href="/plans/new?from=/plans">
                <Plus className="h-4 w-4 mr-1" />
                Создать первый план
              </Link>
            </Button>
          </div>
        )}

        {myPlans.length > 0 && (
          <div className="grid gap-3 sm:gap-4 sm:grid-cols-2">
            {myPlans.map((plan) => (
              <Card key={plan.id} className="flex flex-col min-w-0 max-w-full overflow-hidden hover:border-primary transition-colors">
                <CardHeader className="p-3 sm:p-6 pb-2 sm:pb-3 min-w-0">
                  <div className="flex items-start justify-between gap-2 min-w-0">
                    <div className="flex flex-1 items-center gap-2 min-w-0">
                      <div className="h-8 w-8 sm:h-9 sm:w-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                        <Dumbbell className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
                      </div>
                      <CardTitle className="text-base sm:text-lg leading-tight truncate min-w-0">{plan.name}</CardTitle>
                    </div>
                    <div className="flex items-center gap-0.5 shrink-0">
                      <Link
                        href={`/plans/${plan.id}/edit`}
                        className="text-muted-foreground hover:text-foreground transition-colors p-1"
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
                    <p className="text-xs sm:text-sm text-muted-foreground mt-1.5 line-clamp-2">{plan.description}</p>
                  )}
                </CardHeader>
                <CardContent className="flex flex-col flex-1 justify-between gap-3 p-3 sm:p-6 pt-0 sm:pt-0">
                  <div className="flex flex-wrap gap-2 text-xs sm:text-sm text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Calendar className="h-3.5 w-3.5" />
                      {plan.daysPerWeek} дн/нед
                    </span>
                    {plan.duration && (
                      <span className="flex items-center gap-1">
                        <Clock className="h-3.5 w-3.5" />
                        {plan.duration}
                      </span>
                    )}
                    {plan.difficulty && (
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${DIFFICULTY_COLOR[plan.difficulty]}`}>
                        {DIFFICULTY_LABEL[plan.difficulty]}
                      </span>
                    )}
                    {plan.goal && <Badge variant="outline" className="text-xs">{plan.goal}</Badge>}
                  </div>
                  <Button asChild size="sm" className="w-full sm:size-default">
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
        <div className="grid gap-3 sm:gap-4 sm:grid-cols-2">
          {WORKOUT_PLANS.map((plan) => {
            const Icon = TYPE_ICON[plan.type]
            return (
              <Card key={plan.id} className="flex flex-col min-w-0 max-w-full overflow-hidden hover:border-primary transition-colors">
                <CardHeader className="p-3 sm:p-6 pb-2 sm:pb-3 min-w-0">
                  <div className="flex items-start justify-between gap-2 min-w-0">
                    <div className="flex flex-1 items-center gap-2 min-w-0">
                      <div className="h-8 w-8 sm:h-9 sm:w-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                        <Icon className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
                      </div>
                      <CardTitle className="text-base sm:text-lg leading-tight truncate min-w-0">{plan.name}</CardTitle>
                    </div>
                  </div>
                  <p className="text-xs sm:text-sm text-muted-foreground mt-1.5 line-clamp-2">{plan.description}</p>
                </CardHeader>
                <CardContent className="flex flex-col flex-1 justify-between gap-3 p-3 sm:p-6 pt-0 sm:pt-0">
                  <div className="flex flex-wrap gap-2 text-xs sm:text-sm text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Calendar className="h-3.5 w-3.5" />
                      {plan.daysPerWeek} дн/нед
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock className="h-3.5 w-3.5" />
                      {plan.duration}
                    </span>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${DIFFICULTY_COLOR[plan.difficulty]}`}>
                      {DIFFICULTY_LABEL[plan.difficulty]}
                    </span>
                    <Badge variant="outline" className="text-xs">{plan.goal}</Badge>
                  </div>
                  <Button asChild size="sm" className="w-full sm:size-default">
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

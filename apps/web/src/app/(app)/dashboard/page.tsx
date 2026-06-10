'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'
import { format, startOfDay, differenceInCalendarDays } from 'date-fns'
import { ru } from 'date-fns/locale'
import { useAuthStore } from '@/store/auth.store'
import { useWorkouts } from '@/hooks/use-workouts'
import { usePlanTemplates } from '@/hooks/use-plan-templates'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { AlertTriangle, Sparkles, Play } from 'lucide-react'
import { PlanAdjustDialog } from '@/components/plans/plan-adjust-dialog'
import { RecentPrCard } from '@/components/gamification/recent-pr-card'
import { RecentAchievementCard } from '@/components/gamification/recent-achievement-card'
import { ActiveQuestCard } from '@/components/gamification/active-quest-card'
import { BodyWeightCard } from '@/components/dashboard/body-weight-card'
import { plural } from '@/lib/utils'

export default function DashboardPage() {
  const user = useAuthStore((s) => s.user)
  const [adjustOpen, setAdjustOpen] = useState(false)

  // Запланированные тренировки (finishedAt === null), сортировка по дате
  const { data: plannedData } = useWorkouts({ limit: 50, order: 'asc', status: 'planned' })
  const plannedWorkouts = plannedData?.items ?? []

  // Завершённые тренировки за последние 28 дней — для AI-корректировки плана
  const { data: completedData } = useWorkouts({ limit: 30, order: 'desc', status: 'completed' })
  const recentCompletedCount = useMemo(() => {
    const items = completedData?.items ?? []
    const cutoff = Date.now() - 28 * 24 * 3600 * 1000
    return items.filter((w) => w.startedAt && new Date(w.startedAt).getTime() >= cutoff).length
  }, [completedData])

  const { data: planTemplates } = usePlanTemplates()
  const latestPlan = planTemplates?.items?.[0]
  const ADJUST_THRESHOLD = 6
  const canAdjust = !!latestPlan && recentCompletedCount >= ADJUST_THRESHOLD

  // Первый заход — у юзера нет ни одного плана и ни одной завершённой тренировки
  const isFirstTime =
    !latestPlan && (completedData?.items?.length ?? 0) === 0

  // Пропущенные не накапливаются: показываем ОДНУ самую раннюю,
  // пока юзер её не закроет — следующая не отмечается.
  // И только после первой завершённой тренировки, чтобы не пугать новичков.
  const hasAnyCompleted = (completedData?.items?.length ?? 0) > 0

  const { nextWorkout, missedWorkout } = useMemo(() => {
    const today = startOfDay(new Date())
    let next = null as typeof plannedWorkouts[0] | null
    let earliestMissed = null as typeof plannedWorkouts[0] | null

    // plannedWorkouts отсортирован asc → первый просроченный = самый ранний
    for (const w of plannedWorkouts) {
      const wDate = startOfDay(new Date(w.startedAt))
      if (wDate < today) {
        if (!earliestMissed) earliestMissed = w
      } else if (!next) {
        next = w
      }
    }
    return {
      nextWorkout: next,
      missedWorkout: hasAnyCompleted ? earliestMissed : null,
    }
  }, [plannedWorkouts, hasAnyCompleted])

  const todayLabel = format(new Date(), 'EEEE, d MMMM', { locale: ru })

  return (
    <div className="space-y-6 fz-rise">
      <div>
        <div className="eyebrow">{todayLabel}</div>
        <h1
          className="mt-1"
          style={{
            fontSize: 'clamp(28px, 5vw, 36px)',
            fontWeight: 800,
            letterSpacing: -0.6,
            lineHeight: 1.05,
            color: 'var(--txt-1)',
          }}
        >
          Привет, {user?.name ?? 'Атлет'}
        </h1>
      </div>

      {/* ── Hero row: Today plan ─────────────────── */}
      <div className="grid gap-4 sm:gap-5 grid-cols-1">
        {nextWorkout ? (() => {
            const wDate = startOfDay(new Date(nextWorkout.startedAt))
            const today = startOfDay(new Date())
            const isToday = wDate.getTime() === today.getTime()
            const isTomorrow = wDate.getTime() === today.getTime() + 86400000
            const eyebrow = isToday ? 'Сегодня в зале' : isTomorrow ? 'Завтра в зале' : 'Ближайшая тренировка'
            const exCount = nextWorkout.exerciseCount ?? nextWorkout.exercises?.length ?? 0
            return (
              <div className="glass-card strong p-5 sm:p-6 fz-rise">
                <div className="eyebrow" style={{ color: 'var(--c-accent)' }}>{eyebrow}</div>
                <div
                  className="mt-1"
                  style={{
                    fontSize: 'clamp(24px, 4.4vw, 30px)',
                    fontWeight: 800,
                    letterSpacing: -0.5,
                    lineHeight: 1.1,
                    color: 'var(--txt-1)',
                  }}
                >
                  {nextWorkout.title}
                </div>
                <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[13px] txt-muted">
                  <span className="capitalize">
                    {format(new Date(nextWorkout.startedAt), 'EEEE, d MMMM', { locale: ru })}
                  </span>
                  {exCount > 0 && (
                    <>
                      <span className="txt-soft">·</span>
                      <span>
                        <strong className="tnum" style={{ color: 'var(--txt-1)', fontWeight: 800 }}>
                          {exCount}
                        </strong>{' '}
                        {plural(exCount, ['упражнение', 'упражнения', 'упражнений'])}
                      </span>
                    </>
                  )}
                </div>
                <Link
                  href={`/workouts/${nextWorkout.id}`}
                  className="glass-btn-primary inline-flex items-center gap-2 mt-5"
                  style={{ padding: '13px 22px', minHeight: 50, fontSize: 15 }}
                >
                  <Play className="h-[18px] w-[18px]" strokeWidth={2.4} fill="currentColor" />
                  Начать тренировку
                </Link>
              </div>
            )
          })() : isFirstTime ? (
            <div
              className="glass-card strong p-5 sm:p-6 fz-rise flex flex-col gap-3"
              style={{
                background: 'color-mix(in oklab, var(--c-accent) 12%, transparent)',
                border: '1px solid color-mix(in oklab, var(--c-accent) 40%, var(--gl-border))',
                boxShadow: '0 8px 24px var(--c-accent-glow)',
              }}
            >
              <div className="flex items-center gap-2">
                <div
                  className="grid place-items-center shrink-0"
                  style={{
                    width: 36, height: 36, borderRadius: 11,
                    background:
                      'linear-gradient(135deg, var(--c-accent), color-mix(in oklab, var(--c-accent) 60%, black))',
                    boxShadow: '0 4px 12px var(--c-accent-glow)',
                    color: 'white',
                  }}
                >
                  <Sparkles className="h-[18px] w-[18px]" strokeWidth={2.4} />
                </div>
                <div className="eyebrow" style={{ color: 'var(--c-accent)' }}>
                  Старт за 5 минут
                </div>
              </div>
              <div
                style={{
                  fontSize: 'clamp(22px, 4.4vw, 28px)',
                  fontWeight: 800,
                  letterSpacing: -0.5,
                  lineHeight: 1.1,
                  color: 'var(--txt-1)',
                }}
              >
                Соберите план с AI-тренером
              </div>
              <div className="text-[13px] sm:text-[14px] txt-muted leading-snug">
                Расскажите про цели и опыт — AI составит программу под вас, расставит дни и упражнения. Дальше — просто отмечайте подходы.
              </div>
              <div className="flex flex-wrap gap-2 mt-2">
                <Link
                  href="/plans/new?ai=1&from=/dashboard"
                  className="glass-btn-primary inline-flex items-center gap-2"
                  style={{ padding: '13px 20px', minHeight: 48, fontSize: 14, fontWeight: 800 }}
                >
                  <Sparkles className="h-4 w-4" strokeWidth={2.4} />
                  Собрать план с ИИ
                </Link>
                <Link
                  href="/plans/new?mode=manual&from=/dashboard"
                  className="glass-btn inline-flex items-center gap-2"
                  style={{ padding: '13px 18px', minHeight: 48, fontSize: 14 }}
                >
                  Создать вручную
                </Link>
              </div>
            </div>
          ) : (
            <div className="glass-card p-5 sm:p-6 fz-rise flex flex-col gap-3">
              <div className="eyebrow">Свободный день</div>
              <div
                style={{
                  fontSize: 'clamp(20px, 4vw, 26px)',
                  fontWeight: 800,
                  letterSpacing: -0.4,
                  lineHeight: 1.1,
                  color: 'var(--txt-1)',
                }}
              >
                Запланируйте тренировку
              </div>
              <div className="text-[13px] txt-muted">
                Чтобы продолжить серию — добавьте новую тренировку или соберите план
              </div>
              <div className="flex flex-wrap gap-2 mt-2">
                <Link
                  href="/workouts/new"
                  className="glass-btn-primary inline-flex items-center gap-2"
                  style={{ padding: '11px 18px', minHeight: 44, fontSize: 14 }}
                >
                  <Play className="h-4 w-4" strokeWidth={2.4} fill="currentColor" />
                  Новая тренировка
                </Link>
                <Link
                  href="/plans"
                  className="glass-btn inline-flex items-center gap-2"
                  style={{ padding: '11px 18px', minHeight: 44, fontSize: 14 }}
                >
                  Планы →
                </Link>
              </div>
            </div>
          )}
      </div>

      {/* ── PR/Achievement (left) + Body weight (right) ───── */}
      <div className="grid gap-4 sm:gap-5 grid-cols-1 lg:[grid-template-columns:1fr_1.4fr] items-stretch">
        <div className="flex h-full flex-col gap-4 sm:gap-5 [&>*]:flex-1">
          <ActiveQuestCard />
          <RecentPrCard />
          <RecentAchievementCard />
        </div>
        <BodyWeightCard />
      </div>

      {/* ── AI-корректировка плана ──────────────────────── */}
      {canAdjust && latestPlan && (
        <div>
          <Card
            onClick={() => setAdjustOpen(true)}
            className="border-primary/40 bg-primary/5 hover:border-primary transition-colors cursor-pointer"
          >
            <CardContent className="flex items-center gap-3 py-4 px-4">
              <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                <Sparkles className="h-4 w-4 text-primary" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="font-semibold text-sm">Скорректировать план тренировок</p>
                <p className="text-xs text-muted-foreground truncate">
                  {recentCompletedCount} {plural(recentCompletedCount, ['тренировка', 'тренировки', 'тренировок'])} за 28 дней — AI проанализирует прогресс и предложит правки к «{latestPlan.name}»
                </p>
              </div>
              <Button size="sm" variant="outline" className="shrink-0" onClick={(e) => { e.stopPropagation(); setAdjustOpen(true) }}>
                Запустить
              </Button>
            </CardContent>
          </Card>
          <PlanAdjustDialog
            open={adjustOpen}
            onOpenChange={setAdjustOpen}
            planTemplateId={latestPlan.id}
          />
        </div>
      )}

      {/* ── Одна пропущенная — не накапливается, пока не закроется ── */}
      {missedWorkout && (() => {
        const daysAgo = differenceInCalendarDays(new Date(), new Date(missedWorkout.startedAt))
        const daysLabel = daysAgo === 1
          ? 'Пропущена вчера'
          : `Пропущена ${daysAgo} ${plural(daysAgo, ['день', 'дня', 'дней'])} назад`
        return (
          <Link href={`/workouts/${missedWorkout.id}`} className="block">
            <Card className="border-red-300 dark:border-red-800 bg-red-50 dark:bg-red-950/30 hover:border-red-400 transition-colors cursor-pointer">
              <CardContent className="flex items-center gap-3 py-3 px-4">
                <AlertTriangle className="h-5 w-5 shrink-0 text-red-500" />
                <div className="min-w-0 flex-1">
                  <p className="font-medium text-sm truncate text-red-700 dark:text-red-400">
                    {missedWorkout.title}
                  </p>
                  <p className="text-xs text-red-500/70 dark:text-red-500/60">
                    {daysLabel} · догоните, когда сможете
                  </p>
                </div>
                <span className="text-xs text-red-500/70 shrink-0">
                  {missedWorkout.exerciseCount ?? 0} упр.
                </span>
              </CardContent>
            </Card>
          </Link>
        )
      })()}
    </div>
  )
}

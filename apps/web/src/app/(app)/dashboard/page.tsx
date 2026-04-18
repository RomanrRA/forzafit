'use client'

import { useState, useEffect, useMemo } from 'react'
import Link from 'next/link'
import { format, startOfDay, differenceInDays } from 'date-fns'
import { ru } from 'date-fns/locale'
import { useAuthStore } from '@/store/auth.store'
import { useWorkouts, usePersonalRecords } from '@/hooks/use-workouts'
import { useBodyMeasurements, type BodyMeasurement } from '@/hooks/use-body-measurements'
import { usePlanTemplates } from '@/hooks/use-plan-templates'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Scale, TrendingDown, TrendingUp, Minus, CalendarClock, AlertTriangle, Trophy, ChevronDown, ChevronUp, Bell, Settings, Sparkles } from 'lucide-react'
import { PlanAdjustDialog } from '@/components/plans/plan-adjust-dialog'

interface BodyReminderSettings {
  enabled: boolean
  intervalDays: number
}

type BodyGoal = 'gain' | 'lose'

interface BodyMetricSetting {
  visible: boolean
  goal: BodyGoal
}

interface BodyWidgetSettings {
  [key: string]: BodyMetricSetting
}

const STANDARD_METRICS = [
  { key: 'weightKg', label: 'Вес', unit: 'кг' },
  { key: 'bodyFatPct', label: '% жира', unit: '%' },
  { key: 'chestCm', label: 'Грудь', unit: 'см' },
  { key: 'waistCm', label: 'Талия', unit: 'см' },
  { key: 'hipsCm', label: 'Бёдра', unit: 'см' },
  { key: 'armCm', label: 'Рука', unit: 'см' },
]

interface CustomFieldDef {
  id: string
  name: string
  unit: string
}

const CUSTOM_FIELDS_KEY = 'fitlog_custom_fields'

const REMINDER_SETTINGS_KEY = 'fitlog_body_reminder_settings'
const WIDGET_SETTINGS_KEY = 'fitlog_body_widget_settings'
const DEFAULT_REMINDER: BodyReminderSettings = { enabled: true, intervalDays: 21 }

const DEFAULT_WIDGET_SETTINGS: BodyWidgetSettings = {
  weightKg: { visible: true, goal: 'lose' },
  bodyFatPct: { visible: true, goal: 'lose' },
  chestCm: { visible: false, goal: 'gain' },
  waistCm: { visible: true, goal: 'lose' },
  hipsCm: { visible: false, goal: 'lose' },
  armCm: { visible: false, goal: 'gain' },
}

function loadReminderSettings(): BodyReminderSettings {
  try {
    const raw = localStorage.getItem(REMINDER_SETTINGS_KEY)
    if (raw) return JSON.parse(raw)
  } catch {}
  return DEFAULT_REMINDER
}

function loadWidgetSettings(): BodyWidgetSettings {
  try {
    const raw = localStorage.getItem(WIDGET_SETTINGS_KEY)
    if (raw) return { ...DEFAULT_WIDGET_SETTINGS, ...JSON.parse(raw) }
  } catch {}
  return DEFAULT_WIDGET_SETTINGS
}

export default function DashboardPage() {
  const user = useAuthStore((s) => s.user)
  const [missedExpanded, setMissedExpanded] = useState(true)
  const [reminderSettings, setReminderSettings] = useState<BodyReminderSettings>(DEFAULT_REMINDER)
  const [widgetSettings, setWidgetSettings] = useState<BodyWidgetSettings>(DEFAULT_WIDGET_SETTINGS)
  const [showWidgetConfig, setShowWidgetConfig] = useState(false)
  const [customFields, setCustomFields] = useState<CustomFieldDef[]>([])

  // Body measurements from API
  const { data: bodyData } = useBodyMeasurements({ limit: 200 })
  const entries = useMemo(() => {
    if (!bodyData?.items) return [] as BodyMeasurement[]
    return [...bodyData.items].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
  }, [bodyData])

  // Все метрики = стандартные + кастомные
  const allMetrics = useMemo(() => {
    const custom = customFields.map((f) => ({
      key: `custom_${f.id}`,
      label: f.name,
      unit: f.unit,
    }))
    return [...STANDARD_METRICS, ...custom]
  }, [customFields])

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
  const latestPlan = planTemplates?.items?.[0] // backend sorts desc by createdAt
  const ADJUST_THRESHOLD = 6
  const canAdjust = !!latestPlan && recentCompletedCount >= ADJUST_THRESHOLD
  const [adjustOpen, setAdjustOpen] = useState(false)

  // Персональные рекорды для топ-3 прогресса
  const { data: records } = usePersonalRecords()
  const topRecords = useMemo(() => {
    if (!records) return []
    return [...records]
      .filter((r) => r.maxWeightKg && r.sessionCount >= 2)
      .sort((a, b) => (b.maxWeightKg ?? 0) - (a.maxWeightKg ?? 0))
      .slice(0, 3)
  }, [records])

  // Разделяем на ближайшую и пропущенные
  const { nextWorkout, missedWorkouts } = useMemo(() => {
    const today = startOfDay(new Date())
    let next = null as typeof plannedWorkouts[0] | null
    const missed: typeof plannedWorkouts = []

    for (const w of plannedWorkouts) {
      const wDate = startOfDay(new Date(w.startedAt))
      if (wDate < today) {
        missed.push(w)
      } else if (!next) {
        next = w
      }
    }
    return { nextWorkout: next, missedWorkouts: missed }
  }, [plannedWorkouts])

  useEffect(() => {
    setReminderSettings(loadReminderSettings())
    setWidgetSettings(loadWidgetSettings())
    try {
      const raw = localStorage.getItem(CUSTOM_FIELDS_KEY)
      if (raw) setCustomFields(JSON.parse(raw))
    } catch {}
  }, [])

  function updateWidgetSettings(next: BodyWidgetSettings) {
    setWidgetSettings(next)
    localStorage.setItem(WIDGET_SETTINGS_KEY, JSON.stringify(next))
  }

  const latest = entries[entries.length - 1]
  const previous = entries.length >= 2 ? entries[entries.length - 2] : null

  // Получить значение метрики из записи (стандартной или кастомной)
  function getMetricValue(entry: BodyMeasurement, key: string): number | null {
    if (key.startsWith('custom_')) {
      const fieldId = key.replace('custom_', '')
      const found = entry.custom?.find((c) => c.fieldId === fieldId)
      return found?.value ?? null
    }
    return (entry[key as keyof BodyMeasurement] as number | null) ?? null
  }

  // Дельты для компактного виджета — с учётом настроек
  const deltas = useMemo(() => {
    if (!latest || !previous) return []
    const items: { label: string; delta: number; unit: string; goal: BodyGoal }[] = []
    for (const m of allMetrics) {
      const setting = widgetSettings[m.key]
      if (!setting?.visible) continue
      const cur = getMetricValue(latest, m.key)
      const prev = getMetricValue(previous, m.key)
      if (cur != null && prev != null) {
        items.push({ label: m.label, delta: cur - prev, unit: m.unit, goal: setting.goal })
      }
    }
    return items
  }, [latest, previous, widgetSettings, allMetrics])

  // Напоминание о замере
  const shouldRemind = useMemo(() => {
    if (!reminderSettings.enabled) return false
    if (!latest) return true // нет замеров — напомнить
    const daysSinceLast = differenceInDays(new Date(), new Date(latest.date))
    return daysSinceLast >= reminderSettings.intervalDays
  }, [latest, reminderSettings])

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Привет, {user?.name ?? 'Атлет'}!</h1>
      </div>

      {/* ── Замеры тела — компактный виджет ──────────── */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-semibold flex items-center gap-2">
            <Scale className="h-4 w-4 text-primary" />
            Замеры тела
          </h2>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-muted-foreground"
              onClick={() => setShowWidgetConfig((v) => !v)}
            >
              <Settings className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="sm" className="text-muted-foreground" asChild>
              <Link href="/body">Подробнее →</Link>
            </Button>
          </div>
        </div>

        {/* Настройки виджета */}
        {showWidgetConfig && (
          <Card className="mb-3">
            <CardContent className="py-3 px-4">
              <p className="text-xs font-medium text-muted-foreground mb-2">Показатели и цели</p>
              <div className="space-y-2">
                {allMetrics.map((m) => {
                  const s = widgetSettings[m.key] ?? { visible: false, goal: 'lose' as BodyGoal }
                  return (
                    <div key={m.key} className="flex items-center justify-between gap-2">
                      <label className="flex items-center gap-2 min-w-0">
                        <input
                          type="checkbox"
                          checked={s.visible}
                          onChange={() => updateWidgetSettings({
                            ...widgetSettings,
                            [m.key]: { ...s, visible: !s.visible },
                          })}
                          className="rounded border-border"
                        />
                        <span className="text-sm">{m.label}</span>
                      </label>
                      {s.visible && (
                        <div className="flex rounded-full bg-muted p-0.5 shrink-0">
                          <button
                            onClick={() => updateWidgetSettings({
                              ...widgetSettings,
                              [m.key]: { ...s, goal: 'lose' },
                            })}
                            className={`px-2 py-0.5 rounded-full text-[11px] font-medium transition-colors ${
                              s.goal === 'lose'
                                ? 'bg-green-500 text-white'
                                : 'text-muted-foreground hover:text-foreground'
                            }`}
                          >
                            Снижение
                          </button>
                          <button
                            onClick={() => updateWidgetSettings({
                              ...widgetSettings,
                              [m.key]: { ...s, goal: 'gain' },
                            })}
                            className={`px-2 py-0.5 rounded-full text-[11px] font-medium transition-colors ${
                              s.goal === 'gain'
                                ? 'bg-blue-500 text-white'
                                : 'text-muted-foreground hover:text-foreground'
                            }`}
                          >
                            Набор
                          </button>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Напоминание о замере */}
        {shouldRemind && (
          <Link href="/body">
            <Card className="border-amber-300 dark:border-amber-700 bg-amber-50 dark:bg-amber-950/30 mb-3 hover:border-amber-400 transition-colors cursor-pointer">
              <CardContent className="flex items-center gap-3 py-3 px-4">
                <Bell className="h-4 w-4 text-amber-500 shrink-0" />
                <div className="min-w-0">
                  <p className="text-sm font-medium text-amber-700 dark:text-amber-400">
                    {!latest ? 'Добавьте первый замер' : 'Пора сделать замер'}
                  </p>
                  <p className="text-xs text-amber-600/70 dark:text-amber-500/60">
                    {latest
                      ? `Последний замер ${format(new Date(latest.date), 'd MMMM', { locale: ru })} — ${differenceInDays(new Date(), new Date(latest.date))} дн. назад`
                      : 'Начните отслеживать прогресс тела'}
                  </p>
                </div>
              </CardContent>
            </Card>
          </Link>
        )}

        {/* Дельты — прогресс за период */}
        {deltas.length > 0 ? (
          <div className={`grid gap-2 ${deltas.length === 1 ? 'grid-cols-1' : deltas.length === 2 ? 'grid-cols-2' : 'grid-cols-3'}`}>
            {deltas.map((d) => {
              const isGood = d.goal === 'lose' ? d.delta < 0 : d.delta > 0
              const isBad = d.goal === 'lose' ? d.delta > 0 : d.delta < 0
              return (
                <Card key={d.label}>
                  <CardContent className="py-3 px-3 text-center">
                    <div className="text-xs text-muted-foreground mb-1">{d.label}</div>
                    <div className={`flex items-center justify-center gap-1 text-lg font-bold ${
                      isGood ? 'text-green-500' : isBad ? 'text-orange-500' : 'text-muted-foreground'
                    }`}>
                      {d.delta < 0 ? <TrendingDown className="h-4 w-4" /> : d.delta > 0 ? <TrendingUp className="h-4 w-4" /> : <Minus className="h-4 w-4" />}
                      {d.delta > 0 ? '+' : ''}{d.delta.toFixed(1)}
                    </div>
                    <div className="text-[10px] text-muted-foreground">{d.unit}</div>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        ) : latest && !shouldRemind ? (
          <Card>
            <CardContent className="py-4 text-center text-muted-foreground">
              <p className="text-sm">Нужен ещё один замер для сравнения</p>
            </CardContent>
          </Card>
        ) : null}
      </div>

      {/* ── Топ-3 прогресса ────────────────────────────── */}
      {topRecords.length > 0 && (
        <div>
          <h2 className="font-semibold flex items-center gap-2 mb-3">
            <Trophy className="h-4 w-4 text-yellow-500" />
            Лучшие показатели
          </h2>
          <div className="flex flex-col gap-2">
            {topRecords.map((r, i) => (
              <Card key={r.exerciseId} className="border-yellow-200 dark:border-yellow-800/50 bg-yellow-50/50 dark:bg-yellow-950/20">
                <CardContent className="flex items-center gap-3 py-3 px-4">
                  <span className="text-lg font-bold text-yellow-500 w-6 text-center shrink-0">
                    {i === 0 ? '🥇' : i === 1 ? '🥈' : '🥉'}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-sm truncate">{r.exerciseName}</p>
                    <p className="text-xs text-muted-foreground">
                      {r.sessionCount} {r.sessionCount === 1 ? 'тренировка' : r.sessionCount < 5 ? 'тренировки' : 'тренировок'}
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="font-bold text-sm">{r.maxWeightKg} кг</p>
                    {r.repsAtMax && (
                      <p className="text-xs text-muted-foreground">× {r.repsAtMax} повт.</p>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
          <Button variant="ghost" size="sm" className="mt-1 text-muted-foreground" asChild>
            <Link href="/workouts">Все тренировки →</Link>
          </Button>
        </div>
      )}

      {/* ── AI-корректировка плана (≥6 завершённых тренировок за 28 дней) ─ */}
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
                  {recentCompletedCount} тренировок за 28 дней — AI проанализирует прогресс и предложит правки к «{latestPlan.name}»
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

      {/* ── Ближайшая тренировка ─────────────────────── */}
      {nextWorkout && (
        <div>
          <h2 className="font-semibold flex items-center gap-2 mb-3">
            <CalendarClock className="h-4 w-4 text-primary" />
            Ближайшая тренировка
          </h2>
          <Link href={`/workouts/${nextWorkout.id}`}>
            <Card className="border-primary/50 bg-primary/5 hover:border-primary transition-colors cursor-pointer">
              <CardContent className="flex items-center justify-between py-4 px-4">
                <div className="min-w-0">
                  <p className="font-semibold text-sm truncate">{nextWorkout.title}</p>
                  <p className="text-xs text-muted-foreground">
                    {format(new Date(nextWorkout.startedAt), 'EEEE, d MMMM', { locale: ru })}
                  </p>
                </div>
                <span className="text-xs text-muted-foreground shrink-0 ml-2">
                  {nextWorkout.exerciseCount ?? 0} упр.
                </span>
              </CardContent>
            </Card>
          </Link>
        </div>
      )}

      {/* ── Пропущенные тренировки (сворачиваемый) ───── */}
      {missedWorkouts.length > 0 && (
        <div>
          <button
            onClick={() => setMissedExpanded((v) => !v)}
            className="w-full flex items-center justify-between mb-3 text-red-500 hover:text-red-600 transition-colors"
          >
            <h2 className="font-semibold flex items-center gap-2">
              <AlertTriangle className="h-4 w-4" />
              Пропущенные тренировки
              <span className="text-xs font-normal bg-red-100 text-red-600 dark:bg-red-950 dark:text-red-400 px-1.5 py-0.5 rounded-full">
                {missedWorkouts.length}
              </span>
            </h2>
            {missedExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </button>
          {missedExpanded && (
            <div className="flex flex-col gap-2">
              {missedWorkouts.map((w) => (
                <Link key={w.id} href={`/workouts/${w.id}`}>
                  <Card className="border-red-300 dark:border-red-800 bg-red-50 dark:bg-red-950/30 hover:border-red-400 transition-colors cursor-pointer">
                    <CardContent className="flex items-center justify-between py-3 px-4">
                      <div className="min-w-0">
                        <p className="font-medium text-sm truncate text-red-700 dark:text-red-400">{w.title}</p>
                        <p className="text-xs text-red-500/70 dark:text-red-500/60">
                          {format(new Date(w.startedAt), 'EEEE, d MMMM', { locale: ru })}
                        </p>
                      </div>
                      <span className="text-xs text-red-500/70 shrink-0 ml-2">
                        {w.exerciseCount ?? 0} упр.
                      </span>
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

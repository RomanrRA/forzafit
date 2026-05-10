'use client'

import Link from 'next/link'
import { useMemo, useState } from 'react'
import { format, differenceInDays } from 'date-fns'
import { ru } from 'date-fns/locale'
import { Activity, Bell } from 'lucide-react'
import { useBodyMeasurements, type BodyMeasurement } from '@/hooks/use-body-measurements'
import { BigSparkline } from '@/components/ui/big-sparkline'

const REMINDER_INTERVAL_DAYS = 21

interface MetricDef {
  key: string
  label: string
  unit: string
  // Цель «снижения» — для веса/жира/талии. Влияет на цвет дельты.
  prefersDecrease: boolean
  getValue: (m: BodyMeasurement) => number | null
}

const STANDARD_METRICS: MetricDef[] = [
  { key: 'weightKg', label: 'Вес', unit: 'кг', prefersDecrease: true, getValue: (m) => m.weightKg },
  { key: 'bodyFatPct', label: '% жира', unit: '%', prefersDecrease: true, getValue: (m) => m.bodyFatPct },
  { key: 'chestCm', label: 'Грудь', unit: 'см', prefersDecrease: false, getValue: (m) => m.chestCm },
  { key: 'waistCm', label: 'Талия', unit: 'см', prefersDecrease: true, getValue: (m) => m.waistCm },
  { key: 'hipsCm', label: 'Бёдра', unit: 'см', prefersDecrease: false, getValue: (m) => m.hipsCm },
  { key: 'armCm', label: 'Рука', unit: 'см', prefersDecrease: false, getValue: (m) => m.armCm },
]

function fmtNum(v: number, decimals = 1): string {
  return v.toFixed(decimals).replace(/\.0$/, '')
}

function fmtDelta(v: number): string {
  const abs = Math.abs(v).toFixed(1).replace(/\.0$/, '')
  if (v > 0) return `+${abs}`
  if (v < 0) return `−${abs}`
  return abs
}

export function BodyWeightCard() {
  const { data, isLoading } = useBodyMeasurements({ limit: 60 })

  // Сортируем все измерения по дате (от старых к новым)
  const items = useMemo(() => {
    const arr = data?.items ?? []
    return [...arr].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
  }, [data])

  // Все доступные метрики: стандартные + кастомные. Только те, у которых есть хоть одно значение.
  const availableMetrics = useMemo<MetricDef[]>(() => {
    const result: MetricDef[] = []

    for (const m of STANDARD_METRICS) {
      if (items.some((i) => m.getValue(i) != null)) {
        result.push(m)
      }
    }

    const customSeen = new Map<string, { name: string; unit: string }>()
    for (const it of items) {
      for (const c of it.custom ?? []) {
        if (!customSeen.has(c.fieldId)) {
          customSeen.set(c.fieldId, { name: c.name, unit: c.unit })
        }
      }
    }
    for (const [fieldId, def] of customSeen) {
      result.push({
        key: `custom_${fieldId}`,
        label: def.name,
        unit: def.unit,
        prefersDecrease: false,
        getValue: (m) => m.custom?.find((c) => c.fieldId === fieldId)?.value ?? null,
      })
    }

    return result
  }, [items])

  const [activeKey, setActiveKey] = useState<string | null>(null)
  const active = useMemo(() => {
    if (!availableMetrics.length) return null
    return availableMetrics.find((m) => m.key === activeKey) ?? availableMetrics[0]
  }, [availableMetrics, activeKey])

  // Серия значений по выбранной метрике
  const series = useMemo(() => {
    if (!active) return [] as { date: string; value: number }[]
    return items
      .map((m) => {
        const v = active.getValue(m)
        return v != null ? { date: m.date, value: v } : null
      })
      .filter((x): x is { date: string; value: number } => x != null)
  }, [items, active])

  const latest = series[series.length - 1]

  const weekAgo = useMemo(() => {
    if (!latest) return null
    const target = new Date(latest.date).getTime() - 7 * 86400000
    let best: typeof series[0] | null = null
    for (const m of series) {
      if (m === latest) break
      const t = new Date(m.date).getTime()
      if (t <= target) best = m
      else if (!best) best = m
    }
    return best
  }, [series, latest])

  if (isLoading) {
    return (
      <div className="glass-card p-5 sm:p-6">
        <div className="eyebrow flex items-center gap-2">
          <Activity className="h-4 w-4" />
          Замеры тела
        </div>
        <div className="mt-4 h-[160px] animate-pulse rounded-xl" style={{ background: 'var(--gl-bg)' }} />
      </div>
    )
  }

  // Нет ни одного замера вообще
  if (!availableMetrics.length || !active || !latest) {
    return (
      <Link
        href="/body"
        className="glass-card p-5 sm:p-6 fz-rise block hover:opacity-90 transition-opacity"
      >
        <div className="flex items-center gap-3">
          <div
            className="grid place-items-center shrink-0"
            style={{
              width: 48,
              height: 48,
              borderRadius: 14,
              background: 'color-mix(in oklab, var(--c-yellow) 24%, transparent)',
              border: '1px solid color-mix(in oklab, var(--c-yellow) 40%, transparent)',
              color: 'var(--c-yellow)',
            }}
          >
            <Bell className="h-6 w-6" strokeWidth={2.2} />
          </div>
          <div className="min-w-0">
            <div className="text-[15px] font-semibold" style={{ color: 'var(--txt-1)' }}>
              Добавьте первый замер
            </div>
            <div className="text-[12px] txt-soft mt-1">
              Начните отслеживать прогресс тела
            </div>
          </div>
        </div>
      </Link>
    )
  }

  const daysSinceLast = differenceInDays(new Date(), new Date(latest.date))
  const shouldRemind = daysSinceLast >= REMINDER_INTERVAL_DAYS
  const sparklineData = series.length >= 2 ? series.slice(-12).map((m) => m.value) : null

  const delta = weekAgo ? latest.value - weekAgo.value : null
  const isGoodDelta = delta != null && (active.prefersDecrease ? delta < 0 : delta > 0)
  const isBadDelta = delta != null && delta !== 0 && !isGoodDelta
  const deltaColor = isGoodDelta
    ? 'var(--c-green)'
    : isBadDelta
    ? 'var(--c-orange)'
    : 'var(--txt-3)'

  // Точность отображения: для %жира и веса — 1 знак, для см — 1 знак тоже, для кастомных — 1 знак
  const decimals = active.unit === '%' || active.unit === 'кг' ? 1 : 1

  return (
    <div className="glass-card p-5 sm:p-6 fz-rise">
      <div className="flex items-center gap-2 mb-2">
        <Activity className="h-4 w-4" style={{ color: 'var(--txt-2)' }} strokeWidth={2.4} />
        <span className="eyebrow">{active.label}</span>
        {delta != null && (
          <span
            className="tnum ml-auto text-[13px] font-bold"
            style={{ color: deltaColor }}
          >
            {fmtDelta(delta)} {active.unit} за неделю
          </span>
        )}
      </div>

      {/* Чипы-фильтры */}
      {availableMetrics.length > 1 && (
        <div className="flex gap-2 overflow-x-auto no-scrollbar -mx-1 px-1 mb-3">
          {availableMetrics.map((m) => {
            const isActive = m.key === active.key
            return (
              <button
                key={m.key}
                onClick={() => setActiveKey(m.key)}
                className="shrink-0 transition-all"
                style={{
                  padding: '6px 12px',
                  borderRadius: 'var(--r-pill)',
                  fontSize: 12,
                  fontWeight: 700,
                  letterSpacing: 0.1,
                  cursor: 'pointer',
                  background: isActive
                    ? 'color-mix(in oklab, var(--c-accent) 24%, transparent)'
                    : 'var(--gl-bg)',
                  border: isActive
                    ? '1px solid color-mix(in oklab, var(--c-accent) 50%, transparent)'
                    : '1px solid var(--gl-border)',
                  color: isActive ? 'var(--c-accent)' : 'var(--txt-2)',
                }}
              >
                {m.label}
              </button>
            )
          })}
        </div>
      )}

      <div
        className="tnum"
        style={{
          fontSize: 'clamp(30px, 5vw, 36px)',
          fontWeight: 800,
          letterSpacing: -1,
          lineHeight: 1,
          color: 'var(--txt-1)',
          marginTop: 6,
        }}
      >
        {fmtNum(latest.value, decimals)}
        <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--txt-2)', marginLeft: 6 }}>
          {active.unit}
        </span>
      </div>
      {sparklineData ? (
        <BigSparkline data={sparklineData} height={120} />
      ) : (
        <div className="text-[13px] txt-soft mt-3">
          Нужен ещё один замер для сравнения
        </div>
      )}
      <div className="mt-3 flex items-center justify-between text-[12px] txt-soft">
        <span>
          Замер {format(new Date(latest.date), 'd MMMM', { locale: ru })}
          {daysSinceLast > 0 && ` · ${daysSinceLast} дн. назад`}
        </span>
        <Link
          href="/body"
          className="font-semibold hover:opacity-80 transition-opacity"
          style={{ color: shouldRemind ? 'var(--c-yellow)' : 'var(--c-accent)' }}
        >
          {shouldRemind ? 'Пора замерить →' : 'Подробнее →'}
        </Link>
      </div>
    </div>
  )
}

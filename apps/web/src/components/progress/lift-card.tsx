'use client'

import { useMemo } from 'react'
import { Dumbbell } from 'lucide-react'
import { useProgress } from '@/hooks/use-workouts'
import { BigSparkline } from '@/components/ui/big-sparkline'
import { PERIOD_DAYS, type ProgressPeriod } from './period-tabs'

interface LiftCardProps {
  exerciseId: string
  name: string
  isActive?: boolean
  onClick?: () => void
  period: ProgressPeriod
}

function fmt(v: number): string {
  return v % 1 === 0 ? String(v) : v.toFixed(1).replace(/\.0$/, '')
}

function fmtDelta(v: number): string {
  const abs = Math.abs(v).toFixed(1).replace(/\.0$/, '')
  if (v > 0) return `+${abs}`
  if (v < 0) return `−${abs}`
  return abs
}

export function LiftCard({ exerciseId, name, isActive, onClick, period }: LiftCardProps) {
  const { data, isLoading } = useProgress(exerciseId)

  const series = useMemo(() => {
    const points = (data ?? []).filter(
      (p): p is typeof p & { maxWeightKg: number } => p.maxWeightKg != null,
    )
    const cutoff = Date.now() - PERIOD_DAYS[period] * 86400000
    return points
      .filter((p) => new Date(p.date).getTime() >= cutoff)
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
  }, [data, period])

  const cur = series.length ? series[series.length - 1].maxWeightKg : null
  const prev = series.length >= 2 ? series[0].maxWeightKg : null
  const delta = cur != null && prev != null ? cur - prev : null
  const pct = delta != null && prev ? (delta / prev) * 100 : null

  const deltaColor =
    delta == null ? 'var(--txt-3)' : delta > 0 ? 'var(--c-green)' : delta < 0 ? 'var(--c-orange)' : 'var(--txt-3)'

  const Wrapper: 'button' | 'div' = onClick ? 'button' : 'div'

  return (
    <Wrapper
      onClick={onClick}
      className={`glass-card p-4 sm:p-5 fz-rise text-left transition-all ${
        onClick ? 'cursor-pointer hover:opacity-95' : ''
      }`}
      style={{
        outline: isActive ? '1.5px solid var(--c-accent)' : 'none',
        outlineOffset: -1,
      }}
    >
      <div className="flex items-center gap-3">
        <div
          className="grid place-items-center shrink-0"
          style={{
            width: 36,
            height: 36,
            borderRadius: 10,
            background: 'var(--gl-bg)',
            color: 'var(--txt-2)',
          }}
        >
          <Dumbbell className="h-4 w-4" />
        </div>
        <div className="min-w-0 flex-1">
          <div
            className="truncate"
            style={{ fontSize: 13, color: 'var(--txt-3)', fontWeight: 600 }}
          >
            {name}
          </div>
          <div
            className="tnum"
            style={{
              fontSize: 'clamp(22px, 4vw, 28px)',
              fontWeight: 800,
              letterSpacing: -0.6,
              lineHeight: 1,
              color: 'var(--txt-1)',
              marginTop: 4,
            }}
          >
            {cur != null ? fmt(cur) : '—'}
            {cur != null && (
              <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--txt-2)', marginLeft: 4 }}>
                кг
              </span>
            )}
          </div>
        </div>
        {delta != null && delta !== 0 && (
          <div
            className="tnum text-right shrink-0"
            style={{ fontSize: 13, color: deltaColor, fontWeight: 700, lineHeight: 1.2 }}
          >
            {fmtDelta(delta)}
            {pct != null && (
              <>
                <br />
                <span style={{ fontSize: 10, color: deltaColor, opacity: 0.8 }}>
                  {fmtDelta(pct)}%
                </span>
              </>
            )}
          </div>
        )}
      </div>
      {isLoading ? (
        <div className="mt-3 h-[70px] animate-pulse rounded-lg" style={{ background: 'var(--gl-bg)' }} />
      ) : series.length >= 2 ? (
        <BigSparkline data={series.map((p) => p.maxWeightKg)} height={70} marginTop={10} />
      ) : (
        <div className="mt-3 h-[70px] grid place-items-center text-[12px] txt-soft">
          Нужно ≥2 тренировок за период
        </div>
      )}
    </Wrapper>
  )
}

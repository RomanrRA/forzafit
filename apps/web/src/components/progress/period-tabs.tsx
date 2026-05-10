'use client'

export type ProgressPeriod = 'week' | 'month' | '3months' | 'year'

export const PERIOD_DAYS: Record<ProgressPeriod, number> = {
  week: 7,
  month: 30,
  '3months': 90,
  year: 365,
}

const PERIOD_LABELS: { key: ProgressPeriod; label: string }[] = [
  { key: 'week', label: 'Неделя' },
  { key: 'month', label: 'Месяц' },
  { key: '3months', label: '3 мес' },
  { key: 'year', label: 'Год' },
]

interface PeriodTabsProps {
  value: ProgressPeriod
  onChange: (v: ProgressPeriod) => void
}

export function PeriodTabs({ value, onChange }: PeriodTabsProps) {
  return (
    <div className="flex gap-1.5">
      {PERIOD_LABELS.map((p) => {
        const active = p.key === value
        return (
          <button
            key={p.key}
            onClick={() => onChange(p.key)}
            className="transition-all"
            style={{
              padding: '8px 14px',
              borderRadius: 10,
              background: active ? 'var(--gl-bg-strong)' : 'transparent',
              border: '1px solid ' + (active ? 'var(--gl-border-strong)' : 'var(--gl-border)'),
              color: active ? 'var(--txt-1)' : 'var(--txt-2)',
              fontSize: 12,
              fontWeight: 700,
              cursor: 'pointer',
              whiteSpace: 'nowrap',
            }}
          >
            {p.label}
          </button>
        )
      })}
    </div>
  )
}

'use client'

import { useMemo } from 'react'
import { format, startOfDay, subDays } from 'date-fns'
import { Flame } from 'lucide-react'
import { useGamificationOverview } from '@/hooks/use-gamification'
import { useWorkouts } from '@/hooks/use-workouts'
import { plural } from '@/lib/utils'

export function StreakHeatmapCard() {
  const { data, isLoading } = useGamificationOverview()

  const since = useMemo(() => format(startOfDay(subDays(new Date(), 13)), 'yyyy-MM-dd'), [])
  const { data: completedData } = useWorkouts({
    limit: 100,
    order: 'asc',
    status: 'completed',
    from: since,
  })

  const doneDates = useMemo(() => {
    const set = new Set<string>()
    for (const w of completedData?.items ?? []) {
      if (!w.startedAt) continue
      set.add(format(startOfDay(new Date(w.startedAt)), 'yyyy-MM-dd'))
    }
    return set
  }, [completedData])

  const days14 = useMemo(() => {
    const today = startOfDay(new Date())
    return Array.from({ length: 14 }, (_, i) => {
      const d = subDays(today, 13 - i)
      const key = format(d, 'yyyy-MM-dd')
      return {
        key,
        date: d.getDate(),
        done: doneDates.has(key),
        today: i === 13,
      }
    })
  }, [doneDates])

  if (isLoading || !data) return null

  const { streak } = data
  const dayWord = plural(streak.current, ['день', 'дня', 'дней'])
  const sub = streak.longest > streak.current ? `рекорд: ${streak.longest}` : 'серия. не ломаем.'

  return (
    <div className="glass-card strong p-5 sm:p-6 fz-rise flex flex-col gap-3">
      <div className="flex items-center gap-3">
        <div
          className="grid place-items-center shrink-0"
          style={{
            width: 52,
            height: 52,
            borderRadius: 16,
            background: 'color-mix(in oklab, var(--c-orange) 24%, transparent)',
            border: '1px solid color-mix(in oklab, var(--c-orange) 40%, transparent)',
            color: 'var(--c-orange)',
          }}
        >
          <Flame className="h-[26px] w-[26px]" strokeWidth={2.2} />
        </div>
        <div className="min-w-0">
          <div
            className="tnum"
            style={{
              fontSize: 36,
              fontWeight: 800,
              letterSpacing: -1,
              lineHeight: 1,
              color: 'var(--txt-1)',
            }}
          >
            {streak.current}
            <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--txt-2)', marginLeft: 6 }}>
              {dayWord}
            </span>
          </div>
          <div className="text-[12px] mt-1 txt-soft">{sub}</div>
        </div>
      </div>
      <div className="flex gap-1 mt-2">
        {days14.map((d) => (
          <div
            key={d.key}
            title={`${d.date} · ${d.done ? 'тренировка' : 'нет'}`}
            style={{
              flex: 1,
              height: 24,
              borderRadius: 6,
              background: d.done
                ? 'color-mix(in oklab, var(--c-green) 32%, transparent)'
                : 'var(--gl-bg)',
              outline: d.today ? '1.5px solid var(--c-accent)' : 'none',
              outlineOffset: 1,
              transition: 'background 0.2s',
            }}
          />
        ))}
      </div>
    </div>
  )
}

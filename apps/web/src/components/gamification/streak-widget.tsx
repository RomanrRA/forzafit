'use client'

import Link from 'next/link'
import { useMemo } from 'react'
import { format, startOfDay, subDays } from 'date-fns'
import { Flame, Trophy, Medal } from 'lucide-react'
import { useGamificationOverview } from '@/hooks/use-gamification'
import { useWorkouts } from '@/hooks/use-workouts'
import { plural } from '@/lib/utils'

export function StreakWidget() {
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
      if (!w.finishedAt && !w.startedAt) continue
      const date = format(startOfDay(new Date(w.startedAt)), 'yyyy-MM-dd')
      set.add(date)
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

  const { streak, achievementsUnlocked, achievementsTotal, prCount, recentAchievements, points } = data

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="eyebrow">Достижения</div>
        <Link
          href="/achievements"
          className="text-xs font-semibold txt-muted hover:opacity-80 transition-opacity"
        >
          Все →
        </Link>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        {/* ── Серия + 14-day heatmap ── */}
        <div className="glass-card strong p-4 sm:p-5 sm:col-span-1">
          <div className="flex items-center gap-3">
            <div
              className="grid place-items-center shrink-0"
              style={{
                width: 48,
                height: 48,
                borderRadius: 14,
                background: 'color-mix(in oklab, var(--c-orange) 24%, transparent)',
                border: '1px solid color-mix(in oklab, var(--c-orange) 40%, transparent)',
                color: 'var(--c-orange)',
              }}
            >
              <Flame className="h-6 w-6" strokeWidth={2.2} />
            </div>
            <div className="min-w-0">
              <div
                className="tnum"
                style={{
                  fontSize: 32,
                  fontWeight: 800,
                  letterSpacing: -0.8,
                  lineHeight: 1,
                  color: 'var(--txt-1)',
                }}
              >
                {streak.current}
                <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--txt-2)', marginLeft: 6 }}>
                  {streak.current === 1 ? 'день' : streak.current >= 2 && streak.current <= 4 ? 'дня' : 'дней'}
                </span>
              </div>
              <div className="text-[11px] mt-1 txt-soft">
                {streak.longest > streak.current ? `рекорд: ${streak.longest}` : 'серия. не ломаем.'}
              </div>
            </div>
          </div>
          {/* 14 дней */}
          <div className="flex gap-1 mt-3">
            {days14.map((d) => (
              <div
                key={d.key}
                title={
                  (d.today ? 'сегодня · ' : '') +
                  `${d.date} · ${d.done ? 'тренировка' : 'нет'}`
                }
                style={{
                  flex: 1,
                  height: 22,
                  borderRadius: 5,
                  background: d.done
                    ? 'color-mix(in oklab, var(--c-green) 38%, transparent)'
                    : 'var(--gl-bg)',
                  outline: d.today ? '1.5px solid color-mix(in oklab, var(--txt-2) 60%, transparent)' : 'none',
                  outlineOffset: 1,
                  transition: 'background 0.2s',
                }}
              />
            ))}
          </div>
        </div>

        {/* ── Достижения ── */}
        <Link
          href="/achievements"
          className="glass-card p-4 sm:p-5 flex items-center gap-3 hover:opacity-90 transition-opacity"
        >
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
            <Trophy className="h-6 w-6" strokeWidth={2.2} />
          </div>
          <div className="min-w-0">
            <div
              className="tnum"
              style={{
                fontSize: 32,
                fontWeight: 800,
                letterSpacing: -0.8,
                lineHeight: 1,
                color: 'var(--txt-1)',
              }}
            >
              {achievementsUnlocked}
              <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--txt-2)', marginLeft: 6 }}>
                / {achievementsTotal}
              </span>
            </div>
            <div className="text-[11px] mt-1 txt-soft">{points} очков</div>
          </div>
        </Link>

        {/* ── PR ── */}
        <div className="glass-card p-4 sm:p-5 flex items-center gap-3">
          <div
            className="grid place-items-center shrink-0"
            style={{
              width: 48,
              height: 48,
              borderRadius: 14,
              background: 'color-mix(in oklab, var(--c-green) 24%, transparent)',
              border: '1px solid color-mix(in oklab, var(--c-green) 40%, transparent)',
              color: 'var(--c-green)',
            }}
          >
            <Medal className="h-6 w-6" strokeWidth={2.2} />
          </div>
          <div className="min-w-0">
            <div
              className="tnum"
              style={{
                fontSize: 32,
                fontWeight: 800,
                letterSpacing: -0.8,
                lineHeight: 1,
                color: 'var(--txt-1)',
              }}
            >
              {prCount}
            </div>
            <div className="text-[11px] mt-1 txt-soft">
              {plural(prCount, ['рекорд', 'рекорда', 'рекордов'])}
            </div>
          </div>
        </div>
      </div>

      {recentAchievements.length > 0 && (
        <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
          {recentAchievements.map((a) => (
            <div
              key={a.id}
              className="glass-card shrink-0 flex items-center gap-2 px-3 py-1.5 text-xs"
              style={{ borderRadius: 'var(--r-pill)' }}
              title={a.description}
            >
              <span className="text-base">{a.emoji}</span>
              <span className="font-semibold" style={{ color: 'var(--txt-1)' }}>
                {a.title}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

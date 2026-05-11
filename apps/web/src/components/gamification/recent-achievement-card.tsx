'use client'

import Link from 'next/link'
import { useMemo } from 'react'
import { format, formatDistanceToNow } from 'date-fns'
import { ru } from 'date-fns/locale'
import { Trophy } from 'lucide-react'
import { useGamificationOverview, type AchievementWithProgress } from '@/hooks/use-gamification'

const CATEGORY_COLOR: Record<string, string> = {
  milestone: 'var(--c-blue)',
  consistency: 'var(--c-orange)',
  strength: 'var(--c-green)',
  volume: 'var(--c-violet)',
  time: 'var(--c-yellow)',
  social: 'var(--c-red)',
}

function relTime(iso: string): string {
  const d = new Date(iso)
  const diffDays = Math.floor((Date.now() - d.getTime()) / 86400000)
  if (diffDays === 0) return 'сегодня'
  if (diffDays === 1) return 'вчера'
  if (diffDays < 7) return formatDistanceToNow(d, { locale: ru, addSuffix: true })
  return format(d, 'd MMMM', { locale: ru })
}

export function RecentAchievementCard() {
  const { data, isLoading } = useGamificationOverview()

  const latest = useMemo<AchievementWithProgress | null>(() => {
    const list = data?.recentAchievements ?? []
    const unlocked = list.filter((a) => a.unlocked && a.unlockedAt)
    if (!unlocked.length) return null
    return [...unlocked].sort(
      (a, b) => new Date(b.unlockedAt!).getTime() - new Date(a.unlockedAt!).getTime(),
    )[0]
  }, [data])

  if (isLoading) return null

  if (!latest) {
    return (
      <Link
        href="/achievements"
        className="glass-card p-5 fz-rise block hover:opacity-90 transition-opacity"
      >
        <div className="flex items-center gap-2 mb-3">
          <Trophy
            className="h-4 w-4 opacity-60"
            style={{ color: 'var(--c-yellow)' }}
            strokeWidth={2.4}
          />
          <span className="eyebrow opacity-70" style={{ color: 'var(--c-yellow)' }}>
            Достижения
          </span>
        </div>
        <div className="flex items-center gap-3">
          <div
            className="grid place-items-center shrink-0"
            style={{
              width: 52,
              height: 52,
              borderRadius: 16,
              background: 'color-mix(in oklab, var(--c-yellow) 22%, transparent)',
              border: '1px solid color-mix(in oklab, var(--c-yellow) 40%, transparent)',
              fontSize: 26,
              lineHeight: 1,
            }}
          >
            🎯
          </div>
          <div className="min-w-0">
            <div
              className="font-bold truncate"
              style={{ fontSize: 16, letterSpacing: -0.2, color: 'var(--txt-1)' }}
            >
              Получи первое достижение
            </div>
            <div className="text-[12px] txt-soft mt-1">
              Тренируйся регулярно — 20 достижений ждут
            </div>
          </div>
        </div>
      </Link>
    )
  }

  const accent = CATEGORY_COLOR[latest.category] ?? 'var(--c-yellow)'

  return (
    <Link
      href="/achievements"
      className="glass-card p-5 fz-rise block hover:opacity-90 transition-opacity"
    >
      <div className="flex items-center gap-2 mb-3">
        <Trophy className="h-4 w-4" style={{ color: accent }} strokeWidth={2.4} />
        <span className="eyebrow" style={{ color: accent }}>
          Новое достижение
        </span>
        <span
          className="tnum ml-auto text-[12px] font-bold"
          style={{
            padding: '2px 8px',
            borderRadius: 'var(--r-pill)',
            background: `color-mix(in oklab, ${accent} 18%, transparent)`,
            color: accent,
          }}
        >
          +{latest.points}
        </span>
      </div>
      <div className="flex items-center gap-3">
        <div
          className="grid place-items-center shrink-0"
          style={{
            width: 52,
            height: 52,
            borderRadius: 16,
            background: `color-mix(in oklab, ${accent} 22%, transparent)`,
            border: `1px solid color-mix(in oklab, ${accent} 40%, transparent)`,
            fontSize: 28,
            lineHeight: 1,
          }}
        >
          {latest.emoji}
        </div>
        <div className="min-w-0">
          <div
            className="font-bold truncate"
            style={{ fontSize: 16, letterSpacing: -0.2, color: 'var(--txt-1)' }}
          >
            {latest.title}
          </div>
          <div className="text-[12px] txt-soft mt-1">
            {latest.unlockedAt ? relTime(latest.unlockedAt) : ''}
          </div>
        </div>
      </div>
    </Link>
  )
}

'use client'

import { useMemo } from 'react'
import { format, formatDistanceToNow } from 'date-fns'
import { ru } from 'date-fns/locale'
import { Trophy } from 'lucide-react'
import { useGamificationPrs, type GamificationPr } from '@/hooks/use-gamification'

function fmtKg(v: number): string {
  return Number.isInteger(v) ? String(v) : v.toFixed(1).replace(/\.0$/, '')
}

function relTime(iso: string): string {
  const d = new Date(iso)
  const diffDays = Math.floor((Date.now() - d.getTime()) / 86400000)
  if (diffDays === 0) return 'сегодня'
  if (diffDays === 1) return 'вчера'
  if (diffDays < 7) return formatDistanceToNow(d, { locale: ru, addSuffix: true })
  return format(d, 'd MMMM', { locale: ru })
}

export function RecentPrCard() {
  const { data: prs, isLoading } = useGamificationPrs()

  const latest = useMemo<GamificationPr | null>(() => {
    if (!prs?.length) return null
    return [...prs].sort((a, b) => new Date(b.achievedAt).getTime() - new Date(a.achievedAt).getTime())[0]
  }, [prs])

  if (isLoading || !latest) return null

  const value = typeof latest.valueKg === 'string' ? Number(latest.valueKg) : latest.valueKg

  return (
    <div className="glass-card p-5 fz-rise">
      <div className="flex items-center gap-2 mb-2">
        <Trophy className="h-4 w-4" style={{ color: 'var(--c-green)' }} strokeWidth={2.4} />
        <span
          className="eyebrow"
          style={{ color: 'var(--c-green)' }}
        >
          Свежий PR
        </span>
      </div>
      <div
        className="tnum"
        style={{
          fontSize: 'clamp(34px, 6vw, 42px)',
          fontWeight: 800,
          letterSpacing: -1.4,
          lineHeight: 1,
          color: 'var(--txt-1)',
        }}
      >
        {fmtKg(value)}
        <span style={{ fontSize: 16, fontWeight: 600, color: 'var(--txt-2)', marginLeft: 6 }}>
          кг
        </span>
        {latest.reps && (
          <>
            <span style={{ color: 'var(--txt-3)', margin: '0 8px', fontWeight: 500 }}>×</span>
            {latest.reps}
          </>
        )}
      </div>
      <div className="mt-2 text-[13px] txt-muted">
        {latest.exerciseName ?? 'Упражнение'} · {relTime(latest.achievedAt)}
      </div>
    </div>
  )
}

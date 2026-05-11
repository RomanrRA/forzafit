'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Flame, Trophy, Medal, Users, Globe2 } from 'lucide-react'
import {
  useLeaderboard,
  type LeaderboardMetric,
  type LeaderboardScope,
  type LeaderboardEntry,
} from '@/hooks/use-social'
import { plural } from '@/lib/utils'

const METRICS: { key: LeaderboardMetric; label: string; icon: typeof Flame; tone: string }[] = [
  { key: 'streak', label: 'Серии', icon: Flame, tone: 'var(--c-orange)' },
  { key: 'achievements', label: 'Достижения', icon: Trophy, tone: 'var(--c-yellow)' },
  { key: 'prCount', label: 'Рекорды', icon: Medal, tone: 'var(--c-green)' },
]

const SCOPES: { key: LeaderboardScope; label: string; icon: typeof Users }[] = [
  { key: 'friends', label: 'Друзья', icon: Users },
  { key: 'all', label: 'Все', icon: Globe2 },
]

function entryName(e: LeaderboardEntry): string {
  return e.displayName || e.name || e.username || 'Атлет'
}

function valueLabel(e: LeaderboardEntry): string {
  if (e.metric === 'streak') return `${e.value} ${plural(e.value, ['день', 'дня', 'дней'])}`
  if (e.metric === 'achievements') return `${e.value}`
  return `${e.value}`
}

function Avatar({ name, url, rank }: { name: string; url: string | null; rank: number }) {
  const initial = name.trim().slice(0, 1).toUpperCase()
  const trophy = rank === 1 ? '🥇' : rank === 2 ? '🥈' : rank === 3 ? '🥉' : null
  return (
    <div className="relative shrink-0">
      {url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={url} alt="" width={40} height={40} style={{ width: 40, height: 40, borderRadius: '50%', objectFit: 'cover' }} />
      ) : (
        <div
          className="grid place-items-center"
          style={{
            width: 40, height: 40, borderRadius: '50%',
            background: 'linear-gradient(135deg, oklch(0.55 0.15 30), oklch(0.45 0.18 280))',
            color: 'white', fontWeight: 700, fontSize: 15,
          }}
        >
          {initial}
        </div>
      )}
      {trophy && (
        <span
          style={{
            position: 'absolute', bottom: -4, right: -4, fontSize: 14,
            filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.3))',
          }}
        >
          {trophy}
        </span>
      )}
    </div>
  )
}

export default function LeaderboardPage() {
  const [metric, setMetric] = useState<LeaderboardMetric>('streak')
  const [scope, setScope] = useState<LeaderboardScope>('friends')
  const { data, isLoading } = useLeaderboard(metric, scope)
  const list = data ?? []
  const tone = METRICS.find((m) => m.key === metric)?.tone ?? 'var(--c-accent)'

  return (
    <div className="space-y-5 fz-rise">
      <div className="flex items-baseline gap-3 flex-wrap">
        <h1
          style={{
            fontSize: 'clamp(24px, 4.4vw, 28px)',
            fontWeight: 800,
            letterSpacing: -0.4,
            color: 'var(--txt-1)',
            margin: 0,
          }}
        >
          Топ
        </h1>
      </div>

      {/* Metric tabs */}
      <div className="flex gap-2 overflow-x-auto no-scrollbar -mx-1 px-1">
        {METRICS.map(({ key, label, icon: Icon, tone: t }) => {
          const active = metric === key
          return (
            <button
              key={key}
              onClick={() => setMetric(key)}
              className="shrink-0 inline-flex items-center gap-1.5 transition-all"
              style={{
                padding: '8px 14px',
                borderRadius: 'var(--r-pill)',
                fontSize: 13,
                fontWeight: 700,
                cursor: 'pointer',
                background: active ? `color-mix(in oklab, ${t} 24%, transparent)` : 'var(--gl-bg)',
                border: '1px solid ' + (active ? `color-mix(in oklab, ${t} 50%, transparent)` : 'var(--gl-border)'),
                color: active ? t : 'var(--txt-2)',
              }}
            >
              <Icon className="h-3.5 w-3.5" />
              {label}
            </button>
          )
        })}
      </div>

      {/* Scope tabs */}
      <div className="flex gap-2">
        {SCOPES.map(({ key, label, icon: Icon }) => {
          const active = scope === key
          return (
            <button
              key={key}
              onClick={() => setScope(key)}
              className="inline-flex items-center gap-1.5 transition-all"
              style={{
                padding: '6px 12px',
                borderRadius: 10,
                fontSize: 12,
                fontWeight: 700,
                cursor: 'pointer',
                background: active ? 'var(--gl-bg-strong)' : 'transparent',
                border: '1px solid ' + (active ? 'var(--gl-border-strong)' : 'var(--gl-border)'),
                color: active ? 'var(--txt-1)' : 'var(--txt-2)',
              }}
            >
              <Icon className="h-3.5 w-3.5" />
              {label}
            </button>
          )
        })}
      </div>

      {/* List */}
      {isLoading ? (
        <div className="space-y-2">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="glass-card p-4 animate-pulse h-[68px]" />
          ))}
        </div>
      ) : list.length === 0 ? (
        <div className="glass-card p-6 text-center text-sm txt-muted">
          Пока пусто в этой категории
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {list.map((e) => {
            const name = entryName(e)
            const inner = (
              <>
                <span
                  className="tnum text-center shrink-0"
                  style={{
                    width: 28,
                    fontSize: 14,
                    fontWeight: 800,
                    color: e.rank <= 3 ? tone : 'var(--txt-3)',
                  }}
                >
                  {e.rank}
                </span>
                <Avatar name={name} url={e.avatarUrl} rank={e.rank} />
                <div className="min-w-0 flex-1">
                  <div className="font-semibold truncate" style={{ color: 'var(--txt-1)' }}>{name}</div>
                  {e.username && (
                    <div className="text-[12px] txt-soft truncate">@{e.username}</div>
                  )}
                </div>
                <div
                  className="tnum text-right shrink-0"
                  style={{ fontSize: 16, fontWeight: 800, color: tone }}
                >
                  {valueLabel(e)}
                </div>
              </>
            )
            const cls = 'glass-card p-3 sm:p-4 flex items-center gap-3 fz-rise'
            return e.username ? (
              <Link key={e.userId} href={`/profile/${e.username}`} className={cls}>
                {inner}
              </Link>
            ) : (
              <div key={e.userId} className={cls}>
                {inner}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

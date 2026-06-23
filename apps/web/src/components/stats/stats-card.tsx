'use client'

import { useMemo, useState } from 'react'
import {
  PolarAngleAxis,
  PolarGrid,
  PolarRadiusAxis,
  Radar,
  RadarChart,
  ResponsiveContainer,
} from 'recharts'
import { Sparkles, Swords } from 'lucide-react'
import { useMyStats, useUserStats, type StatKey } from '@/hooks/use-stats'
import { useFriends } from '@/hooks/use-social'

const STAT_META: { key: StatKey; label: string; short: string }[] = [
  { key: 'strength', label: 'Сила', short: 'СИЛА' },
  { key: 'power', label: 'Мощь', short: 'МОЩЬ' },
  { key: 'endurance', label: 'Выносливость', short: 'ВЫНОСЛ' },
  { key: 'intensity', label: 'Интенсивность', short: 'ИНТЕНС' },
  { key: 'discipline', label: 'Дисциплина', short: 'ДИСЦ' },
  { key: 'balance', label: 'Баланс', short: 'БАЛАНС' },
]

const ME_COLOR = '#6366f1'
const FRIEND_COLOR = '#f59e0b'

export function StatsCard() {
  const { data: me, isLoading } = useMyStats()
  const { data: friends } = useFriends('accepted')
  const [friendId, setFriendId] = useState<string | null>(null)
  const { data: friendStats } = useUserStats(friendId)

  const friendOptions = useMemo(
    () =>
      (friends ?? [])
        .map((f) => f.friend)
        .filter((u): u is NonNullable<typeof u> => !!u),
    [friends],
  )

  const radarData = useMemo(
    () =>
      STAT_META.map((m) => ({
        stat: m.short,
        me: me?.stats[m.key] ?? 0,
        friend: friendStats?.stats[m.key] ?? 0,
      })),
    [me, friendStats],
  )

  const selectedFriend = friendOptions.find((u) => u.id === friendId) ?? null
  const friendName = selectedFriend
    ? selectedFriend.displayName ||
      selectedFriend.name ||
      selectedFriend.username ||
      'Друг'
    : null

  // Итог сравнения: где ты ведёшь сильнее всего и где друг
  const summary = useMemo(() => {
    if (!me || !friendStats) return null
    let myBest: { label: string; diff: number } | null = null
    let friendBest: { label: string; diff: number } | null = null
    for (const m of STAT_META) {
      const diff = me.stats[m.key] - friendStats.stats[m.key]
      if (diff > 0 && (!myBest || diff > myBest.diff))
        myBest = { label: m.label, diff }
      if (diff < 0 && (!friendBest || diff < friendBest.diff))
        friendBest = { label: m.label, diff }
    }
    return { myBest, friendBest }
  }, [me, friendStats])

  if (isLoading) {
    return (
      <div
        className="glass-card grid place-items-center"
        style={{ height: 240, color: 'var(--txt-3)', fontSize: 13 }}
      >
        Загружаем характеристики…
      </div>
    )
  }
  if (!me) return null

  const allZero = Object.values(me.stats).every((v) => v === 0)

  return (
    <div
      className="glass-card"
      style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 14 }}
    >
      {/* Шапка */}
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <h2
          style={{
            fontSize: 16,
            fontWeight: 800,
            letterSpacing: 0.5,
            color: 'var(--txt-1)',
          }}
        >
          ХАРАКТЕРИСТИКИ
        </h2>
        <div
          className="inline-flex items-center gap-1.5"
          style={{
            padding: '5px 12px',
            borderRadius: 'var(--r-pill)',
            fontSize: 13,
            fontWeight: 800,
            fontVariantNumeric: 'tabular-nums',
            letterSpacing: 0.5,
            color: ME_COLOR,
            background: `color-mix(in oklab, ${ME_COLOR} 16%, transparent)`,
            border: `1px solid color-mix(in oklab, ${ME_COLOR} 40%, transparent)`,
          }}
        >
          LVL {me.level}
        </div>
      </div>

      {allZero && (
        <div
          className="glass-card"
          style={{
            padding: '10px 14px',
            fontSize: 13,
            fontWeight: 600,
            color: 'var(--txt-2)',
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            border: `1px solid color-mix(in oklab, ${ME_COLOR} 35%, var(--gl-border))`,
          }}
        >
          <Sparkles
            className="h-4 w-4 shrink-0"
            style={{ color: ME_COLOR }}
            strokeWidth={2}
          />
          <span>
            Тренируйся и ставь рекорды — характеристики прокачиваются по твоим
            подходам, PR и стрику.
          </span>
        </div>
      )}

      <div className="flex flex-wrap gap-4">
        {/* Радар */}
        <div style={{ flex: '1 1 240px', minWidth: 240, height: 240 }}>
          <ResponsiveContainer width="100%" height="100%">
            <RadarChart data={radarData} outerRadius="72%">
              <PolarGrid stroke="var(--gl-border)" />
              <PolarAngleAxis
                dataKey="stat"
                tick={{ fontSize: 10, fill: 'var(--txt-3)' }}
              />
              <PolarRadiusAxis domain={[0, 100]} tick={false} axisLine={false} />
              <Radar
                name="Я"
                dataKey="me"
                stroke={ME_COLOR}
                fill={ME_COLOR}
                fillOpacity={0.35}
                strokeWidth={2}
                isAnimationActive={false}
              />
              {friendStats && (
                <Radar
                  name={friendName ?? 'Друг'}
                  dataKey="friend"
                  stroke={FRIEND_COLOR}
                  fill={FRIEND_COLOR}
                  fillOpacity={0.12}
                  strokeWidth={2}
                  strokeDasharray="4 3"
                  isAnimationActive={false}
                />
              )}
            </RadarChart>
          </ResponsiveContainer>
        </div>

        {/* Список статов */}
        <div
          style={{
            flex: '1 1 240px',
            minWidth: 220,
            display: 'flex',
            flexDirection: 'column',
            gap: 8,
            justifyContent: 'center',
          }}
        >
          {STAT_META.map((m) => {
            const mine = me.stats[m.key]
            const theirs = friendStats?.stats[m.key]
            const lead =
              theirs == null
                ? null
                : mine > theirs
                  ? 'me'
                  : mine < theirs
                    ? 'friend'
                    : 'tie'
            return (
              <div key={m.key}>
                <div className="flex items-center justify-between" style={{ marginBottom: 3 }}>
                  <span
                    style={{ fontSize: 12, fontWeight: 600, color: 'var(--txt-2)' }}
                  >
                    {m.label}
                  </span>
                  <span
                    className="inline-flex items-center gap-1.5"
                    style={{
                      fontSize: 12,
                      fontWeight: 800,
                      fontVariantNumeric: 'tabular-nums',
                      color: 'var(--txt-1)',
                    }}
                  >
                    {mine}
                    {theirs != null && (
                      <span style={{ color: 'var(--txt-3)', fontWeight: 600 }}>
                        / {theirs}
                      </span>
                    )}
                    {lead === 'me' && <span style={{ color: ME_COLOR }}>▲</span>}
                    {lead === 'friend' && (
                      <span style={{ color: FRIEND_COLOR }}>▼</span>
                    )}
                  </span>
                </div>
                <div
                  style={{
                    height: 6,
                    borderRadius: 3,
                    background: 'var(--gl-bg)',
                    overflow: 'hidden',
                    position: 'relative',
                  }}
                >
                  <div
                    style={{
                      width: `${mine}%`,
                      height: '100%',
                      borderRadius: 3,
                      background: ME_COLOR,
                    }}
                  />
                  {theirs != null && (
                    <div
                      style={{
                        position: 'absolute',
                        top: -2,
                        left: `calc(${theirs}% - 1px)`,
                        width: 2,
                        height: 10,
                        background: FRIEND_COLOR,
                      }}
                    />
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Сравнение с другом */}
      <div className="flex flex-col gap-2" style={{ borderTop: '1px solid var(--gl-border)', paddingTop: 12 }}>
        {friendOptions.length === 0 ? (
          <div style={{ fontSize: 12, color: 'var(--txt-3)' }}>
            Добавь друзей, чтобы мериться характеристиками.
          </div>
        ) : (
          <div className="flex items-center gap-2 flex-wrap">
            <Swords className="h-4 w-4 shrink-0" style={{ color: 'var(--txt-3)' }} />
            <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--txt-2)' }}>
              Сравнить с
            </span>
            <select
              value={friendId ?? ''}
              onChange={(e) => setFriendId(e.target.value || null)}
              className="glass-btn"
              style={{
                padding: '6px 10px',
                borderRadius: 10,
                fontSize: 13,
                fontWeight: 600,
                color: 'var(--txt-1)',
                background: 'var(--gl-bg)',
                border: '1px solid var(--gl-border)',
                cursor: 'pointer',
              }}
            >
              <option value="">— выбери друга —</option>
              {friendOptions.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.displayName || u.name || u.username || 'Друг'}
                </option>
              ))}
            </select>
          </div>
        )}

        {summary && friendName && (
          <div style={{ fontSize: 12.5, color: 'var(--txt-2)', lineHeight: 1.5 }}>
            {summary.myBest ? (
              <>
                Ты сильнее в «{summary.myBest.label.toLowerCase()}»
              </>
            ) : (
              <>Пока без явного перевеса</>
            )}
            {summary.friendBest && (
              <>
                , {friendName} — в «{summary.friendBest.label.toLowerCase()}».
              </>
            )}
            {!summary.friendBest && summary.myBest && <> — ведёшь по всем фронтам 💪</>}
          </div>
        )}
      </div>
    </div>
  )
}

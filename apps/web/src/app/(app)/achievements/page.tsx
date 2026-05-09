'use client'

import { useMemo, useState } from 'react'
import { format } from 'date-fns'
import { ru } from 'date-fns/locale'
import {
  useAchievements,
  type AchievementCategory,
  type AchievementWithProgress,
} from '@/hooks/use-gamification'

type FilterTab = 'all' | 'unlocked' | 'locked'

const CATEGORY_LABELS: Record<AchievementCategory, string> = {
  milestone: 'Этапы',
  consistency: 'Постоянство',
  strength: 'Сила',
  volume: 'Объём',
  time: 'Время',
  social: 'Социальное',
}

const CATEGORY_TINT: Record<AchievementCategory, string> = {
  milestone: 'var(--c-blue)',
  consistency: 'var(--c-orange)',
  strength: 'var(--c-green)',
  volume: 'var(--c-violet)',
  time: 'var(--c-yellow)',
  social: 'var(--c-red)',
}

function formatRu(date: string): string {
  return format(new Date(date), 'd MMMM yyyy', { locale: ru })
}

export default function AchievementsPage() {
  const { data, isLoading, error } = useAchievements()
  const [filter, setFilter] = useState<FilterTab>('all')
  const [category, setCategory] = useState<AchievementCategory | 'all'>('all')

  const all = data ?? []

  const stats = useMemo(() => {
    const total = all.length
    const unlocked = all.filter((a) => a.unlocked).length
    const points = all
      .filter((a) => a.unlocked)
      .reduce((sum, a) => sum + a.points, 0)
    return { total, unlocked, points }
  }, [all])

  const availableCategories = useMemo(() => {
    const set = new Set<AchievementCategory>()
    for (const a of all) set.add(a.category)
    return Array.from(set)
  }, [all])

  const filtered = useMemo(() => {
    let list = all
    if (filter === 'unlocked') list = list.filter((a) => a.unlocked)
    if (filter === 'locked') list = list.filter((a) => !a.unlocked)
    if (category !== 'all') list = list.filter((a) => a.category === category)
    return list
  }, [all, filter, category])

  return (
    <div className="space-y-5 fz-rise">
      {/* ── Header: title + stats ── */}
      <div className="flex items-baseline gap-3 flex-wrap">
        <h1
          style={{
            fontSize: 'clamp(26px, 4.4vw, 32px)',
            fontWeight: 800,
            letterSpacing: -0.5,
            lineHeight: 1,
            color: 'var(--txt-1)',
          }}
        >
          Ачивки
        </h1>
        {!isLoading && !error && (
          <span className="tnum text-sm font-bold txt-soft">
            {stats.unlocked} / {stats.total}
          </span>
        )}
        {!isLoading && !error && stats.points > 0 && (
          <span
            className="tnum"
            style={{
              fontSize: 11,
              fontWeight: 800,
              padding: '4px 10px',
              borderRadius: 'var(--r-pill)',
              background: 'color-mix(in oklab, var(--c-yellow) 20%, transparent)',
              color: 'var(--c-yellow)',
              border: '1px solid color-mix(in oklab, var(--c-yellow) 35%, transparent)',
            }}
          >
            {stats.points} очков
          </span>
        )}
      </div>

      {/* ── Status filters ── */}
      <div className="flex flex-wrap gap-1.5">
        {(['all', 'unlocked', 'locked'] as const).map((t) => {
          const labels = { all: 'Все', unlocked: 'Получены', locked: 'В процессе' }
          const active = filter === t
          return (
            <button
              key={t}
              type="button"
              onClick={() => setFilter(t)}
              className="whitespace-nowrap"
              style={{
                padding: '8px 14px',
                borderRadius: 10,
                background: active ? 'var(--gl-bg-strong)' : 'transparent',
                border: '1px solid ' + (active ? 'var(--gl-border-strong)' : 'var(--gl-border)'),
                color: active ? 'var(--txt-1)' : 'var(--txt-2)',
                fontSize: 12,
                fontWeight: 700,
                cursor: 'pointer',
                transition: 'background 0.15s, color 0.15s',
                flexShrink: 0,
              }}
            >
              {labels[t]}
            </button>
          )
        })}
      </div>

      {/* ── Category chips ── */}
      {availableCategories.length > 1 && (
        <div className="flex flex-wrap gap-1.5">
          <CategoryChip
            label="Все категории"
            active={category === 'all'}
            onClick={() => setCategory('all')}
          />
          {availableCategories.map((c) => (
            <CategoryChip
              key={c}
              label={CATEGORY_LABELS[c]}
              tint={CATEGORY_TINT[c]}
              active={category === c}
              onClick={() => setCategory(c)}
            />
          ))}
        </div>
      )}

      {isLoading && (
        <div className="glass-card p-6 text-center text-sm txt-muted">Загрузка ачивок…</div>
      )}

      {error && (
        <div className="glass-card p-6 text-center text-sm" style={{ color: 'var(--c-red)' }}>
          Не удалось загрузить ачивки
        </div>
      )}

      {!isLoading && !error && filtered.length === 0 && (
        <div className="glass-card p-6 text-center text-sm txt-muted">Здесь пока пусто</div>
      )}

      {/* ── Flat grid ── */}
      {filtered.length > 0 && (
        <div className="grid gap-3.5 grid-cols-2 sm:grid-cols-3 lg:grid-cols-4">
          {filtered.map((a) => (
            <AchievementCard
              key={a.id}
              achievement={a}
              tint={CATEGORY_TINT[a.category]}
              categoryLabel={CATEGORY_LABELS[a.category]}
            />
          ))}
        </div>
      )}
    </div>
  )
}

function CategoryChip({
  label,
  tint,
  active,
  onClick,
}: {
  label: string
  tint?: string
  active: boolean
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 6,
        padding: '6px 12px',
        borderRadius: 'var(--r-pill)',
        background: active
          ? tint
            ? `color-mix(in oklab, ${tint} 22%, transparent)`
            : 'var(--gl-bg-strong)'
          : 'var(--gl-bg)',
        border: `1px solid ${
          active
            ? tint
              ? `color-mix(in oklab, ${tint} 40%, transparent)`
              : 'var(--gl-border-strong)'
            : 'var(--gl-border)'
        }`,
        color: active ? (tint ?? 'var(--txt-1)') : 'var(--txt-2)',
        fontSize: 12,
        fontWeight: 700,
        cursor: 'pointer',
        transition: 'background 0.15s, color 0.15s',
      }}
    >
      {tint && (
        <span
          style={{
            width: 6,
            height: 6,
            borderRadius: 999,
            background: tint,
            display: 'inline-block',
          }}
        />
      )}
      {label}
    </button>
  )
}

function AchievementCard({
  achievement: a,
  tint,
  categoryLabel,
}: {
  achievement: AchievementWithProgress
  tint: string
  categoryLabel: string
}) {
  const showProgress =
    !a.unlocked &&
    a.progressCurrent != null &&
    a.progressTarget != null &&
    a.progressTarget > 0

  const pct = showProgress
    ? Math.min(100, Math.round(((a.progressCurrent ?? 0) / (a.progressTarget ?? 1)) * 100))
    : 0

  return (
    <div
      className="glass-card flex flex-col"
      style={{
        padding: 18,
        opacity: a.unlocked ? 1 : 0.92,
        minHeight: 176,
      }}
    >
      {/* Эмодзи + points */}
      <div className="flex items-start justify-between">
        <div
          style={{
            fontSize: 36,
            lineHeight: 1,
            filter: a.unlocked ? 'none' : 'grayscale(0.6)',
          }}
        >
          {a.emoji}
        </div>
        <span
          className="tnum"
          style={{
            fontSize: 11,
            fontWeight: 800,
            color: a.unlocked ? 'var(--c-yellow)' : 'var(--txt-3)',
            padding: '2px 8px',
            borderRadius: 'var(--r-pill)',
            background: a.unlocked
              ? 'color-mix(in oklab, var(--c-yellow) 18%, transparent)'
              : 'var(--gl-bg)',
            border: `1px solid ${
              a.unlocked
                ? 'color-mix(in oklab, var(--c-yellow) 35%, transparent)'
                : 'var(--gl-border)'
            }`,
          }}
        >
          +{a.points}
        </span>
      </div>

      {/* Category eyebrow */}
      <div
        className="mt-3 inline-flex items-center gap-1"
        style={{
          fontSize: 10,
          fontWeight: 800,
          textTransform: 'uppercase',
          letterSpacing: 0.5,
          color: tint,
        }}
      >
        <span
          style={{
            width: 5,
            height: 5,
            borderRadius: 999,
            background: tint,
            display: 'inline-block',
          }}
        />
        {categoryLabel}
      </div>

      {/* Title + description */}
      <div className="mt-1.5 min-w-0 flex-1">
        <div
          style={{
            fontSize: 15,
            fontWeight: 800,
            color: 'var(--txt-1)',
            lineHeight: 1.25,
            letterSpacing: -0.2,
          }}
        >
          {a.title}
        </div>
        <div
          style={{
            marginTop: 4,
            fontSize: 12,
            color: 'var(--txt-3)',
            lineHeight: 1.4,
          }}
        >
          {a.description}
        </div>
      </div>

      {/* Status: unlocked / progress / locked */}
      {a.unlocked ? (
        <div
          className="mt-3"
          style={{
            fontSize: 11,
            fontWeight: 800,
            letterSpacing: 0.5,
            textTransform: 'uppercase',
            color: tint,
          }}
        >
          ✓ Получено
          {a.unlockedAt && (
            <span
              className="ml-2 normal-case tracking-normal txt-soft"
              style={{ fontWeight: 600 }}
            >
              {formatRu(a.unlockedAt)}
            </span>
          )}
        </div>
      ) : showProgress ? (
        <div className="mt-3">
          <div
            style={{
              height: 5,
              borderRadius: 999,
              background: 'var(--gl-bg)',
              overflow: 'hidden',
            }}
          >
            <div
              style={{
                height: '100%',
                width: `${pct}%`,
                background: tint,
                borderRadius: 999,
                transition: 'width 0.4s ease',
              }}
            />
          </div>
          <div className="tnum mt-1.5 flex items-center justify-between text-[11px] font-bold txt-soft">
            <span>
              {a.progressCurrent} / {a.progressTarget}
            </span>
            <span>{pct}%</span>
          </div>
        </div>
      ) : (
        <div className="mt-3 text-[11px] font-bold uppercase tracking-wider txt-soft">
          Закрыто
        </div>
      )}
    </div>
  )
}

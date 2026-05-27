'use client'

import Link from 'next/link'
import { Target, Sparkles, ChevronRight } from 'lucide-react'
import {
  useQuests,
  daysLeft,
  formatQuestTarget,
  type QuestType,
} from '@/hooks/use-quests'

const TYPE_TINT: Record<QuestType, string> = {
  workout_count: 'var(--c-blue)',
  streak_keep: 'var(--c-orange)',
  pr_in_exercise: 'var(--c-green)',
  total_volume: 'var(--c-violet)',
  exercise_frequency: 'var(--c-yellow)',
  weekday_consistency: 'var(--c-red)',
}

export function ActiveQuestCard() {
  const { data, isLoading } = useQuests()

  if (isLoading) return null

  const active = data?.active ?? null
  const suggestionsCount = data?.suggestions.length ?? 0

  // Нет квестов вообще — компактный CTA
  if (!active && suggestionsCount === 0) {
    return (
      <Link href="/quests" className="block">
        <div
          className="glass-card flex items-center gap-3"
          style={{
            padding: '14px 16px',
            cursor: 'pointer',
            transition: 'border-color 0.15s',
          }}
        >
          <div
            style={{
              width: 36,
              height: 36,
              borderRadius: 10,
              background: 'color-mix(in oklab, var(--c-violet) 18%, transparent)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            <Sparkles size={18} style={{ color: 'var(--c-violet)' }} />
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-sm font-bold">AI-тренер ждёт</div>
            <div className="text-xs txt-muted truncate">
              Получи персональные цели на неделю
            </div>
          </div>
          <ChevronRight size={16} className="txt-soft" />
        </div>
      </Link>
    )
  }

  // Есть suggestions, но нет активного — приглашение принять
  if (!active) {
    return (
      <Link href="/quests" className="block">
        <div
          className="glass-card flex items-center gap-3"
          style={{ padding: '14px 16px', cursor: 'pointer' }}
        >
          <div
            style={{
              width: 36,
              height: 36,
              borderRadius: 10,
              background: 'color-mix(in oklab, var(--c-violet) 18%, transparent)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            <Sparkles size={18} style={{ color: 'var(--c-violet)' }} />
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-sm font-bold">
              {suggestionsCount} {suggestionsCount === 1 ? 'предложение' : 'предложения'} от AI-тренера
            </div>
            <div className="text-xs txt-muted truncate">
              Выбери цель на ближайшую неделю
            </div>
          </div>
          <ChevronRight size={16} className="txt-soft" />
        </div>
      </Link>
    )
  }

  const tint = TYPE_TINT[active.type]
  const ratio = active.progressRatio ?? 0
  const left = daysLeft(active)
  const current = Number(active.progress?.current ?? 0)

  return (
    <Link href="/quests" className="block h-full">
      <div
        className="glass-card flex flex-col gap-3 h-full"
        style={{
          padding: 16,
          cursor: 'pointer',
          borderColor: tint,
        }}
      >
        <div className="flex items-center gap-2">
          <Target size={16} style={{ color: tint, flexShrink: 0 }} />
          <span className="text-xs font-bold uppercase tracking-wide txt-soft">
            Активный квест
          </span>
          {left !== null && (
            <span
              className="ml-auto tnum text-xs font-bold"
              style={{ color: left <= 2 ? 'var(--c-red)' : 'var(--txt-2)' }}
            >
              {left} дн.
            </span>
          )}
        </div>

        <div className="flex-1">
          <h3
            className="font-bold leading-tight"
            style={{ fontSize: 16, color: 'var(--txt-1)' }}
          >
            {active.title}
          </h3>
          <p className="text-xs txt-muted mt-1">{formatQuestTarget(active)}</p>
        </div>

        <div className="space-y-1">
          <div
            style={{
              height: 6,
              borderRadius: 999,
              background: 'var(--gl-bg-strong)',
              overflow: 'hidden',
            }}
          >
            <div
              style={{
                width: `${Math.round(ratio * 100)}%`,
                height: '100%',
                background: tint,
                transition: 'width 0.3s',
              }}
            />
          </div>
          <div className="flex items-center justify-between text-xs txt-muted tnum">
            <span>{current}</span>
            <span>+{active.rewardPoints} очков</span>
          </div>
        </div>
      </div>
    </Link>
  )
}

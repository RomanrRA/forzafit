'use client'

import { Sparkles, Loader2, X, Check, RotateCw } from 'lucide-react'
import {
  useQuests,
  useGenerateQuests,
  useAcceptQuest,
  useAbandonQuest,
  formatQuestTarget,
  daysLeft,
  type Quest,
  type QuestType,
} from '@/hooks/use-quests'
import { useToast } from '@/hooks/use-toast'

const TYPE_LABELS: Record<QuestType, string> = {
  workout_count: 'Частота',
  streak_keep: 'Серия',
  pr_in_exercise: 'Рекорд',
  total_volume: 'Объём',
  exercise_frequency: 'Упражнение',
  weekday_consistency: 'Дисциплина',
}

const TYPE_TINT: Record<QuestType, string> = {
  workout_count: 'var(--c-blue)',
  streak_keep: 'var(--c-orange)',
  pr_in_exercise: 'var(--c-green)',
  total_volume: 'var(--c-violet)',
  exercise_frequency: 'var(--c-yellow)',
  weekday_consistency: 'var(--c-red)',
}

export function QuestsContent() {
  const { data, isLoading, error } = useQuests()
  const generate = useGenerateQuests()
  const accept = useAcceptQuest()
  const abandon = useAbandonQuest()
  const { toast } = useToast()

  const onGenerate = async () => {
    try {
      await generate.mutateAsync()
      toast({ title: 'Готово', description: 'AI-тренер прислал свежие квесты' })
    } catch (e) {
      toast({
        title: 'Не получилось',
        description: (e as Error)?.message ?? 'Попробуй ещё раз',
        variant: 'destructive',
      })
    }
  }

  const onAccept = async (q: Quest) => {
    try {
      await accept.mutateAsync(q.id)
      toast({ title: 'Квест активен', description: q.title })
    } catch (e) {
      toast({
        title: 'Не получилось',
        description: (e as Error)?.message ?? 'Ошибка',
        variant: 'destructive',
      })
    }
  }

  const onAbandon = async (q: Quest, isActive: boolean) => {
    if (
      isActive &&
      !confirm(`Точно отказаться от «${q.title}»? Прогресс будет потерян.`)
    )
      return
    try {
      await abandon.mutateAsync(q.id)
    } catch (e) {
      toast({
        title: 'Не получилось',
        description: (e as Error)?.message ?? 'Ошибка',
        variant: 'destructive',
      })
    }
  }

  const active = data?.active ?? null
  const suggestions = data?.suggestions ?? []
  const recent = data?.recent ?? []

  return (
    <div className="space-y-6 fz-rise">
      <div className="flex items-baseline gap-3 flex-wrap">
        <h2
          style={{
            fontSize: 'clamp(22px, 4vw, 26px)',
            fontWeight: 800,
            letterSpacing: -0.4,
            color: 'var(--txt-1)',
            margin: 0,
          }}
        >
          Квесты
        </h2>
        <span className="text-sm txt-soft">персональные цели от AI-тренера</span>
      </div>

      {isLoading && (
        <div className="glass-card p-6 text-center text-sm txt-muted">
          Загрузка квестов…
        </div>
      )}

      {error && (
        <div
          className="glass-card p-6 text-center text-sm"
          style={{ color: 'var(--c-red)' }}
        >
          Не удалось загрузить квесты
        </div>
      )}

      {!isLoading && !error && (
        <section className="space-y-3">
          <h3 className="text-sm font-bold txt-soft uppercase tracking-wide">
            Активный квест
          </h3>
          {active ? (
            <QuestCard
              quest={active}
              variant="active"
              onAbandon={() => onAbandon(active, true)}
              busy={abandon.isPending}
            />
          ) : (
            <div className="glass-card p-6 text-center text-sm txt-muted">
              Сейчас нет активного квеста. Выбери один из предложений ниже.
            </div>
          )}
        </section>
      )}

      {!isLoading && !error && (
        <section className="space-y-3">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div className="flex items-center gap-2">
              <Sparkles size={16} style={{ color: 'var(--c-violet)' }} />
              <h3 className="text-sm font-bold uppercase tracking-wide">
                AI-тренер советует
              </h3>
            </div>
            <button
              type="button"
              onClick={onGenerate}
              disabled={generate.isPending}
              className="glass-btn flex items-center gap-1.5"
              style={{ fontSize: 12, padding: '6px 12px' }}
            >
              {generate.isPending ? (
                <Loader2 size={14} className="animate-spin" />
              ) : (
                <RotateCw size={14} />
              )}
              {suggestions.length > 0 ? 'Обновить' : 'Получить предложения'}
            </button>
          </div>

          {suggestions.length === 0 ? (
            <div className="glass-card p-6 text-center text-sm txt-muted">
              Нажми «Получить предложения», чтобы AI-тренер подобрал 3 квеста
              под твою историю.
            </div>
          ) : (
            <div className="grid gap-3.5 grid-cols-1 md:grid-cols-3">
              {suggestions.map((q) => (
                <QuestCard
                  key={q.id}
                  quest={q}
                  variant="suggested"
                  onAccept={() => onAccept(q)}
                  onAbandon={() => onAbandon(q, false)}
                  busy={accept.isPending || abandon.isPending}
                  disabledAccept={!!active}
                />
              ))}
            </div>
          )}
        </section>
      )}

      {!isLoading && !error && recent.length > 0 && (
        <section className="space-y-3">
          <h3 className="text-sm font-bold txt-soft uppercase tracking-wide">
            История
          </h3>
          <div className="grid gap-2.5 grid-cols-1 sm:grid-cols-2">
            {recent.map((q) => (
              <RecentRow key={q.id} quest={q} />
            ))}
          </div>
        </section>
      )}
    </div>
  )
}

function QuestCard({
  quest,
  variant,
  onAccept,
  onAbandon,
  busy,
  disabledAccept,
}: {
  quest: Quest
  variant: 'active' | 'suggested'
  onAccept?: () => void
  onAbandon?: () => void
  busy?: boolean
  disabledAccept?: boolean
}) {
  const tint = TYPE_TINT[quest.type]
  const typeLabel = TYPE_LABELS[quest.type]
  const ratio = quest.progressRatio ?? 0
  const left = daysLeft(quest)
  const current = Number(quest.progress?.current ?? 0)

  return (
    <div
      className="glass-card p-5 flex flex-col gap-3"
      style={{
        borderColor: variant === 'active' ? tint : undefined,
      }}
    >
      <div className="flex items-start justify-between gap-2">
        <span
          className="tnum"
          style={{
            fontSize: 11,
            fontWeight: 800,
            padding: '4px 10px',
            borderRadius: 'var(--r-pill)',
            background: `color-mix(in oklab, ${tint} 18%, transparent)`,
            color: tint,
            border: `1px solid color-mix(in oklab, ${tint} 35%, transparent)`,
            textTransform: 'uppercase',
            letterSpacing: 0.4,
          }}
        >
          {typeLabel}
        </span>
        <span
          className="tnum"
          style={{
            fontSize: 11,
            fontWeight: 800,
            color: 'var(--c-yellow)',
          }}
        >
          +{quest.rewardPoints} очк.
        </span>
      </div>

      <div>
        <h4
          style={{
            fontSize: 18,
            fontWeight: 800,
            lineHeight: 1.2,
            color: 'var(--txt-1)',
          }}
        >
          {quest.title}
        </h4>
        <p className="text-sm txt-soft mt-1.5" style={{ lineHeight: 1.4 }}>
          {quest.description}
        </p>
      </div>

      <div className="text-xs txt-muted">{formatQuestTarget(quest)}</div>

      {variant === 'active' && (
        <div className="space-y-1.5">
          <div
            style={{
              height: 8,
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
            <span>{left !== null ? `${left} дн. осталось` : ''}</span>
          </div>
        </div>
      )}

      {quest.aiReason && variant === 'suggested' && (
        <div
          className="text-xs"
          style={{
            color: 'var(--c-violet)',
            fontStyle: 'italic',
            lineHeight: 1.4,
          }}
        >
          <Sparkles size={11} className="inline mr-1" />
          {quest.aiReason}
        </div>
      )}

      <div className="flex gap-2 mt-auto pt-1">
        {variant === 'suggested' && onAccept && (
          <button
            type="button"
            onClick={onAccept}
            disabled={busy || disabledAccept}
            className="glass-btn flex-1 flex items-center justify-center gap-1.5"
            style={{
              fontSize: 13,
              padding: '8px 12px',
              opacity: disabledAccept ? 0.5 : 1,
              cursor: disabledAccept ? 'not-allowed' : 'pointer',
            }}
            title={
              disabledAccept
                ? 'Сначала заверши или откажись от активного квеста'
                : ''
            }
          >
            <Check size={14} />
            Принять
          </button>
        )}
        {onAbandon && (
          <button
            type="button"
            onClick={onAbandon}
            disabled={busy}
            className="glass-btn flex items-center justify-center"
            style={{
              fontSize: 13,
              padding: '8px 12px',
              color: 'var(--txt-2)',
            }}
            title={variant === 'active' ? 'Отказаться' : 'Скрыть'}
          >
            <X size={14} />
          </button>
        )}
      </div>
    </div>
  )
}

function RecentRow({ quest }: { quest: Quest }) {
  const tint = TYPE_TINT[quest.type]
  const status = quest.status
  const statusLabel =
    status === 'completed'
      ? 'Завершён'
      : status === 'failed'
        ? 'Не успел'
        : 'Отменён'
  const statusColor =
    status === 'completed'
      ? 'var(--c-green)'
      : status === 'failed'
        ? 'var(--c-red)'
        : 'var(--txt-2)'

  return (
    <div
      className="glass-card flex items-center gap-3"
      style={{ padding: '10px 14px' }}
    >
      <div
        style={{
          width: 8,
          height: 8,
          borderRadius: 999,
          background: tint,
          flexShrink: 0,
        }}
      />
      <div className="flex-1 min-w-0">
        <div className="text-sm font-semibold truncate">{quest.title}</div>
        <div className="text-xs txt-muted">{formatQuestTarget(quest)}</div>
      </div>
      <span
        className="text-xs font-bold"
        style={{ color: statusColor, flexShrink: 0 }}
      >
        {statusLabel}
      </span>
    </div>
  )
}

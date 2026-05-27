'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Sparkles, TrendingDown, TrendingUp, Minus, X, Loader2, Dumbbell } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { useAiSuggestBodyGoals, type BodyGoalIntent } from '@/hooks/use-body-goals'
import { toast } from '@/hooks/use-toast'

interface IntentOption {
  key: BodyGoalIntent
  label: string
  description: string
  icon: typeof TrendingDown
  tone: string
}

const INTENTS: IntentOption[] = [
  {
    key: 'lose',
    label: 'Сбросить вес',
    description: 'Меньше жира, талия уже',
    icon: TrendingDown,
    tone: 'var(--c-blue)',
  },
  {
    key: 'gain',
    label: 'Набрать массу',
    description: 'Больше мышц, шире плечи',
    icon: TrendingUp,
    tone: 'var(--c-green)',
  },
  {
    key: 'strength',
    label: 'Набрать силу',
    description: 'Больше рабочие веса, тяжёлая база',
    icon: Dumbbell,
    tone: 'var(--c-violet, var(--c-accent))',
  },
  {
    key: 'maintain',
    label: 'Поддерживать форму',
    description: 'Тот же вес, лучше композиция',
    icon: Minus,
    tone: 'var(--c-yellow)',
  },
]

const MONTH_OPTIONS = [2, 3, 6, 9, 12]

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function AiGoalDialog({ open, onOpenChange }: Props) {
  const router = useRouter()
  const [intents, setIntents] = useState<BodyGoalIntent[]>([])
  const [months, setMonths] = useState<number>(3)
  const [rationale, setRationale] = useState<string | null>(null)
  const mutation = useAiSuggestBodyGoals()

  function toggleIntent(key: BodyGoalIntent) {
    setIntents((prev) =>
      prev.includes(key) ? prev.filter((x) => x !== key) : [...prev, key],
    )
  }

  function goToPlanWizard() {
    if (intents.length === 0) return
    onOpenChange(false)
    router.push(
      `/plans/new?ai=1&intent=${intents.join(',')}&months=${months}&from=/body`,
    )
  }

  function reset() {
    setIntents([])
    setMonths(3)
    setRationale(null)
  }

  function handleClose() {
    if (mutation.isPending) return
    reset()
    onOpenChange(false)
  }

  async function handleRun() {
    if (intents.length === 0) return
    try {
      const result = await mutation.mutateAsync({
        intent: intents,
        targetMonths: months,
      })
      setRationale(result.rationale)
      toast({ title: 'Цель готова', description: 'Сверьтесь с табом «Цель» в аватаре' })
    } catch (e) {
      const err = e as { response?: { data?: { message?: string } } }
      toast({
        variant: 'destructive',
        title: 'Не получилось',
        description: err?.response?.data?.message ?? 'Попробуйте ещё раз',
      })
    }
  }

  return (
    <Dialog open={open} onOpenChange={(v) => (v ? onOpenChange(v) : handleClose())}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5" style={{ color: 'var(--c-accent)' }} />
            AI-тренер подберёт цель
          </DialogTitle>
          <DialogDescription>
            По вашим замерам и профилю — здоровая и достижимая цель за выбранный срок.
          </DialogDescription>
        </DialogHeader>

        {rationale ? (
          <div className="flex flex-col gap-3">
            <div
              className="glass-card"
              style={{
                padding: 14,
                fontSize: 13,
                lineHeight: 1.5,
                color: 'var(--txt-2)',
                border: '1px solid color-mix(in oklab, var(--c-accent) 30%, var(--gl-border))',
              }}
            >
              <div
                className="eyebrow mb-2"
                style={{ color: 'var(--c-accent)' }}
              >
                Почему именно так
              </div>
              {rationale}
            </div>
            <button
              type="button"
              onClick={goToPlanWizard}
              className="glass-btn-primary inline-flex items-center justify-center gap-1.5"
              style={{ padding: '10px 16px', borderRadius: 12, fontSize: 14, fontWeight: 700 }}
            >
              <Sparkles className="h-4 w-4" strokeWidth={2.4} />
              Создать AI-план под эту цель
            </button>
            <button
              type="button"
              onClick={handleClose}
              className="glass-btn"
              style={{ padding: '8px 14px', borderRadius: 12, fontSize: 13 }}
            >
              Позже
            </button>
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-2">
              <div className="eyebrow">1. Что хотите? (можно несколько)</div>
              {INTENTS.map(({ key, label, description, icon: Icon, tone }) => {
                const active = intents.includes(key)
                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => toggleIntent(key)}
                    className="glass-card flex items-center gap-3 transition-all"
                    style={{
                      padding: '12px 14px',
                      cursor: 'pointer',
                      background: active
                        ? `color-mix(in oklab, ${tone} 14%, transparent)`
                        : undefined,
                      border: `1px solid ${
                        active ? `color-mix(in oklab, ${tone} 45%, transparent)` : 'var(--gl-border)'
                      }`,
                    }}
                  >
                    <div
                      className="grid place-items-center shrink-0"
                      style={{
                        width: 36,
                        height: 36,
                        borderRadius: 11,
                        background: `color-mix(in oklab, ${tone} 22%, transparent)`,
                        color: tone,
                      }}
                    >
                      <Icon className="h-4 w-4" strokeWidth={2.4} />
                    </div>
                    <div className="min-w-0 flex-1 text-left">
                      <div className="font-bold text-sm" style={{ color: 'var(--txt-1)' }}>
                        {label}
                      </div>
                      <div className="text-xs txt-muted">{description}</div>
                    </div>
                  </button>
                )
              })}
            </div>

            <div className="flex flex-col gap-2">
              <div className="eyebrow">2. На какой срок?</div>
              <div className="flex flex-wrap gap-1.5">
                {MONTH_OPTIONS.map((m) => {
                  const active = months === m
                  return (
                    <button
                      key={m}
                      type="button"
                      onClick={() => setMonths(m)}
                      style={{
                        padding: '6px 12px',
                        borderRadius: 'var(--r-pill)',
                        fontSize: 12,
                        fontWeight: 700,
                        cursor: 'pointer',
                        background: active
                          ? 'color-mix(in oklab, var(--c-accent) 22%, transparent)'
                          : 'var(--gl-bg)',
                        border: active
                          ? '1px solid color-mix(in oklab, var(--c-accent) 50%, transparent)'
                          : '1px solid var(--gl-border)',
                        color: active ? 'var(--c-accent)' : 'var(--txt-2)',
                      }}
                    >
                      {m} мес.
                    </button>
                  )
                })}
              </div>
            </div>

            <div className="flex gap-2 justify-end">
              <button
                type="button"
                onClick={handleClose}
                disabled={mutation.isPending}
                className="glass-btn"
                style={{ padding: '9px 14px', borderRadius: 12, fontSize: 13 }}
              >
                <X className="h-4 w-4 inline-block mr-1" />
                Отмена
              </button>
              <button
                type="button"
                onClick={handleRun}
                disabled={intents.length === 0 || mutation.isPending}
                className="glass-btn-primary inline-flex items-center gap-1.5"
                style={{
                  padding: '9px 16px',
                  borderRadius: 12,
                  fontSize: 13,
                  fontWeight: 700,
                  opacity: intents.length === 0 || mutation.isPending ? 0.6 : 1,
                  cursor:
                    intents.length === 0 || mutation.isPending ? 'not-allowed' : 'pointer',
                }}
              >
                {mutation.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Sparkles className="h-4 w-4" strokeWidth={2.4} />
                )}
                Подобрать
              </button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}

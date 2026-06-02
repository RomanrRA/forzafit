'use client'

import { useEffect, useMemo, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { Sparkles, Loader2, ArrowRight, RefreshCw } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { toast } from '@/hooks/use-toast'
import { usePlanAdjustment, type PlanAdjustment } from '@/hooks/use-plan-adjustment'

const DAY_LABEL = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс']

interface Props {
  open: boolean
  onOpenChange: (v: boolean) => void
  planTemplateId: string
}

export function PlanAdjustDialog({ open, onOpenChange, planTemplateId }: Props) {
  const qc = useQueryClient()
  const {
    summary,
    adjustments,
    isStreaming,
    toolCallReady,
    error,
    analyze,
    apply,
    reset,
  } = usePlanAdjustment()
  const [selected, setSelected] = useState<Set<number>>(new Set())
  const [applying, setApplying] = useState(false)
  const [note, setNote] = useState('')
  // false = фаза ввода пожеланий; true = анализ запущен / показываем результат
  const [started, setStarted] = useState(false)

  // Reset to the input phase whenever the dialog opens
  useEffect(() => {
    if (!open) return
    reset()
    setSelected(new Set())
    setNote('')
    setStarted(false)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, planTemplateId])

  function runAnalysis() {
    reset()
    setSelected(new Set())
    setStarted(true)
    void analyze(planTemplateId, note)
  }

  // By default, pre-select all suggested adjustments once they arrive
  useEffect(() => {
    if (toolCallReady) {
      setSelected(new Set(adjustments.map((_, i) => i)))
    }
  }, [toolCallReady, adjustments])

  const canApply = toolCallReady && selected.size > 0 && !isStreaming && !applying

  async function handleApply() {
    if (!canApply) return
    setApplying(true)
    try {
      const res = await apply([...selected])
      toast({ title: 'План обновлён', description: `Применено правок: ${res.applied}` })
      await qc.invalidateQueries({ queryKey: ['plan-templates', planTemplateId] })
      onOpenChange(false)
    } catch (err) {
      toast({
        variant: 'destructive',
        title: 'Ошибка',
        description: err instanceof Error ? err.message : 'Не удалось применить правки',
      })
    } finally {
      setApplying(false)
    }
  }

  function toggle(i: number) {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(i)) next.delete(i)
      else next.add(i)
      return next
    })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            AI-корректировка плана
          </DialogTitle>
          <DialogDescription>
            Анализ последних 4 недель тренировок и точечные правки. Можно
            подсказать AI, что не нравится — он учтёт это в приоритете.
          </DialogDescription>
        </DialogHeader>

        {!started && (
          <div className="space-y-2 py-1">
            <label className="text-sm font-medium">
              Что хочешь изменить?{' '}
              <span className="text-muted-foreground font-normal">(необязательно)</span>
            </label>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Например: не нравятся приседания со штангой — болит колено, замени на что-то для ног. Жим лёжа стал лёгким."
              rows={4}
              maxLength={2000}
              autoFocus
              className="w-full resize-none rounded-xl border border-input bg-background/70 px-3 py-2.5 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            />
            <p className="text-xs text-muted-foreground">
              Оставь поле пустым, чтобы AI просто проанализировал прогресс по истории.
            </p>
          </div>
        )}

        {started && isStreaming && !toolCallReady && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground py-6">
            <Loader2 className="h-4 w-4 animate-spin" />
            Анализирую историю тренировок…
          </div>
        )}

        {started && error && !isStreaming && (
          <div className="text-sm text-destructive py-4">
            {error}
          </div>
        )}

        {started && toolCallReady && (
          <div className="space-y-4">
            {summary && (
              <div className="text-sm bg-muted/50 rounded-md p-3 leading-relaxed">
                {summary}
              </div>
            )}

            {adjustments.length === 0 ? (
              <div className="text-sm text-muted-foreground text-center py-6">
                Правок не требуется — план идёт ровно.
              </div>
            ) : (
              <div className="space-y-2">
                <div className="text-xs text-muted-foreground">
                  Выбрано {selected.size} из {adjustments.length}
                </div>
                {adjustments.map((adj, i) => (
                  <AdjustmentRow
                    key={i}
                    adjustment={adj}
                    checked={selected.has(i)}
                    onToggle={() => toggle(i)}
                  />
                ))}
              </div>
            )}
          </div>
        )}

        <DialogFooter className="gap-2 pt-2">
          {!started ? (
            <>
              <Button
                variant="outline"
                size="sm"
                onClick={() => onOpenChange(false)}
              >
                Отмена
              </Button>
              <Button size="sm" onClick={runAnalysis}>
                <Sparkles className="h-3.5 w-3.5 mr-1" />
                Подобрать правки
              </Button>
            </>
          ) : (
            <>
              {toolCallReady && !isStreaming && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setStarted(false)}
                  disabled={applying}
                >
                  <RefreshCw className="h-3.5 w-3.5 mr-1" />
                  Изменить запрос
                </Button>
              )}
              <Button
                variant="outline"
                size="sm"
                onClick={() => onOpenChange(false)}
                disabled={applying}
              >
                Отмена
              </Button>
              <Button
                size="sm"
                onClick={handleApply}
                disabled={!canApply || adjustments.length === 0}
              >
                {applying
                  ? 'Применяю…'
                  : adjustments.length === 0
                    ? 'Ок'
                    : `Применить (${selected.size})`}
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function AdjustmentRow({
  adjustment,
  checked,
  onToggle,
}: {
  adjustment: PlanAdjustment
  checked: boolean
  onToggle: () => void
}) {
  const dayLabel = DAY_LABEL[adjustment.dayNumber - 1] ?? `День ${adjustment.dayNumber}`

  const changes = useMemo(() => {
    const parts: string[] = []
    if (adjustment.action === 'replace' && adjustment.newExerciseName) {
      parts.push(`→ ${adjustment.newExerciseName}`)
    }
    if (adjustment.action === 'add') {
      parts.push('новое упражнение')
    }
    if (adjustment.newSets != null) parts.push(`${adjustment.newSets} подх.`)
    if (adjustment.newReps != null) parts.push(`${adjustment.newReps} повт.`)
    if (adjustment.newWeightKg != null) {
      parts.push(adjustment.newWeightKg === 0 ? 'свой вес' : `${adjustment.newWeightKg} кг`)
    }
    return parts
  }, [adjustment])

  return (
    <label
      className={`flex gap-3 p-3 rounded-md border cursor-pointer transition-colors ${
        checked ? 'border-primary bg-primary/5' : 'border-border bg-background hover:bg-muted/40'
      }`}
    >
      <input
        type="checkbox"
        className="mt-1 h-4 w-4 cursor-pointer accent-primary"
        checked={checked}
        onChange={onToggle}
      />
      <div className="flex-1 min-w-0 space-y-1">
        <div className="flex items-center gap-2 flex-wrap">
          <Badge variant="outline" className="text-xs">{dayLabel}</Badge>
          <Badge variant={adjustment.action === 'update' ? 'outline' : 'secondary'} className="text-xs">
            {adjustment.action === 'replace'
              ? 'Замена'
              : adjustment.action === 'add'
                ? 'Добавить'
                : 'Правка'}
          </Badge>
          <span className="font-medium text-sm break-words">{adjustment.exerciseName}</span>
        </div>
        {changes.length > 0 && (
          <div className="flex items-center gap-1.5 flex-wrap text-sm">
            <ArrowRight className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
            {changes.map((c, i) => (
              <span key={i} className="text-primary font-medium">{c}</span>
            ))}
          </div>
        )}
        <p className="text-xs text-muted-foreground italic leading-snug">{adjustment.reason}</p>
      </div>
    </label>
  )
}

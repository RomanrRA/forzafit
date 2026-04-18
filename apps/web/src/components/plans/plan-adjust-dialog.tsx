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

  // Kick off analysis when the dialog opens
  useEffect(() => {
    if (!open) return
    reset()
    setSelected(new Set())
    void analyze(planTemplateId)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, planTemplateId])

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
            Анализ последних 4 недель тренировок и точечные правки.
          </DialogDescription>
        </DialogHeader>

        {isStreaming && !toolCallReady && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground py-6">
            <Loader2 className="h-4 w-4 animate-spin" />
            Анализирую историю тренировок…
          </div>
        )}

        {error && !isStreaming && (
          <div className="text-sm text-destructive py-4">
            {error}
          </div>
        )}

        {toolCallReady && (
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
          {toolCallReady && !isStreaming && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                reset()
                setSelected(new Set())
                void analyze(planTemplateId)
              }}
              disabled={applying}
            >
              <RefreshCw className="h-3.5 w-3.5 mr-1" />
              Перепроверить
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
          <Badge variant={adjustment.action === 'replace' ? 'secondary' : 'outline'} className="text-xs">
            {adjustment.action === 'replace' ? 'Замена' : 'Правка'}
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

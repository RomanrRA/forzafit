'use client'

import { Flame, Sparkles, Trophy, Medal } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import type { WorkoutCompletedGamification } from '@/hooks/use-gamification'

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  data: WorkoutCompletedGamification | null
  onClose?: () => void
}

const PR_TYPE_LABEL: Record<string, string> = {
  one_rm: '1ПМ',
  working_weight: 'рабочий вес',
  volume_session: 'объём за сессию',
}

export function CelebrationDialog({ open, onOpenChange, data, onClose }: Props) {
  if (!data) return null

  const hasContent =
    data.newAchievements.length > 0 ||
    data.newPrs.length > 0 ||
    data.streak.isNewLongest ||
    data.streak.current >= 1

  if (!hasContent) return null

  function handleClose() {
    onOpenChange(false)
    onClose?.()
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { onOpenChange(v); if (!v) onClose?.() }}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <Sparkles className="h-5 w-5 text-yellow-500" />
            Тренировка завершена!
          </DialogTitle>
          <DialogDescription>
            Вот что произошло
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          {data.streak.current >= 1 && (
            <div className="flex items-center gap-3 rounded-lg border border-orange-200 dark:border-orange-900/50 bg-orange-50 dark:bg-orange-950/30 px-3 py-2.5">
              <Flame className="h-5 w-5 text-orange-500 shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-sm">
                  Серия: {data.streak.current}{' '}
                  {data.streak.current === 1
                    ? 'день'
                    : data.streak.current < 5
                      ? 'дня'
                      : 'дней'}
                </p>
                {data.streak.isNewLongest ? (
                  <p className="text-xs text-orange-600 dark:text-orange-400">
                    🎉 Новый личный рекорд!
                  </p>
                ) : (
                  <p className="text-xs text-muted-foreground">
                    Рекорд: {data.streak.longest}
                  </p>
                )}
              </div>
            </div>
          )}

          {data.newPrs.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-muted-foreground mb-1.5 flex items-center gap-1">
                <Medal className="h-3.5 w-3.5 text-blue-500" />
                Новые рекорды ({data.newPrs.length})
              </p>
              <div className="space-y-1.5">
                {data.newPrs.map((pr, i) => (
                  <div
                    key={`${pr.exerciseId}-${pr.type}-${i}`}
                    className="flex items-center justify-between gap-2 rounded-md border border-blue-200 dark:border-blue-900/50 bg-blue-50 dark:bg-blue-950/30 px-3 py-2 text-sm"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="font-medium truncate">
                        {pr.exerciseName ?? 'Упражнение'}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {PR_TYPE_LABEL[pr.type] ?? pr.type}
                      </p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="font-bold text-blue-600 dark:text-blue-400">
                        {pr.valueKg.toFixed(1)} кг
                        {pr.reps ? ` × ${pr.reps}` : ''}
                      </p>
                      {pr.previousValueKg != null && (
                        <p className="text-[10px] text-muted-foreground">
                          было: {pr.previousValueKg.toFixed(1)} кг
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {data.newAchievements.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-muted-foreground mb-1.5 flex items-center gap-1">
                <Trophy className="h-3.5 w-3.5 text-yellow-500" />
                Получены ачивки ({data.newAchievements.length})
              </p>
              <div className="space-y-1.5">
                {data.newAchievements.map((a) => (
                  <div
                    key={a.id}
                    className="flex items-center gap-3 rounded-md border border-yellow-200 dark:border-yellow-900/50 bg-yellow-50 dark:bg-yellow-950/30 px-3 py-2"
                  >
                    <span className="text-2xl shrink-0">{a.emoji}</span>
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold text-sm truncate">{a.title}</p>
                      <p className="text-xs text-muted-foreground line-clamp-2">
                        {a.description}
                      </p>
                    </div>
                    <span className="text-xs font-semibold text-yellow-600 dark:text-yellow-400 shrink-0">
                      +{a.points}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button onClick={handleClose} className="w-full">
            Отлично!
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

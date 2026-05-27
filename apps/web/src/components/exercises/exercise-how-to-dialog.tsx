'use client'

import { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { useExercise } from '@/hooks/use-exercises'
import { Loader2, ChevronLeft, ChevronRight } from 'lucide-react'
import {
  DIFFICULTY_LABEL,
  FORCE_LABEL,
  MECHANIC_LABEL,
  muscleRu,
  equipmentRu,
} from '@/lib/exercise-labels'

interface Props {
  exerciseId: string | null
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function ExerciseHowToDialog({ exerciseId, open, onOpenChange }: Props) {
  const { data: ex, isLoading } = useExercise(exerciseId)
  const [imgIdx, setImgIdx] = useState(0)

  const images = ex?.imageUrls ?? []
  const instructions = ex?.instructions ?? []
  const hasMedia = images.length > 0 || instructions.length > 0

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{ex?.name ?? 'Упражнение'}</DialogTitle>
          {ex && (
            <DialogDescription className="flex flex-wrap gap-1.5 mt-1">
              {ex.difficulty && (
                <Pill>{DIFFICULTY_LABEL[ex.difficulty] ?? ex.difficulty}</Pill>
              )}
              {ex.force && <Pill>{FORCE_LABEL[ex.force] ?? ex.force}</Pill>}
              {ex.mechanic && (
                <Pill>{MECHANIC_LABEL[ex.mechanic] ?? ex.mechanic}</Pill>
              )}
              {ex.equipment && <Pill>{equipmentRu(ex.equipment)}</Pill>}
            </DialogDescription>
          )}
        </DialogHeader>

        {isLoading && (
          <div className="grid place-items-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        )}

        {!isLoading && ex && !hasMedia && (
          <p className="text-sm text-muted-foreground py-4">
            Для этого упражнения пока нет подробного описания. Попробуй найти похожее в каталоге или добавь свою заметку в плане.
          </p>
        )}

        {!isLoading && images.length > 0 && (
          <div className="relative rounded-2xl overflow-hidden bg-muted/40">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={images[imgIdx]}
              alt={`${ex?.name} — кадр ${imgIdx + 1}`}
              className="w-full object-contain max-h-[360px]"
              loading="lazy"
            />
            {images.length > 1 && (
              <div className="absolute inset-x-0 bottom-2 flex items-center justify-between px-3">
                <button
                  type="button"
                  onClick={() =>
                    setImgIdx((i) => (i - 1 + images.length) % images.length)
                  }
                  className="glass-btn h-8 w-8 grid place-items-center rounded-full"
                  aria-label="Предыдущий кадр"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <span className="text-xs px-2 py-1 rounded-full bg-background/80 border border-border">
                  {imgIdx + 1} / {images.length}
                </span>
                <button
                  type="button"
                  onClick={() => setImgIdx((i) => (i + 1) % images.length)}
                  className="glass-btn h-8 w-8 grid place-items-center rounded-full"
                  aria-label="Следующий кадр"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            )}
          </div>
        )}

        {!isLoading && instructions.length > 0 && (
          <ol className="space-y-2 mt-2">
            {instructions.map((step, i) => (
              <li key={i} className="flex gap-2 text-sm leading-snug">
                <span
                  className="shrink-0 w-6 h-6 rounded-full grid place-items-center text-xs font-bold"
                  style={{
                    background: 'color-mix(in oklab, var(--c-accent) 18%, transparent)',
                    color: 'var(--c-accent)',
                  }}
                >
                  {i + 1}
                </span>
                <span className="text-foreground/90">{step}</span>
              </li>
            ))}
          </ol>
        )}

        {!isLoading &&
          ex &&
          (ex.primaryMuscles?.length || ex.secondaryMuscles?.length) ? (
            <div className="mt-2 space-y-1.5 text-xs text-muted-foreground">
              {ex.primaryMuscles?.length ? (
                <div>
                  <span className="font-semibold text-foreground">Основные мышцы:</span>{' '}
                  {ex.primaryMuscles.map(muscleRu).join(', ')}
                </div>
              ) : null}
              {ex.secondaryMuscles?.length ? (
                <div>
                  <span className="font-semibold text-foreground">Вспомогательные:</span>{' '}
                  {ex.secondaryMuscles.map(muscleRu).join(', ')}
                </div>
              ) : null}
            </div>
          ) : null}
      </DialogContent>
    </Dialog>
  )
}

function Pill({ children }: { children: React.ReactNode }) {
  return (
    <span className="text-[11px] px-2 py-0.5 rounded-full bg-muted/60 border border-border text-foreground/80">
      {children}
    </span>
  )
}

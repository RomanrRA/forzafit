'use client'

import { useState, useEffect, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Timer, X } from 'lucide-react'
import { cn } from '@/lib/utils'

const PRESETS = [30, 60, 90, 120, 180]

export function RestTimer() {
  const [selected, setSelected] = useState(60)
  const [remaining, setRemaining] = useState<number | null>(null)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  function start(secs: number) {
    if (intervalRef.current) clearInterval(intervalRef.current)
    setRemaining(secs)
    intervalRef.current = setInterval(() => {
      setRemaining((prev) => {
        if (prev === null || prev <= 1) {
          clearInterval(intervalRef.current!)
          // Звуковое уведомление
          try { new Audio('data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAA...').play() } catch {}
          return null
        }
        return prev - 1
      })
    }, 1000)
  }

  function stop() {
    if (intervalRef.current) clearInterval(intervalRef.current)
    setRemaining(null)
  }

  useEffect(() => () => { if (intervalRef.current) clearInterval(intervalRef.current) }, [])

  const isRunning = remaining !== null
  const pct = isRunning ? (remaining / selected) * 100 : 0

  return (
    <div className="flex items-center gap-2 flex-wrap mt-2 pt-2 border-t">
      <Timer className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
      <span className="text-xs text-muted-foreground">Отдых:</span>

      {!isRunning ? (
        <>
          <div className="flex gap-1">
            {PRESETS.map((s) => (
              <button
                key={s}
                onClick={() => { setSelected(s); start(s) }}
                className={cn(
                  'text-xs px-2 py-0.5 rounded border transition-colors',
                  selected === s
                    ? 'border-primary text-primary bg-primary/5'
                    : 'border-border text-muted-foreground hover:border-primary hover:text-primary'
                )}
              >
                {s >= 60 ? `${s / 60}м` : `${s}с`}
              </button>
            ))}
          </div>
        </>
      ) : (
        <div className="flex items-center gap-2">
          {/* Прогресс-бар */}
          <div className="w-24 h-1.5 bg-muted rounded-full overflow-hidden">
            <div
              className="h-full bg-primary rounded-full transition-all duration-1000"
              style={{ width: `${pct}%` }}
            />
          </div>
          <span className={cn(
            'text-sm font-mono font-bold tabular-nums w-8',
            remaining! <= 10 && 'text-destructive'
          )}>
            {remaining}с
          </span>
          <Button variant="ghost" size="icon" className="h-5 w-5" onClick={stop}>
            <X className="h-3 w-3" />
          </Button>
        </div>
      )}
    </div>
  )
}

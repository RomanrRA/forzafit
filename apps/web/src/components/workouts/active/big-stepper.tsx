'use client'

import { useRef, useCallback } from 'react'
import { Minus, Plus } from 'lucide-react'

interface Props {
  label: string
  value: string | number
  unit?: string
  hint?: string
  onDec: () => void
  onInc: () => void
}

export function BigStepper({ label, value, unit, hint, onDec, onInc }: Props) {
  const t1 = useRef<ReturnType<typeof setTimeout> | null>(null)
  const t2 = useRef<ReturnType<typeof setInterval> | null>(null)

  const stop = useCallback(() => {
    if (t1.current) clearTimeout(t1.current)
    if (t2.current) clearInterval(t2.current)
    t1.current = null
    t2.current = null
  }, [])

  const press = (cb: () => void) => ({
    onPointerDown: () => {
      cb()
      t1.current = setTimeout(() => {
        t2.current = setInterval(cb, 70)
      }, 360)
    },
    onPointerUp: stop,
    onPointerLeave: stop,
    onPointerCancel: stop,
  })

  return (
    <div className="flex flex-1 flex-col gap-2">
      <div className="flex items-baseline justify-between">
        <span className="eyebrow">{label}</span>
        {hint && (
          <span style={{ fontSize: 11, color: 'var(--txt-3)' }}>{hint}</span>
        )}
      </div>
      <div
        className="flex items-stretch gap-1.5"
        style={{
          background: 'var(--in-bg)',
          border: '1px solid var(--in-border)',
          borderRadius: 18,
          padding: 6,
        }}
      >
        <button
          type="button"
          aria-label={`${label} −`}
          {...press(onDec)}
          className="grid place-items-center cursor-pointer transition-transform"
          style={{
            width: 60,
            borderRadius: 14,
            background: 'var(--gl-bg)',
            border: '1px solid var(--gl-border)',
            color: 'var(--txt-1)',
          }}
        >
          <Minus className="h-[22px] w-[22px]" strokeWidth={2.2} />
        </button>
        <div className="flex-1 grid place-items-center" style={{ padding: '4px 0' }}>
          <div className="inline-flex items-baseline gap-2">
            <span
              className="tnum"
              style={{
                fontSize: 'clamp(40px, 8vw, 64px)',
                fontWeight: 800,
                color: 'var(--txt-1)',
                letterSpacing: -2.4,
                lineHeight: 1,
              }}
            >
              {value}
            </span>
            {unit && (
              <span
                style={{
                  fontSize: 18,
                  fontWeight: 600,
                  color: 'var(--txt-2)',
                }}
              >
                {unit}
              </span>
            )}
          </div>
        </div>
        <button
          type="button"
          aria-label={`${label} +`}
          {...press(onInc)}
          className="grid place-items-center cursor-pointer transition-transform"
          style={{
            width: 60,
            borderRadius: 14,
            background: 'var(--gl-bg)',
            border: '1px solid var(--gl-border)',
            color: 'var(--txt-1)',
          }}
        >
          <Plus className="h-[22px] w-[22px]" strokeWidth={2.2} />
        </button>
      </div>
    </div>
  )
}

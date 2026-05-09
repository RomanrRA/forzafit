'use client'

import { useEffect, useRef, useState } from 'react'
import { Flame, Pause, Play, SkipForward } from 'lucide-react'

function fmtClock(sec: number) {
  const m = Math.max(0, Math.floor(sec / 60))
  const s = Math.max(0, sec % 60)
    .toString()
    .padStart(2, '0')
  return `${m}:${s}`
}

interface Props {
  totalSec: number
  onClose: () => void
}

export function RestTimer({ totalSec, onClose }: Props) {
  const [remaining, setRemaining] = useState(totalSec)
  const [total, setTotal] = useState(totalSec)
  const [running, setRunning] = useState(true)
  const startedAt = useRef<number>(Date.now())

  useEffect(() => {
    setRemaining(totalSec)
    setTotal(totalSec)
    setRunning(true)
    startedAt.current = Date.now()
  }, [totalSec])

  useEffect(() => {
    if (!running) return
    const id = setInterval(() => {
      setRemaining((r) => (r <= 1 ? (setRunning(false), 0) : r - 1))
    }, 1000)
    return () => clearInterval(id)
  }, [running])

  const C = 2 * Math.PI * 28
  const pct = total > 0 ? Math.max(0, Math.min(1, remaining / total)) : 0

  const adjust = (delta: number) => {
    setRemaining((r) => Math.max(0, r + delta))
    if (delta > 0) setTotal((t) => Math.max(t, total + (delta > 0 ? delta : 0)))
    if (!running && remaining + delta > 0) setRunning(true)
  }

  return (
    <div
      className="glass-card strong fz-rise flex items-center gap-3 sm:gap-4"
      style={{ padding: '14px 16px' }}
    >
      {/* Ring */}
      <div className="relative shrink-0" style={{ width: 64, height: 64 }}>
        <svg width="64" height="64" viewBox="0 0 64 64" style={{ transform: 'rotate(-90deg)' }}>
          <circle
            cx="32"
            cy="32"
            r="28"
            stroke="var(--gl-bg-strong)"
            strokeWidth="4"
            fill="none"
          />
          <circle
            cx="32"
            cy="32"
            r="28"
            stroke="var(--c-orange)"
            strokeWidth="4"
            fill="none"
            strokeLinecap="round"
            strokeDasharray={C}
            strokeDashoffset={C * (1 - pct)}
            style={{ transition: 'stroke-dashoffset .9s linear' }}
          />
        </svg>
        <div
          className="absolute inset-0 grid place-items-center"
          style={{ color: 'var(--c-orange)' }}
        >
          <Flame className="h-[22px] w-[22px]" strokeWidth={2} />
        </div>
      </div>

      {/* Label + remaining */}
      <div className="min-w-0 flex-1">
        <div className="eyebrow">Отдых</div>
        <div
          className="tnum"
          style={{
            fontSize: 30,
            fontWeight: 800,
            color: 'var(--txt-1)',
            letterSpacing: -1,
            lineHeight: 1.05,
          }}
        >
          {fmtClock(remaining)}
        </div>
      </div>

      {/* Controls */}
      <div className="flex shrink-0 gap-1.5">
        <RoundBtn label="−30 секунд" onClick={() => adjust(-30)}>
          <span className="tnum text-xs font-bold">−30</span>
        </RoundBtn>
        <RoundBtn label="+30 секунд" onClick={() => adjust(30)}>
          <span className="tnum text-xs font-bold">+30</span>
        </RoundBtn>
        <RoundBtn
          label={running ? 'Пауза' : 'Продолжить'}
          onClick={() => setRunning((r) => !r)}
        >
          {running ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
        </RoundBtn>
        <RoundBtn label="Пропустить" tone="accent" onClick={onClose}>
          <SkipForward className="h-3.5 w-3.5" />
        </RoundBtn>
      </div>
    </div>
  )
}

function RoundBtn({
  children,
  label,
  onClick,
  tone,
}: {
  children: React.ReactNode
  label: string
  onClick: () => void
  tone?: 'accent'
}) {
  const accent = tone === 'accent'
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      className="grid place-items-center cursor-pointer"
      style={{
        width: 36,
        height: 36,
        borderRadius: 12,
        background: accent
          ? 'color-mix(in oklab, var(--c-orange) 26%, transparent)'
          : 'var(--gl-bg-strong)',
        border: `1px solid ${
          accent
            ? 'color-mix(in oklab, var(--c-orange) 40%, transparent)'
            : 'var(--gl-border)'
        }`,
        color: accent ? 'var(--c-orange)' : 'var(--txt-1)',
      }}
    >
      {children}
    </button>
  )
}

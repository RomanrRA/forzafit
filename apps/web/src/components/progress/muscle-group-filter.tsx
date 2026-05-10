'use client'

import { useLayoutEffect, useRef, useState } from 'react'
import { ChevronDown } from 'lucide-react'

interface MuscleGroupFilterProps {
  groups: string[]
  selected: string[]
  onChange: (next: string[]) => void
}

const GAP_PX = 8

export function MuscleGroupFilter({ groups, selected, onChange }: MuscleGroupFilterProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [shouldClamp, setShouldClamp] = useState(false)
  const [twoRowsHeight, setTwoRowsHeight] = useState<number | null>(null)
  const [expanded, setExpanded] = useState(false)

  useLayoutEffect(() => {
    const el = containerRef.current
    if (!el) return

    const measure = () => {
      const firstChip = el.querySelector('button') as HTMLButtonElement | null
      if (!firstChip) {
        setShouldClamp(false)
        return
      }
      const chipH = firstChip.offsetHeight
      const rowH = chipH + GAP_PX

      // временно снимаем clamp, чтобы измерить полную высоту
      const prevMax = el.style.maxHeight
      const prevOverflow = el.style.overflow
      el.style.maxHeight = 'none'
      el.style.overflow = 'visible'
      const full = el.scrollHeight
      el.style.maxHeight = prevMax
      el.style.overflow = prevOverflow

      setTwoRowsHeight(rowH * 2 - GAP_PX) // высота 2 строк без нижнего gap
      // > 3 строк (с допуском 4px на округление)
      setShouldClamp(full > rowH * 3 + 4)
    }

    measure()
    const ro = new ResizeObserver(measure)
    ro.observe(el)
    return () => ro.disconnect()
  }, [groups.length])

  if (groups.length === 0) return null

  const allActive = selected.length === 0
  const isClamped = shouldClamp && !expanded

  function toggle(g: string) {
    if (selected.includes(g)) {
      onChange(selected.filter((x) => x !== g))
    } else {
      onChange([...selected, g])
    }
  }

  return (
    <div>
      <div
        ref={containerRef}
        className="flex flex-wrap"
        style={{
          gap: GAP_PX,
          maxHeight: isClamped && twoRowsHeight ? twoRowsHeight : undefined,
          overflow: isClamped ? 'hidden' : undefined,
        }}
      >
        <button
          onClick={() => onChange([])}
          className="shrink-0 transition-all"
          style={chipStyle(allActive)}
        >
          Все
        </button>
        {groups.map((g) => {
          const active = selected.includes(g)
          return (
            <button
              key={g}
              onClick={() => toggle(g)}
              className="shrink-0 transition-all capitalize"
              style={chipStyle(active)}
            >
              {g}
            </button>
          )
        })}
      </div>

      {shouldClamp && (
        <button
          onClick={() => setExpanded((v) => !v)}
          className="mt-2 inline-flex items-center gap-1 text-xs txt-muted hover:opacity-80 transition-opacity"
          style={{ fontWeight: 600, cursor: 'pointer' }}
        >
          {expanded ? 'Свернуть' : 'Показать все'}
          <ChevronDown
            className="h-4 w-4 transition-transform"
            style={{ transform: expanded ? 'rotate(180deg)' : 'none' }}
          />
        </button>
      )}
    </div>
  )
}

function chipStyle(active: boolean): React.CSSProperties {
  return {
    padding: '6px 12px',
    borderRadius: 'var(--r-pill)',
    fontSize: 12,
    fontWeight: 700,
    letterSpacing: 0.1,
    cursor: 'pointer',
    whiteSpace: 'nowrap',
    background: active
      ? 'color-mix(in oklab, var(--c-accent) 24%, transparent)'
      : 'var(--gl-bg)',
    border: active
      ? '1px solid color-mix(in oklab, var(--c-accent) 50%, transparent)'
      : '1px solid var(--gl-border)',
    color: active ? 'var(--c-accent)' : 'var(--txt-2)',
  }
}

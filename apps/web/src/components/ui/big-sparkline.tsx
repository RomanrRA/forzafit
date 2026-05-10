'use client'

interface BigSparklineProps {
  data: number[]
  height?: number
  accent?: string
  marginTop?: number
}

export function BigSparkline({
  data,
  height = 120,
  accent = 'var(--c-green)',
  marginTop = 12,
}: BigSparklineProps) {
  if (data.length === 0) return null
  const w = 100
  const h = height
  const min = Math.min(...data)
  const max = Math.max(...data)
  const span = max - min || 1
  const pts = data
    .map(
      (v, i) =>
        `${(i / Math.max(1, data.length - 1)) * w},${h - ((v - min) / span) * (h - 16) - 8}`,
    )
    .join(' ')
  return (
    <svg
      viewBox={`0 0 ${w} ${h}`}
      preserveAspectRatio="none"
      style={{ width: '100%', height, marginTop, display: 'block' }}
    >
      <polyline
        points={pts}
        fill="none"
        stroke={accent}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        vectorEffect="non-scaling-stroke"
      />
      <polyline points={`0,${h} ${pts} ${w},${h}`} fill={accent} opacity="0.14" />
    </svg>
  )
}

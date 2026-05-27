'use client'

import { Sparkles } from 'lucide-react'
import { useWorkoutAdvice } from '@/hooks/use-workout-advice'

function formatTarget(item: {
  suggestedWeightKg: number | null
  suggestedReps: number | null
  suggestedSets: number | null
}): string {
  const parts: string[] = []
  const sets = item.suggestedSets ?? null
  const reps = item.suggestedReps ?? null
  const weight = item.suggestedWeightKg

  if (sets != null && reps != null) parts.push(`${sets}×${reps}`)
  else if (reps != null) parts.push(`${reps} повторов`)
  else if (sets != null) parts.push(`${sets} подходов`)

  if (weight != null) parts.push(`${weight} кг`)

  return parts.join(' · ') || '—'
}

export function WorkoutAdvicePanel({ sessionId }: { sessionId: string }) {
  const { data, isLoading, isError } = useWorkoutAdvice(sessionId)

  if (isLoading) {
    return (
      <div
        className="glass-card"
        style={{ padding: 14, display: 'flex', alignItems: 'center', gap: 10 }}
      >
        <Sparkles
          className="h-4 w-4 animate-pulse"
          style={{ color: 'var(--c-accent)' }}
          strokeWidth={2}
        />
        <span style={{ fontSize: 13, color: 'var(--txt-3)' }}>
          AI-тренер подбирает веса…
        </span>
      </div>
    )
  }

  if (isError || !data || data.items.length === 0) return null

  return (
    <div className="glass-card" style={{ padding: 14 }}>
      <div className="flex items-center gap-2" style={{ marginBottom: 10 }}>
        <Sparkles
          className="h-4 w-4"
          style={{ color: 'var(--c-accent)' }}
          strokeWidth={2}
        />
        <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--txt-1)' }}>
          AI-тренер ForzaFit предлагает
        </div>
      </div>
      <ul style={{ display: 'flex', flexDirection: 'column', gap: 8, margin: 0, padding: 0, listStyle: 'none' }}>
        {data.items.map((item) => (
          <li
            key={item.exerciseId}
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: 2,
              padding: '8px 10px',
              borderRadius: 10,
              background: 'var(--gl-bg)',
              border: '1px solid var(--gl-border)',
            }}
          >
            <div
              className="flex items-baseline gap-2 flex-wrap"
              style={{ fontSize: 13 }}
            >
              <span style={{ fontWeight: 700, color: 'var(--txt-1)' }}>
                {item.exerciseName}
              </span>
              <span
                className="tnum"
                style={{ fontWeight: 700, color: 'var(--c-accent)' }}
              >
                {formatTarget(item)}
              </span>
            </div>
            <div style={{ fontSize: 12, color: 'var(--txt-3)' }}>
              {item.reason}
            </div>
          </li>
        ))}
      </ul>
    </div>
  )
}

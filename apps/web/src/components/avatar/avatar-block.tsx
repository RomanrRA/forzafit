'use client'

import { useMemo, useState } from 'react'
import dynamic from 'next/dynamic'
import Link from 'next/link'
import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { Sparkles } from 'lucide-react'
import { useBodyMeasurements } from '@/hooks/use-body-measurements'
import { useBodyGoals } from '@/hooks/use-body-goals'
import { BASE_HEIGHT_CM } from '@/lib/avatar-measurements-mapping'
import { AiGoalDialog } from './ai-goal-dialog'

const AvatarViewer = dynamic(
  () => import('@/components/avatar/avatar-viewer'),
  {
    ssr: false,
    loading: () => (
      <div
        className="glass-card grid place-items-center"
        style={{
          height: 'calc(100vh - 280px)',
          minHeight: 360,
          color: 'var(--txt-3)',
          fontSize: 13,
        }}
      >
        Загружаем 3D-аватар…
      </div>
    ),
  },
)

interface UserMe {
  id: string
  gender: 'male' | 'female' | 'other' | null
  dob: string | null
  heightCm: number | null
  weightKg: number | null
}

function yearsBetween(isoDob: string | null): number | null {
  if (!isoDob) return null
  const d = new Date(isoDob)
  if (Number.isNaN(d.getTime())) return null
  const now = new Date()
  let years = now.getFullYear() - d.getFullYear()
  const m = now.getMonth() - d.getMonth()
  if (m < 0 || (m === 0 && now.getDate() < d.getDate())) years--
  return years
}

export function AvatarBlock() {
  const [aiGoalOpen, setAiGoalOpen] = useState(false)
  const { data: me, isLoading } = useQuery({
    queryKey: ['users', 'me'],
    queryFn: async () => {
      const { data } = await api.get('/users/me')
      return data as UserMe
    },
    staleTime: 30_000,
  })
  const { data: measurementsData } = useBodyMeasurements({ limit: 1000 })
  const { data: goals } = useBodyGoals()

  const { startMeasurement, currentMeasurement } = useMemo(() => {
    const items = measurementsData?.items ?? []
    if (items.length === 0) return { startMeasurement: null, currentMeasurement: null }
    const sorted = [...items].sort((a, b) => a.date.localeCompare(b.date))
    return {
      startMeasurement: sorted[0],
      currentMeasurement: sorted[sorted.length - 1],
    }
  }, [measurementsData])

  const hasMeasurements = !!currentMeasurement

  if (isLoading) {
    return (
      <div
        className="glass-card grid place-items-center"
        style={{ height: 240, color: 'var(--txt-3)' }}
      >
        Загружаем профиль…
      </div>
    )
  }

  const gender = me?.gender
  if (gender !== 'male' && gender !== 'female') {
    return (
      <div
        className="glass-card"
        style={{
          padding: 20,
          display: 'flex',
          flexDirection: 'column',
          gap: 10,
          alignItems: 'flex-start',
        }}
      >
        <Sparkles
          className="h-7 w-7"
          style={{ color: 'var(--c-accent)' }}
          strokeWidth={1.8}
        />
        <div style={{ fontSize: 16, fontWeight: 800, color: 'var(--txt-1)' }}>
          Укажите пол в профиле
        </div>
        <div style={{ fontSize: 13, color: 'var(--txt-2)', lineHeight: 1.5 }}>
          Аватар строится по полу — мужская и женская модели разные.
        </div>
        <Link
          href="/profile"
          className="glass-btn"
          style={{
            padding: '9px 14px',
            fontWeight: 700,
            color: 'var(--txt-1)',
            background: 'var(--gl-bg-strong)',
            border: '1px solid var(--gl-border-strong)',
            borderRadius: 10,
            fontSize: 13,
          }}
        >
          Открыть профиль
        </Link>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <h2
          style={{
            fontSize: 18,
            fontWeight: 800,
            letterSpacing: -0.3,
            color: 'var(--txt-1)',
          }}
        >
          3D-аватар
        </h2>
        <button
          type="button"
          onClick={() => setAiGoalOpen(true)}
          className="inline-flex items-center gap-2"
          style={{
            padding: '11px 18px',
            borderRadius: 14,
            fontSize: 14,
            fontWeight: 800,
            letterSpacing: -0.1,
            color: 'white',
            background:
              'linear-gradient(135deg, var(--c-accent), color-mix(in oklab, var(--c-accent) 55%, black))',
            border: '1px solid color-mix(in oklab, var(--c-accent) 60%, transparent)',
            boxShadow: '0 8px 22px var(--c-accent-glow, rgba(99,102,241,0.45))',
            cursor: 'pointer',
          }}
          title="AI-тренер подберёт цель"
        >
          <Sparkles className="h-4 w-4" strokeWidth={2.6} />
          AI-цель
        </button>
      </div>
      {!hasMeasurements && (
        <div
          className="glass-card"
          style={{
            padding: '10px 14px',
            fontSize: 13,
            fontWeight: 600,
            color: 'var(--txt-2)',
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            border: '1px solid var(--c-accent)',
          }}
        >
          <Sparkles
            className="h-4 w-4 shrink-0"
            style={{ color: 'var(--c-accent)' }}
            strokeWidth={2}
          />
          <span>
            Внесите замеры ниже, чтобы аватар отражал вашу фигуру. Сейчас показан базовый силуэт.
          </span>
        </div>
      )}
      <AvatarViewer
        gender={gender}
        startMeasurement={startMeasurement}
        currentMeasurement={currentMeasurement}
        goals={goals ?? null}
        profile={{
          heightCm: me?.heightCm ?? BASE_HEIGHT_CM[gender],
          weightKg: currentMeasurement?.weightKg ?? me?.weightKg ?? null,
          ageYears: yearsBetween(me?.dob ?? null),
          gender,
        }}
        onOpenAiGoal={() => setAiGoalOpen(true)}
      />
      <AiGoalDialog open={aiGoalOpen} onOpenChange={setAiGoalOpen} />
    </div>
  )
}

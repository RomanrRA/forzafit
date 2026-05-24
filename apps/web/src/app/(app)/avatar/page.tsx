'use client'

import { useMemo } from 'react'
import dynamic from 'next/dynamic'
import Link from 'next/link'
import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { Sparkles } from 'lucide-react'
import { useBodyMeasurements } from '@/hooks/use-body-measurements'
import { useBodyGoals } from '@/hooks/use-body-goals'

const AvatarViewer = dynamic(
  () => import('@/components/avatar/avatar-viewer'),
  {
    ssr: false,
    loading: () => (
      <div
        className="glass-card grid place-items-center"
        style={{
          height: 'calc(100vh - 200px)',
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
}

export default function AvatarPage() {
  const { data: me, isLoading } = useQuery({
    queryKey: ['users', 'me'],
    queryFn: async () => {
      const { data } = await api.get('/users/me')
      return data as UserMe
    },
    staleTime: 30_000,
  })
  // Получаем все замеры разом для start/now snapshots.
  const { data: measurementsData } = useBodyMeasurements({ limit: 1000 })
  const { data: goals } = useBodyGoals()

  // Сортировка по дате asc → первый = «Начало», последний = «Сейчас».
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
        style={{ height: 'calc(100vh - 140px)', color: 'var(--txt-3)' }}
      >
        Загружаем профиль…
      </div>
    )
  }

  const gender = me?.gender
  if (gender !== 'male' && gender !== 'female') {
    return (
      <div className="flex flex-col gap-4" style={{ padding: '0 0 16px' }}>
        <h1
          style={{
            fontSize: 24,
            fontWeight: 800,
            letterSpacing: -0.5,
            color: 'var(--txt-1)',
          }}
        >
          3D-аватар
        </h1>
        <div
          className="glass-card"
          style={{
            padding: 24,
            display: 'flex',
            flexDirection: 'column',
            gap: 12,
            alignItems: 'flex-start',
          }}
        >
          <Sparkles
            className="h-8 w-8"
            style={{ color: 'var(--c-accent)' }}
            strokeWidth={1.8}
          />
          <div style={{ fontSize: 18, fontWeight: 800, color: 'var(--txt-1)' }}>
            Укажите пол в профиле
          </div>
          <div style={{ fontSize: 14, color: 'var(--txt-2)', lineHeight: 1.5 }}>
            Аватар строится по полу — мужская и женская модели разные. Это поле
            также используется при подборе тренировок и питания.
          </div>
          <Link
            href="/profile"
            className="glass-btn"
            style={{
              padding: '10px 16px',
              fontWeight: 700,
              color: 'var(--txt-1)',
              background: 'var(--gl-bg-strong)',
              border: '1px solid var(--gl-border-strong)',
              borderRadius: 10,
            }}
          >
            Открыть профиль
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-3" style={{ padding: '0 0 16px' }}>
      <div className="flex items-baseline justify-between">
        <h1
          style={{
            fontSize: 24,
            fontWeight: 800,
            letterSpacing: -0.5,
            color: 'var(--txt-1)',
          }}
        >
          3D-аватар
        </h1>
        <div style={{ fontSize: 12, color: 'var(--txt-3)' }}>
          drag — вращать · scroll — приближать
        </div>
      </div>
      {!hasMeasurements && (
        <Link
          href="/body"
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
            textDecoration: 'none',
          }}
        >
          <Sparkles
            className="h-4 w-4 shrink-0"
            style={{ color: 'var(--c-accent)' }}
            strokeWidth={2}
          />
          <span>
            Внесите замеры, чтобы аватар отражал вашу фигуру. Сейчас показан
            базовый «атлетичный» силуэт.
          </span>
        </Link>
      )}
      <AvatarViewer
        gender={gender}
        startMeasurement={startMeasurement}
        currentMeasurement={currentMeasurement}
        goals={goals ?? null}
      />
    </div>
  )
}

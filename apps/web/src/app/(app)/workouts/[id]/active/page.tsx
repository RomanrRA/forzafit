'use client'

import { use, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useWorkout } from '@/hooks/use-workouts'
import { ActiveWorkout } from '@/components/workouts/active/active-workout'

interface Props {
  params: Promise<{ id: string }>
}

export default function ActiveWorkoutPage({ params }: Props) {
  const { id } = use(params)
  const router = useRouter()
  const { data: workout, isLoading } = useWorkout(id)

  useEffect(() => {
    if (workout?.finishedAt) {
      router.replace(`/workouts/${id}`)
    }
  }, [workout?.finishedAt, id, router])

  if (isLoading) {
    return (
      <div className="glass-card text-center" style={{ padding: 24, color: 'var(--txt-2)' }}>
        Загрузка…
      </div>
    )
  }
  if (!workout) {
    return (
      <div className="glass-card text-center" style={{ padding: 24, color: 'var(--txt-2)' }}>
        Тренировка не найдена
      </div>
    )
  }
  if (workout.finishedAt) return null

  return <ActiveWorkout workout={workout} />
}

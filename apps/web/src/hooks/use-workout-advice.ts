import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/api'

export interface WorkoutAdviceItem {
  exerciseId: string
  exerciseName: string
  suggestedWeightKg: number | null
  suggestedReps: number | null
  suggestedSets: number | null
  reason: string
  generatedAt: string
}

export function useWorkoutAdvice(sessionId: string | null | undefined) {
  return useQuery({
    queryKey: ['workout-advice', sessionId],
    queryFn: async () => {
      const { data } = await api.get(`/workouts/${sessionId}/advice`)
      return data as { items: WorkoutAdviceItem[] }
    },
    enabled: !!sessionId,
    staleTime: 5 * 60_000,
    retry: 1,
  })
}

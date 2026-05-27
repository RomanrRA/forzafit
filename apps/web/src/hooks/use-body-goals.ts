import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'

export interface BodyGoals {
  userId: string
  weightKg: number | null
  bodyFatPct: number | null
  chestCm: number | null
  waistCm: number | null
  hipsCm: number | null
  armCm: number | null
  thighCm: number | null
  targetDate: string | null
  createdAt: string
  updatedAt: string
}

export interface UpsertBodyGoalsDto {
  weightKg?: number | null
  bodyFatPct?: number | null
  chestCm?: number | null
  waistCm?: number | null
  hipsCm?: number | null
  armCm?: number | null
  thighCm?: number | null
  targetDate?: string | null
}

export function useBodyGoals() {
  return useQuery({
    queryKey: ['body-goals'],
    queryFn: async () => {
      const { data } = await api.get('/body-goals')
      return data as BodyGoals | null
    },
    staleTime: 60_000,
  })
}

export function useUpsertBodyGoals() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (dto: UpsertBodyGoalsDto) => {
      const { data } = await api.put('/body-goals', dto)
      return data as BodyGoals
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['body-goals'] })
    },
  })
}

export function useDeleteBodyGoals() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async () => {
      await api.delete('/body-goals')
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['body-goals'] })
    },
  })
}

export type BodyGoalIntent = 'lose' | 'gain' | 'maintain' | 'strength'

export interface AiGoalResponse {
  goal: BodyGoals
  rationale: string
}

export function useAiSuggestBodyGoals() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (dto: { intent: BodyGoalIntent[]; targetMonths?: number }) => {
      const { data } = await api.post('/body-goals/ai-suggest', dto)
      return data as AiGoalResponse
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['body-goals'] })
    },
  })
}

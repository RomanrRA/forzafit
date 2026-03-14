import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'

export interface PlanExercise {
  exerciseId: string
  name: string
  sets: number
  reps: string
  rest: string
  note: string
  weightKg?: number
}

export interface PlanDay {
  dayNumber: number
  name: string
  focus?: string
  isRest: boolean
  exercises: PlanExercise[]
}

export interface PlanTemplate {
  id: string
  userId: string
  name: string
  description: string | null
  goal: string | null
  difficulty: 'beginner' | 'intermediate' | 'advanced' | null
  type: string | null
  daysPerWeek: number
  duration: string | null
  days: PlanDay[]
  createdAt: string
  updatedAt: string
}

export function usePlanTemplates() {
  return useQuery({
    queryKey: ['plan-templates'],
    queryFn: async () => {
      const { data } = await api.get('/plan-templates')
      return data as { items: PlanTemplate[]; total: number }
    },
  })
}

export function usePlanTemplate(id: string) {
  return useQuery({
    queryKey: ['plan-templates', id],
    queryFn: async () => {
      const { data } = await api.get(`/plan-templates/${id}`)
      return data as PlanTemplate
    },
    enabled: !!id,
  })
}

export function useCreatePlanTemplate() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (body: Partial<PlanTemplate>) => {
      const { data } = await api.post('/plan-templates', body)
      return data as PlanTemplate
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['plan-templates'] })
    },
  })
}

export function useUpdatePlanTemplate(id: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (body: Partial<PlanTemplate>) => {
      const { data } = await api.patch(`/plan-templates/${id}`, body)
      return data as PlanTemplate
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['plan-templates'] })
      qc.invalidateQueries({ queryKey: ['plan-templates', id] })
    },
  })
}

export function useDeletePlanTemplate() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/plan-templates/${id}`)
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['plan-templates'] }),
  })
}

export function useSchedulePlan(id: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (weeks: number) => {
      const { data } = await api.post(`/plan-templates/${id}/schedule`, { weeks })
      return data as { created: number }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['workouts'] }),
  })
}

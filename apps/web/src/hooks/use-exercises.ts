import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'

export interface Exercise {
  id: string
  name: string
  description: string | null
  muscleGroups: string[]
  equipment: string | null
  difficulty: 'beginner' | 'intermediate' | 'advanced' | null
  isCustom: boolean
  animationUrl: string | null
  // Из free-exercise-db. Старые упражнения имеют null/пустые массивы.
  sourceId?: string | null
  primaryMuscles?: string[]
  secondaryMuscles?: string[]
  instructions?: string[]
  imageUrls?: string[]
  category?: string | null
  force?: string | null
  mechanic?: string | null
}

export function useExercise(id: string | null | undefined) {
  return useQuery({
    queryKey: ['exercises', id],
    enabled: !!id,
    queryFn: async () => {
      const { data } = await api.get(`/exercises/${id}`)
      return data as Exercise
    },
  })
}

export function useExercises(params?: {
  muscleGroup?: string
  equipment?: string
  difficulty?: string
  search?: string
}) {
  return useQuery({
    queryKey: ['exercises', params],
    queryFn: async () => {
      const { data } = await api.get('/exercises', { params })
      return data as { items: Exercise[]; total: number }
    },
  })
}

export function useCreateExercise() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (body: {
      name: string
      description?: string
      muscleGroup?: string
      equipment?: string
      difficulty?: string
      animationUrl?: string
    }) => {
      const { data } = await api.post('/exercises', body)
      return data as Exercise
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['exercises'] }),
  })
}

export function useDeleteExercise() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/exercises/${id}`)
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['exercises'] }),
  })
}

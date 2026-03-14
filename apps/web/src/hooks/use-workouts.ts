import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'

export interface WorkoutSession {
  id: string
  title: string
  startedAt: string
  finishedAt: string | null
  notes: string | null
  exercises?: WorkoutExercise[]
  exerciseCount?: number
}

export interface WorkoutExercise {
  id: string
  exerciseId: string
  exercise: { id: string; name: string; muscleGroups: string[]; description?: string | null }
  orderIndex: number
  sets: WorkoutSet[]
}

export interface WorkoutSet {
  id: string
  reps: number | null
  weightKg: number | null
  completed: boolean
}

export function useWorkouts(params?: { limit?: number; page?: number; from?: string; to?: string; status?: 'all' | 'planned' | 'completed'; order?: 'asc' | 'desc' }) {
  return useQuery({
    queryKey: ['workouts', params],
    queryFn: async () => {
      const { data } = await api.get('/workouts', { params })
      return data as { items: WorkoutSession[]; total: number }
    },
  })
}

export function useWorkout(id: string) {
  return useQuery({
    queryKey: ['workouts', id],
    queryFn: async () => {
      const { data } = await api.get(`/workouts/${id}`)
      return data as WorkoutSession
    },
    enabled: !!id,
  })
}

export function useCreateWorkout() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (body: { title: string; startedAt?: string; finishedAt?: string; notes?: string }) => {
      const { data } = await api.post('/workouts', body)
      return data as WorkoutSession
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['workouts'] }),
  })
}

export function useUpdateWorkout(id: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (body: { title?: string; finishedAt?: string; notes?: string }) => {
      const { data } = await api.patch(`/workouts/${id}`, body)
      return data as WorkoutSession
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['workouts', id] })
      qc.invalidateQueries({ queryKey: ['workouts'] })
    },
  })
}

export function useDeleteWorkout() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/workouts/${id}`)
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['workouts'] }),
  })
}

export function useAddExerciseToWorkout(workoutId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (body: { exerciseId: string; orderIndex?: number }) => {
      const { data } = await api.post(`/workouts/${workoutId}/exercises`, body)
      return data as WorkoutExercise
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['workouts', workoutId] }),
  })
}

export function useRemoveExerciseFromWorkout(workoutId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (workoutExerciseId: string) => {
      await api.delete(`/workouts/${workoutId}/exercises/${workoutExerciseId}`)
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['workouts', workoutId] }),
  })
}

export function useAddSet(workoutId: string, workoutExerciseId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (body: { reps?: number; weightKg?: number }) => {
      const { data } = await api.post(
        `/workouts/${workoutId}/exercises/${workoutExerciseId}/sets`,
        body
      )
      return data as WorkoutSet
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['workouts', workoutId] }),
  })
}

export function useUpdateSet(workoutId: string, workoutExerciseId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (body: { setId: string; reps?: number; weightKg?: number; completed?: boolean; _silent?: boolean }) => {
      const { setId, _silent, ...rest } = body
      const { data } = await api.patch(
        `/workouts/${workoutId}/exercises/${workoutExerciseId}/sets/${setId}`,
        rest
      )
      return { data: data as WorkoutSet, silent: _silent }
    },
    onSuccess: (result) => {
      if (!result.silent) {
        qc.invalidateQueries({ queryKey: ['workouts', workoutId] })
      }
    },
  })
}

export function useDeleteSet(workoutId: string, workoutExerciseId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (setId: string) => {
      await api.delete(`/workouts/${workoutId}/exercises/${workoutExerciseId}/sets/${setId}`)
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['workouts', workoutId] }),
  })
}

export interface ProgressPoint {
  sessionId: string
  date: string
  maxWeightKg: number | null
  totalVolume: number
  totalReps: number
}

export interface PersonalRecord {
  exerciseId: string
  exerciseName: string
  maxWeightKg: number | null
  repsAtMax: number | null
  sessionCount: number
  achievedAt: string | null
}

export interface MuscleStatItem {
  muscle: string
  sessionCount: number
}

export function useProgress(exerciseId: string | null) {
  return useQuery({
    queryKey: ['progress', exerciseId],
    queryFn: async () => {
      const { data } = await api.get('/workouts/progress', { params: { exerciseId } })
      return data as ProgressPoint[]
    },
    enabled: !!exerciseId,
  })
}

export function usePersonalRecords() {
  return useQuery({
    queryKey: ['personal-records'],
    queryFn: async () => {
      const { data } = await api.get('/workouts/records')
      return data as PersonalRecord[]
    },
  })
}

export function useMuscleStats(period: '7days' | 'month' | 'all' = '7days') {
  return useQuery({
    queryKey: ['muscle-stats', period],
    queryFn: async () => {
      const { data } = await api.get('/workouts/stats/muscles', { params: { period } })
      return data as MuscleStatItem[]
    },
  })
}


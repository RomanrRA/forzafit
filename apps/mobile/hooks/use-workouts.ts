import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';

export interface WorkoutSession {
  id: string;
  title: string | null;
  startedAt: string | null;
  finishedAt: string | null;
  notes: string | null;
}

export function useWorkouts() {
  return useQuery({
    queryKey: ['workouts'],
    queryFn: async () => {
      const { data } = await api.get('/workouts');
      return data as { items: WorkoutSession[]; total: number };
    },
  });
}

export function useWorkout(id: string) {
  return useQuery({
    queryKey: ['workouts', id],
    queryFn: async () => {
      const { data } = await api.get(`/workouts/${id}`);
      return data;
    },
  });
}

export function useCreateWorkout() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (title?: string) => {
      const { data } = await api.post('/workouts', {
        title: title || `Тренировка ${new Date().toLocaleDateString('ru')}`,
        startedAt: new Date().toISOString(),
      });
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['workouts'] }),
  });
}

export function useFinishWorkout() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { data } = await api.patch(`/workouts/${id}`, { finishedAt: new Date().toISOString() });
      return data;
    },
    onSuccess: (_, id) => {
      qc.invalidateQueries({ queryKey: ['workouts'] });
      qc.invalidateQueries({ queryKey: ['workouts', id] });
    },
  });
}

export function useAddExerciseToWorkout(workoutId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (exerciseId: string) => {
      const { data } = await api.post(`/workouts/${workoutId}/exercises`, { exerciseId });
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['workouts', workoutId] }),
  });
}

export function useUpdateSet() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      workoutId,
      weId,
      setId,
      patch,
    }: {
      workoutId: string;
      weId: string;
      setId: string;
      patch: { weightKg?: number; reps?: number; completed?: boolean };
    }) => {
      const { data } = await api.patch(`/workouts/${workoutId}/exercises/${weId}/sets/${setId}`, patch);
      return data;
    },
    onSuccess: (_, { workoutId }) => qc.invalidateQueries({ queryKey: ['workouts', workoutId] }),
  });
}

export function useAddSet() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ workoutId, weId }: { workoutId: string; weId: string }) => {
      const { data } = await api.post(`/workouts/${workoutId}/exercises/${weId}/sets`, {});
      return data;
    },
    onSuccess: (_, { workoutId }) => qc.invalidateQueries({ queryKey: ['workouts', workoutId] }),
  });
}

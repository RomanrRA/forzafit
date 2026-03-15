import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';

export interface Exercise {
  id: string;
  name: string;
  muscleGroups: string[];
  equipment: string | null;
  difficulty: string | null;
  isCustom: boolean;
}

export function useExercises(params?: { muscleGroup?: string; equipment?: string; search?: string }) {
  return useQuery({
    queryKey: ['exercises', params],
    queryFn: async () => {
      const { data } = await api.get('/exercises', { params });
      return data as { items: Exercise[]; total: number };
    },
  });
}

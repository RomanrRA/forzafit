import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/api'

export type StatKey =
  | 'strength'
  | 'power'
  | 'endurance'
  | 'intensity'
  | 'discipline'
  | 'balance'

export interface StatProfile {
  userId: string
  level: number
  /** Средний по 6 статам, 0–100 */
  overall: number
  stats: Record<StatKey, number>
}

export function useMyStats() {
  return useQuery({
    queryKey: ['stats', 'me'],
    queryFn: async () => {
      const { data } = await api.get('/stats/me')
      return data as StatProfile
    },
    staleTime: 60_000,
  })
}

export function useUserStats(userId: string | null) {
  return useQuery({
    enabled: !!userId,
    queryKey: ['stats', 'user', userId],
    queryFn: async () => {
      const { data } = await api.get(`/stats/user/${userId}`)
      return data as StatProfile
    },
    staleTime: 60_000,
  })
}

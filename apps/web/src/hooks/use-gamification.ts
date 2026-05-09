import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/api'

export type AchievementCategory =
  | 'milestone'
  | 'consistency'
  | 'strength'
  | 'volume'
  | 'time'
  | 'social'

export type PrType = 'one_rm' | 'working_weight' | 'volume_session'

export interface DetectedPr {
  exerciseId: string
  exerciseName: string | null
  type: PrType
  previousValueKg: number | null
  valueKg: number
  reps: number | null
}

export interface UnlockedAchievement {
  id: string
  code: string
  title: string
  description: string
  emoji: string
  category: AchievementCategory
  points: number
}

export interface WorkoutCompletedGamification {
  streak: { current: number; longest: number; isNewLongest: boolean }
  newPrs: DetectedPr[]
  newAchievements: UnlockedAchievement[]
}

export interface GamificationOverview {
  streak: {
    current: number
    longest: number
    lastActivityDate: string | null
  }
  prCount: number
  recentPrs: GamificationPr[]
  achievementsUnlocked: number
  achievementsTotal: number
  points: number
  recentAchievements: AchievementWithProgress[]
}

export interface GamificationPr {
  id: string
  exerciseId: string
  exerciseName: string | null
  type: PrType
  valueKg: string | number
  reps: number | null
  achievedAt: string
}

export interface AchievementWithProgress {
  id: string
  code: string
  title: string
  description: string
  emoji: string
  category: AchievementCategory
  points: number
  threshold: number | null
  unlocked: boolean
  unlockedAt: string | null
  progressCurrent: number | null
  progressTarget: number | null
}

export interface PrHistoryItem {
  id: string
  userId: string
  exerciseId: string
  workoutSessionId: string | null
  type: PrType
  valueKg: string | number
  reps: number | null
  achievedAt: string
}

export function useGamificationOverview() {
  return useQuery({
    queryKey: ['gamification', 'overview'],
    queryFn: async () => {
      const { data } = await api.get('/gamification/me')
      return data as GamificationOverview
    },
    staleTime: 30_000,
  })
}

export function useAchievements() {
  return useQuery({
    queryKey: ['gamification', 'achievements'],
    queryFn: async () => {
      const { data } = await api.get('/gamification/achievements')
      return data as AchievementWithProgress[]
    },
    staleTime: 30_000,
  })
}

export function useGamificationPrs() {
  return useQuery({
    queryKey: ['gamification', 'prs'],
    queryFn: async () => {
      const { data } = await api.get('/gamification/prs')
      return data as GamificationPr[]
    },
    staleTime: 30_000,
  })
}

export function usePrHistory(exerciseId: string | null) {
  return useQuery({
    queryKey: ['gamification', 'prs', exerciseId, 'history'],
    queryFn: async () => {
      const { data } = await api.get(`/gamification/prs/${exerciseId}/history`)
      return data as PrHistoryItem[]
    },
    enabled: !!exerciseId,
    staleTime: 30_000,
  })
}

import { useQuery, useMutation, useQueryClient, useInfiniteQuery } from '@tanstack/react-query'
import { api } from '@/lib/api'

// ─── Types ────────────────────────────────────────────────────────────────────

export interface PublicUser {
  id: string
  username: string | null
  displayName: string | null
  name: string | null
  avatarUrl: string | null
  isProfilePublic?: boolean
}

export interface PublicProfile extends PublicUser {
  bio: string | null
  createdAt: string
}

export type FriendshipStatus = 'pending' | 'accepted' | 'blocked'

export interface Friendship {
  friendshipId: string
  status: FriendshipStatus
  direction: 'incoming' | 'outgoing'
  createdAt: string
  updatedAt: string
  friend: PublicUser | null
}

export type FeedEventType = 'workout_completed' | 'pr_set' | 'achievement_unlocked'

export interface FeedEventData {
  // workout_completed
  sessionId?: string
  title?: string | null
  // pr_set
  exerciseId?: string
  exerciseName?: string
  prType?: 'one_rm' | 'working_weight' | 'volume_session'
  valueKg?: number
  reps?: number | null
  previousValueKg?: number | null
  // achievement_unlocked
  achievementId?: string
  achievementCode?: string
  achievementTitle?: string
  achievementEmoji?: string
}

export interface FeedItem {
  id: string
  type: FeedEventType
  data: FeedEventData
  createdAt: string
  author: PublicUser
}

export interface FeedPage {
  items: FeedItem[]
  nextCursor: string | null
}

export type LeaderboardMetric = 'streak' | 'achievements' | 'prCount'
export type LeaderboardScope = 'friends' | 'all'

export interface LeaderboardEntry {
  rank: number
  userId: string
  username: string | null
  displayName: string | null
  name: string | null
  avatarUrl: string | null
  metric: LeaderboardMetric
  value: number
  longest?: number
}

// ─── Friends ──────────────────────────────────────────────────────────────────

export function useFriends(status: FriendshipStatus = 'accepted') {
  return useQuery({
    queryKey: ['friends', status],
    queryFn: async () => {
      const { data } = await api.get('/friends', { params: { status } })
      return data as Friendship[]
    },
    staleTime: 15_000,
  })
}

export function useSendFriendRequest() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (username: string) => {
      const { data } = await api.post('/friends/requests', { username })
      return data
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['friends'] })
    },
  })
}

export function useAcceptFriendRequest() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (friendshipId: string) => {
      const { data } = await api.post(`/friends/requests/${friendshipId}/accept`)
      return data
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['friends'] }),
  })
}

export function useDeclineFriendRequest() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (friendshipId: string) => {
      await api.delete(`/friends/requests/${friendshipId}`)
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['friends'] }),
  })
}

export function useUnfriend() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (friendshipId: string) => {
      await api.delete(`/friends/${friendshipId}`)
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['friends'] }),
  })
}

export function useBlockUser() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (username: string) => {
      const { data } = await api.post('/friends/block', { username })
      return data
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['friends'] }),
  })
}

// ─── Feed ─────────────────────────────────────────────────────────────────────

export function useFeed(limit = 30) {
  return useInfiniteQuery({
    queryKey: ['feed', limit],
    initialPageParam: null as string | null,
    queryFn: async ({ pageParam }) => {
      const { data } = await api.get('/feed', {
        params: { limit, ...(pageParam ? { cursor: pageParam } : {}) },
      })
      return data as FeedPage
    },
    getNextPageParam: (lastPage) => lastPage.nextCursor,
    staleTime: 15_000,
  })
}

// ─── Leaderboard ──────────────────────────────────────────────────────────────

export function useLeaderboard(
  metric: LeaderboardMetric,
  scope: LeaderboardScope,
  limit = 50,
) {
  return useQuery({
    queryKey: ['leaderboard', metric, scope, limit],
    queryFn: async () => {
      const { data } = await api.get('/leaderboard', {
        params: { metric, scope, limit },
      })
      return data as LeaderboardEntry[]
    },
    staleTime: 30_000,
  })
}

// ─── Public profile ───────────────────────────────────────────────────────────

export function usePublicProfile(username: string | null) {
  return useQuery({
    queryKey: ['public-profile', username],
    enabled: !!username,
    queryFn: async () => {
      const { data } = await api.get(`/users/by-username/${username}`)
      return data as PublicProfile
    },
  })
}

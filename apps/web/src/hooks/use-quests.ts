import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'

export type QuestType =
  | 'workout_count'
  | 'streak_keep'
  | 'pr_in_exercise'
  | 'total_volume'
  | 'exercise_frequency'
  | 'weekday_consistency'

export type QuestStatus =
  | 'suggested'
  | 'active'
  | 'completed'
  | 'failed'
  | 'abandoned'

export interface Quest {
  id: string
  title: string
  description: string
  type: QuestType
  target: Record<string, unknown>
  progress: { current?: number; events?: Array<{ at: string; delta: number }> }
  rewardPoints: number
  status: QuestStatus
  source: 'ai' | 'manual' | 'template'
  durationDays: number
  startedAt: string | null
  expiresAt: string | null
  completedAt: string | null
  aiReason: string | null
  createdAt: string
  updatedAt: string
  progressRatio?: number
}

export interface QuestsOverview {
  active: Quest | null
  suggestions: Quest[]
  recent: Quest[]
}

export function useQuests() {
  return useQuery({
    queryKey: ['quests'],
    queryFn: async () => {
      const { data } = await api.get('/quests')
      return data as QuestsOverview
    },
    staleTime: 30_000,
  })
}

export function useGenerateQuests() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async () => {
      const { data } = await api.post('/quests/generate')
      return data as Quest[]
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['quests'] })
    },
  })
}

export function useAcceptQuest() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (questId: string) => {
      const { data } = await api.post(`/quests/${questId}/accept`)
      return data as Quest
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['quests'] })
      qc.invalidateQueries({ queryKey: ['gamification', 'overview'] })
    },
  })
}

export function useAbandonQuest() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (questId: string) => {
      const { data } = await api.post(`/quests/${questId}/abandon`)
      return data as Quest
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['quests'] })
    },
  })
}

/** Человекочитаемое описание цели для UI. */
export function formatQuestTarget(quest: Quest): string {
  const t = quest.target as Record<string, unknown>
  switch (quest.type) {
    case 'workout_count':
      return `${t.value} тренировок за ${quest.durationDays} дн.`
    case 'streak_keep':
      return `Серия из ${t.value} дн. без пропусков`
    case 'pr_in_exercise':
      return `Личный рекорд в «${String(t.exerciseName ?? '')}»`
    case 'total_volume':
      return `${formatVolume(Number(t.valueKg))} суммарного объёма`
    case 'exercise_frequency':
      return `«${String(t.exerciseName ?? '')}» ${t.value}× за ${quest.durationDays} дн.`
    case 'weekday_consistency': {
      const names = ['вс', 'пн', 'вт', 'ср', 'чт', 'пт', 'сб']
      const days = Array.isArray(t.weekdays)
        ? (t.weekdays as number[]).map((d) => names[d]).join('/')
        : ''
      return `Не пропускай: ${days}`
    }
  }
}

function formatVolume(v: number): string {
  if (!Number.isFinite(v)) return '0 кг'
  if (v >= 1000) return `${(v / 1000).toFixed(1).replace('.0', '')} т`
  return `${Math.round(v)} кг`
}

/** Дней до истечения активного квеста (округление вверх). */
export function daysLeft(quest: Quest): number | null {
  if (!quest.expiresAt) return null
  const ms = new Date(quest.expiresAt).getTime() - Date.now()
  if (ms <= 0) return 0
  return Math.ceil(ms / (24 * 60 * 60 * 1000))
}

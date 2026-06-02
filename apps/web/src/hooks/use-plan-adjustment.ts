'use client'

import { useCallback, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuthStore } from '@/store/auth.store'

const API_BASE = '/api/v1'

export type PlanAdjustment = {
  dayNumber: number
  exerciseName: string
  action: 'update' | 'replace' | 'add'
  newExerciseName?: string
  newSets?: number
  newReps?: string
  newWeightKg?: number
  reason: string
}

interface UsePlanAdjustmentResult {
  summary: string
  adjustments: PlanAdjustment[]
  isStreaming: boolean
  toolCallReady: boolean
  error: string | null
  analyze: (planTemplateId: string, userNote?: string) => Promise<void>
  apply: (indices: number[]) => Promise<{ planTemplateId: string; applied: number }>
  reset: () => void
}

export function usePlanAdjustment(): UsePlanAdjustmentResult {
  const router = useRouter()
  const [summary, setSummary] = useState('')
  const [adjustments, setAdjustments] = useState<PlanAdjustment[]>([])
  const [isStreaming, setIsStreaming] = useState(false)
  const [toolCallReady, setToolCallReady] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const conversationIdRef = useRef<string | null>(null)
  const runningRef = useRef(false)

  function getToken(): string | null {
    return useAuthStore.getState().accessToken
  }

  function handle401() {
    useAuthStore.getState().clearAuth()
    router.push('/login')
  }

  const reset = useCallback(() => {
    setSummary('')
    setAdjustments([])
    setToolCallReady(false)
    setError(null)
    conversationIdRef.current = null
    runningRef.current = false
  }, [])

  async function consumeStream(response: Response) {
    const reader = response.body?.getReader()
    if (!reader) throw new Error('Нет тела ответа')

    const decoder = new TextDecoder()
    let buffer = ''

    try {
      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        buffer += decoder.decode(value, { stream: true })
        const parts = buffer.split('\n\n')
        buffer = parts.pop() ?? ''

        for (const part of parts) {
          const trimmed = part.trim()
          if (!trimmed.startsWith('data:')) continue
          let payload: { type: string; [k: string]: unknown } | null = null
          try {
            payload = JSON.parse(trimmed.slice('data:'.length).trim())
          } catch {
            continue
          }
          if (!payload) continue

          if (payload.type === 'meta') {
            conversationIdRef.current = payload.conversationId as string
          } else if (payload.type === 'tool_call' && payload.name === 'adjust_plan') {
            const args = (payload.args ?? {}) as {
              summary?: string
              adjustments?: PlanAdjustment[]
            }
            setSummary(args.summary ?? '')
            setAdjustments(Array.isArray(args.adjustments) ? args.adjustments : [])
            setToolCallReady(true)
          } else if (payload.type === 'error') {
            setError((payload.message as string) ?? 'Ошибка AI')
          } else if (payload.type === 'done') {
            break
          }
        }
      }
    } finally {
      reader.releaseLock()
    }
  }

  const analyze = useCallback(async (planTemplateId: string, userNote?: string) => {
    if (runningRef.current) return
    runningRef.current = true

    setIsStreaming(true)
    setError(null)
    setToolCallReady(false)
    setAdjustments([])
    setSummary('')

    try {
      const token = getToken()
      const note = userNote?.trim()
      const response = await fetch(
        `${API_BASE}/ai/plans/${planTemplateId}/adjust`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          body: JSON.stringify(note ? { userNote: note } : {}),
        },
      )

      if (response.status === 401) {
        handle401()
        return
      }

      if (!response.ok) {
        throw new Error(`Ошибка сервера: ${response.status}`)
      }

      await consumeStream(response)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Неизвестная ошибка')
    } finally {
      setIsStreaming(false)
      runningRef.current = false
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const apply = useCallback(
    async (indices: number[]) => {
      const id = conversationIdRef.current
      if (!id) throw new Error('Сессия анализа не инициализирована')

      const token = getToken()
      const response = await fetch(
        `${API_BASE}/ai/plans/adjustment/${id}/apply`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          body: JSON.stringify({ indices }),
        },
      )

      if (response.status === 401) {
        handle401()
        throw new Error('Не авторизован')
      }

      if (!response.ok) {
        const body = await response.json().catch(() => ({}))
        throw new Error(
          (body as { message?: string }).message ??
            `Ошибка сервера: ${response.status}`,
        )
      }

      return (await response.json()) as { planTemplateId: string; applied: number }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    },
    [],
  )

  return { summary, adjustments, isStreaming, toolCallReady, error, analyze, apply, reset }
}

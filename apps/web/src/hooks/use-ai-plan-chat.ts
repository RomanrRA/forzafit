'use client'

import { useState, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { useAuthStore } from '@/store/auth.store'

const API_BASE = '/api/v1'

export interface ChatMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  toolCall?: { name: string; args: Record<string, unknown> }
}

interface UseAiPlanChatResult {
  messages: ChatMessage[]
  isStreaming: boolean
  toolCallReady: boolean
  start: (initialMessage?: string) => Promise<void>
  sendMessage: (content: string) => Promise<void>
  finalize: () => Promise<string>
  error: string | null
}

let msgCounter = 0
function nextId() {
  return `msg-${++msgCounter}`
}

/** Parses a raw SSE chunk into individual JSON payloads */
function parseSSEChunk(chunk: string): Array<{ type: string; [k: string]: unknown }> {
  return chunk
    .split('\n\n')
    .map((block) => block.trim())
    .filter((block) => block.startsWith('data:'))
    .map((block) => {
      try {
        return JSON.parse(block.slice('data:'.length).trim())
      } catch {
        return null
      }
    })
    .filter(Boolean)
}

export function useAiPlanChat(): UseAiPlanChatResult {
  const router = useRouter()
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [isStreaming, setIsStreaming] = useState(false)
  const [toolCallReady, setToolCallReady] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // conversationId received from the meta event
  const conversationIdRef = useRef<string | null>(null)
  // Tracks whether start() has already been called
  const startedRef = useRef(false)

  function getToken(): string | null {
    return useAuthStore.getState().accessToken
  }

  function handle401() {
    useAuthStore.getState().clearAuth()
    router.push('/login')
  }

  /** Appends tokens to the last assistant message (or creates it) */
  function appendToken(token: string) {
    setMessages((prev) => {
      const last = prev[prev.length - 1]
      if (last && last.role === 'assistant' && !last.toolCall) {
        return [
          ...prev.slice(0, -1),
          { ...last, content: last.content + token },
        ]
      }
      // Start a new assistant message
      return [...prev, { id: nextId(), role: 'assistant', content: token }]
    })
  }

  /** Attaches a tool_call to the last assistant message */
  function attachToolCall(name: string, args: Record<string, unknown>) {
    setMessages((prev) => {
      const last = prev[prev.length - 1]
      if (last && last.role === 'assistant') {
        return [
          ...prev.slice(0, -1),
          { ...last, toolCall: { name, args } },
        ]
      }
      return [
        ...prev,
        { id: nextId(), role: 'assistant', content: '', toolCall: { name, args } },
      ]
    })
  }

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

        // Process complete SSE messages (delimited by double newline)
        const parts = buffer.split('\n\n')
        // Keep the last (potentially incomplete) chunk in the buffer
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
          } else if (payload.type === 'token') {
            appendToken(payload.content as string)
          } else if (payload.type === 'tool_call') {
            attachToolCall(
              payload.name as string,
              (payload.args ?? {}) as Record<string, unknown>
            )
            if (payload.name === 'generate_plan') {
              setToolCallReady(true)
            }
          } else if (payload.type === 'done') {
            break
          }
        }
      }

      // Flush any remaining buffer
      if (buffer.trim().startsWith('data:')) {
        parseSSEChunk(buffer + '\n\n').forEach((payload) => {
          if (payload.type === 'token') appendToken(payload.content as string)
          else if (payload.type === 'done') { /* handled below */ }
        })
      }
    } finally {
      reader.releaseLock()
    }
  }

  const start = useCallback(async (initialMessage?: string) => {
    if (startedRef.current) return
    startedRef.current = true

    setIsStreaming(true)
    setError(null)

    // Show the user's compiled answers in the transcript if provided
    if (initialMessage) {
      setMessages((prev) => [
        ...prev,
        { id: nextId(), role: 'user', content: initialMessage },
      ])
    }

    try {
      const token = getToken()
      const response = await fetch(`${API_BASE}/ai/plans/start`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(initialMessage ? { initialMessage } : {}),
      })

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
      startedRef.current = false
    } finally {
      setIsStreaming(false)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const sendMessage = useCallback(async (content: string) => {
    const id = conversationIdRef.current
    if (!id) {
      setError('Сессия не инициализирована')
      return
    }

    // Optimistically add user message
    setMessages((prev) => [
      ...prev,
      { id: nextId(), role: 'user', content },
    ])

    setIsStreaming(true)
    setError(null)

    try {
      const token = getToken()
      const response = await fetch(`${API_BASE}/ai/plans/${id}/message`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ content }),
      })

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
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const finalize = useCallback(async (): Promise<string> => {
    const id = conversationIdRef.current
    if (!id) throw new Error('Сессия не инициализирована')

    const token = getToken()
    const response = await fetch(`${API_BASE}/ai/plans/${id}/finalize`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
    })

    if (response.status === 401) {
      handle401()
      throw new Error('Не авторизован')
    }

    if (!response.ok) {
      const body = await response.json().catch(() => ({}))
      throw new Error(
        (body as { message?: string }).message ?? `Ошибка сервера: ${response.status}`
      )
    }

    const data = await response.json() as { planTemplateId: string }
    return data.planTemplateId
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return { messages, isStreaming, toolCallReady, start, sendMessage, finalize, error }
}

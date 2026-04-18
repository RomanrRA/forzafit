'use client'

import { useEffect } from 'react'
import { api } from '@/lib/api'
import { useAuthStore } from '@/store/auth.store'

export function useAuthInit() {
  const { setAuth, clearAuth, setInitialized } = useAuthStore()

  useEffect(() => {
    const { refreshToken } = useAuthStore.getState()

    if (!refreshToken) {
      setInitialized()
      return
    }

    void (async () => {
      try {
        const { data } = await api.post('/auth/refresh', { refreshToken })
        useAuthStore.setState({
          accessToken: data.accessToken,
          refreshToken: data.refreshToken,
        })
        const { data: me } = await api.get('/users/me')
        setAuth(me, data.accessToken, data.refreshToken)
      } catch {
        clearAuth()
      } finally {
        setInitialized()
      }
    })()
  }, [setAuth, clearAuth, setInitialized])
}

export async function signOut() {
  const { refreshToken } = useAuthStore.getState()
  if (refreshToken) {
    try {
      await api.delete('/auth/logout', { data: { refreshToken } })
    } catch {
      // игнорируем: всё равно сбрасываем локальное состояние
    }
  }
  useAuthStore.getState().clearAuth()
}

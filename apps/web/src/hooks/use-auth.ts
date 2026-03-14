'use client'

import { useEffect } from 'react'
import { onAuthStateChanged, signOut as firebaseSignOut } from 'firebase/auth'
import { auth } from '@/lib/firebase'
import { api } from '@/lib/api'
import { useAuthStore } from '@/store/auth.store'

export function useAuthInit() {
  const { setAuth, clearAuth } = useAuthStore()

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        // Если токен уже установлен (логин прошёл на странице входа), не дублируем запрос
        const { accessToken } = useAuthStore.getState()
        if (accessToken) return
        try {
          const idToken = await firebaseUser.getIdToken()
          const { data } = await api.post('/auth/login', { idToken })
          setAuth({ id: '', email: '', name: null, firebaseUid: '' }, data.accessToken, data.refreshToken)
          const { data: me } = await api.get('/users/me')
          setAuth(me, data.accessToken, data.refreshToken)
        } catch {
          clearAuth()
        }
      } else {
        clearAuth()
      }
    })

    return unsubscribe
  }, [setAuth, clearAuth])
}

export async function signOut() {
  await firebaseSignOut(auth)
  useAuthStore.getState().clearAuth()
}

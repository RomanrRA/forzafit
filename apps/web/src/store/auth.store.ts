import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export interface AuthUser {
  id: string
  email: string
  name: string | null
}

interface AuthState {
  user: AuthUser | null
  accessToken: string | null
  refreshToken: string | null
  isInitializing: boolean
  setAuth: (user: AuthUser, accessToken: string, refreshToken: string) => void
  clearAuth: () => void
  setAccessToken: (token: string) => void
  setInitialized: () => void
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      accessToken: null,
      refreshToken: null,
      isInitializing: true,
      setAuth: (user, accessToken, refreshToken) =>
        set({ user, accessToken, refreshToken, isInitializing: false }),
      clearAuth: () => set({ user: null, accessToken: null, refreshToken: null, isInitializing: false }),
      setAccessToken: (token) => set({ accessToken: token }),
      setInitialized: () => set({ isInitializing: false }),
    }),
    {
      name: 'forzafit-auth',
      partialize: (state) => ({
        refreshToken: state.refreshToken,
        user: state.user,
      }),
    }
  )
)

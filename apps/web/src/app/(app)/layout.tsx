'use client'

import { useEffect } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { useQuery } from '@tanstack/react-query'
import { useAuthStore } from '@/store/auth.store'
import { api } from '@/lib/api'
import { Sidebar } from '@/components/layout/sidebar'
import { Header } from '@/components/layout/header'
import { BottomNav } from '@/components/layout/bottom-nav'

interface UserMeForOnboarding {
  heightCm: number | null
}

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const accessToken = useAuthStore((s) => s.accessToken)
  const isInitializing = useAuthStore((s) => s.isInitializing)
  const router = useRouter()
  const pathname = usePathname()

  useEffect(() => {
    if (!isInitializing && !accessToken) {
      router.replace('/login')
    }
  }, [accessToken, isInitializing, router])

  // Онбординг-редирект. Если у юзера ещё нет роста — считаем, что он не
  // заполнил базовый профиль. Запускаем только когда уже залогинен и
  // мы не на самой странице онбординга.
  const { data: me } = useQuery({
    queryKey: ['users', 'me'],
    queryFn: async () => {
      const { data } = await api.get('/users/me')
      return data as UserMeForOnboarding
    },
    enabled: !!accessToken && !isInitializing,
    staleTime: 30_000,
  })

  useEffect(() => {
    if (!me) return
    if (pathname === '/onboarding') return
    if (me.heightCm == null) router.replace('/onboarding')
  }, [me, pathname, router])

  if (isInitializing || !accessToken) return null

  // На странице онбординга прячем sidebar/header/bottom-nav — фокус только
  // на форме.
  if (pathname === '/onboarding') {
    return (
      <div className="lg-bg min-h-screen w-full">
        <main className="w-full px-3 py-4 md:px-6 md:py-6">{children}</main>
      </div>
    )
  }

  return (
    <div className="lg-bg flex min-h-screen w-full">
      <Sidebar />
      <div className="flex-1 min-w-0 flex flex-col min-h-screen">
        <Header />
        <main className="flex-1 min-w-0 w-full px-3 py-4 pb-nav-safe md:px-6 md:py-6 md:pb-6">
          {children}
        </main>
      </div>
      <BottomNav />
    </div>
  )
}

'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuthStore } from '@/store/auth.store'
import { Sidebar } from '@/components/layout/sidebar'
import { Header } from '@/components/layout/header'
import { BottomNav } from '@/components/layout/bottom-nav'

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const accessToken = useAuthStore((s) => s.accessToken)
  const router = useRouter()

  useEffect(() => {
    if (!accessToken) {
      router.replace('/login')
    }
  }, [accessToken, router])

  if (!accessToken) return null

  return (
    <div className="lg-bg flex min-h-screen">
      <Sidebar />
      <div className="flex-1 flex flex-col min-h-screen">
        <Header />
        <main className="flex-1 p-6 pb-20 md:pb-6">{children}</main>
      </div>
      <BottomNav />
    </div>
  )
}

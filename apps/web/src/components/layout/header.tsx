'use client'

import { useAuthStore } from '@/store/auth.store'
import { Button } from '@/components/ui/button'
import { Dumbbell, LogOut } from 'lucide-react'
import { signOut } from '@/hooks/use-auth'
import { useRouter } from 'next/navigation'

export function Header() {
  const user = useAuthStore((s) => s.user)
  const router = useRouter()

  async function handleSignOut() {
    await signOut()
    router.push('/login')
  }

  return (
    <header className="glass-header sticky top-0 z-20">
      <div className="flex items-center justify-between px-5 h-14">
        {/* Mobile logo */}
        <div className="flex items-center gap-2 md:hidden">
          <Dumbbell className="h-5 w-5 text-primary" />
          <span className="font-bold text-foreground">ForzaFit</span>
        </div>

        {/* Desktop right side */}
        <div className="hidden md:flex items-center gap-3 ml-auto">
          {user && (
            <span className="text-sm text-muted-foreground font-medium">{user.email}</span>
          )}
          <button
            onClick={handleSignOut}
            title="Выйти"
            className="glass-btn flex items-center justify-center h-9 w-9 rounded-xl"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>

        {/* Mobile sign out */}
        <Button variant="ghost" size="icon" className="md:hidden" onClick={handleSignOut}>
          <LogOut className="h-4 w-4" />
        </Button>
      </div>
    </header>
  )
}

'use client'

import { useAuthStore } from '@/store/auth.store'
import { Flame, LogOut } from 'lucide-react'
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
    <header className="glass-header sticky top-0 z-20 pt-safe">
      <div className="flex items-center justify-between px-5" style={{ height: 56 }}>
        {/* Mobile brand */}
        <div className="flex items-center gap-2 md:hidden">
          <div
            className="grid place-items-center"
            style={{
              width: 28,
              height: 28,
              borderRadius: 9,
              background:
                'linear-gradient(135deg, var(--c-accent), color-mix(in oklab, var(--c-accent) 60%, black))',
              boxShadow: '0 3px 10px var(--c-accent-glow)',
              color: 'white',
            }}
          >
            <Flame className="h-4 w-4" strokeWidth={2.4} />
          </div>
          <span
            style={{
              fontWeight: 800,
              fontSize: 15,
              letterSpacing: -0.3,
              color: 'var(--txt-1)',
            }}
          >
            Forza<span style={{ color: 'var(--c-accent)' }}>Fit</span>
          </span>
        </div>

        {/* Right side — email + signout */}
        <div className="flex items-center gap-3 ml-auto">
          {user && (
            <span className="hidden md:inline text-xs font-semibold txt-muted">
              {user.email}
            </span>
          )}
          <button
            onClick={handleSignOut}
            title="Выйти"
            className="glass-btn grid place-items-center"
            style={{ width: 36, height: 36, borderRadius: 11 }}
          >
            <LogOut className="h-4 w-4" strokeWidth={2.2} />
          </button>
        </div>
      </div>
    </header>
  )
}

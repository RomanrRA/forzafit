'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Dumbbell, LayoutDashboard, ListChecks, ClipboardList, TrendingUp, Scale, User } from 'lucide-react'
import { cn } from '@/lib/utils'

const navItems = [
  { href: '/dashboard', label: 'Дашборд', icon: LayoutDashboard },
  { href: '/workouts', label: 'Тренировки', icon: ListChecks },
  { href: '/plans', label: 'Планы', icon: ClipboardList },
  { href: '/progress', label: 'Прогресс', icon: TrendingUp },
  { href: '/body', label: 'Замеры', icon: Scale },
  { href: '/profile', label: 'Профиль', icon: User },
]

export function Sidebar() {
  const pathname = usePathname()

  return (
    <aside className="glass-sidebar hidden md:flex flex-col w-60 min-h-screen relative z-10">
      {/* Subtle colour overlay */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            'linear-gradient(160deg, rgba(120,100,255,0.10) 0%, rgba(0,180,255,0.05) 50%, rgba(255,100,180,0.07) 100%)',
        }}
      />

      {/* Logo */}
      <div className="relative flex items-center gap-3 px-5 py-5 border-b border-white/[0.08]">
        <div
          className="flex h-9 w-9 items-center justify-center rounded-xl text-lg flex-shrink-0"
          style={{
            background: 'linear-gradient(145deg, #ffffff 0%, #dde8ff 50%, #b8caff 100%)',
            boxShadow: '0 4px 12px rgba(100,120,255,0.28), inset 0 1px 0 rgba(255,255,255,1)',
          }}
        >
          💪
        </div>
        <span className="text-[19px] font-bold tracking-tight text-white/95">ForzaFit</span>
      </div>

      {/* Nav */}
      <nav className="relative flex flex-col gap-0.5 p-3 flex-1">
        {navItems.map(({ href, label, icon: Icon }) => {
          const active = pathname === href || pathname.startsWith(href + '/')
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                'relative flex items-center gap-3 rounded-[12px] px-3 py-[9px] text-sm font-medium transition-all duration-200',
                active
                  ? 'text-white/95 font-semibold'
                  : 'text-white/40 hover:text-white/72 hover:bg-white/[0.07]'
              )}
              style={
                active
                  ? {
                      background: 'rgba(255,255,255,0.11)',
                      border: '1px solid rgba(255,255,255,0.16)',
                      boxShadow:
                        '0 4px 16px rgba(0,0,0,0.14), inset 0 1px 0 rgba(255,255,255,0.22)',
                    }
                  : undefined
              }
            >
              {active && (
                <span
                  className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-[18px] rounded-r-full"
                  style={{
                    background: 'linear-gradient(180deg, #a0c4ff, #6e9fff)',
                    boxShadow: '0 0 8px rgba(120,160,255,0.55)',
                  }}
                />
              )}
              <Icon className="h-[17px] w-[17px] flex-shrink-0 opacity-80" />
              {label}
            </Link>
          )
        })}
      </nav>
    </aside>
  )
}

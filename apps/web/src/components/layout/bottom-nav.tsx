'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { LayoutDashboard, ListChecks, ClipboardList, TrendingUp, User } from 'lucide-react'
import { cn } from '@/lib/utils'

const navItems = [
  { href: '/dashboard', label: 'Дашборд', icon: LayoutDashboard },
  { href: '/workouts', label: 'Тренировки', icon: ListChecks },
  { href: '/plans', label: 'Планы', icon: ClipboardList },
  { href: '/progress', label: 'Прогресс', icon: TrendingUp },
  { href: '/profile', label: 'Профиль', icon: User },
]

export function BottomNav() {
  const pathname = usePathname()

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 h-16 glass-sidebar border-t border-white/10 pb-4">
      <div className="flex items-center justify-around h-full px-2">
        {navItems.map(({ href, label, icon: Icon }) => {
          const isActive = pathname === href || pathname.startsWith(href + '/')
          return (
            <Link
              key={href}
              href={href}
              className="flex flex-col items-center justify-center flex-1 gap-0.5"
            >
              <div
                className={cn(
                  'flex items-center justify-center rounded-xl w-10 h-7 transition-colors',
                  isActive ? 'bg-white/20' : ''
                )}
              >
                <Icon
                  className={cn(
                    'h-5 w-5 transition-colors',
                    isActive ? 'text-white' : 'text-white/40'
                  )}
                />
              </div>
              <span
                className={cn(
                  'text-[10px] font-medium transition-colors leading-none',
                  isActive ? 'text-white' : 'text-white/40'
                )}
              >
                {label}
              </span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}

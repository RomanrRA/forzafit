'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { LayoutDashboard, ListChecks, ClipboardList, Scale, Trophy, User } from 'lucide-react'

const navItems = [
  { href: '/dashboard', label: 'Дашборд', icon: LayoutDashboard },
  { href: '/workouts', label: 'Тренировки', icon: ListChecks },
  { href: '/plans', label: 'Планы', icon: ClipboardList },
  { href: '/body', label: 'Замеры', icon: Scale },
  { href: '/achievements', label: 'Ачивки', icon: Trophy },
  { href: '/profile', label: 'Профиль', icon: User },
]

export function BottomNav() {
  const pathname = usePathname()

  return (
    <nav
      className="md:hidden fixed bottom-0 left-0 right-0 z-50 glass-sidebar pb-safe"
      style={{ borderTop: '1px solid var(--gl-border)' }}
    >
      <div className="flex items-center justify-around px-1" style={{ height: 64 }}>
        {navItems.map(({ href, label, icon: Icon }) => {
          const active = pathname === href || pathname.startsWith(href + '/')
          return (
            <Link
              key={href}
              href={href}
              className="flex flex-col items-center justify-center flex-1 min-w-0 gap-1"
            >
              <div
                className="grid place-items-center"
                style={{
                  width: 36,
                  height: 28,
                  borderRadius: 11,
                  background: active ? 'var(--gl-bg-strong)' : 'transparent',
                  border: '1px solid ' + (active ? 'var(--gl-border-strong)' : 'transparent'),
                  color: active ? 'var(--c-accent)' : 'var(--txt-3)',
                  transition: 'background 0.15s, color 0.15s',
                }}
              >
                <Icon className="h-[18px] w-[18px]" strokeWidth={2.2} />
              </div>
              <span
                className="block max-w-full truncate text-center"
                style={{
                  fontSize: 10,
                  fontWeight: active ? 800 : 600,
                  letterSpacing: 0.1,
                  color: active ? 'var(--txt-1)' : 'var(--txt-3)',
                  lineHeight: 1,
                }}
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

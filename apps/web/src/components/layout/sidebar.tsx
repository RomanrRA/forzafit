'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Flame, LayoutDashboard, ListChecks, ClipboardList, TrendingUp, Scale, Trophy, User } from 'lucide-react'
import { useAuthStore } from '@/store/auth.store'
import { useGamificationOverview } from '@/hooks/use-gamification'

const navItems = [
  { href: '/dashboard', label: 'Дашборд', icon: LayoutDashboard },
  { href: '/workouts', label: 'Тренировки', icon: ListChecks },
  { href: '/plans', label: 'Планы', icon: ClipboardList },
  { href: '/progress', label: 'Прогресс', icon: TrendingUp },
  { href: '/body', label: 'Замеры', icon: Scale },
  { href: '/achievements', label: 'Достижения', icon: Trophy },
  { href: '/profile', label: 'Профиль', icon: User },
]

export function Sidebar() {
  const pathname = usePathname()
  const user = useAuthStore((s) => s.user)
  const { data: gam } = useGamificationOverview()
  const initial = (user?.name ?? user?.email ?? '?').trim().slice(0, 1).toUpperCase()
  const displayName = user?.name ?? user?.email?.split('@')[0] ?? 'Атлет'
  const streakCurrent = gam?.streak.current ?? 0

  return (
    <aside
      className="glass-sidebar hidden md:flex flex-col min-h-screen relative z-10"
      style={{
        width: 240,
        minWidth: 240,
        borderRight: '1px solid var(--gl-border)',
        padding: '20px 12px 16px',
      }}
    >
      {/* ── Brand ── */}
      <div className="flex items-center gap-2.5 px-2 pb-5">
        <div
          className="grid place-items-center"
          style={{
            width: 32,
            height: 32,
            borderRadius: 10,
            background:
              'linear-gradient(135deg, var(--c-accent), color-mix(in oklab, var(--c-accent) 60%, black))',
            boxShadow: '0 4px 12px var(--c-accent-glow)',
            color: 'white',
          }}
        >
          <Flame className="h-[18px] w-[18px]" strokeWidth={2.4} />
        </div>
        <div
          style={{
            fontWeight: 800,
            fontSize: 16,
            letterSpacing: -0.4,
            color: 'var(--txt-1)',
          }}
        >
          Forza<span style={{ color: 'var(--c-accent)' }}>Fit</span>
        </div>
      </div>

      {/* ── Nav ── */}
      <nav className="flex flex-col gap-0.5">
        {navItems.map(({ href, label, icon: Icon }) => {
          const active = pathname === href || pathname.startsWith(href + '/')
          return (
            <Link
              key={href}
              href={href}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                padding: '10px 12px',
                borderRadius: 12,
                background: active ? 'var(--gl-bg-strong)' : 'transparent',
                border: '1px solid ' + (active ? 'var(--gl-border-strong)' : 'transparent'),
                color: active ? 'var(--txt-1)' : 'var(--txt-2)',
                fontSize: 14,
                fontWeight: active ? 700 : 600,
                transition: 'background 0.15s, color 0.15s',
              }}
            >
              <Icon
                className="h-[18px] w-[18px] shrink-0"
                style={{ color: active ? 'var(--c-accent)' : 'currentColor' }}
                strokeWidth={2}
              />
              <span className="flex-1 truncate text-left">{label}</span>
            </Link>
          )
        })}
      </nav>

      {/* spacer */}
      <div className="flex-1" />

      {/* ── Profile pill ── */}
      <Link
        href="/profile"
        className="glass-card flex items-center gap-2.5"
        style={{ padding: '10px 12px' }}
      >
        <div
          className="grid place-items-center shrink-0"
          style={{
            width: 32,
            height: 32,
            borderRadius: '50%',
            background:
              'linear-gradient(135deg, oklch(0.55 0.15 30), oklch(0.45 0.18 280))',
            color: 'white',
            fontWeight: 700,
            fontSize: 13,
          }}
        >
          {initial || <User className="h-4 w-4" />}
        </div>
        <div className="min-w-0 flex-1">
          <div
            className="truncate"
            style={{ fontSize: 13, fontWeight: 700, color: 'var(--txt-1)' }}
          >
            {displayName}
          </div>
          {streakCurrent > 0 ? (
            <div
              className="inline-flex items-center gap-1"
              style={{ fontSize: 11, fontWeight: 700, color: 'var(--c-orange)' }}
            >
              <Flame className="h-3 w-3" strokeWidth={2.4} />
              <span className="tnum">{streakCurrent}</span>{' '}
              <span style={{ color: 'var(--c-orange)' }}>
                {streakCurrent === 1 ? 'день' : streakCurrent >= 2 && streakCurrent <= 4 ? 'дня' : 'дней'}
              </span>
            </div>
          ) : (
            <div style={{ fontSize: 11, color: 'var(--txt-3)', fontWeight: 600 }}>
              профиль
            </div>
          )}
        </div>
      </Link>
    </aside>
  )
}

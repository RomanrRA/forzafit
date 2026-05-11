'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard, ListChecks, ClipboardList, Scale, Trophy, User,
  MoreHorizontal, TrendingUp, Newspaper, Users, Medal, X,
} from 'lucide-react'
import { useFriends } from '@/hooks/use-social'

interface NavItem {
  href: string
  label: string
  icon: typeof LayoutDashboard
}

const primaryItems: NavItem[] = [
  { href: '/dashboard', label: 'Дашборд', icon: LayoutDashboard },
  { href: '/workouts', label: 'Тренировки', icon: ListChecks },
  { href: '/plans', label: 'Планы', icon: ClipboardList },
  { href: '/body', label: 'Замеры', icon: Scale },
  { href: '/achievements', label: 'Достижения', icon: Trophy },
]

const moreItems: NavItem[] = [
  { href: '/progress', label: 'Прогресс', icon: TrendingUp },
  { href: '/feed', label: 'Лента', icon: Newspaper },
  { href: '/friends', label: 'Друзья', icon: Users },
  { href: '/leaderboard', label: 'Топ', icon: Medal },
  { href: '/profile', label: 'Профиль', icon: User },
]

export function BottomNav() {
  const pathname = usePathname()
  const [moreOpen, setMoreOpen] = useState(false)

  const { data: pendingFriends } = useFriends('pending')
  const incomingCount = (pendingFriends ?? []).filter((f) => f.direction === 'incoming').length

  useEffect(() => {
    setMoreOpen(false)
  }, [pathname])

  useEffect(() => {
    if (!moreOpen) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setMoreOpen(false)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [moreOpen])

  const moreActive = moreItems.some(
    (it) => pathname === it.href || pathname.startsWith(it.href + '/'),
  )

  return (
    <>
      <nav
        className="md:hidden fixed bottom-0 left-0 right-0 z-50 glass-sidebar pb-safe"
        style={{ borderTop: '1px solid var(--gl-border)' }}
      >
        <div className="flex items-center justify-around px-1" style={{ height: 64 }}>
          {primaryItems.map(({ href, label, icon: Icon }) => {
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

          {/* «Ещё» — открывает шторку */}
          <button
            type="button"
            onClick={() => setMoreOpen((v) => !v)}
            aria-expanded={moreOpen}
            aria-label="Ещё"
            className="flex flex-col items-center justify-center flex-1 min-w-0 gap-1 relative"
          >
            <div
              className="grid place-items-center"
              style={{
                width: 36,
                height: 28,
                borderRadius: 11,
                background: moreActive || moreOpen ? 'var(--gl-bg-strong)' : 'transparent',
                border:
                  '1px solid ' +
                  (moreActive || moreOpen ? 'var(--gl-border-strong)' : 'transparent'),
                color: moreActive || moreOpen ? 'var(--c-accent)' : 'var(--txt-3)',
                transition: 'background 0.15s, color 0.15s',
              }}
            >
              <MoreHorizontal className="h-[18px] w-[18px]" strokeWidth={2.2} />
            </div>
            <span
              className="block max-w-full truncate text-center"
              style={{
                fontSize: 10,
                fontWeight: moreActive || moreOpen ? 800 : 600,
                letterSpacing: 0.1,
                color: moreActive || moreOpen ? 'var(--txt-1)' : 'var(--txt-3)',
                lineHeight: 1,
              }}
            >
              Ещё
            </span>
            {incomingCount > 0 && (
              <span
                className="tnum"
                style={{
                  position: 'absolute',
                  top: 2,
                  right: 'calc(50% - 22px)',
                  minWidth: 16,
                  height: 16,
                  padding: '0 4px',
                  borderRadius: 999,
                  background: 'var(--c-red)',
                  color: 'white',
                  fontSize: 9,
                  fontWeight: 800,
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  pointerEvents: 'none',
                }}
              >
                {incomingCount}
              </span>
            )}
          </button>
        </div>
      </nav>

      {/* Шторка «Ещё» */}
      {moreOpen && (
        <div className="md:hidden fixed inset-0 z-[60]" role="dialog" aria-modal="true">
          {/* backdrop */}
          <button
            type="button"
            aria-label="Закрыть"
            onClick={() => setMoreOpen(false)}
            className="absolute inset-0"
            style={{
              background: 'rgba(0, 0, 0, 0.45)',
              backdropFilter: 'blur(2px)',
              WebkitBackdropFilter: 'blur(2px)',
            }}
          />
          {/* sheet */}
          <div
            className="glass-sidebar fz-rise absolute left-0 right-0 pb-safe"
            style={{
              bottom: 0,
              borderTop: '1px solid var(--gl-border)',
              borderTopLeftRadius: 20,
              borderTopRightRadius: 20,
              padding: '12px 12px 16px',
            }}
          >
            <div className="flex items-center justify-between px-3 pb-2">
              <div
                style={{
                  fontSize: 13,
                  fontWeight: 800,
                  letterSpacing: 0.2,
                  color: 'var(--txt-2)',
                  textTransform: 'uppercase',
                }}
              >
                Ещё
              </div>
              <button
                type="button"
                onClick={() => setMoreOpen(false)}
                className="grid place-items-center"
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: 10,
                  color: 'var(--txt-3)',
                }}
                aria-label="Закрыть"
              >
                <X className="h-4 w-4" strokeWidth={2.2} />
              </button>
            </div>

            <div className="grid grid-cols-3 gap-2">
              {moreItems.map(({ href, label, icon: Icon }) => {
                const active = pathname === href || pathname.startsWith(href + '/')
                const showBadge = href === '/friends' && incomingCount > 0
                return (
                  <Link
                    key={href}
                    href={href}
                    className="glass-card flex flex-col items-center justify-center gap-1.5 relative"
                    style={{
                      padding: '14px 8px',
                      background: active ? 'var(--gl-bg-strong)' : undefined,
                      border:
                        '1px solid ' +
                        (active ? 'var(--gl-border-strong)' : 'var(--gl-border)'),
                    }}
                  >
                    <div
                      className="grid place-items-center"
                      style={{
                        width: 36,
                        height: 36,
                        borderRadius: 12,
                        background: active
                          ? 'color-mix(in oklab, var(--c-accent) 18%, transparent)'
                          : 'var(--gl-bg)',
                        color: active ? 'var(--c-accent)' : 'var(--txt-2)',
                      }}
                    >
                      <Icon className="h-[18px] w-[18px]" strokeWidth={2.2} />
                    </div>
                    <span
                      style={{
                        fontSize: 12,
                        fontWeight: active ? 800 : 600,
                        color: active ? 'var(--txt-1)' : 'var(--txt-2)',
                        lineHeight: 1,
                      }}
                    >
                      {label}
                    </span>
                    {showBadge && (
                      <span
                        className="tnum"
                        style={{
                          position: 'absolute',
                          top: 6,
                          right: 6,
                          minWidth: 18,
                          height: 18,
                          padding: '0 6px',
                          borderRadius: 999,
                          background: 'var(--c-red)',
                          color: 'white',
                          fontSize: 10,
                          fontWeight: 800,
                          display: 'inline-flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        {incomingCount}
                      </span>
                    )}
                  </Link>
                )
              })}
            </div>
          </div>
        </div>
      )}
    </>
  )
}

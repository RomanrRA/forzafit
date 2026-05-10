'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import {
  Flame, LayoutDashboard, ListChecks, ClipboardList, TrendingUp, Scale, Trophy, User,
  ChevronsLeft, ChevronsRight,
} from 'lucide-react'
import { useAuthStore } from '@/store/auth.store'
import { useSidebarStore } from '@/store/sidebar.store'
import { useGamificationOverview } from '@/hooks/use-gamification'
import { plural } from '@/lib/utils'

interface NavItem {
  href: string
  label: string
  icon: typeof LayoutDashboard
  shortcut?: number // 1..9 — Cmd/Ctrl + N
}

const navItems: NavItem[] = [
  { href: '/dashboard', label: 'Дашборд', icon: LayoutDashboard, shortcut: 1 },
  { href: '/workouts', label: 'Тренировки', icon: ListChecks, shortcut: 2 },
  { href: '/plans', label: 'Планы', icon: ClipboardList, shortcut: 3 },
  { href: '/progress', label: 'Прогресс', icon: TrendingUp, shortcut: 4 },
  { href: '/body', label: 'Замеры', icon: Scale, shortcut: 5 },
  { href: '/achievements', label: 'Достижения', icon: Trophy },
  { href: '/profile', label: 'Профиль', icon: User },
]

export function Sidebar() {
  const pathname = usePathname()
  const router = useRouter()
  const user = useAuthStore((s) => s.user)
  const { data: gam } = useGamificationOverview()
  const collapsed = useSidebarStore((s) => s.collapsed)
  const toggleCollapsed = useSidebarStore((s) => s.toggle)

  const initial = (user?.name ?? user?.email ?? '?').trim().slice(0, 1).toUpperCase()
  const displayName = user?.name ?? user?.email?.split('@')[0] ?? 'Атлет'
  const streakCurrent = gam?.streak.current ?? 0

  // Mac vs Win — для отображения хинтов (⌘ vs Ctrl)
  const [isMac, setIsMac] = useState(false)
  useEffect(() => {
    setIsMac(/Mac|iPhone|iPad/i.test(navigator.platform))
  }, [])
  const modKey = isMac ? '⌘' : 'Ctrl'

  // Глобальные шорткаты: Cmd/Ctrl + 1..5
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!(e.metaKey || e.ctrlKey)) return
      if (e.shiftKey || e.altKey) return
      const tag = (e.target as HTMLElement)?.tagName
      if (tag === 'INPUT' || tag === 'TEXTAREA' || (e.target as HTMLElement)?.isContentEditable) return
      const n = Number(e.key)
      if (!Number.isInteger(n) || n < 1) return
      const item = navItems.find((it) => it.shortcut === n)
      if (!item) return
      e.preventDefault()
      router.push(item.href)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [router])

  const width = collapsed ? 68 : 240

  return (
    <aside
      className="glass-sidebar hidden md:flex flex-col min-h-screen relative z-10"
      style={{
        width,
        minWidth: width,
        borderRight: '1px solid var(--gl-border)',
        padding: '20px 12px 16px',
        transition: 'width 0.18s ease, min-width 0.18s ease',
      }}
    >
      {/* ── Brand ── */}
      <div
        className={`flex items-center pb-5 ${collapsed ? 'justify-center px-0' : 'gap-2.5 px-2'}`}
      >
        <div
          className="grid place-items-center shrink-0"
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
        {!collapsed && (
          <div
            style={{
              fontWeight: 800,
              fontSize: 16,
              letterSpacing: -0.4,
              color: 'var(--txt-1)',
              whiteSpace: 'nowrap',
            }}
          >
            Forza<span style={{ color: 'var(--c-accent)' }}>Fit</span>
          </div>
        )}
      </div>

      {/* ── Nav ── */}
      <nav className="flex flex-col gap-0.5">
        {navItems.map(({ href, label, icon: Icon, shortcut }) => {
          const active = pathname === href || pathname.startsWith(href + '/')
          return (
            <Link
              key={href}
              href={href}
              title={collapsed ? `${label}${shortcut ? ` (${modKey}${shortcut})` : ''}` : undefined}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: collapsed ? 0 : 12,
                justifyContent: collapsed ? 'center' : 'flex-start',
                padding: collapsed ? '10px 0' : '10px 12px',
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
              {!collapsed && (
                <>
                  <span className="flex-1 truncate text-left">{label}</span>
                  {shortcut && (
                    <kbd
                      className="tnum shrink-0"
                      style={{
                        padding: '2px 6px',
                        borderRadius: 6,
                        background: 'var(--gl-bg)',
                        border: '1px solid var(--gl-border)',
                        color: active ? 'var(--txt-2)' : 'var(--txt-3)',
                        fontSize: 10,
                        fontWeight: 600,
                        letterSpacing: 0.2,
                        fontFamily: 'ui-monospace, "SF Mono", Menlo, monospace',
                      }}
                    >
                      {modKey}{shortcut}
                    </kbd>
                  )}
                </>
              )}
            </Link>
          )
        })}
      </nav>

      {/* spacer */}
      <div className="flex-1" />

      {/* ── Profile pill / avatar ── */}
      <Link
        href="/profile"
        className={`glass-card flex items-center mb-2 ${collapsed ? 'justify-center' : 'gap-2.5'}`}
        style={{ padding: collapsed ? '8px' : '10px 12px' }}
        title={collapsed ? displayName : undefined}
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
        {!collapsed && (
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
                  {plural(streakCurrent, ['день', 'дня', 'дней'])}
                </span>
              </div>
            ) : (
              <div style={{ fontSize: 11, color: 'var(--txt-3)', fontWeight: 600 }}>
                профиль
              </div>
            )}
          </div>
        )}
      </Link>

      {/* ── Collapse toggle ── */}
      <button
        type="button"
        onClick={toggleCollapsed}
        title={collapsed ? 'Развернуть сайдбар' : 'Свернуть сайдбар'}
        className="glass-btn flex items-center justify-center"
        style={{
          width: '100%',
          height: 32,
          borderRadius: 10,
          fontSize: 12,
          fontWeight: 600,
          color: 'var(--txt-3)',
          gap: 6,
        }}
      >
        {collapsed ? (
          <ChevronsRight className="h-4 w-4" />
        ) : (
          <>
            <ChevronsLeft className="h-4 w-4" />
            <span>Свернуть</span>
          </>
        )}
      </button>
    </aside>
  )
}

'use client'

import { useSearchParams, useRouter } from 'next/navigation'
import { Newspaper, Users, Medal } from 'lucide-react'
import { FeedContent } from '../feed/_content'
import { FriendsContent } from '../friends/_content'
import { LeaderboardContent } from '../leaderboard/_content'
import { useFriends } from '@/hooks/use-social'

type SocialTab = 'feed' | 'friends' | 'leaderboard'

const TABS: { key: SocialTab; label: string; icon: typeof Newspaper }[] = [
  { key: 'feed', label: 'Лента', icon: Newspaper },
  { key: 'friends', label: 'Друзья', icon: Users },
  { key: 'leaderboard', label: 'Топ', icon: Medal },
]

export default function SocialPage() {
  const router = useRouter()
  const sp = useSearchParams()
  const raw = sp.get('tab')
  const tab: SocialTab =
    raw === 'friends' || raw === 'leaderboard' || raw === 'feed' ? (raw as SocialTab) : 'feed'

  const { data: pendingFriends } = useFriends('pending')
  const incomingCount = (pendingFriends ?? []).filter((f) => f.direction === 'incoming').length

  function setTab(next: SocialTab) {
    const params = new URLSearchParams(sp.toString())
    if (next === 'feed') params.delete('tab')
    else params.set('tab', next)
    const qs = params.toString()
    router.replace(qs ? `/social?${qs}` : '/social', { scroll: false })
  }

  return (
    <div className="space-y-4 fz-rise">
      {/* Top tabs */}
      <div className="flex gap-2 overflow-x-auto no-scrollbar -mx-1 px-1">
        {TABS.map(({ key, label, icon: Icon }) => {
          const active = tab === key
          const badge = key === 'friends' && incomingCount > 0 ? incomingCount : null
          return (
            <button
              key={key}
              onClick={() => setTab(key)}
              className="shrink-0 inline-flex items-center gap-1.5 transition-all relative"
              style={{
                padding: '8px 16px',
                borderRadius: 'var(--r-pill)',
                fontSize: 13,
                fontWeight: 700,
                cursor: 'pointer',
                background: active
                  ? 'color-mix(in oklab, var(--c-accent) 22%, transparent)'
                  : 'var(--gl-bg)',
                border: active
                  ? '1px solid color-mix(in oklab, var(--c-accent) 50%, transparent)'
                  : '1px solid var(--gl-border)',
                color: active ? 'var(--c-accent)' : 'var(--txt-2)',
              }}
            >
              <Icon className="h-3.5 w-3.5" strokeWidth={2.2} />
              {label}
              {badge != null && (
                <span
                  className="tnum"
                  style={{
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
                  {badge}
                </span>
              )}
            </button>
          )
        })}
      </div>

      {tab === 'feed' && <FeedContent />}
      {tab === 'friends' && <FriendsContent />}
      {tab === 'leaderboard' && <LeaderboardContent />}
    </div>
  )
}

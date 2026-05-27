'use client'

import { useSearchParams, useRouter } from 'next/navigation'
import { Trophy, Target } from 'lucide-react'
import { AchievementsContent } from './_content'
import { QuestsContent } from '../quests/_content'

type GoalsTab = 'achievements' | 'quests'

const TABS: { key: GoalsTab; label: string; icon: typeof Trophy }[] = [
  { key: 'quests', label: 'Квесты', icon: Target },
  { key: 'achievements', label: 'Достижения', icon: Trophy },
]

export default function AchievementsPage() {
  const router = useRouter()
  const sp = useSearchParams()
  const raw = sp.get('tab')
  const tab: GoalsTab = raw === 'achievements' ? 'achievements' : 'quests'

  function setTab(next: GoalsTab) {
    const params = new URLSearchParams(sp.toString())
    if (next === 'quests') params.delete('tab')
    else params.set('tab', next)
    const qs = params.toString()
    router.replace(qs ? `/achievements?${qs}` : '/achievements', { scroll: false })
  }

  return (
    <div className="space-y-4 fz-rise">
      <div className="flex gap-2 overflow-x-auto no-scrollbar -mx-1 px-1">
        {TABS.map(({ key, label, icon: Icon }) => {
          const active = tab === key
          return (
            <button
              key={key}
              onClick={() => setTab(key)}
              className="shrink-0 inline-flex items-center gap-1.5 transition-all"
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
            </button>
          )
        })}
      </div>

      {tab === 'achievements' && <AchievementsContent />}
      {tab === 'quests' && <QuestsContent />}
    </div>
  )
}

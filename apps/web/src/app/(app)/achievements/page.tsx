'use client'

import { useMemo, useState } from 'react'
import { format } from 'date-fns'
import { ru } from 'date-fns/locale'
import { Trophy, Lock } from 'lucide-react'
import {
  useAchievements,
  type AchievementCategory,
  type AchievementWithProgress,
} from '@/hooks/use-gamification'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'

type FilterTab = 'all' | 'unlocked' | 'locked'

const CATEGORY_LABELS: Record<AchievementCategory, string> = {
  milestone: 'Этапы',
  streak: 'Серии',
  pr: 'Рекорды',
  volume: 'Объём',
  time: 'Время',
  comeback: 'Возвращение',
}

const CATEGORY_ORDER: AchievementCategory[] = [
  'milestone',
  'streak',
  'pr',
  'volume',
  'time',
  'comeback',
]

function formatRu(date: string): string {
  return format(new Date(date), 'd MMMM yyyy', { locale: ru })
}

export default function AchievementsPage() {
  const { data, isLoading, error } = useAchievements()
  const [filter, setFilter] = useState<FilterTab>('all')

  const all = data ?? []

  const stats = useMemo(() => {
    const total = all.length
    const unlocked = all.filter((a) => a.unlocked).length
    const points = all
      .filter((a) => a.unlocked)
      .reduce((sum, a) => sum + a.points, 0)
    return { total, unlocked, points }
  }, [all])

  const filtered = useMemo(() => {
    if (filter === 'unlocked') return all.filter((a) => a.unlocked)
    if (filter === 'locked') return all.filter((a) => !a.unlocked)
    return all
  }, [all, filter])

  const groups = useMemo(() => {
    const map = new Map<AchievementCategory, AchievementWithProgress[]>()
    for (const a of filtered) {
      const list = map.get(a.category) ?? []
      list.push(a)
      map.set(a.category, list)
    }
    return CATEGORY_ORDER
      .filter((c) => map.has(c))
      .map((c) => ({ category: c, items: map.get(c)! }))
  }, [filtered])

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Trophy className="h-6 w-6 text-yellow-500" />
          Ачивки
        </h1>
        {!isLoading && !error && (
          <p className="text-sm text-muted-foreground mt-1">
            {stats.unlocked} из {stats.total} ачивок · {stats.points} очков
          </p>
        )}
      </div>

      <div className="flex gap-2">
        <Button
          size="sm"
          variant={filter === 'all' ? 'default' : 'outline'}
          onClick={() => setFilter('all')}
        >
          Все
        </Button>
        <Button
          size="sm"
          variant={filter === 'unlocked' ? 'default' : 'outline'}
          onClick={() => setFilter('unlocked')}
        >
          Получены
        </Button>
        <Button
          size="sm"
          variant={filter === 'locked' ? 'default' : 'outline'}
          onClick={() => setFilter('locked')}
        >
          Закрыты
        </Button>
      </div>

      {isLoading && (
        <Card>
          <CardContent className="py-6 text-center text-muted-foreground text-sm">
            Загрузка ачивок…
          </CardContent>
        </Card>
      )}

      {error && (
        <Card>
          <CardContent className="py-6 text-center text-sm text-red-500">
            Не удалось загрузить ачивки
          </CardContent>
        </Card>
      )}

      {!isLoading && !error && groups.length === 0 && (
        <Card>
          <CardContent className="py-6 text-center text-muted-foreground text-sm">
            Здесь пока пусто
          </CardContent>
        </Card>
      )}

      {groups.map((group) => (
        <div key={group.category}>
          <h2 className="font-semibold mb-3">{CATEGORY_LABELS[group.category]}</h2>
          <div className="flex flex-col gap-2">
            {group.items.map((a) => (
              <AchievementCard key={a.id} achievement={a} />
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}

function AchievementCard({ achievement: a }: { achievement: AchievementWithProgress }) {
  const showProgress =
    !a.unlocked &&
    a.progressCurrent != null &&
    a.progressTarget != null &&
    a.progressTarget > 0

  const pct = showProgress
    ? Math.min(100, Math.round(((a.progressCurrent ?? 0) / (a.progressTarget ?? 1)) * 100))
    : 0

  return (
    <Card className={a.unlocked ? '' : 'opacity-60'}>
      <CardContent className="flex items-start gap-3 py-3 px-4">
        <div className="text-3xl shrink-0 leading-none mt-0.5 relative">
          <span>{a.emoji}</span>
          {!a.unlocked && (
            <Lock className="h-3 w-3 text-muted-foreground absolute -bottom-1 -right-1" />
          )}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="font-semibold text-sm truncate">{a.title}</p>
              <p className="text-xs text-muted-foreground">{a.description}</p>
            </div>
            <span className="text-xs font-semibold text-yellow-500 shrink-0">
              +{a.points}
            </span>
          </div>

          {a.unlocked && (
            <div className="mt-2 flex items-center gap-2 flex-wrap">
              <span className="inline-flex items-center text-[11px] font-medium px-2 py-0.5 rounded-full bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-400">
                Получено
              </span>
              {a.unlockedAt && (
                <span className="text-[11px] text-muted-foreground">
                  {formatRu(a.unlockedAt)}
                </span>
              )}
            </div>
          )}

          {showProgress && (
            <div className="mt-2">
              <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
                <div
                  className="h-full bg-primary transition-all"
                  style={{ width: `${pct}%` }}
                />
              </div>
              <p className="text-[11px] text-muted-foreground mt-1">
                {a.progressCurrent} / {a.progressTarget}
              </p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

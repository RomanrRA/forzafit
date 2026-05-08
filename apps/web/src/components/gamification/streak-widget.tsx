'use client'

import Link from 'next/link'
import { Flame, Trophy, Medal } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { useGamificationOverview } from '@/hooks/use-gamification'

export function StreakWidget() {
  const { data, isLoading } = useGamificationOverview()

  if (isLoading || !data) return null

  const { streak, achievementsUnlocked, achievementsTotal, prCount, recentAchievements, points } = data

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <h2 className="font-semibold flex items-center gap-2">
          <Flame className="h-4 w-4 text-orange-500" />
          Достижения
        </h2>
        <Link
          href="/achievements"
          className="text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          Все →
        </Link>
      </div>

      <div className="grid grid-cols-3 gap-2 mb-2">
        <Card>
          <CardContent className="py-3 px-3 text-center">
            <div className="flex items-center justify-center gap-1 text-xl font-bold text-orange-500">
              <Flame className="h-4 w-4" />
              {streak.current}
            </div>
            <div className="text-[10px] text-muted-foreground mt-0.5">
              серия дней
            </div>
            {streak.longest > streak.current && (
              <div className="text-[10px] text-muted-foreground/70">
                рекорд: {streak.longest}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardContent className="py-3 px-3 text-center">
            <div className="flex items-center justify-center gap-1 text-xl font-bold text-yellow-500">
              <Trophy className="h-4 w-4" />
              {achievementsUnlocked}
            </div>
            <div className="text-[10px] text-muted-foreground mt-0.5">
              из {achievementsTotal} ачивок
            </div>
            <div className="text-[10px] text-muted-foreground/70">
              {points} очк.
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="py-3 px-3 text-center">
            <div className="flex items-center justify-center gap-1 text-xl font-bold text-blue-500">
              <Medal className="h-4 w-4" />
              {prCount}
            </div>
            <div className="text-[10px] text-muted-foreground mt-0.5">
              рекордов
            </div>
            <div className="text-[10px] text-muted-foreground/70">
              &nbsp;
            </div>
          </CardContent>
        </Card>
      </div>

      {recentAchievements.length > 0 && (
        <div className="flex gap-2 overflow-x-auto pb-1">
          {recentAchievements.map((a) => (
            <div
              key={a.id}
              className="shrink-0 flex items-center gap-2 rounded-full bg-muted px-3 py-1.5 text-xs"
              title={a.description}
            >
              <span className="text-base">{a.emoji}</span>
              <span className="font-medium">{a.title}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

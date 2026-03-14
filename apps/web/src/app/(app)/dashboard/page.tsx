'use client'

import { useState } from 'react'
import Link from 'next/link'
import { format, subDays, isAfter } from 'date-fns'
import { ru } from 'date-fns/locale'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts'
import { useAuthStore } from '@/store/auth.store'
import { useWorkouts, useMuscleStats } from '@/hooks/use-workouts'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Plus, BookOpen, Calendar, Dumbbell, Activity } from 'lucide-react'

const PERIOD_LABELS = {
  '7days': '7 дней',
  'month': 'Месяц',
  'all': 'Всё время',
} as const

type Period = keyof typeof PERIOD_LABELS

export default function DashboardPage() {
  const user = useAuthStore((s) => s.user)
  const [musclePeriod, setMusclePeriod] = useState<Period>('7days')
  const { data, isLoading } = useWorkouts({ limit: 5, status: 'planned', order: 'asc' })
  const { data: muscleStats } = useMuscleStats(musclePeriod)

  const workouts = data?.items ?? []
  const weekAgo = subDays(new Date(), 7)
  const thisWeekCount = workouts.filter((w) => isAfter(new Date(w.startedAt), weekAgo)).length
  const lastWorkout = workouts[0]

  const muscleChartData = (muscleStats ?? []).slice(0, 8).map((m) => ({
    muscle: m.muscle.length > 10 ? m.muscle.slice(0, 10) + '…' : m.muscle,
    count: m.sessionCount,
  }))

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">
          Привет, {user?.name ?? 'Атлет'}!
        </h1>
        <p className="text-muted-foreground">Ваш тренировочный дашборд</p>
      </div>

      <div className="grid gap-4 grid-cols-2 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Тренировок за неделю</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{isLoading ? '...' : thisWeekCount}</div>
            <p className="text-xs text-muted-foreground">за последние 7 дней</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Всего тренировок</CardTitle>
            <Dumbbell className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{isLoading ? '...' : (data?.total ?? 0)}</div>
            <p className="text-xs text-muted-foreground">за всё время</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Следующая тренировка</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-lg font-bold truncate">
              {isLoading ? '...' : lastWorkout
                ? format(new Date(lastWorkout.startedAt), 'd MMM', { locale: ru })
                : 'Нет'}
            </div>
            <p className="text-xs text-muted-foreground truncate">
              {lastWorkout?.title ?? '—'}
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="flex gap-3">
        <Button asChild>
          <Link href="/workouts/new">
            <Plus className="h-4 w-4 mr-2" />
            Начать тренировку
          </Link>
        </Button>
        <Button variant="outline" asChild>
          <Link href="/exercises">
            <BookOpen className="h-4 w-4 mr-2" />
            База упражнений
          </Link>
        </Button>
      </div>

      {/* Muscle stats */}
      {muscleChartData.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Activity className="h-4 w-4" />
                Мышцы — {PERIOD_LABELS[musclePeriod].toLowerCase()}
              </CardTitle>
              <div className="flex gap-1">
                {(Object.keys(PERIOD_LABELS) as Period[]).map((p) => (
                  <Button
                    key={p}
                    size="sm"
                    variant={musclePeriod === p ? 'default' : 'ghost'}
                    className="h-7 text-xs px-2"
                    onClick={() => setMusclePeriod(p)}
                  >
                    {PERIOD_LABELS[p]}
                  </Button>
                ))}
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={160}>
              <BarChart data={muscleChartData} layout="vertical" margin={{ left: 0, right: 16 }}>
                <XAxis type="number" tick={{ fontSize: 11 }} allowDecimals={false} />
                <YAxis type="category" dataKey="muscle" tick={{ fontSize: 11 }} width={90} />
                <Tooltip formatter={(v) => [`${v} тр.`, 'Тренировок']} />
                <Bar dataKey="count" radius={[0, 4, 4, 0]}>
                  {muscleChartData.map((_, i) => (
                    <Cell key={i} fill={`hsl(var(--primary) / ${1 - i * 0.08})`} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {workouts.length > 0 && (
        <div>
          <h2 className="text-xl font-semibold mb-3">Ближайшие тренировки</h2>
          <div className="flex flex-col gap-3">
            {workouts.map((w) => (
              <Link key={w.id} href={`/workouts/${w.id}`}>
                <Card className="hover:border-primary transition-colors cursor-pointer">
                  <CardContent className="flex items-center justify-between p-4">
                    <div>
                      <p className="font-medium">{w.title}</p>
                      <p className="text-sm text-muted-foreground">
                        {format(new Date(w.startedAt), 'd MMMM yyyy', { locale: ru })}
                      </p>
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {w.exerciseCount ?? w.exercises?.length ?? 0} упр.
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
          <div className="mt-3">
            <Button variant="ghost" asChild>
              <Link href="/workouts">Все тренировки →</Link>
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}

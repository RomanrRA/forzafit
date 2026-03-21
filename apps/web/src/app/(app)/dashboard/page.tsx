'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { format } from 'date-fns'
import { ru } from 'date-fns/locale'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { useAuthStore } from '@/store/auth.store'
import { useWorkouts } from '@/hooks/use-workouts'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Scale, Plus, TrendingUp, Dumbbell } from 'lucide-react'
import { loadEncryptedJson } from '@/lib/crypto'

interface BodyEntry {
  id: string
  date: string
  weightKg: number | null
  bodyFatPct: number | null
  chestCm: number | null
  waistCm: number | null
  hipsCm: number | null
  armCm: number | null
  custom: { fieldId: string; name: string; value: number; unit: string }[]
}

const STORAGE_KEY = 'fitlog_body_measurements'

export default function DashboardPage() {
  const userId = useAuthStore((s) => s.user?.id ?? 'anon')
  const user = useAuthStore((s) => s.user)
  const [entries, setEntries] = useState<BodyEntry[]>([])

  const { data: workoutsData } = useWorkouts({ limit: 3, order: 'desc', status: 'completed' })
  const recentWorkouts = workoutsData?.items ?? []

  useEffect(() => {
    loadEncryptedJson<BodyEntry>(STORAGE_KEY, userId).then((data) =>
      setEntries(data.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()))
    )
  }, [userId])

  const latest = entries[entries.length - 1]

  const weightData = entries
    .filter((e) => e.weightKg)
    .map((e) => ({ date: format(new Date(e.date), 'd MMM', { locale: ru }), weight: e.weightKg }))

  const weightDelta = weightData.length >= 2
    ? (weightData[weightData.length - 1].weight as number) - (weightData[weightData.length - 2].weight as number)
    : null

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Привет, {user?.name ?? 'Атлет'}!</h1>
      </div>

      {/* ── Замеры тела ─────────────────────────────────── */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-semibold flex items-center gap-2">
            <Scale className="h-4 w-4 text-primary" />
            Замеры тела
          </h2>
          <Button asChild size="sm" variant="outline">
            <Link href="/body">
              <Plus className="h-3.5 w-3.5 mr-1" />
              Добавить
            </Link>
          </Button>
        </div>

        {latest ? (
          <>
            <p className="text-xs text-muted-foreground mb-2">
              Последний замер — {format(new Date(latest.date), 'd MMMM yyyy', { locale: ru })}
            </p>
            <div className="grid grid-cols-2 gap-3">
              {latest.weightKg && (
                <Card>
                  <CardContent className="pt-4 pb-3">
                    <div className="text-xs text-muted-foreground mb-1">Вес</div>
                    <div className="text-2xl font-bold">
                      {latest.weightKg}
                      <span className="text-sm font-normal text-muted-foreground ml-1">кг</span>
                    </div>
                    {weightDelta !== null && (
                      <p className={`text-xs mt-1 ${weightDelta < 0 ? 'text-green-500' : weightDelta > 0 ? 'text-orange-500' : 'text-muted-foreground'}`}>
                        {weightDelta > 0 ? '+' : ''}{weightDelta.toFixed(1)} кг
                      </p>
                    )}
                  </CardContent>
                </Card>
              )}
              {latest.bodyFatPct && (
                <Card>
                  <CardContent className="pt-4 pb-3">
                    <div className="text-xs text-muted-foreground mb-1">% жира</div>
                    <div className="text-2xl font-bold">
                      {latest.bodyFatPct}
                      <span className="text-sm font-normal text-muted-foreground ml-1">%</span>
                    </div>
                  </CardContent>
                </Card>
              )}
              {latest.waistCm && (
                <Card>
                  <CardContent className="pt-4 pb-3">
                    <div className="text-xs text-muted-foreground mb-1">Талия</div>
                    <div className="text-2xl font-bold">
                      {latest.waistCm}
                      <span className="text-sm font-normal text-muted-foreground ml-1">см</span>
                    </div>
                  </CardContent>
                </Card>
              )}
              {latest.chestCm && (
                <Card>
                  <CardContent className="pt-4 pb-3">
                    <div className="text-xs text-muted-foreground mb-1">Грудь</div>
                    <div className="text-2xl font-bold">
                      {latest.chestCm}
                      <span className="text-sm font-normal text-muted-foreground ml-1">см</span>
                    </div>
                  </CardContent>
                </Card>
              )}
              {latest.hipsCm && (
                <Card>
                  <CardContent className="pt-4 pb-3">
                    <div className="text-xs text-muted-foreground mb-1">Бёдра</div>
                    <div className="text-2xl font-bold">
                      {latest.hipsCm}
                      <span className="text-sm font-normal text-muted-foreground ml-1">см</span>
                    </div>
                  </CardContent>
                </Card>
              )}
              {latest.armCm && (
                <Card>
                  <CardContent className="pt-4 pb-3">
                    <div className="text-xs text-muted-foreground mb-1">Рука</div>
                    <div className="text-2xl font-bold">
                      {latest.armCm}
                      <span className="text-sm font-normal text-muted-foreground ml-1">см</span>
                    </div>
                  </CardContent>
                </Card>
              )}
              {latest.custom?.map((c) => (
                <Card key={c.fieldId}>
                  <CardContent className="pt-4 pb-3">
                    <div className="text-xs text-muted-foreground mb-1">{c.name}</div>
                    <div className="text-2xl font-bold">
                      {c.value}
                      <span className="text-sm font-normal text-muted-foreground ml-1">{c.unit}</span>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {weightData.length > 1 && (
              <Card className="mt-3">
                <CardHeader className="pb-2 pt-4">
                  <CardTitle className="text-sm font-medium flex items-center gap-2">
                    <TrendingUp className="h-4 w-4" />
                    Динамика веса
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={180}>
                    <LineChart data={weightData}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                      <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                      <YAxis tick={{ fontSize: 11 }} domain={['auto', 'auto']} />
                      <Tooltip formatter={(value) => [`${value} кг`, 'Вес']} />
                      <Line
                        type="monotone"
                        dataKey="weight"
                        stroke="hsl(var(--primary))"
                        strokeWidth={2}
                        dot={{ r: 4, fill: 'hsl(var(--primary))' }}
                        activeDot={{ r: 6 }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            )}

            <Button variant="ghost" size="sm" className="mt-1 text-muted-foreground" asChild>
              <Link href="/body">Все замеры →</Link>
            </Button>
          </>
        ) : (
          <Card>
            <CardContent className="py-8 text-center text-muted-foreground">
              <Scale className="h-10 w-10 mx-auto mb-3 opacity-20" />
              <p className="text-sm mb-3">Замеров пока нет</p>
              <Button size="sm" asChild>
                <Link href="/body">
                  <Plus className="h-4 w-4 mr-1" />
                  Добавить первый замер
                </Link>
              </Button>
            </CardContent>
          </Card>
        )}
      </div>

      {/* ── Тренировки ─────────────────────────────────── */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-semibold flex items-center gap-2">
            <Dumbbell className="h-4 w-4 text-primary" />
            Тренировки
          </h2>
          <Button asChild size="sm" variant="outline">
            <Link href="/workouts/new">
              <Plus className="h-3.5 w-3.5 mr-1" />
              Начать
            </Link>
          </Button>
        </div>

        {recentWorkouts.length > 0 ? (
          <>
            <div className="flex flex-col gap-2">
              {recentWorkouts.map((w) => (
                <Link key={w.id} href={`/workouts/${w.id}`}>
                  <Card className="hover:border-primary transition-colors cursor-pointer">
                    <CardContent className="flex items-center justify-between py-3 px-4">
                      <div className="min-w-0">
                        <p className="font-medium text-sm truncate">{w.title}</p>
                        <p className="text-xs text-muted-foreground">
                          {format(new Date(w.startedAt), 'd MMMM', { locale: ru })}
                        </p>
                      </div>
                      <span className="text-xs text-muted-foreground shrink-0 ml-2">
                        {w.exerciseCount ?? 0} упр.
                      </span>
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
            <Button variant="ghost" size="sm" className="mt-1 text-muted-foreground" asChild>
              <Link href="/workouts">Все тренировки →</Link>
            </Button>
          </>
        ) : (
          <Card>
            <CardContent className="py-8 text-center text-muted-foreground">
              <Dumbbell className="h-10 w-10 mx-auto mb-3 opacity-20" />
              <p className="text-sm">Тренировок пока нет</p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}

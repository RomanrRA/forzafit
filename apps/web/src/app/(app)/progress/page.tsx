'use client'

import { useState } from 'react'
import { format } from 'date-fns'
import { ru } from 'date-fns/locale'
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts'
import { useExercises } from '@/hooks/use-exercises'
import { useProgress, usePersonalRecords } from '@/hooks/use-workouts'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { TrendingUp, Trophy, Search } from 'lucide-react'
import { Input } from '@/components/ui/input'

export default function ProgressPage() {
  const [search, setSearch] = useState('')
  const [selectedId, setSelectedId] = useState<string | null>(null)

  const { data: exercisesData } = useExercises({ search: search || undefined })
  const exercises = exercisesData?.items ?? []
  const selectedExercise = exercises.find((e) => e.id === selectedId)

  const { data: progressData, isLoading: progressLoading } = useProgress(selectedId)
  const { data: records } = usePersonalRecords()

  const chartData = (progressData ?? []).map((p) => ({
    date: format(new Date(p.date), 'd MMM', { locale: ru }),
    weight: p.maxWeightKg,
    volume: Math.round(p.totalVolume),
  }))

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Прогресс</h1>
        <p className="text-muted-foreground">Графики роста силы и личные рекорды</p>
      </div>

      {/* Exercise selector */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <TrendingUp className="h-4 w-4" />
            График прогресса
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="relative">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Поиск упражнения..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>

          {search && exercises.length > 0 && (
            <div className="border rounded-md max-h-40 overflow-y-auto">
              {exercises.map((e) => (
                <button
                  key={e.id}
                  onClick={() => { setSelectedId(e.id); setSearch('') }}
                  className="w-full text-left px-3 py-2 text-sm hover:bg-accent transition-colors border-b last:border-0"
                >
                  <span className="font-medium">{e.name}</span>
                  {e.muscleGroups[0] && (
                    <span className="ml-2 text-xs text-muted-foreground">{e.muscleGroups[0]}</span>
                  )}
                </button>
              ))}
            </div>
          )}

          {selectedExercise && (
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium">{selectedExercise.name}</span>
              <button
                onClick={() => setSelectedId(null)}
                className="text-xs text-muted-foreground hover:text-foreground"
              >
                ✕
              </button>
            </div>
          )}

          {selectedId && !progressLoading && chartData.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-4">
              Нет завершённых подходов для этого упражнения
            </p>
          )}

          {chartData.length > 0 && (
            <div className="space-y-4">
              <div>
                <p className="text-xs text-muted-foreground mb-2">Максимальный вес, кг</p>
                <ResponsiveContainer width="100%" height={200}>
                  <LineChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                    <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} />
                    <Tooltip
                      formatter={(value) => [`${value} кг`, 'Макс. вес']}
                    />
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
              </div>

              <div>
                <p className="text-xs text-muted-foreground mb-2">Объём тренировки (кг × повт.)</p>
                <ResponsiveContainer width="100%" height={160}>
                  <LineChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                    <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} />
                    <Tooltip
                      formatter={(value) => [`${value} кг×повт.`, 'Объём']}
                    />
                    <Line
                      type="monotone"
                      dataKey="volume"
                      stroke="hsl(var(--chart-2, 220 70% 50%))"
                      strokeWidth={2}
                      dot={{ r: 3 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {!selectedId && (
            <p className="text-sm text-muted-foreground text-center py-6">
              Выберите упражнение для просмотра графика прогресса
            </p>
          )}
        </CardContent>
      </Card>

      {/* Personal Records */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Trophy className="h-4 w-4" />
            Личные рекорды
          </CardTitle>
        </CardHeader>
        <CardContent>
          {!records || records.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">
              Нет данных. Завершите несколько подходов, чтобы увидеть рекорды.
            </p>
          ) : (
            <div className="space-y-2">
              <div className="grid grid-cols-3 text-xs text-muted-foreground font-medium pb-1 border-b">
                <span className="col-span-1">Упражнение</span>
                <span className="text-center">Макс. вес</span>
                <span className="text-center">Тренировок</span>
              </div>
              {records.map((r, i) => (
                <div key={r.exerciseId} className="grid grid-cols-3 text-sm py-1.5 border-b last:border-0 items-center">
                  <div className="col-span-1 flex items-center gap-2">
                    {i < 3 && (
                      <span className="text-base">{['🥇', '🥈', '🥉'][i]}</span>
                    )}
                    <span className="font-medium truncate">{r.exerciseName}</span>
                  </div>
                  <div className="text-center">
                    {r.maxWeightKg ? (
                      <span className="font-bold text-primary">{r.maxWeightKg} кг</span>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                    {r.repsAtMax && (
                      <span className="text-xs text-muted-foreground ml-1">× {r.repsAtMax}</span>
                    )}
                    {r.achievedAt && (
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {format(new Date(r.achievedAt), 'd MMM yyyy', { locale: ru })}
                      </p>
                    )}
                  </div>
                  <div className="text-center">
                    <Badge variant="secondary" className="text-xs">
                      {r.sessionCount}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

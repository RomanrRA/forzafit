'use client'

import { useState, useMemo } from 'react'
import { format } from 'date-fns'
import { ru } from 'date-fns/locale'
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts'
import { useExercises } from '@/hooks/use-exercises'
import { useProgress, usePersonalRecords } from '@/hooks/use-workouts'
import { muscleRu } from '@/lib/exercise-labels'
import { Search } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { PeriodTabs, type ProgressPeriod } from '@/components/progress/period-tabs'
import { MuscleGroupFilter } from '@/components/progress/muscle-group-filter'
import { LiftCard } from '@/components/progress/lift-card'

export default function ProgressPage() {
  const [period, setPeriod] = useState<ProgressPeriod>('month')
  const [muscleGroups, setMuscleGroups] = useState<string[]>([])
  const [search, setSearch] = useState('')
  const [selectedId, setSelectedId] = useState<string | null>(null)

  // Все упражнения — нужны muscleGroups для join с PR
  const { data: exercisesData } = useExercises()
  const allExercises = exercisesData?.items ?? []
  const exerciseById = useMemo(() => {
    const map = new Map<string, typeof allExercises[number]>()
    for (const e of allExercises) map.set(e.id, e)
    return map
  }, [allExercises])

  // Поиск (для замены упражнения в детальном графике)
  const { data: searchData } = useExercises({ search: search || undefined })
  const searchExercises = searchData?.items ?? []

  const { data: progressData, isLoading: progressLoading } = useProgress(selectedId)
  const { data: records } = usePersonalRecords()

  const selectedExercise = exerciseById.get(selectedId ?? '') ?? searchExercises.find((e) => e.id === selectedId)

  // Все упражнения, которые юзер делал (PR существует) и история по ним есть
  const liftRecords = useMemo(() => {
    if (!records) return []
    return [...records]
      .filter((r) => r.maxWeightKg != null && r.sessionCount >= 1)
      .sort((a, b) => (b.maxWeightKg ?? 0) - (a.maxWeightKg ?? 0))
  }, [records])

  // Уникальные группы мышц из упражнений, которые юзер делал
  const availableMuscleGroups = useMemo(() => {
    const set = new Set<string>()
    for (const r of liftRecords) {
      const ex = exerciseById.get(r.exerciseId)
      for (const g of ex?.muscleGroups ?? []) set.add(g)
    }
    return [...set].sort((a, b) => a.localeCompare(b, 'ru'))
  }, [liftRecords, exerciseById])

  // Применяем фильтр мышечных групп (multi-select OR)
  const visibleLifts = useMemo(() => {
    if (muscleGroups.length === 0) return liftRecords
    return liftRecords.filter((r) => {
      const ex = exerciseById.get(r.exerciseId)
      if (!ex?.muscleGroups?.length) return false
      return ex.muscleGroups.some((g) => muscleGroups.includes(g))
    })
  }, [liftRecords, muscleGroups, exerciseById])

  const chartData = (progressData ?? []).map((p) => ({
    date: format(new Date(p.date), 'd MMM', { locale: ru }),
    weight: p.maxWeightKg,
    volume: Math.round(p.totalVolume),
  }))

  return (
    <div className="space-y-6 fz-rise">
      <div className="flex flex-wrap items-baseline gap-3">
        <h1
          style={{
            fontSize: 'clamp(24px, 4.4vw, 28px)',
            fontWeight: 800,
            letterSpacing: -0.4,
            color: 'var(--txt-1)',
            margin: 0,
          }}
        >
          Прогресс
        </h1>
        <div className="ml-auto">
          <PeriodTabs value={period} onChange={setPeriod} />
        </div>
      </div>

      {availableMuscleGroups.length > 0 && (
        <MuscleGroupFilter
          groups={availableMuscleGroups}
          selected={muscleGroups}
          onChange={setMuscleGroups}
        />
      )}

      {visibleLifts.length === 0 ? (
        <div className="glass-card p-6 text-center">
          <p className="text-sm txt-soft">
            {liftRecords.length === 0
              ? 'Нет завершённых тренировок с весом. Завершите хотя бы один подход, чтобы увидеть прогресс.'
              : 'Нет упражнений в выбранных группах мышц. Сбросьте фильтр или добавьте тренировку.'}
          </p>
        </div>
      ) : (
        <div className="grid gap-4 sm:gap-5 grid-cols-1 sm:grid-cols-2">
          {visibleLifts.map((l) => (
            <LiftCard
              key={l.exerciseId}
              exerciseId={l.exerciseId}
              name={l.exerciseName}
              period={period}
              isActive={l.exerciseId === selectedId}
              onClick={() => setSelectedId((cur) => (cur === l.exerciseId ? null : l.exerciseId))}
            />
          ))}
        </div>
      )}

      {/* ── Детальный график выбранного упражнения ─────── */}
      <div className="glass-card p-5 sm:p-6">
        <div className="flex items-center gap-2 mb-3">
          <h2
            style={{
              fontSize: 16,
              fontWeight: 800,
              letterSpacing: -0.2,
              color: 'var(--txt-1)',
              margin: 0,
            }}
          >
            Детальный график
          </h2>
          {selectedExercise && (
            <span className="ml-2 text-sm txt-muted">{selectedExercise.name}</span>
          )}
        </div>

        <div className="relative mb-3">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Поиск упражнения..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>

        {search && searchExercises.length > 0 && (
          <div
            className="rounded-md max-h-40 overflow-y-auto mb-3"
            style={{ border: '1px solid var(--gl-border)' }}
          >
            {searchExercises.map((e) => (
              <button
                key={e.id}
                onClick={() => { setSelectedId(e.id); setSearch('') }}
                className="w-full text-left px-3 py-2 text-sm hover:bg-accent transition-colors border-b last:border-0"
              >
                <span className="font-medium">{e.name}</span>
                {e.muscleGroups[0] && (
                  <span className="ml-2 text-xs text-muted-foreground">{muscleRu(e.muscleGroups[0])}</span>
                )}
              </button>
            ))}
          </div>
        )}

        {selectedId && !progressLoading && chartData.length === 0 && (
          <p className="text-sm txt-soft text-center py-4">
            Нет завершённых подходов для этого упражнения
          </p>
        )}

        {chartData.length > 0 && (
          <div className="space-y-4">
            <div>
              <p className="text-xs txt-soft mb-2">Максимальный вес, кг</p>
              <ResponsiveContainer width="100%" height={200}>
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--gl-border)" />
                  <XAxis dataKey="date" tick={{ fontSize: 11, fill: 'var(--txt-3)' }} />
                  <YAxis tick={{ fontSize: 11, fill: 'var(--txt-3)' }} />
                  <Tooltip formatter={(value) => [`${value} кг`, 'Макс. вес']} />
                  <Line
                    type="monotone"
                    dataKey="weight"
                    stroke="var(--c-accent)"
                    strokeWidth={2}
                    dot={{ r: 4, fill: 'var(--c-accent)' }}
                    activeDot={{ r: 6 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>

            <div>
              <p className="text-xs txt-soft mb-2">Объём тренировки (кг × повт.)</p>
              <ResponsiveContainer width="100%" height={160}>
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--gl-border)" />
                  <XAxis dataKey="date" tick={{ fontSize: 11, fill: 'var(--txt-3)' }} />
                  <YAxis tick={{ fontSize: 11, fill: 'var(--txt-3)' }} />
                  <Tooltip formatter={(value) => [`${value} кг×повт.`, 'Объём']} />
                  <Line
                    type="monotone"
                    dataKey="volume"
                    stroke="var(--c-blue)"
                    strokeWidth={2}
                    dot={{ r: 3 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {!selectedId && (
          <p className="text-sm txt-soft text-center py-6">
            Выберите упражнение выше или найдите через поиск, чтобы увидеть детальный график
          </p>
        )}
      </div>
    </div>
  )
}

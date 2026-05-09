'use client'

import { useState } from 'react'
import Link from 'next/link'
import { format, startOfDay } from 'date-fns'
import { ru } from 'date-fns/locale'
import { useWorkouts, useDeleteWorkout } from '@/hooks/use-workouts'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent } from '@/components/ui/card'
import { Plus, ChevronLeft, ChevronRight, Dumbbell, CheckCircle2, Clock, AlertTriangle, Trash2 } from 'lucide-react'

const PAGE_SIZE_OPTIONS = [10, 30, 50, 100]

type Tab = 'planned' | 'missed' | 'completed' | 'all'

const TAB_OPTIONS: { value: Tab; label: string; shortLabel: string }[] = [
  { value: 'planned', label: 'Запланированные', shortLabel: 'План' },
  { value: 'missed', label: 'Пропущенные', shortLabel: 'Пропущ.' },
  { value: 'completed', label: 'Выполненные', shortLabel: 'Готово' },
  { value: 'all', label: 'Все', shortLabel: 'Все' },
]

export default function WorkoutsPage() {
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const [tab, setTab] = useState<Tab>('planned')
  const [selected, setSelected] = useState<Set<string>>(new Set())

  const deleteMutation = useDeleteWorkout()

  const todayDate = format(new Date(), 'yyyy-MM-dd')
  const yesterdayDate = format(new Date(Date.now() - 86400000), 'yyyy-MM-dd')

  const queryParams = (() => {
    const base = { limit: pageSize, page, from: from || undefined, to: to || undefined, order: 'asc' as const }
    if (tab === 'planned') return { ...base, status: 'planned' as const, from: base.from || todayDate }
    if (tab === 'missed') return { ...base, status: 'planned' as const, to: base.to || yesterdayDate }
    if (tab === 'completed') return { ...base, status: 'completed' as const }
    return { ...base, status: 'all' as const }
  })()

  const { data, isLoading } = useWorkouts(queryParams)

  const workouts = data?.items ?? []
  const total = data?.total ?? 0
  const totalPages = Math.ceil(total / pageSize)
  const allSelected = workouts.length > 0 && workouts.every((w) => selected.has(w.id))

  function handleTabChange(t: Tab) {
    setTab(t)
    setPage(1)
    setFrom('')
    setTo('')
    setSelected(new Set())
  }

  function toggleSelect(id: string) {
    setSelected((prev) => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  function toggleSelectAll() {
    if (allSelected) {
      setSelected(new Set())
    } else {
      setSelected(new Set(workouts.map((w) => w.id)))
    }
  }

  async function deleteSelected() {
    if (!confirm(`Удалить ${selected.size} тренировок?`)) return
    for (const id of selected) {
      await deleteMutation.mutateAsync(id)
    }
    setSelected(new Set())
  }

  return (
    <div className="space-y-4 fz-rise">
      {/* Header */}
      <div className="flex items-center justify-between gap-3">
        <div>
          <div className="eyebrow">Зал</div>
          <h1
            className="mt-1"
            style={{
              fontSize: 'clamp(26px, 4.4vw, 32px)',
              fontWeight: 800,
              letterSpacing: -0.5,
              lineHeight: 1,
              color: 'var(--txt-1)',
            }}
          >
            Тренировки
          </h1>
        </div>
        <Button asChild size="sm" className="sm:size-default glass-btn-primary border-0">
          <Link href="/workouts/new">
            <Plus className="h-4 w-4 sm:mr-2" />
            <span className="hidden sm:inline">Новая</span>
          </Link>
        </Button>
      </div>

      {/* Status tabs */}
      <div
        className="grid grid-cols-4 gap-1 glass-card"
        style={{ padding: 4, borderRadius: 14 }}
      >
        {TAB_OPTIONS.map((opt) => {
          const active = tab === opt.value
          return (
            <button
              key={opt.value}
              onClick={() => handleTabChange(opt.value)}
              style={{
                padding: '8px 10px',
                borderRadius: 10,
                fontSize: 12,
                fontWeight: 700,
                background: active ? 'var(--gl-bg-strong)' : 'transparent',
                border: '1px solid ' + (active ? 'var(--gl-border-strong)' : 'transparent'),
                color: active ? 'var(--txt-1)' : 'var(--txt-2)',
                transition: 'background 0.15s, color 0.15s',
              }}
              className="text-center"
            >
              <span className="hidden sm:inline">{opt.label}</span>
              <span className="sm:hidden">{opt.shortLabel}</span>
            </button>
          )
        })}
      </div>

      {/* Date filters */}
      {(tab === 'completed' || tab === 'all') && (
        <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
          <div className="flex items-center gap-2">
            <label className="text-sm text-muted-foreground w-6 shrink-0">С</label>
            <Input
              type="date"
              className="flex-1 sm:w-40"
              value={from}
              onChange={(e) => { setFrom(e.target.value); setPage(1) }}
            />
          </div>
          <div className="flex items-center gap-2">
            <label className="text-sm text-muted-foreground w-6 shrink-0">По</label>
            <Input
              type="date"
              className="flex-1 sm:w-40"
              value={to}
              onChange={(e) => { setTo(e.target.value); setPage(1) }}
            />
          </div>
          {(from || to) && (
            <Button variant="ghost" size="sm" onClick={() => { setFrom(''); setTo(''); setPage(1) }}>
              Сбросить
            </Button>
          )}
        </div>
      )}

      {isLoading && <p className="text-muted-foreground">Загрузка...</p>}

      {!isLoading && workouts.length === 0 && (
        <div className="text-center py-16 text-muted-foreground">
          <Dumbbell className="h-12 w-12 mx-auto mb-3 opacity-30" />
          <p className="text-sm sm:text-base">
            {tab === 'planned'
              ? 'Нет запланированных тренировок'
              : tab === 'missed'
              ? 'Нет пропущенных. Так держать!'
              : tab === 'completed'
              ? 'Нет завершённых тренировок'
              : 'Нет тренировок. Начните первую!'}
          </p>
          <Button className="mt-4" size="sm" asChild>
            <Link href="/workouts/new">Создать тренировку</Link>
          </Button>
        </div>
      )}

      {/* Toolbar */}
      {workouts.length > 0 && (
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <div className="flex items-center gap-3">
            <label className="flex items-center gap-2 cursor-pointer select-none text-sm text-muted-foreground">
              <input
                type="checkbox"
                className="h-4 w-4 rounded border-border accent-primary cursor-pointer"
                checked={allSelected}
                onChange={toggleSelectAll}
              />
              {allSelected ? 'Снять' : 'Выбрать все'}
            </label>
            {selected.size > 0 && (
              <Button
                variant="destructive"
                size="sm"
                onClick={deleteSelected}
                disabled={deleteMutation.isPending}
              >
                <Trash2 className="h-3.5 w-3.5 mr-1" />
                Удалить ({selected.size})
              </Button>
            )}
          </div>
          <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
            <span className="text-xs">Показывать:</span>
            {PAGE_SIZE_OPTIONS.map((n) => (
              <button
                key={n}
                onClick={() => { setPageSize(n); setPage(1); setSelected(new Set()) }}
                className={`px-2 py-0.5 rounded text-xs font-medium transition-colors ${
                  pageSize === n
                    ? 'bg-primary text-primary-foreground'
                    : 'hover:bg-muted'
                }`}
              >
                {n}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Workout list */}
      <div className="space-y-2">
        {workouts.map((w) => {
          const isCompleted = !!w.finishedAt
          const isMissed = !w.finishedAt && startOfDay(new Date(w.startedAt)) < startOfDay(new Date())

          const cardClass = isCompleted
            ? 'border-green-300 dark:border-green-800 bg-green-50 dark:bg-green-950/30 hover:border-green-400'
            : isMissed
            ? 'border-red-300 dark:border-red-800 bg-red-50 dark:bg-red-950/30 hover:border-red-400'
            : 'hover:border-primary'

          const StatusIcon = isCompleted ? CheckCircle2 : isMissed ? AlertTriangle : Clock
          const iconClass = isCompleted
            ? 'text-green-600 dark:text-green-400'
            : isMissed
            ? 'text-red-500'
            : 'text-primary'

          const titleClass = isCompleted
            ? 'text-green-700 dark:text-green-400'
            : isMissed
            ? 'text-red-700 dark:text-red-400'
            : ''

          const dateClass = isCompleted
            ? 'text-green-600/70 dark:text-green-500/60'
            : isMissed
            ? 'text-red-500/70 dark:text-red-500/60'
            : 'text-muted-foreground'

          return (
            <div key={w.id} className="flex items-start gap-2 group">
              <input
                type="checkbox"
                className="h-4 w-4 rounded border-border accent-primary cursor-pointer shrink-0 mt-4"
                checked={selected.has(w.id)}
                onChange={() => toggleSelect(w.id)}
              />
              <Link href={`/workouts/${w.id}`} className="flex-1 min-w-0">
                <Card className={`transition-colors cursor-pointer ${cardClass}`}>
                  <CardContent className="p-3 sm:p-4">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        {/* Title row */}
                        <div className="flex items-center gap-1.5">
                          <StatusIcon className={`h-4 w-4 shrink-0 ${iconClass}`} />
                          <p className={`font-medium text-sm sm:text-base truncate ${titleClass}`}>
                            {w.title}
                          </p>
                        </div>
                        {/* Date + meta */}
                        <div className="flex items-center gap-2 mt-1 ml-[22px]">
                          <span className={`text-xs sm:text-sm ${dateClass}`}>
                            {format(new Date(w.startedAt), 'd MMM yyyy, EE', { locale: ru })}
                          </span>
                          <span className={`text-xs ${dateClass}`}>
                            · {w.exerciseCount ?? w.exercises?.length ?? 0} упр.
                          </span>
                        </div>
                      </div>
                      {/* Delete button */}
                      <button
                        className="p-1.5 rounded-md text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors opacity-0 group-hover:opacity-100 shrink-0 sm:mt-0.5"
                        onClick={(e) => {
                          e.preventDefault()
                          if (confirm(`Удалить «${w.title}»?`)) {
                            deleteMutation.mutate(w.id)
                          }
                        }}
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            </div>
          )
        })}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <Button
            variant="outline"
            size="icon"
            onClick={() => setPage((p) => p - 1)}
            disabled={page === 1}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="text-sm text-muted-foreground">
            {page} / {totalPages}
          </span>
          <Button
            variant="outline"
            size="icon"
            onClick={() => setPage((p) => p + 1)}
            disabled={page >= totalPages}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      )}
    </div>
  )
}

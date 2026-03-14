'use client'

import { useState } from 'react'
import Link from 'next/link'
import { format } from 'date-fns'
import { ru } from 'date-fns/locale'
import { useWorkouts, useDeleteWorkout } from '@/hooks/use-workouts'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Plus, ChevronLeft, ChevronRight, Dumbbell, CheckCircle2, Clock, Trash2 } from 'lucide-react'

const PAGE_SIZE_OPTIONS = [10, 30, 50, 100]

type Status = 'planned' | 'completed' | 'all'

const STATUS_OPTIONS: { value: Status; label: string }[] = [
  { value: 'planned', label: 'Запланированные' },
  { value: 'completed', label: 'Выполненные' },
  { value: 'all', label: 'Все' },
]

export default function WorkoutsPage() {
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const [status, setStatus] = useState<Status>('planned')
  const [selected, setSelected] = useState<Set<string>>(new Set())

  const deleteMutation = useDeleteWorkout()

  const { data, isLoading } = useWorkouts({
    limit: pageSize,
    page,
    from: from || undefined,
    to: to || undefined,
    status,
    order: 'asc',
  })

  const workouts = data?.items ?? []
  const total = data?.total ?? 0
  const totalPages = Math.ceil(total / pageSize)
  const allSelected = workouts.length > 0 && workouts.every((w) => selected.has(w.id))

  function handleStatusChange(s: Status) {
    setStatus(s)
    setPage(1)
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
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Тренировки</h1>
        <Button asChild>
          <Link href="/workouts/new">
            <Plus className="h-4 w-4 mr-2" />
            Новая тренировка
          </Link>
        </Button>
      </div>

      {/* Status tabs */}
      <div className="flex gap-1 p-1 bg-muted rounded-lg w-fit">
        {STATUS_OPTIONS.map((opt) => (
          <button
            key={opt.value}
            onClick={() => handleStatusChange(opt.value)}
            className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${
              status === opt.value
                ? 'bg-background text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>


      {/* Date filters */}
      <div className="flex gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          <label className="text-sm text-muted-foreground">С</label>
          <Input
            type="date"
            className="w-40"
            value={from}
            onChange={(e) => { setFrom(e.target.value); setPage(1) }}
          />
        </div>
        <div className="flex items-center gap-2">
          <label className="text-sm text-muted-foreground">По</label>
          <Input
            type="date"
            className="w-40"
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

      {isLoading && <p className="text-muted-foreground">Загрузка...</p>}

      {!isLoading && workouts.length === 0 && (
        <div className="text-center py-16 text-muted-foreground">
          <Dumbbell className="h-12 w-12 mx-auto mb-3 opacity-30" />
          <p>
            {status === 'planned'
              ? 'Нет запланированных тренировок. Откройте план и запланируйте занятия!'
              : status === 'completed'
              ? 'Нет завершённых тренировок.'
              : 'Нет тренировок. Начните первую!'}
          </p>
          <Button className="mt-4" asChild>
            <Link href="/workouts/new">Создать тренировку</Link>
          </Button>
        </div>
      )}

      {/* Toolbar: select-all + bulk delete + page size */}
      {workouts.length > 0 && (
        <div className="flex items-center justify-between gap-3 flex-wrap gap-y-2">
          <div className="flex items-center gap-3">
            <label className="flex items-center gap-2 cursor-pointer select-none text-sm text-muted-foreground">
              <input
                type="checkbox"
                className="h-4 w-4 rounded border-border accent-primary cursor-pointer"
                checked={allSelected}
                onChange={toggleSelectAll}
              />
              {allSelected ? 'Снять всё' : 'Выбрать все'}
            </label>
            {selected.size > 0 && (
              <Button
                variant="destructive"
                size="sm"
                onClick={deleteSelected}
                disabled={deleteMutation.isPending}
              >
                <Trash2 className="h-3.5 w-3.5 mr-1.5" />
                Удалить ({selected.size})
              </Button>
            )}
          </div>
          <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
            <span>Показывать:</span>
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

      <div className="space-y-2">
        {workouts.map((w) => (
          <div key={w.id} className="flex items-center gap-2 group">
            <input
              type="checkbox"
              className="h-4 w-4 rounded border-border accent-primary cursor-pointer shrink-0"
              checked={selected.has(w.id)}
              onChange={() => toggleSelect(w.id)}
            />
            <div className="relative flex-1">
              <Link href={`/workouts/${w.id}`}>
                <Card className={`hover:border-primary transition-colors cursor-pointer ${w.finishedAt ? 'bg-muted/50' : ''}`}>
                  <CardContent className="flex items-center justify-between p-4 pr-12">
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="font-medium">{w.title}</p>
                        {w.finishedAt ? (
                          <Badge variant="secondary" className="text-xs">
                            <CheckCircle2 className="h-3 w-3 mr-1" />
                            Выполнена
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="text-xs">
                            <Clock className="h-3 w-3 mr-1" />
                            Запланирована
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {format(new Date(w.startedAt), 'd MMMM yyyy, HH:mm', { locale: ru })}
                      </p>
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {w.exerciseCount ?? w.exercises?.length ?? 0} упр.
                    </div>
                  </CardContent>
                </Card>
              </Link>
              <button
                className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 rounded-md text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors opacity-0 group-hover:opacity-100"
                onClick={(e) => {
                  e.preventDefault()
                  if (confirm(`Удалить тренировку «${w.title}»?`)) {
                    deleteMutation.mutate(w.id)
                  }
                }}
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          </div>
        ))}
      </div>

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

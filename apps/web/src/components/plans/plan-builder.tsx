'use client'

import { useState, useRef, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { useExercises } from '@/hooks/use-exercises'
import { PlanTemplate, PlanDay, PlanExercise } from '@/hooks/use-plan-templates'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Search, X, Coffee, Dumbbell, Copy } from 'lucide-react'

// ─── Constants ────────────────────────────────────────────────────────────────

const WEEKDAYS = [
  { num: 1, short: 'Пн', full: 'Понедельник' },
  { num: 2, short: 'Вт', full: 'Вторник' },
  { num: 3, short: 'Ср', full: 'Среда' },
  { num: 4, short: 'Чт', full: 'Четверг' },
  { num: 5, short: 'Пт', full: 'Пятница' },
  { num: 6, short: 'Сб', full: 'Суббота' },
  { num: 7, short: 'Вс', full: 'Воскресенье' },
]

const DIFFICULTY_OPTIONS = [
  { value: '', label: 'Не указана' },
  { value: 'beginner', label: 'Начинающий' },
  { value: 'intermediate', label: 'Средний' },
  { value: 'advanced', label: 'Продвинутый' },
]

const TYPE_OPTIONS = [
  { value: '', label: 'Не указан' },
  { value: 'fullbody', label: 'Фул Боди' },
  { value: 'split', label: 'Сплит' },
  { value: 'cardio', label: 'Кардио' },
  { value: 'beginner', label: 'Для начинающих' },
]

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Строит массив из 7 дней: тренировочные берутся из existing, остальные = отдых */
function buildWeekDays(existing: PlanDay[]): PlanDay[] {
  return WEEKDAYS.map((wd) => {
    const found = existing.find((d) => d.dayNumber === wd.num)
    if (found) return found
    return { dayNumber: wd.num, name: wd.full, focus: '', isRest: true, exercises: [] }
  })
}

// ─── Exercise Search ───────────────────────────────────────────────────────────

function ExerciseSearch({ onSelect }: { onSelect: (ex: { id: string; name: string }) => void }) {
  const [search, setSearch] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)
  const [dropdownStyle, setDropdownStyle] = useState<React.CSSProperties>({})
  const { data } = useExercises({ search: search || undefined })
  const exercises = data?.items ?? []

  useEffect(() => {
    if (search && inputRef.current) {
      const rect = inputRef.current.getBoundingClientRect()
      setDropdownStyle({
        position: 'fixed',
        top: rect.bottom + 4,
        left: rect.left,
        width: rect.width,
        zIndex: 9999,
      })
    }
  }, [search, exercises])

  const dropdown = search && exercises.length > 0 && typeof document !== 'undefined'
    ? createPortal(
        <div
          style={dropdownStyle}
          className="bg-background border rounded-md shadow-lg max-h-48 overflow-y-auto"
        >
          {exercises.slice(0, 10).map((ex) => (
            <button
              key={ex.id}
              type="button"
              className="w-full text-left px-3 py-2 text-sm hover:bg-accent transition-colors"
              onClick={() => { onSelect({ id: ex.id, name: ex.name }); setSearch('') }}
            >
              {ex.name}
            </button>
          ))}
        </div>,
        document.body
      )
    : null

  return (
    <div className="relative">
      <Search className="absolute left-2 top-2.5 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
      <Input
        ref={inputRef}
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="Найти и добавить упражнение..."
        className="pl-7 h-8 text-sm"
      />
      {search && (
        <button
          type="button"
          onClick={() => setSearch('')}
          className="absolute right-2 top-2.5 text-muted-foreground hover:text-foreground"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      )}
      {dropdown}
    </div>
  )
}

// ─── Training Day Card ────────────────────────────────────────────────────────

interface DayCardProps {
  day: PlanDay
  onUpdate: (day: PlanDay) => void
  otherTrainingDays: PlanDay[]
  onCopyTo: (targetNum: number) => void
}

function TrainingDayCard({ day, onUpdate, otherTrainingDays, onCopyTo }: DayCardProps) {
  const [copyOpen, setCopyOpen] = useState(false)
  const weekday = WEEKDAYS.find((w) => w.num === day.dayNumber)!

  function addExercise(ex: { id: string; name: string }) {
    const newEx: PlanExercise = {
      exerciseId: ex.id,
      name: ex.name,
      sets: 3,
      reps: '8-12',
      rest: '60 сек',
      note: '',
      weightKg: undefined,
    }
    onUpdate({ ...day, exercises: [...day.exercises, newEx] })
  }

  function updateExercise(i: number, field: keyof PlanExercise, value: string | number | undefined) {
    const exercises = day.exercises.map((e, idx) =>
      idx === i ? { ...e, [field]: value === '' ? undefined : value } : e
    )
    onUpdate({ ...day, exercises })
  }

  function removeExercise(i: number) {
    onUpdate({ ...day, exercises: day.exercises.filter((_, idx) => idx !== i) })
  }

  return (
    <Card className="border-primary/30 overflow-visible">
      <CardHeader className="pb-2 pt-3 px-4">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 shrink-0">
            <Dumbbell className="h-4 w-4 text-primary" />
            <CardTitle className="text-sm font-semibold">{weekday.full}</CardTitle>
          </div>
          <Input
            value={day.focus ?? ''}
            onChange={(e) => onUpdate({ ...day, focus: e.target.value })}
            placeholder="Акцент дня (напр. Грудь, Ноги...)"
            className="h-7 text-sm flex-1"
          />
          {otherTrainingDays.length > 0 && (
            <div className="relative shrink-0">
              <button
                type="button"
                onClick={() => setCopyOpen((v) => !v)}
                title="Скопировать упражнения в другой день"
                className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground border rounded-md px-2 py-1 transition-colors"
              >
                <Copy className="h-3.5 w-3.5" />
                Копировать
              </button>
              {copyOpen && (
                <>
                  {/* backdrop */}
                  <div className="fixed inset-0 z-10" onClick={() => setCopyOpen(false)} />
                  <div className="absolute right-0 top-full mt-1 z-20 bg-background border rounded-md shadow-lg min-w-36 py-1">
                    <p className="px-3 py-1 text-xs text-muted-foreground font-medium">Скопировать в:</p>
                    {otherTrainingDays.map((target) => {
                      const wd = WEEKDAYS.find((w) => w.num === target.dayNumber)!
                      return (
                        <button
                          key={target.dayNumber}
                          type="button"
                          className="w-full text-left px-3 py-1.5 text-sm hover:bg-accent transition-colors"
                          onClick={() => { onCopyTo(target.dayNumber); setCopyOpen(false) }}
                        >
                          {wd.full}
                          {target.focus && (
                            <span className="text-xs text-muted-foreground ml-1">({target.focus})</span>
                          )}
                        </button>
                      )
                    })}
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      </CardHeader>

      <CardContent className="px-4 pb-4 pt-0 space-y-3 overflow-visible">
        {day.exercises.length > 0 && (
          <div className="space-y-2">
            <div className="grid grid-cols-12 gap-1.5">
              <span className="col-span-3 text-xs text-muted-foreground">Упражнение</span>
              <span className="col-span-2 text-xs text-muted-foreground text-center">Кг (старт)</span>
              <span className="col-span-1 text-xs text-muted-foreground text-center">Подх.</span>
              <span className="col-span-2 text-xs text-muted-foreground text-center">Повт.</span>
              <span className="col-span-2 text-xs text-muted-foreground text-center">Отдых</span>
              <span className="col-span-1 text-xs text-muted-foreground">Замет.</span>
            </div>
            {day.exercises.map((ex, i) => (
              <div key={i} className="grid grid-cols-12 gap-1.5 items-center">
                <div className="col-span-3">
                  <p className="text-xs font-medium truncate" title={ex.name}>{ex.name}</p>
                </div>
                <div className="col-span-2">
                  <Input
                    value={ex.weightKg ?? ''}
                    onChange={(e) => updateExercise(i, 'weightKg', e.target.value === '' ? '' : Number(e.target.value))}
                    type="number"
                    inputMode="decimal"
                    min={0}
                    step={0.5}
                    placeholder="кг"
                    className="h-7 text-xs text-center"
                  />
                </div>
                <div className="col-span-1">
                  <Input
                    value={ex.sets}
                    onChange={(e) => updateExercise(i, 'sets', Number(e.target.value))}
                    type="number"
                    inputMode="numeric"
                    min={1}
                    placeholder="—"
                    className="h-7 text-xs text-center"
                  />
                </div>
                <div className="col-span-2">
                  <Input
                    value={ex.reps}
                    onChange={(e) => updateExercise(i, 'reps', e.target.value)}
                    placeholder="—"
                    className="h-7 text-xs text-center"
                  />
                </div>
                <div className="col-span-2">
                  <Input
                    value={ex.rest}
                    onChange={(e) => updateExercise(i, 'rest', e.target.value)}
                    placeholder="—"
                    className="h-7 text-xs text-center"
                  />
                </div>
                <div className="col-span-1">
                  <Input
                    value={ex.note}
                    onChange={(e) => updateExercise(i, 'note', e.target.value)}
                    placeholder="—"
                    className="h-7 text-xs"
                  />
                </div>
                <div className="col-span-1 flex justify-end">
                  <button
                    type="button"
                    onClick={() => removeExercise(i)}
                    className="text-muted-foreground hover:text-destructive transition-colors"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        <ExerciseSearch onSelect={addExercise} />
      </CardContent>
    </Card>
  )
}

// ─── Plan Builder ─────────────────────────────────────────────────────────────

interface Props {
  initialData?: Partial<PlanTemplate>
  onSave: (data: Partial<PlanTemplate>) => void
  saving?: boolean
}

export function PlanBuilder({ initialData, onSave, saving }: Props) {
  const [name, setName] = useState(initialData?.name ?? '')
  const [description, setDescription] = useState(initialData?.description ?? '')
  const [goal, setGoal] = useState(initialData?.goal ?? '')
  const [difficulty, setDifficulty] = useState(initialData?.difficulty ?? '')
  const [type, setType] = useState(initialData?.type ?? '')
  const [duration, setDuration] = useState(initialData?.duration ?? '')

  // Всегда 7 дней (1=Пн..7=Вс), isRest=true для невыбранных
  const [days, setDays] = useState<PlanDay[]>(() =>
    buildWeekDays(initialData?.days ?? [])
  )

  const trainingDays = days.filter((d) => !d.isRest)
  const daysPerWeek = trainingDays.length

  function toggleWeekday(num: number) {
    setDays((prev) =>
      prev.map((d) => {
        if (d.dayNumber !== num) return d
        const willBeRest = !d.isRest
        return { ...d, isRest: willBeRest, exercises: willBeRest ? [] : d.exercises }
      })
    )
  }

  function updateDay(num: number, updated: PlanDay) {
    setDays((prev) => prev.map((d) => d.dayNumber === num ? updated : d))
  }

  function copyDayTo(sourceNum: number, targetNum: number) {
    setDays((prev) => {
      const source = prev.find((d) => d.dayNumber === sourceNum)
      if (!source) return prev
      return prev.map((d) =>
        d.dayNumber === targetNum
          ? { ...d, exercises: source.exercises.map((e) => ({ ...e })) }
          : d
      )
    })
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    onSave({
      name,
      description: description || undefined,
      goal: goal || undefined,
      difficulty: (difficulty || undefined) as any,
      type: type || undefined,
      daysPerWeek,
      duration: duration || undefined,
      days,
    })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Section 1: Основное */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Основная информация</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="name">Название <span className="text-destructive">*</span></Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Например: Мой план на массу"
              required
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="description">Описание</Label>
            <Input
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Краткое описание программы"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="goal">Цель</Label>
              <Input
                id="goal"
                value={goal}
                onChange={(e) => setGoal(e.target.value)}
                placeholder="Набор массы, похудение..."
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="duration">Продолжительность</Label>
              <Input
                id="duration"
                value={duration}
                onChange={(e) => setDuration(e.target.value)}
                placeholder="8 недель"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="difficulty">Сложность</Label>
              <select
                id="difficulty"
                value={difficulty}
                onChange={(e) => setDifficulty(e.target.value)}
                className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              >
                {DIFFICULTY_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="type">Тип</Label>
              <select
                id="type"
                value={type}
                onChange={(e) => setType(e.target.value)}
                className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              >
                {TYPE_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Section 2: Дни недели */}
      <div className="space-y-4">
        <div>
          <h2 className="text-lg font-semibold">Расписание недели</h2>
          <p className="text-sm text-muted-foreground mt-0.5">
            Выберите тренировочные дни — остальные станут днями отдыха
          </p>
        </div>

        {/* Weekday picker */}
        <div className="flex gap-2">
          {WEEKDAYS.map((wd) => {
            const day = days.find((d) => d.dayNumber === wd.num)!
            const isTraining = !day.isRest
            return (
              <button
                key={wd.num}
                type="button"
                onClick={() => toggleWeekday(wd.num)}
                className={`flex-1 flex flex-col items-center py-2.5 rounded-lg border-2 text-sm font-medium transition-colors ${
                  isTraining
                    ? 'border-primary bg-primary text-primary-foreground'
                    : 'border-border bg-background text-muted-foreground hover:border-primary/40'
                }`}
              >
                <span>{wd.short}</span>
                {isTraining
                  ? <Dumbbell className="h-3 w-3 mt-1" />
                  : <Coffee className="h-3 w-3 mt-1 opacity-50" />
                }
              </button>
            )
          })}
        </div>

        {/* Summary */}
        <p className="text-xs text-muted-foreground">
          {daysPerWeek > 0
            ? `${daysPerWeek} ${daysPerWeek === 1 ? 'тренировочный день' : daysPerWeek < 5 ? 'тренировочных дня' : 'тренировочных дней'} в неделю`
            : 'Не выбрано ни одного тренировочного дня'
          }
        </p>

        {/* Training day cards */}
        {daysPerWeek === 0 && (
          <div className="border-2 border-dashed rounded-lg p-8 text-center text-muted-foreground">
            <Dumbbell className="h-8 w-8 mx-auto mb-2 opacity-40" />
            <p className="text-sm">Выберите хотя бы один день для тренировок</p>
          </div>
        )}

        <div className="space-y-3">
          {days
            .filter((d) => !d.isRest)
            .map((day) => (
              <TrainingDayCard
                key={day.dayNumber}
                day={day}
                onUpdate={(updated) => updateDay(day.dayNumber, updated)}
                otherTrainingDays={trainingDays.filter((d) => d.dayNumber !== day.dayNumber)}
                onCopyTo={(targetNum) => copyDayTo(day.dayNumber, targetNum)}
              />
            ))}
        </div>
      </div>

      <div className="flex justify-end gap-3 pt-2">
        <Button type="submit" disabled={saving || !name.trim()}>
          {saving ? 'Сохранение...' : 'Сохранить план'}
        </Button>
      </div>
    </form>
  )
}

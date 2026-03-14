'use client'

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Button } from '@/components/ui/button'

export const MUSCLE_GROUPS = [
  { label: 'Грудь', value: 'грудь' },
  { label: 'Спина / Широчайшие', value: 'широчайшие' },
  { label: 'Плечи / Дельты', value: 'дельта' },
  { label: 'Бицепс', value: 'бицепс' },
  { label: 'Трицепс', value: 'трицепс' },
  { label: 'Квадрицепс', value: 'квадрицепс' },
  { label: 'Бицепс бедра', value: 'бицепс бедра' },
  { label: 'Ягодицы', value: 'ягодицы' },
  { label: 'Икры', value: 'икры' },
  { label: 'Пресс', value: 'пресс' },
  { label: 'Поясница', value: 'поясница' },
  { label: 'Кардио', value: 'кардио' },
]

export const EQUIPMENT_LIST = [
  { label: 'Штанга', value: 'штанга' },
  { label: 'Гантели', value: 'гантели' },
  { label: 'Тренажёр', value: 'тренажёр' },
  { label: 'Блок', value: 'блок' },
  { label: 'Турник', value: 'турник' },
  { label: 'Брусья', value: 'брусья' },
  { label: 'Гиря', value: 'гиря' },
  { label: 'Без оборудования', value: 'без оборудования' },
]

export const DIFFICULTY_LIST = [
  { label: 'Начинающий', value: 'beginner' },
  { label: 'Средний', value: 'intermediate' },
  { label: 'Продвинутый', value: 'advanced' },
]

interface Props {
  muscleGroup: string
  equipment: string
  difficulty: string
  onChangeMuscle: (v: string) => void
  onChangeEquip: (v: string) => void
  onChangeDiff: (v: string) => void
  onReset: () => void
}

export function ExerciseFilters({
  muscleGroup, equipment, difficulty,
  onChangeMuscle, onChangeEquip, onChangeDiff, onReset,
}: Props) {
  const hasFilters = muscleGroup !== 'all' || equipment !== 'all' || difficulty !== 'all'

  return (
    <div className="flex gap-3 flex-wrap items-center">
      <Select value={muscleGroup} onValueChange={onChangeMuscle}>
        <SelectTrigger className="w-44">
          <SelectValue placeholder="Группа мышц" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Все мышцы</SelectItem>
          {MUSCLE_GROUPS.map((m) => (
            <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select value={equipment} onValueChange={onChangeEquip}>
        <SelectTrigger className="w-44">
          <SelectValue placeholder="Инвентарь" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Любой инвентарь</SelectItem>
          {EQUIPMENT_LIST.map((e) => (
            <SelectItem key={e.value} value={e.value}>{e.label}</SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select value={difficulty} onValueChange={onChangeDiff}>
        <SelectTrigger className="w-40">
          <SelectValue placeholder="Сложность" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Любая сложность</SelectItem>
          {DIFFICULTY_LIST.map((d) => (
            <SelectItem key={d.value} value={d.value}>{d.label}</SelectItem>
          ))}
        </SelectContent>
      </Select>

      {hasFilters && (
        <Button variant="ghost" size="sm" onClick={onReset}>Сбросить</Button>
      )}
    </div>
  )
}

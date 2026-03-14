'use client'

import { useState } from 'react'
import { useCreateExercise } from '@/hooks/use-exercises'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { toast } from '@/hooks/use-toast'
import { Plus } from 'lucide-react'

const MUSCLE_GROUPS = ['Грудь', 'Спина', 'Плечи', 'Бицепс', 'Трицепс', 'Ноги', 'Ягодицы', 'Пресс', 'Икры']
const EQUIPMENT = ['Штанга', 'Гантели', 'Тренажёр', 'Блоки', 'Турник', 'Брусья', 'Гири', 'Резина', 'Без инвентаря']
const DIFFICULTY = ['Начинающий', 'Средний', 'Продвинутый']

export function CreateExerciseDialog() {
  const [open, setOpen] = useState(false)
  const [name, setName] = useState('')
  const [muscleGroup, setMuscleGroup] = useState('')
  const [equipment, setEquipment] = useState('')
  const [difficulty, setDifficulty] = useState('')
  const [animationUrl, setAnimationUrl] = useState('')
  const createExercise = useCreateExercise()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    try {
      await createExercise.mutateAsync({
        name,
        muscleGroup: muscleGroup || undefined,
        equipment: equipment || undefined,
        difficulty: difficulty || undefined,
        animationUrl: animationUrl || undefined,
      })
      toast({ title: 'Упражнение создано' })
      setOpen(false)
      setName('')
      setMuscleGroup('')
      setEquipment('')
      setDifficulty('')
      setAnimationUrl('')
    } catch {
      toast({ variant: 'destructive', title: 'Ошибка', description: 'Не удалось создать упражнение' })
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="h-4 w-4 mr-2" />
          Создать упражнение
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Новое упражнение</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1">
            <Label htmlFor="ex-name">Название</Label>
            <Input
              id="ex-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              placeholder="Жим штанги лёжа"
            />
          </div>
          <div className="space-y-1">
            <Label>Группа мышц</Label>
            <Select value={muscleGroup} onValueChange={setMuscleGroup}>
              <SelectTrigger><SelectValue placeholder="Выберите..." /></SelectTrigger>
              <SelectContent>
                {MUSCLE_GROUPS.map((m) => <SelectItem key={m} value={m}>{m}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label>Инвентарь</Label>
            <Select value={equipment} onValueChange={setEquipment}>
              <SelectTrigger><SelectValue placeholder="Выберите..." /></SelectTrigger>
              <SelectContent>
                {EQUIPMENT.map((e) => <SelectItem key={e} value={e}>{e}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label>Сложность</Label>
            <Select value={difficulty} onValueChange={setDifficulty}>
              <SelectTrigger><SelectValue placeholder="Выберите..." /></SelectTrigger>
              <SelectContent>
                {DIFFICULTY.map((d) => <SelectItem key={d} value={d}>{d}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label htmlFor="ex-img">Картинка (URL)</Label>
            <Input
              id="ex-img"
              type="url"
              value={animationUrl}
              onChange={(e) => setAnimationUrl(e.target.value)}
              placeholder="https://example.com/exercise.gif"
            />
          </div>
          <Button type="submit" className="w-full" disabled={createExercise.isPending}>
            {createExercise.isPending ? 'Создание...' : 'Создать'}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  )
}

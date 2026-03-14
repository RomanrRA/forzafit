'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useCreateWorkout } from '@/hooks/use-workouts'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { toast } from '@/hooks/use-toast'
import { ArrowLeft } from 'lucide-react'
import Link from 'next/link'
import { format } from 'date-fns'

export default function NewWorkoutPage() {
  const router = useRouter()
  const createWorkout = useCreateWorkout()

  const now = new Date()
  const [title, setTitle] = useState(`Тренировка ${format(now, 'dd.MM.yyyy')}`)
  const [startedAt, setStartedAt] = useState(format(now, "yyyy-MM-dd'T'HH:mm"))
  const [notes, setNotes] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    try {
      const workout = await createWorkout.mutateAsync({
        title,
        startedAt: new Date(startedAt).toISOString(),
        notes: notes || undefined,
      })
      router.push(`/workouts/${workout.id}`)
    } catch {
      toast({ variant: 'destructive', title: 'Ошибка', description: 'Не удалось создать тренировку' })
    }
  }

  return (
    <div className="w-full max-w-lg space-y-4">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/workouts"><ArrowLeft className="h-4 w-4" /></Link>
        </Button>
        <h1 className="text-2xl font-bold">Новая тренировка</h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Детали тренировки</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1">
              <Label htmlFor="title">Название</Label>
              <Input
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="startedAt">Начало</Label>
              <Input
                id="startedAt"
                type="datetime-local"
                value={startedAt}
                onChange={(e) => setStartedAt(e.target.value)}
                required
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="notes">Заметки</Label>
              <Input
                id="notes"
                placeholder="Необязательно"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </div>
            <Button type="submit" className="w-full" disabled={createWorkout.isPending}>
              {createWorkout.isPending ? 'Создание...' : 'Создать тренировку'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}

'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { Sparkles } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { toast } from '@/hooks/use-toast'

type Gender = 'male' | 'female' | 'other'

interface OnboardingPayload {
  heightCm: number
  weightKg: number
  gender: Gender
  dob: string
}

const MAX_DOB = new Date().toISOString().split('T')[0]

export default function OnboardingPage() {
  const router = useRouter()
  const qc = useQueryClient()

  const [heightCm, setHeightCm] = useState('')
  const [weightKg, setWeightKg] = useState('')
  const [gender, setGender] = useState<Gender>('male')
  const [dob, setDob] = useState('')

  const saveMutation = useMutation({
    mutationFn: async (payload: OnboardingPayload) => {
      await api.patch('/users/me', {
        heightCm: payload.heightCm,
        weightKg: payload.weightKg,
        gender: payload.gender,
        dob: new Date(payload.dob).toISOString(),
      })
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['users', 'me'] })
      toast({ title: 'Профиль создан', description: 'Аватар готов к использованию' })
      router.replace('/avatar')
    },
    onError: () => {
      toast({ variant: 'destructive', title: 'Не удалось сохранить' })
    },
  })

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const h = Number(heightCm)
    const w = Number(weightKg)
    if (!h || h < 120 || h > 220) {
      toast({ variant: 'destructive', title: 'Рост должен быть 120-220 см' })
      return
    }
    if (!w || w < 30 || w > 250) {
      toast({ variant: 'destructive', title: 'Вес должен быть 30-250 кг' })
      return
    }
    if (!dob) {
      toast({ variant: 'destructive', title: 'Укажите дату рождения' })
      return
    }
    saveMutation.mutate({ heightCm: h, weightKg: w, gender, dob })
  }

  return (
    <div
      style={{
        maxWidth: 480,
        margin: '0 auto',
        padding: '24px 0',
      }}
    >
      <div className="glass-card" style={{ padding: 24 }}>
        <div className="flex items-center gap-3" style={{ marginBottom: 16 }}>
          <Sparkles
            className="h-7 w-7"
            style={{ color: 'var(--c-accent)' }}
            strokeWidth={1.8}
          />
          <div>
            <div style={{ fontSize: 20, fontWeight: 800, color: 'var(--txt-1)' }}>
              Расскажите о себе
            </div>
            <div style={{ fontSize: 13, color: 'var(--txt-3)', marginTop: 2 }}>
              Эти данные нужны для аватара и подбора тренировок. Их можно
              поменять в любой момент.
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label htmlFor="height">Рост, см</Label>
              <Input
                id="height"
                type="number"
                inputMode="decimal"
                placeholder="175"
                value={heightCm}
                min={120}
                max={220}
                onChange={(e) => setHeightCm(e.target.value)}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="weight">Вес, кг</Label>
              <Input
                id="weight"
                type="number"
                inputMode="decimal"
                step="0.1"
                placeholder="75"
                value={weightKg}
                min={30}
                max={250}
                onChange={(e) => setWeightKg(e.target.value)}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label htmlFor="gender">Пол</Label>
              <select
                id="gender"
                value={gender}
                onChange={(e) => setGender(e.target.value as Gender)}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
              >
                <option value="male">Мужской</option>
                <option value="female">Женский</option>
                <option value="other">Другой</option>
              </select>
            </div>
            <div className="space-y-1">
              <Label htmlFor="dob">Дата рождения</Label>
              <Input
                id="dob"
                type="date"
                value={dob}
                max={MAX_DOB}
                onChange={(e) => setDob(e.target.value)}
              />
            </div>
          </div>

          <Button
            type="submit"
            className="w-full"
            disabled={saveMutation.isPending}
          >
            {saveMutation.isPending ? 'Сохраняю…' : 'Продолжить'}
          </Button>
        </form>
      </div>
    </div>
  )
}

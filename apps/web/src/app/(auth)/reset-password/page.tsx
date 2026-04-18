'use client'

import { Suspense, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { api } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { toast } from '@/hooks/use-toast'
import { Dumbbell } from 'lucide-react'

function ResetPasswordForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const token = searchParams.get('token') ?? ''

  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [done, setDone] = useState(false)

  if (!token) {
    return (
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-2">
            <Dumbbell className="h-10 w-10 text-primary" />
          </div>
          <CardTitle className="text-2xl">Ссылка недействительна</CardTitle>
          <CardDescription>
            В ссылке отсутствует токен сброса. Запросите новое письмо.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button className="w-full" onClick={() => router.push('/login')}>
            Перейти к входу
          </Button>
        </CardContent>
      </Card>
    )
  }

  if (done) {
    return (
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-2">
            <Dumbbell className="h-10 w-10 text-primary" />
          </div>
          <CardTitle className="text-2xl">Пароль обновлён</CardTitle>
          <CardDescription>
            Теперь можно войти с новым паролем.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button className="w-full" onClick={() => router.push('/login')}>
            Войти
          </Button>
        </CardContent>
      </Card>
    )
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()

    if (newPassword.length < 8) {
      toast({ variant: 'destructive', title: 'Ошибка', description: 'Пароль должен быть не менее 8 символов' })
      return
    }
    if (newPassword !== confirmPassword) {
      toast({ variant: 'destructive', title: 'Ошибка', description: 'Пароли не совпадают' })
      return
    }

    setIsLoading(true)
    try {
      await api.post('/auth/reset-password', { token, newPassword })
      setDone(true)
    } catch (err: unknown) {
      const status = (err as { response?: { status?: number } }).response?.status
      const apiMsg = (err as { response?: { data?: { message?: string | string[] } } }).response?.data?.message
      const fromApi = Array.isArray(apiMsg) ? apiMsg[0] : apiMsg
      const friendly =
        status === 400 ? (fromApi ?? 'Ссылка недействительна или истекла. Запросите новое письмо.') :
        status === 429 ? 'Слишком много попыток. Попробуйте позже.' :
        (fromApi ?? 'Не удалось сбросить пароль. Попробуйте ещё раз.')
      toast({ variant: 'destructive', title: 'Ошибка', description: friendly })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Card className="w-full max-w-md">
      <CardHeader className="text-center">
        <div className="flex justify-center mb-2">
          <Dumbbell className="h-10 w-10 text-primary" />
        </div>
        <CardTitle className="text-2xl">Новый пароль</CardTitle>
        <CardDescription>
          Введите новый пароль для вашего аккаунта.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="space-y-1">
            <Label htmlFor="newPassword">Новый пароль</Label>
            <Input
              id="newPassword"
              type="password"
              placeholder="Минимум 8 символов"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              minLength={8}
              required
              autoFocus
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="confirmPassword">Подтверждение пароля</Label>
            <Input
              id="confirmPassword"
              type="password"
              placeholder="Повторите пароль"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              minLength={8}
              required
            />
          </div>
          <Button type="submit" className="w-full" disabled={isLoading}>
            {isLoading ? 'Сохраняю...' : 'Сохранить пароль'}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}

export default function ResetPasswordPage() {
  return (
    <div className="lg-bg flex min-h-screen items-center justify-center px-4 py-8">
      <Suspense fallback={<div className="text-muted-foreground">Загрузка...</div>}>
        <ResetPasswordForm />
      </Suspense>
    </div>
  )
}

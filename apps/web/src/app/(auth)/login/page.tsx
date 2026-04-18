'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { api } from '@/lib/api'
import { useAuthStore } from '@/store/auth.store'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { toast } from '@/hooks/use-toast'
import { Dumbbell } from 'lucide-react'

interface ApiError {
  response?: { status?: number; data?: { message?: string | string[] } }
}

function extractApiMessage(err: unknown, fallback: string): string {
  const e = err as ApiError
  const m = e.response?.data?.message
  if (Array.isArray(m)) return m[0] ?? fallback
  if (typeof m === 'string') return m
  return fallback
}

async function applyTokens(accessToken: string, refreshToken: string) {
  // Сначала сохраняем токены, чтобы api-интерсептор отправил Bearer
  useAuthStore.setState({ accessToken, refreshToken })
  const { data: me } = await api.get('/users/me')
  useAuthStore.getState().setAuth(me, accessToken, refreshToken)
}

export default function LoginPage() {
  const router = useRouter()
  const [isRegister, setIsRegister] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [showResetPassword, setShowResetPassword] = useState(false)
  const [resetEmail, setResetEmail] = useState('')
  const [resetSent, setResetSent] = useState(false)

  // Общие поля
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')

  // Поля только для регистрации
  const [name, setName] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [gender, setGender] = useState('')
  const [dob, setDob] = useState('')

  function switchMode() {
    setIsRegister(!isRegister)
    setConfirmPassword('')
    setName('')
    setGender('')
    setDob('')
  }

  async function handleResetPassword(e: React.FormEvent) {
    e.preventDefault()
    if (!resetEmail.trim()) {
      toast({ variant: 'destructive', title: 'Ошибка', description: 'Введите email' })
      return
    }
    setIsLoading(true)
    try {
      await api.post('/auth/forgot-password', { email: resetEmail.trim() })
      setResetSent(true)
      toast({ title: 'Письмо отправлено', description: 'Если email зарегистрирован — придёт ссылка для сброса' })
    } catch (err: unknown) {
      toast({
        variant: 'destructive',
        title: 'Ошибка',
        description: extractApiMessage(err, 'Не удалось отправить письмо. Попробуйте позже.'),
      })
    } finally {
      setIsLoading(false)
    }
  }

  async function handleEmailAuth(e: React.FormEvent) {
    e.preventDefault()

    if (password.length < 8) {
      toast({ variant: 'destructive', title: 'Ошибка', description: 'Пароль должен быть не менее 8 символов' })
      return
    }

    if (isRegister) {
      if (password !== confirmPassword) {
        toast({ variant: 'destructive', title: 'Ошибка', description: 'Пароли не совпадают' })
        return
      }
      if (!name.trim()) {
        toast({ variant: 'destructive', title: 'Ошибка', description: 'Введите имя' })
        return
      }
      if (!gender) {
        toast({ variant: 'destructive', title: 'Ошибка', description: 'Выберите пол' })
        return
      }
      if (!dob) {
        toast({ variant: 'destructive', title: 'Ошибка', description: 'Введите дату рождения' })
        return
      }
    }

    setIsLoading(true)
    try {
      let tokens: { accessToken: string; refreshToken: string }

      if (isRegister) {
        const { data } = await api.post('/auth/register', {
          email: email.trim().toLowerCase(),
          password,
          name: name.trim(),
        })
        tokens = data
      } else {
        const { data } = await api.post('/auth/login', {
          email: email.trim().toLowerCase(),
          password,
        })
        tokens = data
      }

      await applyTokens(tokens.accessToken, tokens.refreshToken)

      if (isRegister) {
        try {
          await api.patch('/users/me', {
            name: name.trim(),
            dob: new Date(dob).toISOString(),
            gender,
          })
          const store = useAuthStore.getState()
          if (store.user) {
            store.setAuth({ ...store.user, name: name.trim() }, tokens.accessToken, tokens.refreshToken)
          }
        } catch {
          // профиль не сохранился — аккаунт создан, идём дальше
        }
      }

      router.push('/dashboard')
    } catch (err: unknown) {
      const status = (err as ApiError).response?.status
      const fallback = isRegister
        ? 'Не удалось зарегистрироваться. Попробуйте ещё раз.'
        : 'Неверный email или пароль'
      const friendly =
        status === 409 ? 'Этот email уже зарегистрирован. Войдите в аккаунт.' :
        status === 401 ? 'Неверный email или пароль' :
        status === 429 ? 'Слишком много попыток. Попробуйте позже.' :
        extractApiMessage(err, fallback)
      toast({ variant: 'destructive', title: 'Ошибка', description: friendly })
    } finally {
      setIsLoading(false)
    }
  }

  if (showResetPassword) {
    return (
      <div className="lg-bg flex min-h-screen items-center justify-center px-4 py-8">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="flex justify-center mb-2">
              <Dumbbell className="h-10 w-10 text-primary" />
            </div>
            <CardTitle className="text-2xl">Сброс пароля</CardTitle>
            <CardDescription>
              {resetSent
                ? 'Если email зарегистрирован, на него отправлена ссылка для сброса пароля. Проверьте почту.'
                : 'Введите email вашего аккаунта. Мы отправим ссылку для сброса пароля.'}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {!resetSent ? (
              <form onSubmit={handleResetPassword} className="space-y-3">
                <div className="space-y-1">
                  <Label htmlFor="resetEmail">Email</Label>
                  <Input
                    id="resetEmail"
                    type="email"
                    placeholder="you@example.com"
                    value={resetEmail}
                    onChange={(e) => setResetEmail(e.target.value)}
                    required
                    autoFocus
                  />
                </div>
                <Button type="submit" className="w-full" disabled={isLoading}>
                  {isLoading ? 'Отправка...' : 'Отправить ссылку'}
                </Button>
              </form>
            ) : (
              <Button
                className="w-full"
                onClick={() => { setShowResetPassword(false); setResetSent(false) }}
              >
                Вернуться к входу
              </Button>
            )}
            {!resetSent && (
              <p className="text-center text-sm text-muted-foreground">
                <button
                  type="button"
                  onClick={() => setShowResetPassword(false)}
                  className="text-primary underline-offset-4 hover:underline"
                >
                  ← Назад к входу
                </button>
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="lg-bg flex min-h-screen items-center justify-center px-4 py-8">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-2">
            <Dumbbell className="h-10 w-10 text-primary" />
          </div>
          <CardTitle className="text-2xl">ForzaFit</CardTitle>
          <CardDescription>
            {isRegister ? 'Создайте аккаунт для начала' : 'Войдите в свой аккаунт'}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <form onSubmit={handleEmailAuth} className="space-y-3">
            {isRegister && (
              <div className="space-y-1">
                <Label htmlFor="name">Имя</Label>
                <Input
                  id="name"
                  type="text"
                  placeholder="Ваше имя"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                />
              </div>
            )}

            <div className="space-y-1">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>

            <div className="space-y-1">
              <Label htmlFor="password">Пароль</Label>
              <Input
                id="password"
                type="password"
                placeholder="Минимум 8 символов"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                minLength={8}
                required
              />
              {!isRegister && (
                <button
                  type="button"
                  onClick={() => { setShowResetPassword(true); setResetEmail(email); setResetSent(false) }}
                  className="text-xs text-primary hover:underline underline-offset-4"
                >
                  Забыли пароль?
                </button>
              )}
            </div>

            {isRegister && (
              <>
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

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label>Пол</Label>
                    <Select value={gender} onValueChange={setGender}>
                      <SelectTrigger>
                        <SelectValue placeholder="Выберите" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="male">Мужской</SelectItem>
                        <SelectItem value="female">Женский</SelectItem>
                        <SelectItem value="other">Другой</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1">
                    <Label htmlFor="dob">Дата рождения</Label>
                    <Input
                      id="dob"
                      type="date"
                      value={dob}
                      max={new Date().toISOString().split('T')[0]}
                      onChange={(e) => setDob(e.target.value)}
                      required
                    />
                  </div>
                </div>
              </>
            )}

            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? 'Загрузка...' : isRegister ? 'Зарегистрироваться' : 'Войти'}
            </Button>
          </form>

          <p className="text-center text-sm text-muted-foreground">
            {isRegister ? 'Уже есть аккаунт?' : 'Нет аккаунта?'}{' '}
            <button
              type="button"
              onClick={switchMode}
              className="text-primary underline-offset-4 hover:underline"
            >
              {isRegister ? 'Войти' : 'Зарегистрироваться'}
            </button>
          </p>
        </CardContent>
      </Card>
    </div>
  )
}

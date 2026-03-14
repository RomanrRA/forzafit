'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  signInWithEmailAndPassword,
  signInWithPopup,
  createUserWithEmailAndPassword,
} from 'firebase/auth'
import { auth, googleProvider } from '@/lib/firebase'
import { api } from '@/lib/api'
import { useAuthStore } from '@/store/auth.store'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { toast } from '@/hooks/use-toast'
import { Dumbbell } from 'lucide-react'

async function loginToBackend(idToken: string) {
  const { data } = await api.post('/auth/login', { idToken })
  // Временно сохраняем токены чтобы следующий запрос прошёл с авторизацией
  useAuthStore.getState().setAuth({ id: '', email: '', name: null, firebaseUid: '' }, data.accessToken, data.refreshToken)
  const { data: me } = await api.get('/users/me')
  useAuthStore.getState().setAuth(me, data.accessToken, data.refreshToken)
}

export default function LoginPage() {
  const router = useRouter()
  const [isRegister, setIsRegister] = useState(false)
  const [isLoading, setIsLoading] = useState(false)

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

  async function handleEmailAuth(e: React.FormEvent) {
    e.preventDefault()

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
      let cred
      if (isRegister) {
        try {
          cred = await createUserWithEmailAndPassword(auth, email, password)
        } catch (firebaseErr: unknown) {
          const code = (firebaseErr as { code?: string }).code
          const msg =
            code === 'auth/email-already-in-use' ? 'Этот email уже зарегистрирован. Войдите в аккаунт.' :
            code === 'auth/weak-password' ? 'Пароль слишком короткий (минимум 6 символов)' :
            code === 'auth/invalid-email' ? 'Некорректный email' :
            'Ошибка регистрации. Попробуйте ещё раз.'
          toast({ variant: 'destructive', title: 'Ошибка', description: msg })
          return
        }
      } else {
        try {
          cred = await signInWithEmailAndPassword(auth, email, password)
        } catch (firebaseErr: unknown) {
          const code = (firebaseErr as { code?: string }).code
          const msg =
            code === 'auth/user-not-found' || code === 'auth/wrong-password' || code === 'auth/invalid-credential'
              ? 'Неверный email или пароль' :
            code === 'auth/too-many-requests' ? 'Слишком много попыток. Попробуйте позже.' :
            'Ошибка входа. Попробуйте ещё раз.'
          toast({ variant: 'destructive', title: 'Ошибка', description: msg })
          return
        }
      }

      const idToken = await cred.user.getIdToken()
      await loginToBackend(idToken)

      if (isRegister) {
        try {
          const patch: Record<string, unknown> = {
            name: name.trim(),
            dob: new Date(dob).toISOString(),
            gender,
          }
          await api.patch('/users/me', patch)
          // Обновляем имя в store
          const store = useAuthStore.getState()
          if (store.user) {
            store.setAuth({ ...store.user, name: name.trim() }, store.accessToken!, store.refreshToken!)
          }
        } catch {
          // Профиль не сохранился, но аккаунт создан — всё равно переходим
        }
      }

      router.push('/dashboard')
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Ошибка входа'
      toast({ variant: 'destructive', title: 'Ошибка', description: message })
    } finally {
      setIsLoading(false)
    }
  }

  async function handleGoogle() {
    setIsLoading(true)
    try {
      const cred = await signInWithPopup(auth, googleProvider)
      const idToken = await cred.user.getIdToken()
      await loginToBackend(idToken)
      router.push('/dashboard')
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Ошибка входа через Google'
      toast({ variant: 'destructive', title: 'Ошибка', description: message })
    } finally {
      setIsLoading(false)
    }
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
                placeholder="Введите пароль"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
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

          <div className="flex items-center gap-2">
            <Separator className="flex-1" />
            <span className="text-xs text-muted-foreground">или</span>
            <Separator className="flex-1" />
          </div>

          <Button variant="outline" className="w-full" onClick={handleGoogle} disabled={isLoading}>
            <svg className="h-4 w-4" viewBox="0 0 24 24">
              <path
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                fill="#4285F4"
              />
              <path
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                fill="#34A853"
              />
              <path
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                fill="#FBBC05"
              />
              <path
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                fill="#EA4335"
              />
            </svg>
            Войти через Google
          </Button>

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

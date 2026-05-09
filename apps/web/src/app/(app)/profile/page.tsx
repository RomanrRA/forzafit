'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { signOut } from '@/hooks/use-auth'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { toast } from '@/hooks/use-toast'
import { LogOut, Sun, Moon, Monitor } from 'lucide-react'
import { useThemeStore, type ThemeMode } from '@/store/theme.store'

interface UserProfile {
  id: string
  email: string
  name: string | null
  gender: 'male' | 'female' | 'other' | null
  dob: string | null
  heightCm: number | null
  weightKg: number | null
}

export default function ProfilePage() {
  const router = useRouter()
  const qc = useQueryClient()
  const themeMode = useThemeStore((s) => s.mode)
  const setThemeMode = useThemeStore((s) => s.setMode)

  const themes: { value: ThemeMode; label: string; icon: React.ReactNode }[] = [
    { value: 'light', label: 'Светлая', icon: <Sun className="h-4 w-4" /> },
    { value: 'dark', label: 'Тёмная', icon: <Moon className="h-4 w-4" /> },
    { value: 'auto', label: 'Авто', icon: <Monitor className="h-4 w-4" /> },
  ]

  const { data: profile, isLoading } = useQuery({
    queryKey: ['users', 'me'],
    queryFn: async () => {
      const { data } = await api.get('/users/me')
      return data as UserProfile
    },
  })

  // --- Поля профиля ---
  const [name, setName] = useState('')
  const [gender, setGender] = useState('')
  const [dob, setDob] = useState('')

  useEffect(() => {
    if (profile) {
      setName(profile.name ?? '')
      setGender(profile.gender ?? '')
      setDob(profile.dob ? profile.dob.split('T')[0] : '')
    }
  }, [profile])

  const updateProfile = useMutation({
    mutationFn: async (body: Record<string, unknown>) => {
      const { data } = await api.patch('/users/me', body)
      return data as UserProfile
    },
    onSuccess: (data) => {
      qc.setQueryData(['users', 'me'], data)
      setName(data.name ?? '')
      setGender(data.gender ?? '')
      setDob(data.dob ? data.dob.split('T')[0] : '')
      toast({ title: 'Профиль обновлён' })
    },
    onError: () => {
      toast({ variant: 'destructive', title: 'Ошибка', description: 'Не удалось сохранить профиль' })
    },
  })

  function handleSaveProfile(e: React.FormEvent) {
    e.preventDefault()
    const patch: Record<string, unknown> = {}
    if (name.trim()) patch.name = name.trim()
    if (gender) patch.gender = gender
    if (dob) patch.dob = new Date(dob).toISOString()
    updateProfile.mutate(patch)
  }

  // --- Смена пароля ---
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmNewPassword, setConfirmNewPassword] = useState('')
  const [isChangingPassword, setIsChangingPassword] = useState(false)

  async function handleChangePassword(e: React.FormEvent) {
    e.preventDefault()
    if (newPassword !== confirmNewPassword) {
      toast({ variant: 'destructive', title: 'Ошибка', description: 'Новые пароли не совпадают' })
      return
    }
    if (newPassword.length < 8) {
      toast({ variant: 'destructive', title: 'Ошибка', description: 'Пароль должен быть не менее 8 символов' })
      return
    }

    setIsChangingPassword(true)
    try {
      await api.post('/auth/change-password', { currentPassword, newPassword })
      setCurrentPassword('')
      setNewPassword('')
      setConfirmNewPassword('')
      toast({ title: 'Пароль изменён' })
    } catch (err: unknown) {
      const status = (err as { response?: { status?: number } }).response?.status
      const apiMsg = (err as { response?: { data?: { message?: string } } }).response?.data?.message
      const friendly =
        status === 401 ? 'Неверный текущий пароль' :
        apiMsg ?? 'Ошибка смены пароля'
      toast({ variant: 'destructive', title: 'Ошибка', description: friendly })
    } finally {
      setIsChangingPassword(false)
    }
  }

  async function handleSignOut() {
    await signOut()
    router.push('/login')
  }

  if (isLoading) return <div className="text-muted-foreground">Загрузка...</div>

  const initial = (profile?.name ?? profile?.email ?? '?').trim().slice(0, 1).toUpperCase()

  return (
    <div className="w-full max-w-md space-y-5 fz-rise">
      <div>
        <div className="eyebrow">Аккаунт</div>
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
          Профиль
        </h1>
      </div>

      {/* Личные данные */}
      <Card className="strong">
        <CardHeader>
          <div className="flex items-center gap-4">
            <div
              className="grid place-items-center shrink-0 fz-pop"
              style={{
                width: 64,
                height: 64,
                borderRadius: '50%',
                background:
                  'linear-gradient(135deg, oklch(0.55 0.15 30), oklch(0.45 0.18 280))',
                color: 'white',
                fontWeight: 800,
                fontSize: 26,
                boxShadow: '0 6px 20px rgba(0,0,0,0.18)',
              }}
            >
              {initial}
            </div>
            <div className="min-w-0">
              <CardTitle>{profile?.name ?? 'Пользователь'}</CardTitle>
              <p className="text-sm txt-muted truncate">{profile?.email}</p>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSaveProfile} className="space-y-4">
            <div className="space-y-1">
              <Label htmlFor="email">Email</Label>
              <Input id="email" value={profile?.email ?? ''} disabled />
            </div>
            <div className="space-y-1">
              <Label htmlFor="name">Имя</Label>
              <Input
                id="name"
                placeholder="Ваше имя"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label htmlFor="gender">Пол</Label>
                <select
                  id="gender"
                  value={gender}
                  onChange={(e) => setGender(e.target.value)}
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
                  max={new Date().toISOString().split('T')[0]}
                  onChange={(e) => setDob(e.target.value)}
                />
              </div>
            </div>
            <Button type="submit" className="w-full" disabled={updateProfile.isPending}>
              {updateProfile.isPending ? 'Сохранение...' : 'Сохранить'}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Смена пароля */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Смена пароля</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleChangePassword} className="space-y-3">
            <div className="space-y-1">
              <Label htmlFor="currentPassword">Текущий пароль</Label>
              <Input
                id="currentPassword"
                type="password"
                placeholder="Введите текущий пароль"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                required
              />
            </div>
            <Separator />
            <div className="space-y-1">
              <Label htmlFor="newPassword">Новый пароль</Label>
              <Input
                id="newPassword"
                type="password"
                placeholder="Новый пароль"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="confirmNewPassword">Подтверждение нового пароля</Label>
              <Input
                id="confirmNewPassword"
                type="password"
                placeholder="Повторите новый пароль"
                value={confirmNewPassword}
                onChange={(e) => setConfirmNewPassword(e.target.value)}
                required
              />
            </div>
            <Button type="submit" className="w-full" disabled={isChangingPassword}>
              {isChangingPassword ? 'Сохранение...' : 'Изменить пароль'}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Тема */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Оформление</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground mb-3">Выберите тему интерфейса</p>
          <div className="grid grid-cols-3 gap-2">
            {themes.map(({ value, label, icon }) => (
              <button
                key={value}
                onClick={() => setThemeMode(value)}
                className={`flex flex-col items-center gap-2 rounded-xl border py-3 px-2 text-sm font-medium transition-all duration-200 ${
                  themeMode === value
                    ? 'border-primary bg-primary/10 text-primary shadow-sm'
                    : 'border-border bg-transparent text-muted-foreground hover:bg-accent hover:text-foreground'
                }`}
              >
                {icon}
                {label}
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Выход */}
      <Card>
        <CardContent className="pt-6">
          <Button variant="destructive" className="w-full" onClick={handleSignOut}>
            <LogOut className="h-4 w-4 mr-2" />
            Выйти
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}

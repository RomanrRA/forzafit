'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  EmailAuthProvider,
  reauthenticateWithCredential,
  updatePassword,
} from 'firebase/auth'
import { auth } from '@/lib/firebase'
import { api } from '@/lib/api'
import { signOut } from '@/hooks/use-auth'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Separator } from '@/components/ui/separator'
import { toast } from '@/hooks/use-toast'
import { LogOut, User, Sun, Moon, Monitor } from 'lucide-react'
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
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['users', 'me'] })
      toast({ title: 'Профиль обновлён' })
    },
    onError: () => {
      toast({ variant: 'destructive', title: 'Ошибка', description: 'Не удалось сохранить профиль' })
    },
  })

  function handleSaveProfile(e: React.FormEvent) {
    e.preventDefault()
    const patch: Record<string, unknown> = { name: name.trim() || undefined }
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
    if (newPassword.length < 6) {
      toast({ variant: 'destructive', title: 'Ошибка', description: 'Пароль должен быть не менее 6 символов' })
      return
    }

    setIsChangingPassword(true)
    try {
      const user = auth.currentUser
      if (!user || !user.email) throw new Error('Пользователь не авторизован')

      const credential = EmailAuthProvider.credential(user.email, currentPassword)
      await reauthenticateWithCredential(user, credential)
      await updatePassword(user, newPassword)

      setCurrentPassword('')
      setNewPassword('')
      setConfirmNewPassword('')
      toast({ title: 'Пароль изменён' })
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Ошибка смены пароля'
      const friendly = msg.includes('wrong-password') || msg.includes('invalid-credential')
        ? 'Неверный текущий пароль'
        : msg
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

  return (
    <div className="w-full max-w-md space-y-5">
      <h1 className="text-3xl font-bold">Профиль</h1>

      {/* Личные данные */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
              <User className="h-6 w-6 text-primary" />
            </div>
            <div>
              <CardTitle>{profile?.name ?? 'Пользователь'}</CardTitle>
              <p className="text-sm text-muted-foreground">{profile?.email}</p>
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

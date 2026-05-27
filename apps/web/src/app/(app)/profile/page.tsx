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
import { LogOut, Sun, Moon, Monitor, Dumbbell, Flame, Trophy, Star } from 'lucide-react'
import { useThemeStore, type ThemeMode } from '@/store/theme.store'
import { useGamificationOverview } from '@/hooks/use-gamification'
import { useWorkouts } from '@/hooks/use-workouts'
import { plural } from '@/lib/utils'

interface UserProfile {
  id: string
  email: string
  name: string | null
  gender: 'male' | 'female' | 'other' | null
  dob: string | null
  heightCm: number | null
  weightKg: number | null
  username: string | null
  displayName: string | null
  bio: string | null
  avatarUrl: string | null
  isProfilePublic: boolean
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

  const { data: gam } = useGamificationOverview()
  const { data: workoutsData } = useWorkouts({ limit: 1, status: 'completed' })

  // --- Поля профиля ---
  const [name, setName] = useState('')
  const [gender, setGender] = useState('')
  const [dob, setDob] = useState('')
  const [heightCm, setHeightCm] = useState('')
  const [weightKg, setWeightKg] = useState('')

  // --- Соц. профиль ---
  const [username, setUsername] = useState('')
  const [bio, setBio] = useState('')
  const [avatarUrl, setAvatarUrl] = useState('')
  const [isProfilePublic, setIsProfilePublic] = useState(true)

  useEffect(() => {
    if (profile) {
      setName(profile.name ?? '')
      setGender(profile.gender ?? '')
      setDob(profile.dob ? profile.dob.split('T')[0] : '')
      setHeightCm(profile.heightCm?.toString() ?? '')
      setWeightKg(profile.weightKg?.toString() ?? '')
      setUsername(profile.username ?? '')
      setBio(profile.bio ?? '')
      setAvatarUrl(profile.avatarUrl ?? '')
      setIsProfilePublic(profile.isProfilePublic ?? true)
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
      setHeightCm(data.heightCm?.toString() ?? '')
      setWeightKg(data.weightKg?.toString() ?? '')
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
    if (heightCm.trim()) {
      const h = Number(heightCm)
      if (h < 120 || h > 220) {
        toast({ variant: 'destructive', title: 'Рост должен быть 120-220 см' })
        return
      }
      patch.heightCm = h
    }
    if (weightKg.trim()) {
      const w = Number(weightKg)
      if (w < 30 || w > 250) {
        toast({ variant: 'destructive', title: 'Вес должен быть 30-250 кг' })
        return
      }
      patch.weightKg = w
    }
    updateProfile.mutate(patch)
  }

  function handleSaveSocial(e: React.FormEvent) {
    e.preventDefault()
    const patch: Record<string, unknown> = {
      bio: bio.trim() || null,
      avatarUrl: avatarUrl.trim() || null,
      isProfilePublic,
    }
    if (username.trim() && username.trim() !== profile?.username) {
      patch.username = username.trim().toLowerCase()
    }
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
  const displayName = profile?.name?.trim() || profile?.email?.split('@')[0] || 'Атлет'
  const workoutsTotal = workoutsData?.total ?? 0
  const streakCurrent = gam?.streak.current ?? 0
  const prCount = gam?.prCount ?? 0
  const achievementsUnlocked = gam?.achievementsUnlocked ?? 0
  const achievementsTotal = gam?.achievementsTotal ?? 0

  const stats: { value: string; label: string; tint: string; icon: React.ReactNode }[] = [
    {
      value: String(workoutsTotal),
      label: plural(workoutsTotal, ['тренировка', 'тренировки', 'тренировок']),
      tint: 'var(--c-accent)',
      icon: <Dumbbell className="h-4 w-4" />,
    },
    {
      value: String(streakCurrent),
      label: plural(streakCurrent, ['день серии', 'дня серии', 'дней серии']),
      tint: 'var(--c-orange)',
      icon: <Flame className="h-4 w-4" />,
    },
    {
      value: String(prCount),
      label: plural(prCount, ['личный рекорд', 'личных рекорда', 'личных рекордов']),
      tint: 'var(--c-green)',
      icon: <Trophy className="h-4 w-4" />,
    },
    {
      value: `${achievementsUnlocked}/${achievementsTotal}`,
      label: plural(achievementsTotal, ['достижение', 'достижения', 'достижений']),
      tint: 'var(--c-yellow)',
      icon: <Star className="h-4 w-4" />,
    },
  ]

  return (
    <div className="w-full max-w-md space-y-5 fz-rise">
      <h1
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

      {/* ── Hero: avatar + name + meta ── */}
      <div className="glass-card strong flex items-center gap-4" style={{ padding: 18 }}>
        <div
          className="grid place-items-center shrink-0 fz-pop"
          style={{
            width: 72,
            height: 72,
            borderRadius: '50%',
            background:
              'linear-gradient(135deg, oklch(0.62 0.18 30), oklch(0.50 0.20 290))',
            color: 'white',
            fontWeight: 800,
            fontSize: 30,
            boxShadow: '0 6px 20px rgba(0,0,0,0.20)',
          }}
        >
          {initial}
        </div>
        <div className="min-w-0 flex-1">
          <div
            className="truncate"
            style={{
              fontSize: 20,
              fontWeight: 800,
              color: 'var(--txt-1)',
              letterSpacing: -0.3,
              lineHeight: 1.15,
            }}
          >
            {displayName}
          </div>
          <p
            className="truncate"
            style={{ fontSize: 12, color: 'var(--txt-3)', marginTop: 2 }}
          >
            {profile?.email}
          </p>
          <div className="mt-1.5 flex items-center gap-2 flex-wrap" style={{ fontSize: 12 }}>
            <span style={{ color: 'var(--txt-2)' }}>
              <span className="tnum font-bold" style={{ color: 'var(--txt-1)' }}>
                {workoutsTotal}
              </span>{' '}
              тренировок
            </span>
            {streakCurrent > 0 && (
              <>
                <span style={{ color: 'var(--txt-3)' }}>·</span>
                <span
                  className="inline-flex items-center gap-1"
                  style={{ color: 'var(--c-orange)', fontWeight: 700 }}
                >
                  <Flame className="h-3 w-3" />
                  <span className="tnum">{streakCurrent}</span>
                </span>
              </>
            )}
            {prCount > 0 && (
              <>
                <span style={{ color: 'var(--txt-3)' }}>·</span>
                <span
                  className="inline-flex items-center gap-1"
                  style={{ color: 'var(--c-green)', fontWeight: 700 }}
                >
                  <Trophy className="h-3 w-3" />
                  <span className="tnum">{prCount}</span>
                </span>
              </>
            )}
          </div>
        </div>
      </div>

      {/* ── Statistics ── */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Статистика</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4">
            {stats.map((s) => (
              <div key={s.label} className="flex items-start gap-2.5">
                <div
                  className="grid place-items-center shrink-0"
                  style={{
                    width: 32,
                    height: 32,
                    borderRadius: 10,
                    background: `color-mix(in oklab, ${s.tint} 18%, transparent)`,
                    border: `1px solid color-mix(in oklab, ${s.tint} 30%, transparent)`,
                    color: s.tint,
                  }}
                >
                  {s.icon}
                </div>
                <div className="min-w-0">
                  <div
                    className="tnum"
                    style={{
                      fontSize: 22,
                      fontWeight: 800,
                      color: s.tint,
                      letterSpacing: -0.5,
                      lineHeight: 1,
                    }}
                  >
                    {s.value}
                  </div>
                  <div
                    style={{
                      fontSize: 11,
                      color: 'var(--txt-3)',
                      textTransform: 'uppercase',
                      letterSpacing: 0.4,
                      fontWeight: 700,
                      marginTop: 4,
                    }}
                  >
                    {s.label}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Личные данные */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Личные данные</CardTitle>
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
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label htmlFor="height">Рост, см</Label>
                <Input
                  id="height"
                  type="number"
                  inputMode="decimal"
                  placeholder="175"
                  min={120}
                  max={220}
                  value={heightCm}
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
                  min={30}
                  max={250}
                  value={weightKg}
                  onChange={(e) => setWeightKg(e.target.value)}
                />
                <p className="text-xs text-muted-foreground">
                  Если ведёте замеры на странице «Тело» — берётся последний оттуда.
                </p>
              </div>
            </div>
            <Button type="submit" className="w-full" disabled={updateProfile.isPending}>
              {updateProfile.isPending ? 'Сохранение...' : 'Сохранить'}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Социальный профиль */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Соц. профиль</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSaveSocial} className="space-y-4">
            <div className="space-y-1">
              <Label htmlFor="avatarUrl">Аватар (URL картинки)</Label>
              <div className="flex items-center gap-3">
                {avatarUrl.trim() ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={avatarUrl.trim()}
                    alt=""
                    width={48}
                    height={48}
                    style={{
                      width: 48, height: 48, borderRadius: '50%', objectFit: 'cover',
                      border: '1px solid var(--gl-border)', flexShrink: 0,
                    }}
                    onError={(e) => { (e.target as HTMLImageElement).style.opacity = '0.3' }}
                  />
                ) : (
                  <div
                    className="grid place-items-center shrink-0"
                    style={{
                      width: 48, height: 48, borderRadius: '50%',
                      background: 'linear-gradient(135deg, oklch(0.55 0.15 30), oklch(0.45 0.18 280))',
                      color: 'white', fontWeight: 700, fontSize: 18,
                    }}
                  >
                    {(profile?.name ?? profile?.email ?? '?').trim().slice(0, 1).toUpperCase()}
                  </div>
                )}
                <Input
                  id="avatarUrl"
                  type="url"
                  placeholder="https://..."
                  value={avatarUrl}
                  onChange={(e) => setAvatarUrl(e.target.value)}
                />
              </div>
              <p className="text-xs text-muted-foreground">
                Вставьте ссылку на квадратное изображение (например, из Telegram-канала или хостинга).
              </p>
            </div>
            <div className="space-y-1">
              <Label htmlFor="username">@username</Label>
              <Input
                id="username"
                placeholder="latin+цифры+_, 3-24 символа"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                maxLength={24}
              />
              <p className="text-xs text-muted-foreground">
                Используется для добавления в друзья и публичной ссылки на профиль.
              </p>
            </div>
            <div className="space-y-1">
              <Label htmlFor="bio">О себе</Label>
              <textarea
                id="bio"
                placeholder="Коротко о ваших целях и опыте"
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                maxLength={200}
                rows={3}
                className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 resize-none"
              />
              <p className="text-xs text-muted-foreground text-right">{bio.length}/200</p>
            </div>
            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={isProfilePublic}
                onChange={(e) => setIsProfilePublic(e.target.checked)}
                className="mt-1"
              />
              <span className="text-sm">
                <strong>Публичный профиль</strong>
                <br />
                <span className="text-muted-foreground text-xs">
                  Видно другим юзерам в топе и по прямой ссылке. Друзьям видно всегда.
                </span>
              </span>
            </label>
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

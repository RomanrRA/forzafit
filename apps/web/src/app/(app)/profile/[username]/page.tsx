'use client'

import { use } from 'react'
import Link from 'next/link'
import { ArrowLeft, UserPlus, Lock } from 'lucide-react'
import { format } from 'date-fns'
import { ru } from 'date-fns/locale'
import {
  usePublicProfile,
  useFriends,
  useSendFriendRequest,
} from '@/hooks/use-social'
import { useAuthStore } from '@/store/auth.store'
import { toast } from '@/hooks/use-toast'

export default function PublicProfilePage({
  params,
}: {
  params: Promise<{ username: string }>
}) {
  const { username } = use(params)
  const me = useAuthStore((s) => s.user)
  const { data: profile, isLoading, error } = usePublicProfile(username)
  const { data: friends } = useFriends('accepted')
  const { data: pending } = useFriends('pending')
  const send = useSendFriendRequest()

  const isMe = me && profile && (me.email === username || me.id === profile.id)
  const alreadyFriend = profile && (friends ?? []).some((f) => f.friend?.id === profile.id)
  const alreadyPending = profile && (pending ?? []).some((f) => f.friend?.id === profile.id)

  async function handleAdd() {
    if (!profile?.username) return
    try {
      await send.mutateAsync(profile.username)
      toast({ title: 'Запрос отправлен' })
    } catch (e: unknown) {
      const err = e as { response?: { data?: { message?: string } } }
      toast({
        variant: 'destructive',
        title: 'Не удалось',
        description: err?.response?.data?.message ?? 'Попробуйте ещё раз',
      })
    }
  }

  if (isLoading) {
    return (
      <div className="space-y-3 fz-rise">
        <div className="glass-card p-6 animate-pulse h-[180px]" />
      </div>
    )
  }

  if (error || !profile) {
    return (
      <div className="space-y-4 fz-rise">
        <Link href="/feed" className="inline-flex items-center gap-1.5 text-sm txt-muted">
          <ArrowLeft className="h-4 w-4" />
          Назад
        </Link>
        <div className="glass-card p-6 text-center">
          <Lock className="h-8 w-8 mx-auto mb-2" style={{ color: 'var(--txt-3)' }} />
          <div className="font-semibold" style={{ color: 'var(--txt-1)' }}>Профиль недоступен</div>
          <p className="text-sm txt-muted mt-1">
            Пользователь не найден или скрыл профиль.
          </p>
        </div>
      </div>
    )
  }

  const name = profile.displayName || profile.name || profile.username || 'Атлет'
  const initial = name.trim().slice(0, 1).toUpperCase()

  return (
    <div className="space-y-5 fz-rise">
      <Link href="/feed" className="inline-flex items-center gap-1.5 text-sm txt-muted hover:opacity-80">
        <ArrowLeft className="h-4 w-4" />
        Назад
      </Link>

      <div className="glass-card strong p-5 sm:p-6 fz-rise">
        <div className="flex items-start gap-4">
          {profile.avatarUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={profile.avatarUrl}
              alt=""
              width={72}
              height={72}
              style={{ width: 72, height: 72, borderRadius: '50%', objectFit: 'cover' }}
            />
          ) : (
            <div
              className="grid place-items-center shrink-0"
              style={{
                width: 72, height: 72, borderRadius: '50%',
                background: 'linear-gradient(135deg, oklch(0.55 0.15 30), oklch(0.45 0.18 280))',
                color: 'white', fontWeight: 700, fontSize: 28,
              }}
            >
              {initial}
            </div>
          )}
          <div className="min-w-0 flex-1">
            <div
              className="truncate"
              style={{
                fontSize: 'clamp(20px, 4vw, 24px)',
                fontWeight: 800,
                letterSpacing: -0.4,
                color: 'var(--txt-1)',
              }}
            >
              {name}
            </div>
            {profile.username && (
              <div className="text-[13px] txt-muted truncate mt-0.5">@{profile.username}</div>
            )}
            <div className="text-[12px] txt-soft mt-1">
              на ForzaFit с {format(new Date(profile.createdAt), 'LLLL yyyy', { locale: ru })}
            </div>
          </div>
        </div>

        {profile.bio && (
          <p className="mt-4 text-[14px] leading-snug" style={{ color: 'var(--txt-2)' }}>
            {profile.bio}
          </p>
        )}

        {!isMe && profile.username && (
          <div className="mt-4">
            {alreadyFriend ? (
              <span
                className="inline-flex items-center gap-1.5"
                style={{
                  padding: '8px 14px', height: 38, borderRadius: 11,
                  background: 'color-mix(in oklab, var(--c-green) 18%, transparent)',
                  color: 'var(--c-green)',
                  fontSize: 13, fontWeight: 700,
                }}
              >
                ✓ В друзьях
              </span>
            ) : alreadyPending ? (
              <span
                className="inline-flex items-center gap-1.5"
                style={{
                  padding: '8px 14px', height: 38, borderRadius: 11,
                  background: 'var(--gl-bg)',
                  color: 'var(--txt-2)',
                  fontSize: 13, fontWeight: 700,
                }}
              >
                Запрос ожидает
              </span>
            ) : (
              <button
                onClick={handleAdd}
                disabled={send.isPending}
                className="glass-btn-primary inline-flex items-center gap-1.5"
                style={{
                  padding: '8px 14px', height: 38, borderRadius: 11,
                  fontSize: 13, fontWeight: 700,
                }}
              >
                <UserPlus className="h-4 w-4" strokeWidth={2.4} />
                Добавить в друзья
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

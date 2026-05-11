'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Check, X, UserPlus, Users, Clock } from 'lucide-react'
import {
  useFriends,
  useSendFriendRequest,
  useAcceptFriendRequest,
  useDeclineFriendRequest,
  useUnfriend,
  type Friendship,
  type FriendshipStatus,
} from '@/hooks/use-social'
import { useAuthStore } from '@/store/auth.store'
import { ShareInvite } from '@/components/social/share-invite'
import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { toast } from '@/hooks/use-toast'

type Tab = 'accepted' | 'incoming' | 'outgoing'

function authorName(f: Friendship): string {
  const a = f.friend
  if (!a) return '???'
  return a.displayName || a.name || a.username || 'Атлет'
}

function Avatar({ name, url }: { name: string; url: string | null | undefined }) {
  const initial = name.trim().slice(0, 1).toUpperCase()
  if (url) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={url} alt="" width={40} height={40} style={{ width: 40, height: 40, borderRadius: '50%', objectFit: 'cover' }} />
  }
  return (
    <div
      className="grid place-items-center"
      style={{
        width: 40, height: 40, borderRadius: '50%',
        background: 'linear-gradient(135deg, oklch(0.55 0.15 30), oklch(0.45 0.18 280))',
        color: 'white', fontWeight: 700, fontSize: 15,
      }}
    >
      {initial}
    </div>
  )
}

function FriendRow({ f, tab }: { f: Friendship; tab: Tab }) {
  const accept = useAcceptFriendRequest()
  const decline = useDeclineFriendRequest()
  const unfriend = useUnfriend()
  const name = authorName(f)
  const username = f.friend?.username

  return (
    <div className="glass-card p-3 sm:p-4 flex items-center gap-3 fz-rise">
      <Avatar name={name} url={f.friend?.avatarUrl} />
      <div className="min-w-0 flex-1">
        {username ? (
          <Link
            href={`/profile/${username}`}
            className="font-semibold truncate block"
            style={{ color: 'var(--txt-1)' }}
          >
            {name}
          </Link>
        ) : (
          <div className="font-semibold truncate" style={{ color: 'var(--txt-1)' }}>{name}</div>
        )}
        {username && (
          <div className="text-[12px] txt-soft truncate">@{username}</div>
        )}
      </div>
      <div className="flex items-center gap-1.5 shrink-0">
        {tab === 'incoming' && (
          <>
            <button
              onClick={() => accept.mutate(f.friendshipId)}
              disabled={accept.isPending}
              className="glass-btn-primary inline-flex items-center gap-1"
              style={{ padding: '6px 10px', fontSize: 12, height: 32, borderRadius: 10 }}
            >
              <Check className="h-3.5 w-3.5" strokeWidth={2.4} />
              Принять
            </button>
            <button
              onClick={() => decline.mutate(f.friendshipId)}
              disabled={decline.isPending}
              className="glass-btn"
              style={{ padding: '6px 10px', fontSize: 12, height: 32, borderRadius: 10, color: 'var(--c-red)' }}
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </>
        )}
        {tab === 'outgoing' && (
          <button
            onClick={() => decline.mutate(f.friendshipId)}
            disabled={decline.isPending}
            className="glass-btn inline-flex items-center gap-1"
            style={{ padding: '6px 10px', fontSize: 12, height: 32, borderRadius: 10 }}
          >
            <X className="h-3.5 w-3.5" />
            Отменить
          </button>
        )}
        {tab === 'accepted' && (
          <button
            onClick={() => {
              if (confirm(`Удалить ${name} из друзей?`)) unfriend.mutate(f.friendshipId)
            }}
            disabled={unfriend.isPending}
            className="glass-btn"
            style={{ padding: '6px 10px', fontSize: 12, height: 32, borderRadius: 10, color: 'var(--c-red)' }}
          >
            <X className="h-3.5 w-3.5" />
          </button>
        )}
      </div>
    </div>
  )
}

export default function FriendsPage() {
  const [tab, setTab] = useState<Tab>('accepted')
  const [username, setUsername] = useState('')

  const status: FriendshipStatus = 'pending'
  const accepted = useFriends('accepted')
  const pending = useFriends(status)
  const send = useSendFriendRequest()

  // Достаём собственный username чтобы построить invite-ссылку
  useAuthStore((s) => s.user) // подключение store на случай ререндера
  const { data: me } = useQuery({
    queryKey: ['users', 'me'],
    queryFn: async () => {
      const { data } = await api.get('/users/me')
      return data as { username: string | null }
    },
    staleTime: 60_000,
  })

  const incoming = (pending.data ?? []).filter((f) => f.direction === 'incoming')
  const outgoing = (pending.data ?? []).filter((f) => f.direction === 'outgoing')
  const visible = tab === 'accepted' ? accepted.data ?? [] : tab === 'incoming' ? incoming : outgoing

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault()
    const u = username.trim().toLowerCase()
    if (!u) return
    try {
      await send.mutateAsync(u)
      toast({ title: 'Запрос отправлен' })
      setUsername('')
      setTab('outgoing')
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string } } }
      toast({
        variant: 'destructive',
        title: 'Не удалось отправить',
        description: e?.response?.data?.message ?? 'Попробуйте ещё раз',
      })
    }
  }

  return (
    <div className="space-y-5 fz-rise">
      <div className="flex items-baseline gap-3 flex-wrap">
        <h1
          style={{
            fontSize: 'clamp(24px, 4.4vw, 28px)',
            fontWeight: 800,
            letterSpacing: -0.4,
            color: 'var(--txt-1)',
            margin: 0,
          }}
        >
          Друзья
        </h1>
      </div>

      {/* Invite */}
      <ShareInvite username={me?.username ?? null} />

      {/* Add by username */}
      <form onSubmit={handleAdd} className="glass-card p-4 sm:p-5 flex items-center gap-2 fz-rise">
        <UserPlus className="h-5 w-5 shrink-0" style={{ color: 'var(--c-accent)' }} strokeWidth={2.2} />
        <input
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          placeholder="Добавить по @username"
          autoComplete="off"
          className="flex-1 min-w-0 bg-transparent outline-none text-[14px]"
          style={{ color: 'var(--txt-1)' }}
        />
        <button
          type="submit"
          disabled={!username.trim() || send.isPending}
          className="glass-btn-primary inline-flex items-center gap-1 shrink-0 whitespace-nowrap"
          style={{
            padding: '8px 14px', fontSize: 13, height: 38, borderRadius: 11,
            opacity: !username.trim() || send.isPending ? 0.5 : 1,
            cursor: !username.trim() || send.isPending ? 'not-allowed' : 'pointer',
          }}
        >
          Отправить
        </button>
      </form>

      {/* Tabs */}
      <div className="flex gap-2 overflow-x-auto no-scrollbar -mx-1 px-1">
        {([
          { key: 'accepted', label: 'Друзья', count: accepted.data?.length ?? 0, icon: Users },
          { key: 'incoming', label: 'Входящие', count: incoming.length, icon: Clock },
          { key: 'outgoing', label: 'Исходящие', count: outgoing.length, icon: Clock },
        ] as const).map(({ key, label, count, icon: Icon }) => {
          const active = tab === key
          return (
            <button
              key={key}
              onClick={() => setTab(key)}
              className="shrink-0 inline-flex items-center gap-1.5 transition-all"
              style={{
                padding: '7px 14px',
                borderRadius: 'var(--r-pill)',
                fontSize: 13,
                fontWeight: 700,
                cursor: 'pointer',
                background: active
                  ? 'color-mix(in oklab, var(--c-accent) 24%, transparent)'
                  : 'var(--gl-bg)',
                border: active
                  ? '1px solid color-mix(in oklab, var(--c-accent) 50%, transparent)'
                  : '1px solid var(--gl-border)',
                color: active ? 'var(--c-accent)' : 'var(--txt-2)',
              }}
            >
              <Icon className="h-3.5 w-3.5" />
              {label}
              {count > 0 && (
                <span
                  className="tnum"
                  style={{
                    padding: '1px 6px',
                    borderRadius: 999,
                    background: active ? 'color-mix(in oklab, var(--c-accent) 18%, transparent)' : 'var(--gl-bg-strong)',
                    fontSize: 11, fontWeight: 700,
                  }}
                >
                  {count}
                </span>
              )}
            </button>
          )
        })}
      </div>

      {/* List */}
      {visible.length === 0 ? (
        <div className="glass-card p-6 text-center text-sm txt-muted">
          {tab === 'accepted' && 'Пока никого. Добавьте друзей по @username.'}
          {tab === 'incoming' && 'Нет входящих запросов'}
          {tab === 'outgoing' && 'Нет исходящих запросов'}
        </div>
      ) : (
        <div className="flex flex-col gap-2 sm:gap-3">
          {visible.map((f) => (
            <FriendRow key={f.friendshipId} f={f} tab={tab} />
          ))}
        </div>
      )}
    </div>
  )
}

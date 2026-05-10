'use client'

import Link from 'next/link'
import { formatDistanceToNow } from 'date-fns'
import { ru } from 'date-fns/locale'
import { Trophy, Dumbbell, Sparkles, UserPlus, Users } from 'lucide-react'
import { useFeed, type FeedItem } from '@/hooks/use-social'

function relTime(iso: string): string {
  return formatDistanceToNow(new Date(iso), { locale: ru, addSuffix: true })
}

function authorName(a: FeedItem['author']): string {
  return a.displayName || a.name || a.username || 'Атлет'
}

function authorHref(a: FeedItem['author']): string | null {
  return a.username ? `/profile/${a.username}` : null
}

function FeedRow({ item }: { item: FeedItem }) {
  const name = authorName(item.author)
  const href = authorHref(item.author)
  const initial = name.trim().slice(0, 1).toUpperCase()

  let icon: React.ReactNode
  let body: React.ReactNode
  let accent = 'var(--c-accent)'

  if (item.type === 'workout_completed') {
    icon = <Dumbbell className="h-4 w-4" strokeWidth={2.4} />
    body = (
      <div>
        <span className="font-semibold" style={{ color: 'var(--txt-1)' }}>{name}</span>{' '}
        завершил тренировку{item.data.title ? <> «<span style={{ color: 'var(--txt-1)' }}>{item.data.title}</span>»</> : null}
      </div>
    )
  } else if (item.type === 'pr_set') {
    icon = <Trophy className="h-4 w-4" strokeWidth={2.4} />
    accent = 'var(--c-green)'
    const v = typeof item.data.valueKg === 'number' ? item.data.valueKg : null
    body = (
      <div>
        <span className="font-semibold" style={{ color: 'var(--txt-1)' }}>{name}</span>{' '}
        поставил рекорд
        {item.data.exerciseName && <> в <span style={{ color: 'var(--txt-1)' }}>{item.data.exerciseName}</span></>}
        {v != null && (
          <>: <span className="tnum font-bold" style={{ color: 'var(--c-green)' }}>{v}</span> кг
            {item.data.reps ? <> × {item.data.reps}</> : null}</>
        )}
      </div>
    )
  } else {
    icon = <Sparkles className="h-4 w-4" strokeWidth={2.4} />
    accent = 'var(--c-yellow)'
    body = (
      <div>
        <span className="font-semibold" style={{ color: 'var(--txt-1)' }}>{name}</span>{' '}
        получил ачивку{' '}
        <span style={{ fontSize: 16 }}>{item.data.achievementEmoji ?? '🏆'}</span>{' '}
        <span style={{ color: 'var(--txt-1)' }}>«{item.data.achievementTitle ?? 'Достижение'}»</span>
      </div>
    )
  }

  return (
    <div className="glass-card p-4 sm:p-5 fz-rise">
      <div className="flex items-start gap-3">
        {href ? (
          <Link href={href} className="shrink-0">
            <Avatar name={initial} url={item.author.avatarUrl} />
          </Link>
        ) : (
          <Avatar name={initial} url={item.author.avatarUrl} />
        )}
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 mb-1">
            <div
              className="grid place-items-center shrink-0"
              style={{
                width: 22,
                height: 22,
                borderRadius: 7,
                background: `color-mix(in oklab, ${accent} 22%, transparent)`,
                color: accent,
              }}
            >
              {icon}
            </div>
            <span className="text-[12px] txt-soft">{relTime(item.createdAt)}</span>
          </div>
          <div className="text-[14px] sm:text-[15px] leading-snug" style={{ color: 'var(--txt-2)' }}>
            {body}
          </div>
        </div>
      </div>
    </div>
  )
}

function Avatar({ name, url }: { name: string; url: string | null }) {
  if (url) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={url} alt="" width={36} height={36} style={{ width: 36, height: 36, borderRadius: '50%', objectFit: 'cover' }} />
  }
  return (
    <div
      className="grid place-items-center"
      style={{
        width: 36, height: 36, borderRadius: '50%',
        background: 'linear-gradient(135deg, oklch(0.55 0.15 30), oklch(0.45 0.18 280))',
        color: 'white', fontWeight: 700, fontSize: 14,
      }}
    >
      {name}
    </div>
  )
}

export default function FeedPage() {
  const { data, fetchNextPage, hasNextPage, isFetchingNextPage, isLoading } = useFeed()
  const items = data?.pages.flatMap((p) => p.items) ?? []

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
          Лента
        </h1>
        <span className="text-sm txt-muted">События твои и друзей</span>
      </div>

      {isLoading && (
        <div className="space-y-3">
          {[0, 1, 2].map((i) => (
            <div key={i} className="glass-card p-5 animate-pulse h-[88px]" />
          ))}
        </div>
      )}

      {!isLoading && items.length === 0 && (
        <div className="glass-card p-6 sm:p-8 text-center fz-rise">
          <div
            className="grid place-items-center mx-auto mb-3"
            style={{
              width: 56, height: 56, borderRadius: 16,
              background: 'color-mix(in oklab, var(--c-accent) 22%, transparent)',
              color: 'var(--c-accent)',
            }}
          >
            <Users className="h-6 w-6" strokeWidth={2.2} />
          </div>
          <div className="font-semibold" style={{ color: 'var(--txt-1)' }}>Лента пока пуста</div>
          <p className="text-sm txt-muted mt-1 max-w-sm mx-auto">
            Завершите тренировку или добавьте друзей — события появятся здесь.
          </p>
          <div className="mt-4 flex justify-center gap-2">
            <Link
              href="/friends"
              className="glass-btn-primary inline-flex items-center gap-1.5"
              style={{ padding: '8px 14px', fontSize: 13, height: 38, borderRadius: 11 }}
            >
              <UserPlus className="h-4 w-4" strokeWidth={2.4} />
              Найти друзей
            </Link>
          </div>
        </div>
      )}

      {items.length > 0 && (
        <div className="flex flex-col gap-3 sm:gap-4">
          {items.map((it) => (
            <FeedRow key={it.id} item={it} />
          ))}
          {hasNextPage && (
            <button
              onClick={() => fetchNextPage()}
              disabled={isFetchingNextPage}
              className="glass-btn"
              style={{ height: 40, borderRadius: 12, fontWeight: 600, fontSize: 13 }}
            >
              {isFetchingNextPage ? 'Загрузка…' : 'Показать ещё'}
            </button>
          )}
        </div>
      )}
    </div>
  )
}

'use client'

import { useEffect, useState } from 'react'
import { Copy, Check, Share2 } from 'lucide-react'
import { toast } from '@/hooks/use-toast'

interface ShareInviteProps {
  username: string | null
}

const APP_URL = 'https://forzafit.ru'

function buildInvite(username: string) {
  const url = `${APP_URL}/profile/${username}`
  const text =
    `💪 Приходи в ForzaFit — здесь AI-тренер за 5 минут собирает план под твои цели, ` +
    `считает рекорды и корректирует тренировоки под тебя. ` +
    `Присоединяйся: я @${username} — будем рвать рекорды вместе!`
  return { url, text, full: `${text}\n${url}` }
}

interface Channel {
  key: string
  label: string
  bg: string
  fg: string
  icon: React.ReactNode
  buildHref: (text: string, url: string) => string | null
  /** true — открывает копирование вместо ссылки (если у мессенджера нет share URL) */
  copyOnly?: boolean
}

const TgIcon = (
  <svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor">
    <path d="M9.78 18.65l.28-4.23 7.68-6.92c.34-.31-.07-.46-.52-.19L7.74 13.24 3.64 11.95c-.88-.27-.89-.88.2-1.3L19.83 4.6c.73-.33 1.43.18 1.15 1.3l-2.72 12.81c-.19.91-.74 1.13-1.5.71L12.6 16.3l-1.99 1.93c-.23.23-.42.42-.83.42z"/>
  </svg>
)

const WaIcon = (
  <svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor">
    <path d="M12.04 2C6.58 2 2.13 6.45 2.13 11.91c0 1.75.46 3.45 1.32 4.95L2 22l5.25-1.38c1.45.79 3.08 1.21 4.79 1.21 5.46 0 9.91-4.45 9.91-9.91S17.5 2 12.04 2zm5.45 14.18c-.23.65-1.34 1.24-1.87 1.32-.48.07-1.09.1-1.76-.11-.41-.13-.93-.3-1.6-.59-2.82-1.22-4.66-4.07-4.8-4.25-.14-.18-1.14-1.51-1.14-2.88 0-1.37.72-2.04.97-2.32.26-.28.56-.35.75-.35h.54c.17 0 .41-.07.64.49.24.59.81 2.04.88 2.18.07.14.12.32.02.5-.1.18-.15.29-.29.45-.14.16-.3.36-.43.49-.14.14-.29.29-.13.57.16.28.71 1.18 1.53 1.91 1.05.93 1.94 1.22 2.22 1.36.28.14.44.12.6-.07.16-.19.69-.81.87-1.08.18-.28.36-.23.62-.14.26.09 1.65.78 1.93.92.28.14.47.21.54.33.07.12.07.7-.16 1.34z"/>
  </svg>
)

const TwIcon = (
  <svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor">
    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
  </svg>
)

const FbIcon = (
  <svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor">
    <path d="M22 12c0-5.52-4.48-10-10-10S2 6.48 2 12c0 4.99 3.66 9.13 8.44 9.88v-6.99H7.9V12h2.54V9.8c0-2.51 1.49-3.89 3.78-3.89 1.09 0 2.24.19 2.24.19v2.46h-1.26c-1.24 0-1.63.77-1.63 1.56V12h2.78l-.45 2.89h-2.34v6.99C18.34 21.13 22 16.99 22 12z"/>
  </svg>
)

// Max (max.ru от VK) — без публичного share-URL, делаем «Скопировать»
const MaxIcon = (
  <svg viewBox="0 0 1000 1000" width="24" height="24" fill="#fff">
    <path
      fillRule="evenodd"
      d="M508.211 878.328c-75.007 0-109.864-10.95-170.453-54.75-38.325 49.275-159.686 87.783-164.979 21.9 0-49.456-10.95-91.248-23.36-136.873-14.782-56.21-31.572-118.807-31.572-209.508 0-216.626 177.754-379.597 388.357-379.597 210.785 0 375.947 171.001 375.947 381.604.707 207.346-166.595 376.118-373.94 377.224m3.103-571.585c-102.564-5.292-182.499 65.7-200.201 177.024-14.6 92.162 11.315 204.398 33.397 210.238 10.585 2.555 37.23-18.98 53.837-35.587a189.8 189.8 0 0 0 92.71 33.032c106.273 5.112 197.08-75.794 204.215-181.95 4.154-106.382-77.67-196.486-183.958-202.574Z"
      clipRule="evenodd"
    />
  </svg>
)

const channels: Channel[] = [
  {
    key: 'telegram',
    label: 'Telegram',
    bg: '#229ED9',
    fg: '#fff',
    icon: TgIcon,
    buildHref: (text, url) =>
      `https://t.me/share/url?url=${encodeURIComponent(url)}&text=${encodeURIComponent(text)}`,
  },
  {
    key: 'whatsapp',
    label: 'WhatsApp',
    bg: '#25D366',
    fg: '#fff',
    icon: WaIcon,
    buildHref: (text, url) => `https://wa.me/?text=${encodeURIComponent(`${text} ${url}`)}`,
  },
  {
    key: 'twitter',
    label: 'X / Twitter',
    bg: '#0f1419',
    fg: '#fff',
    icon: TwIcon,
    buildHref: (text, url) =>
      `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`,
  },
  {
    key: 'facebook',
    label: 'Facebook',
    bg: '#1877F2',
    fg: '#fff',
    icon: FbIcon,
    buildHref: (_text, url) =>
      `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`,
  },
  {
    key: 'max',
    label: 'Макс',
    bg: 'linear-gradient(135deg, #4cf 0%, #53e 66%, #93d 100%)',
    fg: '#fff',
    icon: MaxIcon,
    buildHref: () => null,
    copyOnly: true,
  },
]

export function ShareInvite({ username }: ShareInviteProps) {
  const [copied, setCopied] = useState(false)
  const [hasNativeShare, setHasNativeShare] = useState(false)

  useEffect(() => {
    setHasNativeShare(typeof navigator !== 'undefined' && typeof navigator.share === 'function')
  }, [])

  if (!username) {
    return (
      <div className="glass-card p-4 text-sm txt-muted">
        Задайте @username в профиле, чтобы делиться приглашением.
      </div>
    )
  }

  const { url, text, full } = buildInvite(username)

  async function copyToClipboard() {
    try {
      await navigator.clipboard.writeText(full)
      setCopied(true)
      toast({ title: 'Ссылка скопирована' })
      setTimeout(() => setCopied(false), 1800)
    } catch {
      toast({ variant: 'destructive', title: 'Не удалось скопировать' })
    }
  }

  async function nativeShare() {
    try {
      await navigator.share({ title: 'ForzaFit', text, url })
    } catch {
      // юзер закрыл диалог — игнорируем
    }
  }

  function handleChannel(c: Channel) {
    const href = c.buildHref(text, url)
    if (c.copyOnly || !href) {
      copyToClipboard()
      toast({
        title: `Откройте ${c.label}`,
        description: 'Ссылка скопирована — вставьте в чат',
      })
      return
    }
    window.open(href, '_blank', 'noopener,noreferrer')
  }

  return (
    <div className="glass-card p-4 sm:p-5 fz-rise">
      <div className="flex items-center gap-2 mb-3">
        <Share2 className="h-4 w-4" style={{ color: 'var(--c-accent)' }} strokeWidth={2.4} />
        <span className="eyebrow" style={{ color: 'var(--c-accent)' }}>
          Пригласить друга
        </span>
      </div>
      <p className="text-[13px] txt-muted mb-3">
        Расскажите друзьям про AI-тренера, рекорды и серии — и тренируйтесь вместе.
      </p>

      <div className="grid grid-cols-3 sm:grid-cols-5 gap-2 mb-3">
        {channels.map((c) => (
          <button
            key={c.key}
            onClick={() => handleChannel(c)}
            title={c.label}
            className="flex flex-col items-center gap-1.5 hover:opacity-90 transition-opacity"
            style={{
              padding: '10px 6px',
              borderRadius: 12,
              border: '1px solid var(--gl-border)',
              background: 'var(--gl-bg)',
              cursor: 'pointer',
            }}
          >
            <span
              className="grid place-items-center"
              style={{
                width: 38,
                height: 38,
                borderRadius: 10,
                background: c.bg,
                color: c.fg,
              }}
            >
              {c.icon}
            </span>
            <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--txt-2)' }}>
              {c.label}
            </span>
          </button>
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <button
          onClick={copyToClipboard}
          className="glass-btn inline-flex items-center gap-1.5 flex-1 justify-center"
          style={{ padding: '8px 12px', height: 38, borderRadius: 11, fontSize: 13, fontWeight: 600 }}
        >
          {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
          {copied ? 'Скопировано' : 'Скопировать ссылку'}
        </button>
        {hasNativeShare && (
          <button
            onClick={nativeShare}
            className="glass-btn-primary inline-flex items-center gap-1.5"
            style={{ padding: '8px 14px', height: 38, borderRadius: 11, fontSize: 13, fontWeight: 700 }}
          >
            <Share2 className="h-4 w-4" strokeWidth={2.4} />
            Поделиться
          </button>
        )}
      </div>
      <div
        className="mt-3 text-[11px] txt-soft truncate"
        title={url}
        style={{ fontFamily: 'ui-monospace, "SF Mono", Menlo, monospace' }}
      >
        {url}
      </div>
    </div>
  )
}

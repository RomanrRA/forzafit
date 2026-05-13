'use client'

import { useEffect, useState } from 'react'
import { api } from '@/lib/api'
import { toast } from '@/hooks/use-toast'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Apple, Calendar, Copy } from 'lucide-react'

interface SubscribeData {
  token: string
  feedUrl: string
  webcalUrl: string
  googleUrl: string
}

export function CalendarSubscribeDialog({
  open,
  onOpenChange,
}: {
  open: boolean
  onOpenChange: (v: boolean) => void
}) {
  const [data, setData] = useState<SubscribeData | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!open || data) return
    setLoading(true)
    api
      .post('/calendar/token')
      .then((r) => setData(r.data))
      .catch(() =>
        toast({
          variant: 'destructive',
          title: 'Ошибка',
          description: 'Не удалось получить ссылку календаря',
        }),
      )
      .finally(() => setLoading(false))
  }, [open, data])

  const handleCopy = async () => {
    if (!data) return
    try {
      await navigator.clipboard.writeText(data.feedUrl)
      toast({ title: 'Ссылка скопирована' })
    } catch {
      toast({ variant: 'destructive', title: 'Не удалось скопировать' })
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[calc(100vw-2rem)] sm:max-w-md overflow-hidden">
        <DialogHeader>
          <DialogTitle>Подписаться на календарь</DialogTitle>
          <DialogDescription>
            Подписка обновляется автоматически — новые тренировки появятся сами.
          </DialogDescription>
        </DialogHeader>

        {loading && (
          <div className="text-sm text-muted-foreground py-2">Загрузка...</div>
        )}

        {data && (
          <div className="space-y-3 pt-1 min-w-0">
            <a
              href={data.webcalUrl}
              className="flex items-center gap-3 rounded-xl border border-border p-3 hover:border-primary/60 hover:bg-accent/50 transition-colors min-w-0 overflow-hidden"
            >
              <Apple className="h-5 w-5 shrink-0" />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium leading-tight">Apple Calendar</p>
                <p className="text-xs text-muted-foreground leading-snug">iPhone / Mac — откроется «Календарь»</p>
              </div>
            </a>

            <a
              href={data.googleUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-3 rounded-xl border border-border p-3 hover:border-primary/60 hover:bg-accent/50 transition-colors min-w-0 overflow-hidden"
            >
              <Calendar className="h-5 w-5 shrink-0" />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium leading-tight">Google Calendar</p>
                <p className="text-xs text-muted-foreground leading-snug">Откроется в новой вкладке</p>
              </div>
            </a>

            <div className="rounded-xl border border-border p-3 space-y-2 min-w-0 overflow-hidden">
              <p className="text-xs font-medium text-muted-foreground">Другой календарь — скопируйте ссылку:</p>
              <Button
                variant="outline"
                size="sm"
                onClick={handleCopy}
                className="w-full"
              >
                <Copy className="h-3.5 w-3.5 mr-1.5" />
                Скопировать ссылку
              </Button>
            </div>

            <p className="text-xs text-muted-foreground leading-snug">
              Ссылка персональная — не делитесь ей.
            </p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}

'use client'

import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { Suspense } from 'react'
import { Button } from '@/components/ui/button'
import { ArrowLeft, Pencil, Sparkles } from 'lucide-react'
import { PlanBuilder } from '@/components/plans/plan-builder'
import { AiPlanWizard } from '@/components/plans/ai-plan-wizard'
import { useCreatePlanTemplate } from '@/hooks/use-plan-templates'
import { toast } from '@/hooks/use-toast'

// ─── Chooser ──────────────────────────────────────────────────────────────────

function ModeChooser({ from }: { from: string | null }) {
  const fromSuffix = from ? `&from=${encodeURIComponent(from)}` : ''
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Новый план</h1>
        <p className="text-sm text-muted-foreground mt-0.5">Выберите способ создания</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {/* Manual */}
        <Link
          href={`/plans/new?mode=manual${fromSuffix}`}
          className="glass-card p-6 flex flex-col gap-3 hover:scale-[1.02] transition-transform cursor-pointer"
        >
          <div className="w-11 h-11 rounded-2xl bg-primary/10 flex items-center justify-center">
            <Pencil className="h-5 w-5 text-primary" />
          </div>
          <div>
            <p className="font-semibold text-base">Создать вручную</p>
            <p className="text-sm text-muted-foreground mt-0.5 leading-snug">
              Выберите дни и упражнения самостоятельно
            </p>
          </div>
          <span className="mt-auto text-sm font-medium text-primary">Открыть конструктор &rarr;</span>
        </Link>

        {/* AI */}
        <Link
          href={`/plans/new?ai=1${fromSuffix}`}
          className="glass-card p-6 flex flex-col gap-3 hover:scale-[1.02] transition-transform cursor-pointer"
        >
          <div className="w-11 h-11 rounded-2xl bg-primary/10 flex items-center justify-center">
            <Sparkles className="h-5 w-5 text-primary" />
          </div>
          <div>
            <p className="font-semibold text-base">Собрать с ИИ</p>
            <p className="text-sm text-muted-foreground mt-0.5 leading-snug">
              AI-тренер задаст вопросы и составит план под ваши цели
            </p>
          </div>
          <span className="mt-auto text-sm font-medium text-primary">Начать диалог &rarr;</span>
        </Link>
      </div>
    </div>
  )
}

// ─── Manual form ──────────────────────────────────────────────────────────────

function ManualForm() {
  const router = useRouter()
  const { mutateAsync, isPending } = useCreatePlanTemplate()

  async function handleSave(data: Parameters<typeof mutateAsync>[0]) {
    try {
      await mutateAsync(data)
      toast({ title: 'План создан' })
      router.push('/plans')
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string | string[] } } }
      const msg = e?.response?.data?.message
      const text = Array.isArray(msg) ? msg.join(', ') : (msg ?? 'Не удалось создать план')
      toast({ variant: 'destructive', title: 'Ошибка', description: text })
    }
  }

  return <PlanBuilder onSave={handleSave} saving={isPending} />
}

// ─── Page content (reads search params, must be inside Suspense) ──────────────

// Только относительные пути на свой же сайт — защита от open redirect.
function safeFrom(raw: string | null): string | null {
  if (!raw) return null
  if (!raw.startsWith('/') || raw.startsWith('//')) return null
  return raw
}

function PageContent() {
  const params = useSearchParams()
  const isAi = params.get('ai') === '1'
  const isManual = params.get('mode') === 'manual'
  const from = safeFrom(params.get('from'))

  let title = 'Новый план'
  let subtitle = 'Создайте свою программу тренировок'
  if (isAi) {
    title = 'AI-тренер'
    subtitle = 'Подберём цель по фигуре и план под неё'
  } else if (isManual) {
    subtitle = 'Заполните детали вручную'
  }

  const backHref = from ?? '/plans'

  // Show chooser when no mode is selected
  if (!isAi && !isManual) {
    return (
      <div className="max-w-2xl space-y-5">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" asChild>
            <Link href={backHref}>
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div>
            <h1 className="text-2xl font-bold">{title}</h1>
            <p className="text-sm text-muted-foreground">{subtitle}</p>
          </div>
        </div>
        <ModeChooser from={from} />
      </div>
    )
  }

  return (
    <div className={isAi ? 'max-w-2xl space-y-5' : 'max-w-2xl space-y-5'}>
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" asChild>
          {/* В sub-mode: на источник (from) или сразу на /plans, минуя chooser */}
          <Link href={backHref}>
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div>
          <h1 className="text-2xl font-bold">{title}</h1>
          <p className="text-sm text-muted-foreground">{subtitle}</p>
        </div>
      </div>

      {isAi ? <AiPlanWizard /> : <ManualForm />}
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function NewPlanPage() {
  return (
    <Suspense
      fallback={
        <div className="max-w-2xl space-y-5">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" asChild>
              <Link href="/plans">
                <ArrowLeft className="h-4 w-4" />
              </Link>
            </Button>
            <div>
              <h1 className="text-2xl font-bold">Новый план</h1>
              <p className="text-sm text-muted-foreground">Загрузка...</p>
            </div>
          </div>
        </div>
      }
    >
      <PageContent />
    </Suspense>
  )
}

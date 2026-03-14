'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { ArrowLeft } from 'lucide-react'
import { PlanBuilder } from '@/components/plans/plan-builder'
import { useCreatePlanTemplate } from '@/hooks/use-plan-templates'
import { toast } from '@/hooks/use-toast'

export default function NewPlanPage() {
  const router = useRouter()
  const { mutateAsync, isPending } = useCreatePlanTemplate()

  async function handleSave(data: Parameters<typeof mutateAsync>[0]) {
    try {
      await mutateAsync(data)
      toast({ title: 'План создан' })
      router.push('/plans')
    } catch (err: any) {
      const msg = err?.response?.data?.message
      const text = Array.isArray(msg) ? msg.join(', ') : (msg ?? 'Не удалось создать план')
      toast({ variant: 'destructive', title: 'Ошибка', description: text })
    }
  }

  return (
    <div className="max-w-2xl space-y-5">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/plans"><ArrowLeft className="h-4 w-4" /></Link>
        </Button>
        <div>
          <h1 className="text-2xl font-bold">Новый план</h1>
          <p className="text-sm text-muted-foreground">Создайте свою программу тренировок</p>
        </div>
      </div>

      <PlanBuilder onSave={handleSave} saving={isPending} />
    </div>
  )
}

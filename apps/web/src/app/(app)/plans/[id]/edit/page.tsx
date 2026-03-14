'use client'

import { use } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { ArrowLeft } from 'lucide-react'
import { PlanBuilder } from '@/components/plans/plan-builder'
import { usePlanTemplate, useUpdatePlanTemplate } from '@/hooks/use-plan-templates'
import { toast } from '@/hooks/use-toast'

interface Props {
  params: Promise<{ id: string }>
}

export default function EditPlanPage({ params }: Props) {
  const { id } = use(params)
  const router = useRouter()
  const { data: plan, isLoading } = usePlanTemplate(id)
  const { mutateAsync, isPending } = useUpdatePlanTemplate(id)

  async function handleSave(data: Parameters<typeof mutateAsync>[0]) {
    try {
      await mutateAsync(data)
      toast({ title: 'План обновлён' })
      router.push(`/plans/${id}`)
    } catch (err: any) {
      const msg = err?.response?.data?.message
      const text = Array.isArray(msg) ? msg.join(', ') : (msg ?? 'Не удалось обновить план')
      toast({ variant: 'destructive', title: 'Ошибка', description: text })
    }
  }

  if (isLoading) {
    return <div className="text-muted-foreground text-sm p-4">Загрузка...</div>
  }

  if (!plan) {
    return <div className="text-muted-foreground text-sm p-4">План не найден</div>
  }

  return (
    <div className="max-w-2xl space-y-5">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" asChild>
          <Link href={`/plans/${id}`}><ArrowLeft className="h-4 w-4" /></Link>
        </Button>
        <div>
          <h1 className="text-2xl font-bold">Редактировать план</h1>
          <p className="text-sm text-muted-foreground">{plan.name}</p>
        </div>
      </div>

      <PlanBuilder initialData={plan} onSave={handleSave} saving={isPending} />
    </div>
  )
}

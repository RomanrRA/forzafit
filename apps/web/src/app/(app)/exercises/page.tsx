'use client'

import { useState } from 'react'
import { useExercises, useDeleteExercise, type Exercise } from '@/hooks/use-exercises'
import { ExerciseFilters } from '@/components/exercises/exercise-filters'
import { CreateExerciseDialog } from '@/components/exercises/create-exercise-dialog'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog'
import { Search, Trash2, BookOpen, Dumbbell, ZoomIn } from 'lucide-react'
import { toast } from '@/hooks/use-toast'
import { muscleRu, equipmentRu, DIFFICULTY_LABEL } from '@/lib/exercise-labels'

const MUSCLE_HEX: Record<string, string> = {
  грудь: '#f43f5e',      chest: '#f43f5e',
  спина: '#3b82f6',      back: '#3b82f6',
  ноги: '#22c55e',       legs: '#22c55e',
  квадрицепс: '#22c55e', хамстринг: '#10b981',
  бицепс: '#f59e0b',     biceps: '#f59e0b',
  трицепс: '#f97316',    triceps: '#f97316',
  плечи: '#a855f7',      shoulders: '#a855f7',
  пресс: '#eab308',      core: '#eab308', abs: '#eab308',
  ягодицы: '#ec4899',    glutes: '#ec4899',
  икры: '#14b8a6',       calves: '#14b8a6',
}

function getPlaceholderColor(muscleGroups: string[]): string {
  const key = (muscleGroups[0] ?? '').toLowerCase()
  return MUSCLE_HEX[key] ?? '#6b7280'
}

export default function ExercisesPage() {
  const [search, setSearch] = useState('')
  const [muscleGroup, setMuscleGroup] = useState('all')
  const [equipment, setEquipment] = useState('all')
  const [difficulty, setDifficulty] = useState('all')

  const { data, isLoading } = useExercises({
    search: search || undefined,
    muscleGroup: muscleGroup !== 'all' ? muscleGroup : undefined,
    equipment: equipment !== 'all' ? equipment : undefined,
    difficulty: difficulty !== 'all' ? difficulty : undefined,
  })

  const deleteExercise = useDeleteExercise()
  const exercises = data?.items ?? []
  const [preview, setPreview] = useState<Exercise | null>(null)

  async function handleDelete(id: string, name: string) {
    if (!confirm(`Удалить упражнение "${name}"?`)) return
    try {
      await deleteExercise.mutateAsync(id)
      toast({ title: 'Упражнение удалено' })
    } catch {
      toast({ variant: 'destructive', title: 'Ошибка', description: 'Не удалось удалить упражнение' })
    }
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Упражнения</h1>
        <CreateExerciseDialog />
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Поиск упражнения..."
          className="pl-9"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      <ExerciseFilters
        muscleGroup={muscleGroup}
        equipment={equipment}
        difficulty={difficulty}
        onChangeMuscle={setMuscleGroup}
        onChangeEquip={setEquipment}
        onChangeDiff={setDifficulty}
        onReset={() => { setMuscleGroup('all'); setEquipment('all'); setDifficulty('all') }}
      />

      {isLoading && <p className="text-muted-foreground">Загрузка...</p>}

      {!isLoading && exercises.length === 0 && (
        <div className="text-center py-16 text-muted-foreground">
          <BookOpen className="h-12 w-12 mx-auto mb-3 opacity-30" />
          <p>Упражнения не найдены</p>
        </div>
      )}

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {exercises.map((ex) => (
          <Card key={ex.id} className="overflow-hidden">
            {/* Image / placeholder */}
            <div
              className="relative w-full h-36 overflow-hidden cursor-pointer group"
              onClick={() => ex.animationUrl && setPreview(ex)}
            >
              {ex.animationUrl ? (
                <>
                  <img
                    src={ex.animationUrl}
                    alt={ex.name}
                    className="w-full h-full object-cover transition-transform group-hover:scale-105"
                  />
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center">
                    <ZoomIn className="h-8 w-8 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>
                </>
              ) : (
                <div
                  className="w-full h-full flex items-center justify-center"
                  style={{ backgroundColor: `${getPlaceholderColor(ex.muscleGroups)}25` }}
                >
                  <Dumbbell
                    className="h-12 w-12"
                    style={{ color: getPlaceholderColor(ex.muscleGroups), opacity: 0.5 }}
                  />
                </div>
              )}
              {ex.isCustom && (
                <Badge className="absolute top-2 right-2 text-xs">Своё</Badge>
              )}
            </div>

            <CardContent className="p-3">
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate">{ex.name}</p>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {ex.muscleGroups?.slice(0, 2).map((mg) => (
                      <Badge key={mg} variant="secondary" className="text-xs">{muscleRu(mg)}</Badge>
                    ))}
                    {ex.equipment && (
                      <Badge variant="outline" className="text-xs">{equipmentRu(ex.equipment)}</Badge>
                    )}
                    {ex.difficulty && (
                      <Badge variant="outline" className="text-xs">
                        {DIFFICULTY_LABEL[ex.difficulty] ?? ex.difficulty}
                      </Badge>
                    )}
                  </div>
                </div>
                {ex.isCustom && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 shrink-0 text-muted-foreground hover:text-destructive"
                    onClick={() => handleDelete(ex.id, ex.name)}
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {data && (
        <p className="text-sm text-muted-foreground">Найдено: {data.total}</p>
      )}

      <Dialog open={!!preview} onOpenChange={(open) => !open && setPreview(null)}>
        <DialogContent className="max-w-lg p-4">
          {preview && (
            <div className="space-y-3">
              <img
                src={preview.animationUrl!}
                alt={preview.name}
                className="w-full rounded-md"
              />
              <div>
                <DialogTitle className="font-semibold text-lg">{preview.name}</DialogTitle>
                <div className="flex flex-wrap gap-1 mt-1">
                  {preview.muscleGroups?.map((mg) => (
                    <Badge key={mg} variant="secondary" className="text-xs">{muscleRu(mg)}</Badge>
                  ))}
                  {preview.equipment && (
                    <Badge variant="outline" className="text-xs">{equipmentRu(preview.equipment)}</Badge>
                  )}
                  {preview.difficulty && (
                    <Badge variant="outline" className="text-xs">
                      {DIFFICULTY_LABEL[preview.difficulty] ?? preview.difficulty}
                    </Badge>
                  )}
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}

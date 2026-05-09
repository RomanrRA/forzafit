'use client'

import {
  DndContext,
  DragEndEvent,
  PointerSensor,
  TouchSensor,
  KeyboardSensor,
  closestCenter,
  useSensor,
  useSensors,
} from '@dnd-kit/core'
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { GripVertical } from 'lucide-react'
import { WorkoutExercise, useReorderWorkoutExercises } from '@/hooks/use-workouts'
import { ExerciseRow } from './exercise-row'

interface Props {
  workoutId: string
  exercises: WorkoutExercise[]
}

export function SortableWorkoutExercises({ workoutId, exercises }: Props) {
  const reorder = useReorderWorkoutExercises(workoutId)

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  )

  function handleDragEnd(e: DragEndEvent) {
    const { active, over } = e
    if (!over || active.id === over.id) return
    const oldIndex = exercises.findIndex((ex) => ex.id === active.id)
    const newIndex = exercises.findIndex((ex) => ex.id === over.id)
    if (oldIndex < 0 || newIndex < 0) return
    const next = arrayMove(exercises, oldIndex, newIndex).map((ex) => ex.id)
    reorder.mutate(next)
  }

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
      <SortableContext
        items={exercises.map((ex) => ex.id)}
        strategy={verticalListSortingStrategy}
      >
        <div className="space-y-3">
          {exercises.map((ex) => (
            <SortableItem key={ex.id} workoutId={workoutId} ex={ex} />
          ))}
        </div>
      </SortableContext>
    </DndContext>
  )
}

function SortableItem({
  workoutId,
  ex,
}: {
  workoutId: string
  ex: WorkoutExercise
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: ex.id })

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 30 : undefined,
    opacity: isDragging ? 0.85 : 1,
  }

  return (
    <div ref={setNodeRef} style={style} className="flex items-stretch gap-1.5">
      <button
        type="button"
        {...attributes}
        {...listeners}
        aria-label="Перетащить упражнение"
        className="grid shrink-0 place-items-center cursor-grab touch-none rounded-lg"
        style={{
          width: 24,
          color: 'var(--txt-3)',
        }}
      >
        <GripVertical className="h-4 w-4" />
      </button>
      <div className="flex-1 min-w-0">
        <ExerciseRow workoutId={workoutId} workoutExercise={ex} />
      </div>
    </div>
  )
}

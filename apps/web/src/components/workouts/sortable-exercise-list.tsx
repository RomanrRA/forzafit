'use client'

import {
  DndContext,
  DragEndEvent,
  PointerSensor,
  TouchSensor,
  closestCenter,
  useSensor,
  useSensors,
  KeyboardSensor,
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

export interface ExerciseItem {
  id: string
  name: string
  muscleGroup?: string | null
  totalSets: number
  doneSets: number
  isActive?: boolean
}

interface Props {
  items: ExerciseItem[]
  onReorder: (orderedIds: string[]) => void
  onSelect?: (id: string) => void
  showProgress?: boolean
}

export function SortableExerciseList({ items, onReorder, onSelect, showProgress = true }: Props) {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 180, tolerance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  )

  function handleDragEnd(e: DragEndEvent) {
    const { active, over } = e
    if (!over || active.id === over.id) return
    const oldIndex = items.findIndex((it) => it.id === active.id)
    const newIndex = items.findIndex((it) => it.id === over.id)
    if (oldIndex < 0 || newIndex < 0) return
    const next = arrayMove(items, oldIndex, newIndex).map((it) => it.id)
    onReorder(next)
  }

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
      <SortableContext items={items.map((it) => it.id)} strategy={verticalListSortingStrategy}>
        <div className="flex flex-col gap-1.5">
          {items.map((it) => (
            <SortableRow key={it.id} item={it} onSelect={onSelect} showProgress={showProgress} />
          ))}
        </div>
      </SortableContext>
    </DndContext>
  )
}

function SortableRow({
  item,
  onSelect,
  showProgress,
}: {
  item: ExerciseItem
  onSelect?: (id: string) => void
  showProgress: boolean
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: item.id,
  })
  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 30 : undefined,
    opacity: isDragging ? 0.85 : 1,
  }

  const allDone = item.totalSets > 0 && item.doneSets === item.totalSets

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`glass-card flex items-center gap-2 ${item.isActive ? 'strong' : ''}`}
    >
      {/* Drag handle */}
      <button
        type="button"
        {...attributes}
        {...listeners}
        aria-label="Перетащить"
        className="grid shrink-0 place-items-center cursor-grab touch-none"
        style={{
          width: 32,
          height: 44,
          color: 'var(--txt-3)',
        }}
      >
        <GripVertical className="h-4 w-4" />
      </button>

      {/* Body */}
      <button
        type="button"
        onClick={onSelect ? () => onSelect(item.id) : undefined}
        className="flex flex-1 items-center gap-3 min-w-0 text-left"
        style={{
          padding: '10px 12px 10px 0',
          background: 'transparent',
          border: 0,
          cursor: onSelect ? 'pointer' : 'default',
        }}
      >
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            {item.muscleGroup && (
              <span
                style={{
                  fontSize: 10,
                  fontWeight: 800,
                  letterSpacing: 0.5,
                  textTransform: 'uppercase',
                  padding: '2px 6px',
                  borderRadius: 999,
                  background: 'var(--gl-bg)',
                  color: 'var(--txt-3)',
                  border: '1px solid var(--gl-border)',
                }}
              >
                {item.muscleGroup}
              </span>
            )}
            <span
              className="truncate"
              style={{
                fontSize: 14,
                fontWeight: item.isActive ? 800 : 600,
                color: item.isActive
                  ? 'var(--txt-1)'
                  : allDone
                  ? 'var(--txt-3)'
                  : 'var(--txt-1)',
                textDecoration: allDone ? 'line-through' : 'none',
              }}
            >
              {item.name}
            </span>
          </div>

          {showProgress && item.totalSets > 0 && (
            <div className="mt-1.5 flex items-center gap-1">
              {Array.from({ length: item.totalSets }).map((_, i) => {
                const done = i < item.doneSets
                return (
                  <div
                    key={i}
                    style={{
                      flex: 1,
                      maxWidth: 36,
                      height: 5,
                      borderRadius: 999,
                      background: done
                        ? 'color-mix(in oklab, var(--c-green) 60%, transparent)'
                        : 'var(--gl-bg)',
                    }}
                  />
                )
              })}
            </div>
          )}
        </div>

        <span
          className="tnum shrink-0"
          style={{
            fontSize: 12,
            color: allDone ? 'var(--c-green)' : 'var(--txt-3)',
            fontWeight: 700,
          }}
        >
          {item.doneSets}
          <span style={{ color: 'var(--txt-3)', margin: '0 2px' }}>/</span>
          {item.totalSets || '—'}
        </span>
      </button>
    </div>
  )
}

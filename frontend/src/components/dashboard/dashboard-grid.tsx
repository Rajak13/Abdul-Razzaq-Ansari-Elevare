'use client'

import { useDashboardStore } from '@/lib/stores/dashboard-store'
import {
    DndContext,
    DragEndEvent,
    DragOverlay,
    DragStartEvent,
    MouseSensor,
    TouchSensor,
    closestCenter,
    useSensor,
    useSensors,
} from '@dnd-kit/core'
import {
    SortableContext,
    rectSortingStrategy
} from '@dnd-kit/sortable'
import { useState } from 'react'
import { DraggableWidget } from './draggable-widget'
import { WidgetRenderer } from './widget-renderer'

interface DashboardGridProps {
  className?: string
}

export function DashboardGrid({ className }: DashboardGridProps) {
  const { widgets, isEditing, reorderWidgets } = useDashboardStore()
  const [activeId, setActiveId] = useState<string | null>(null)

  const sensors = useSensors(
    useSensor(MouseSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(TouchSensor, {
      activationConstraint: {
        delay: 200,
        tolerance: 6,
      },
    })
  )

  const visibleWidgets = widgets.filter((widget) => widget.visible)

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string)
  }

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event

    if (over && active.id !== over.id) {
      reorderWidgets(active.id as string, over.id as string)
    }

    setActiveId(null)
  }

  const activeWidget = activeId ? widgets.find((w) => w.id === activeId) : null

  if (visibleWidgets.length === 0) {
    return (
      <div className={`${className} flex items-center justify-center min-h-[400px]`}>
        <div className="text-center">
          <div className="text-muted-foreground text-lg mb-2">No widgets to display</div>
          <p className="text-sm text-muted-foreground">
            Add widgets using the controls above to customize your dashboard.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className={`p-6 ${className}`}>
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <SortableContext
          items={visibleWidgets.map((w) => w.id)}
          strategy={rectSortingStrategy}
        >
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {visibleWidgets.map((widget) => (
              <DraggableWidget
                key={widget.id}
                widget={widget}
                isEditing={isEditing}
              >
                <WidgetRenderer widget={widget} />
              </DraggableWidget>
            ))}
          </div>
        </SortableContext>

        <DragOverlay>
          {activeWidget ? (
            <div className="opacity-50 transform rotate-3 scale-105">
              <WidgetRenderer widget={activeWidget} />
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>
    </div>
  )
}
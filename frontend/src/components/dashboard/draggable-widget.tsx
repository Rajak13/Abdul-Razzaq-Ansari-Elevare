'use client'

import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { useDashboardStore, type WidgetConfig } from '@/lib/stores/dashboard-store'
import { cn } from '@/lib/utils'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { Copy, Eye, EyeOff, GripVertical, MoreVertical, Settings, X } from 'lucide-react'
import { WidgetSizeControls } from './widget-size-controls'

interface DraggableWidgetProps {
  widget: WidgetConfig
  children: React.ReactNode
  isEditing: boolean
}

export function DraggableWidget({
  widget,
  children,
  isEditing,
}: DraggableWidgetProps) {
  const { removeWidget, toggleWidget, duplicateWidget } = useDashboardStore()

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: widget.id,
    disabled: !isEditing,
  })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  }

  const handleRemove = (e: React.MouseEvent) => {
    e.stopPropagation()
    removeWidget(widget.id)
  }

  const handleToggleVisibility = (e: React.MouseEvent) => {
    e.stopPropagation()
    toggleWidget(widget.id)
  }

  const handleDuplicate = (e: React.MouseEvent) => {
    e.stopPropagation()
    duplicateWidget(widget.id)
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        'relative group',
        isDragging && 'opacity-50',
        isEditing && 'ring-2 ring-primary/20 rounded-lg'
      )}
      {...attributes}
    >
      {/* Edit Controls */}
      {isEditing && (
        <div className="absolute -top-2 -right-2 z-10 flex space-x-1">
          <Button
            size="sm"
            variant="secondary"
            className="h-6 w-6 p-0"
            onClick={handleToggleVisibility}
          >
            {widget.visible ? (
              <Eye className="h-3 w-3" />
            ) : (
              <EyeOff className="h-3 w-3" />
            )}
          </Button>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button size="sm" variant="secondary" className="h-6 w-6 p-0">
                <MoreVertical className="h-3 w-3" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={handleDuplicate}>
                <Copy className="h-3 w-3 mr-2" />
                Duplicate
              </DropdownMenuItem>
              <DropdownMenuItem disabled>
                <Settings className="h-3 w-3 mr-2" />
                Settings
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleRemove} className="text-destructive">
                <X className="h-3 w-3 mr-2" />
                Remove
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      )}

      {/* Drag Handle */}
      {isEditing && (
        <div
          className="absolute top-2 left-2 z-10 cursor-grab active:cursor-grabbing opacity-0 group-hover:opacity-100 transition-opacity"
          {...listeners}
        >
          <GripVertical className="h-4 w-4 text-muted-foreground" />
        </div>
      )}

      {/* Size Controls */}
      {isEditing && (
        <div className="absolute -bottom-2 -left-2 z-10 opacity-0 group-hover:opacity-100 transition-opacity">
          <WidgetSizeControls widget={widget} />
        </div>
      )}

      {/* Widget Content */}
      <div className={cn(isEditing && 'pointer-events-none')}>
        {children}
      </div>
    </div>
  )
}
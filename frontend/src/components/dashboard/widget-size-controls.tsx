'use client'

import { Button } from '@/components/ui/button'
import { useDashboardStore, type WidgetConfig } from '@/lib/stores/dashboard-store'
import { Minus, Plus } from 'lucide-react'

interface WidgetSizeControlsProps {
  widget: WidgetConfig
  className?: string
}

export function WidgetSizeControls({ widget, className }: WidgetSizeControlsProps) {
  const { updateWidget } = useDashboardStore()

  const handleWidthChange = (delta: number) => {
    const newWidth = Math.max(1, Math.min(4, widget.size.width + delta))
    updateWidget(widget.id, {
      size: { ...widget.size, width: newWidth }
    })
  }

  const handleHeightChange = (delta: number) => {
    const newHeight = Math.max(1, Math.min(3, widget.size.height + delta))
    updateWidget(widget.id, {
      size: { ...widget.size, height: newHeight }
    })
  }

  return (
    <div className={`flex items-center space-x-2 ${className}`}>
      <div className="flex items-center space-x-1">
        <span className="text-xs text-muted-foreground">W:</span>
        <Button
          size="sm"
          variant="outline"
          className="h-5 w-5 p-0"
          onClick={() => handleWidthChange(-1)}
          disabled={widget.size.width <= 1}
        >
          <Minus className="h-2 w-2" />
        </Button>
        <span className="text-xs w-4 text-center">{widget.size.width}</span>
        <Button
          size="sm"
          variant="outline"
          className="h-5 w-5 p-0"
          onClick={() => handleWidthChange(1)}
          disabled={widget.size.width >= 4}
        >
          <Plus className="h-2 w-2" />
        </Button>
      </div>
      
      <div className="flex items-center space-x-1">
        <span className="text-xs text-muted-foreground">H:</span>
        <Button
          size="sm"
          variant="outline"
          className="h-5 w-5 p-0"
          onClick={() => handleHeightChange(-1)}
          disabled={widget.size.height <= 1}
        >
          <Minus className="h-2 w-2" />
        </Button>
        <span className="text-xs w-4 text-center">{widget.size.height}</span>
        <Button
          size="sm"
          variant="outline"
          className="h-5 w-5 p-0"
          onClick={() => handleHeightChange(1)}
          disabled={widget.size.height >= 3}
        >
          <Plus className="h-2 w-2" />
        </Button>
      </div>
    </div>
  )
}
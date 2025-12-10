'use client'

import { type WidgetConfig } from '@/lib/stores/dashboard-store'
import {
    ActivityWidget,
    CalendarWidget,
    RecentNotesWidget,
    TasksOverviewWidget,
    StatsWidget,
} from './widgets'
import { ProductivityChartWidget } from './widgets/productivity-chart-widget'
import { StudyGroupsWidget } from './widgets/study-groups-widget'
import { ProgressStatsWidget } from './widgets/progress-stats-widget'

interface WidgetRendererProps {
  widget: WidgetConfig
  className?: string
}

export function WidgetRenderer({ widget, className }: WidgetRendererProps) {
  const getWidgetSize = (widget: WidgetConfig) => {
    const { width, height } = widget.size
    
    // Map widget size to CSS classes
    const widthClass = width === 1 ? 'col-span-1' : 
                      width === 2 ? 'md:col-span-2' : 
                      width === 3 ? 'lg:col-span-3' : 
                      'lg:col-span-4'
    
    const heightClass = height === 1 ? 'row-span-1' : 
                       height === 2 ? 'row-span-2' : 
                       'row-span-3'
    
    return `${widthClass} ${heightClass}`
  }

  const widgetClassName = `${getWidgetSize(widget)} ${className || ''}`

  switch (widget.type) {
    case 'tasks-overview':
      return <TasksOverviewWidget className={widgetClassName} />
    
    case 'recent-notes':
      return <RecentNotesWidget className={widgetClassName} />
    
    case 'calendar':
      return <CalendarWidget className={widgetClassName} />
    
    case 'activity':
      return <ActivityWidget className={widgetClassName} />
    
    case 'stats':
      return <StatsWidget className={widgetClassName} />
    
    case 'productivity-chart':
      return <ProductivityChartWidget className={widgetClassName} />
    
    case 'study-groups':
      return <StudyGroupsWidget className={widgetClassName} />
    
    case 'progress-stats':
      return <ProgressStatsWidget className={widgetClassName} />
    
    default:
      return (
        <div className={`${widgetClassName} p-4 border rounded-lg`}>
          <p>Unknown widget type: {widget.type}</p>
        </div>
      )
  }
}
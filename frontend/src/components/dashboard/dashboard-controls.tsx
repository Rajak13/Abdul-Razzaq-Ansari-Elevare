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
import {
    Activity,
    BarChart3,
    Calendar,
    CheckSquare,
    Edit3,
    FileText,
    Plus,
    RotateCcw,
    Settings,
    Users,
    Target,
    TrendingUp,
} from 'lucide-react'
import { useState } from 'react'
import { DashboardSettings } from './dashboard-settings'
import { useTranslations } from 'next-intl'

interface DashboardControlsProps {
  className?: string
}

export function DashboardControls({ className }: DashboardControlsProps) {
  const t = useTranslations('dashboard')
  const { isEditing, setEditing, addWidget, resetLayout } = useDashboardStore()
  const [settingsOpen, setSettingsOpen] = useState(false)

  const availableWidgets = [
    {
      type: 'tasks-overview' as const,
      title: t('widgets.tasks.title'),
      icon: CheckSquare,
      description: t('widgets.tasks.description'),
    },
    {
      type: 'recent-notes' as const,
      title: t('widgets.recentNotes.title'),
      icon: FileText,
      description: t('widgets.recentNotes.description'),
    },
    {
      type: 'calendar' as const,
      title: t('widgets.calendar.title'),
      icon: Calendar,
      description: t('widgets.calendar.description'),
    },
    {
      type: 'activity' as const,
      title: t('widgets.activity.title'),
      icon: Activity,
      description: t('widgets.activity.description'),
    },
    {
      type: 'stats' as const,
      title: t('widgets.stats.title'),
      icon: BarChart3,
      description: t('widgets.stats.description'),
    },
    {
      type: 'productivity-chart' as const,
      title: t('widgets.productivity.title'),
      icon: TrendingUp,
      description: t('widgets.productivity.description'),
    },
    {
      type: 'study-groups' as const,
      title: t('widgets.studyGroups.title'),
      icon: Users,
      description: t('widgets.studyGroups.description'),
    },
    {
      type: 'progress-stats' as const,
      title: t('widgets.progress.title'),
      icon: Target,
      description: t('widgets.progress.description'),
    },
  ]

  const handleAddWidget = (widgetType: string, title: string) => {
    addWidget({
      type: widgetType as WidgetConfig['type'],
      title,
      position: { x: 0, y: 0 },
      size: { width: 2, height: 2 },
      visible: true,
    })
  }

  const handleToggleEdit = () => {
    setEditing(!isEditing)
  }

  const handleResetLayout = () => {
    resetLayout()
    setEditing(false)
  }

  return (
    <div className={`flex items-center gap-1.5 sm:gap-2 ${className}`}>
      {/* Edit Toggle */}
      <Button
        id="tour-dashboard-customize"
        variant={isEditing ? 'default' : 'outline'}
        size="sm"
        onClick={handleToggleEdit}
        className="h-8 sm:h-9 text-xs sm:text-sm px-2 sm:px-3"
      >
        <Edit3 className="h-3.5 w-3.5 sm:h-4 sm:w-4 sm:mr-2" />
        <span className="hidden sm:inline">{isEditing ? t('cancelEdit') : t('customize')}</span>
      </Button>

      {/* Add Widget Dropdown */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button id="tour-dashboard-add-widget" variant="outline" size="sm" className="h-8 sm:h-9 text-xs sm:text-sm px-2 sm:px-3">
            <Plus className="h-3.5 w-3.5 sm:h-4 sm:w-4 sm:mr-2" />
            <span className="hidden sm:inline">{t('addWidget')}</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          {availableWidgets.map((widget) => {
            const Icon = widget.icon
            return (
              <DropdownMenuItem
                key={widget.type}
                onClick={() => handleAddWidget(widget.type, widget.title)}
              >
                <Icon className="h-4 w-4 mr-2" />
                <div>
                  <div className="font-medium">{widget.title}</div>
                  <div className="text-xs text-muted-foreground">
                    {widget.description}
                  </div>
                </div>
              </DropdownMenuItem>
            )
          })}
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Dashboard Settings */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="sm" className="h-8 sm:h-9 w-8 sm:w-9 p-0">
            <Settings className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={handleResetLayout}>
            <RotateCcw className="h-4 w-4 mr-2" />
            {t('resetLayout')}
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => setSettingsOpen(true)}>
            <Settings className="h-4 w-4 mr-2" />
            {t('settings.title')}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Dashboard Settings Dialog */}
      <DashboardSettings open={settingsOpen} onOpenChange={setSettingsOpen} />
    </div>
  )
}
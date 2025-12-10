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

interface DashboardControlsProps {
  className?: string
}

export function DashboardControls({ className }: DashboardControlsProps) {
  const { isEditing, setEditing, addWidget, resetLayout } = useDashboardStore()
  const [settingsOpen, setSettingsOpen] = useState(false)

  const availableWidgets = [
    {
      type: 'tasks-overview' as const,
      title: 'Tasks Overview',
      icon: CheckSquare,
      description: 'View and manage your tasks',
    },
    {
      type: 'recent-notes' as const,
      title: 'Recent Notes',
      icon: FileText,
      description: 'Quick access to your latest notes',
    },
    {
      type: 'calendar' as const,
      title: 'Calendar',
      icon: Calendar,
      description: 'View upcoming events and deadlines',
    },
    {
      type: 'activity' as const,
      title: 'Activity Feed',
      icon: Activity,
      description: 'See your recent activity',
    },
    {
      type: 'stats' as const,
      title: 'Quick Stats',
      icon: BarChart3,
      description: 'Overview of your key metrics',
    },
    {
      type: 'productivity-chart' as const,
      title: 'Productivity Chart',
      icon: TrendingUp,
      description: 'Visual chart of your daily productivity',
    },
    {
      type: 'study-groups' as const,
      title: 'Study Groups',
      icon: Users,
      description: 'Your active study groups and sessions',
    },
    {
      type: 'progress-stats' as const,
      title: 'Progress Stats',
      icon: Target,
      description: 'Track your goals and achievements',
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
    <div className={`flex items-center space-x-2 ${className}`}>
      {/* Edit Toggle */}
      <Button
        variant={isEditing ? 'default' : 'outline'}
        size="sm"
        onClick={handleToggleEdit}
      >
        <Edit3 className="h-4 w-4 mr-2" />
        {isEditing ? 'Done Editing' : 'Edit Dashboard'}
      </Button>

      {/* Add Widget Dropdown */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="sm">
            <Plus className="h-4 w-4 mr-2" />
            Add Widget
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
          <Button variant="outline" size="sm">
            <Settings className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={handleResetLayout}>
            <RotateCcw className="h-4 w-4 mr-2" />
            Reset Layout
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => setSettingsOpen(true)}>
            <Settings className="h-4 w-4 mr-2" />
            Dashboard Settings
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Dashboard Settings Dialog */}
      <DashboardSettings open={settingsOpen} onOpenChange={setSettingsOpen} />
    </div>
  )
}
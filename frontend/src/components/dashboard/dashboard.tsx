'use client'

import { useAuth } from '@/hooks/use-auth'
import { useDashboardStore } from '@/lib/stores/dashboard-store'
import { DashboardControls } from './dashboard-controls'
import { DashboardGrid } from './dashboard-grid'

interface DashboardProps {
  className?: string
}

export function Dashboard({ className }: DashboardProps) {
  const { isEditing } = useDashboardStore()

  return (
    <div className={`bg-background ${className}`}>
      <div className="p-6">
        {/* Dashboard Controls */}
        <div className="flex justify-end mb-6">
          <DashboardControls />
        </div>

        {/* Enhanced Edit Mode Notice */}
        {isEditing && (
          <div className="mb-6 bg-primary/10 border border-primary/20 rounded-xl p-4">
            <div className="flex items-center space-x-3">
              <div className="h-3 w-3 bg-primary rounded-full animate-pulse" />
              <p className="text-sm font-semibold text-primary">
                Dashboard editing mode is active
              </p>
            </div>
            <p className="text-xs text-primary/80 mt-2">
              Drag widgets to reorder, use controls to add/remove widgets, or click &quot;Done Editing&quot; when finished.
            </p>
          </div>
        )}

        {/* Dashboard Grid */}
        <div className="bg-card rounded-xl border shadow-sm">
          <DashboardGrid />
        </div>
      </div>
    </div>
  )
}
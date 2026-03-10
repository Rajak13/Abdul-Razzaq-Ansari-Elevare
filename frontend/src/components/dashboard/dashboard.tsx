'use client'

import { useAuth } from '@/hooks/use-auth'
import { useDashboardStore } from '@/lib/stores/dashboard-store'
import { DashboardControls } from './dashboard-controls'
import { DashboardGrid } from './dashboard-grid'
import { useTranslations } from 'next-intl'

interface DashboardProps {
  className?: string
}

export function Dashboard({ className }: DashboardProps) {
  const t = useTranslations('dashboard')
  const { isEditing } = useDashboardStore()

  return (
    <div className={`bg-background ${className}`}>
      <div className="p-3 sm:p-4 lg:p-6">
        {/* Dashboard Controls */}
        <div className="flex justify-end mb-4 sm:mb-6">
          <DashboardControls />
        </div>

        {/* Enhanced Edit Mode Notice */}
        {isEditing && (
          <div className="mb-4 sm:mb-6 bg-primary/10 border border-primary/20 rounded-xl p-3 sm:p-4">
            <div className="flex items-center space-x-2 sm:space-x-3">
              <div className="h-2.5 w-2.5 sm:h-3 sm:w-3 bg-primary rounded-full animate-pulse flex-shrink-0" />
              <p className="text-xs sm:text-sm font-semibold text-primary">
                {t('editMode')} {t('overview').toLowerCase()}
              </p>
            </div>
            <p className="text-[10px] sm:text-xs text-primary/80 mt-2">
              Drag widgets to reorder, use controls to add/remove widgets, or click &quot;{t('cancelEdit')}&quot; when finished.
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
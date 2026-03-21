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
      <div className="p-2 sm:p-3 md:p-4 lg:p-6">
        {/* Dashboard Controls */}
        <div className="flex justify-end mb-3 sm:mb-4 lg:mb-6">
          <DashboardControls />
        </div>

        {/* Enhanced Edit Mode Notice */}
        {isEditing && (
          <div className="mb-3 sm:mb-4 lg:mb-6 bg-primary/10 border border-primary/20 rounded-lg sm:rounded-xl p-2.5 sm:p-3 md:p-4">
            <div className="flex items-center space-x-2">
              <div className="h-2 w-2 sm:h-2.5 sm:w-2.5 bg-primary rounded-full animate-pulse flex-shrink-0" />
              <p className="text-[10px] sm:text-xs md:text-sm font-semibold text-primary">
                {t('editMode')} {t('overview').toLowerCase()}
              </p>
            </div>
            <p className="text-[9px] sm:text-[10px] md:text-xs text-primary/80 mt-1.5 sm:mt-2">
              {t('editModeHint', { cancel: t('cancelEdit') })}
            </p>
          </div>
        )}

        {/* Dashboard Grid */}
        <div className="bg-card rounded-lg sm:rounded-xl border shadow-sm">
          <DashboardGrid />
        </div>
      </div>
    </div>
  )
}
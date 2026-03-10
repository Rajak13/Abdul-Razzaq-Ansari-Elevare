'use client'

import { ProfileForm } from '@/components/profile/profile-form'
import { useAuth } from '@/hooks/use-auth'
import { useTranslations } from 'next-intl'
import { usePageMetadata } from '@/hooks/use-page-metadata'
import { useTheme } from '@/components/theme-provider'
import { User } from 'lucide-react'

// Disable static generation for this page since it requires authentication
export const dynamic = 'force-dynamic'

export default function ProfilePage() {
  const { user } = useAuth()
  const { theme } = useTheme()
  const t = useTranslations('profile')
  const tCommon = useTranslations('common')
  usePageMetadata('profile');

  // Determine avatar color based on theme
  // Light theme: Forest Green (hsl(142 71% 45%))
  // Light2 (Nepali) and Dark: Crimson Red (hsl(348 83% 47%))
  const avatarColor = theme === 'light' 
    ? 'bg-[hsl(142,71%,45%)]' 
    : 'bg-[hsl(348,83%,47%)]'

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <h2 className="text-2xl font-semibold mb-2">{tCommon('auth.pleaseLogin')}</h2>
          <p className="text-muted-foreground">{tCommon('auth.loginRequired')}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto py-4 sm:py-6 px-3 sm:px-4 max-w-5xl">
      {/* Page Header */}
      <div className="mb-4 sm:mb-6">
        <div className="flex items-center gap-2 sm:gap-3 mb-2">
          <div className="rounded-xl bg-primary p-1.5 sm:p-2 text-primary-foreground shadow-lg flex-shrink-0">
            <User className="h-5 w-5 sm:h-6 sm:w-6" />
          </div>
          <h1 className="text-xl sm:text-2xl font-bold text-foreground">{t('title')}</h1>
        </div>
        <p className="text-xs sm:text-sm text-muted-foreground ml-10 sm:ml-14">
          Manage your profile settings and view your learning statistics
        </p>
      </div>

      {/* Single Column Layout - Edit Form Only */}
      <div className="bg-card border border-border rounded-lg p-4 sm:p-6">
        <div className="mb-4 sm:mb-6">
          <h2 className="text-base sm:text-lg font-semibold text-foreground">{t('editProfile')}</h2>
          <p className="text-xs sm:text-sm text-muted-foreground mt-1">
            Update your profile information and preferences
          </p>
        </div>
        <ProfileForm avatarColor={avatarColor} />
      </div>
    </div>
  )
}

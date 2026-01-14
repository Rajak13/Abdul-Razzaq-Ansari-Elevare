'use client'

import { ProfileForm } from '@/components/profile/profile-form'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { useAuth } from '@/hooks/use-auth'
import { useTranslations } from 'next-intl'
import { User } from 'lucide-react'
import { usePageMetadata } from '@/hooks/use-page-metadata'

export default function ProfilePage() {
  const { user } = useAuth()
  const t = useTranslations('profile')
  const tCommon = useTranslations('common')
  usePageMetadata('profile');

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
    <div className="container mx-auto py-6 px-4 max-w-4xl">
      <div className="mb-6">
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <User className="h-8 w-8" />
          {t('title')}
        </h1>
        <p className="text-muted-foreground">
          {t('form.personalInfo')}
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{t('form.personalInfo')}</CardTitle>
          <CardDescription>
            {tCommon('updateInfo')}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ProfileForm />
        </CardContent>
      </Card>
    </div>
  )
}
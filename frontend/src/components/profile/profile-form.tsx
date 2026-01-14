'use client'

import { Camera, Loader2, User, Save } from 'lucide-react'
import Image from 'next/image'
import { useRef, useState } from 'react'
import { useForm } from 'react-hook-form'
import { useTranslations } from 'next-intl'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { useToast } from '@/components/ui/use-toast'
import { useAuth } from '@/hooks/use-auth'

interface ProfileFormData {
  name: string
  email: string
  bio: string
  university: string
  major: string
  graduation_date: string
}

interface ProfileFormProps {
  onSuccess?: () => void
}

export function ProfileForm({ onSuccess }: ProfileFormProps) {
  const [avatarUploading, setAvatarUploading] = useState(false)
  const [profileLoading, setProfileLoading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const authContext = useAuth() as any
  const { user, updateProfile, uploadAvatar } = authContext
  const { toast } = useToast()
  const t = useTranslations('profile')
  const tValidation = useTranslations('validation')

  const {
    register,
    handleSubmit,
    formState: { errors, isDirty },
  } = useForm<ProfileFormData>({
    defaultValues: {
      name: user?.name || '',
      email: user?.email || '',
      bio: user?.bio || '',
      university: user?.university || '',
      major: user?.major || '',
      graduation_date: user?.graduation_date || '',
    },
  })

  const handleAvatarClick = () => {
    fileInputRef.current?.click()
  }

  const handleAvatarChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast({
        title: tValidation('file.invalidType'),
        description: tValidation('file.imageRequired'),
        variant: 'destructive',
      })
      return
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: tValidation('file.tooLarge'),
        description: t('form.maxFileSize', { size: '5MB' }),
        variant: 'destructive',
      })
      return
    }

    setAvatarUploading(true)

    try {
      // Upload avatar using the auth context
      await uploadAvatar(file)
      
      toast({
        title: t('messages.avatarUpdateSuccess'),
        description: t('messages.avatarUpdateSuccess'),
      })
    } catch (error: any) {
      toast({
        title: t('messages.avatarUpdateError'),
        description: error.message || t('messages.avatarUpdateError'),
        variant: 'destructive',
      })
    } finally {
      setAvatarUploading(false)
    }
  }

  const onSubmit = async (data: ProfileFormData) => {
    setProfileLoading(true)

    try {
      // Call the actual API through auth context
      await updateProfile({
        name: data.name,
        bio: data.bio,
        university: data.university,
        major: data.major,
        graduation_date: data.graduation_date,
      })

      toast({
        title: t('messages.updateSuccess'),
        description: t('messages.updateSuccess'),
      })

      if (onSuccess) {
        onSuccess()
      }
    } catch (error: any) {
      toast({
        title: t('messages.updateError'),
        description: error.message || t('messages.updateError'),
        variant: 'destructive',
      })
    } finally {
      setProfileLoading(false)
    }
  }

  const currentAvatar = user?.avatar_url

  return (
    <div className="space-y-6">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {/* Avatar Section */}
        <div className="space-y-4">
          <Label>{t('form.avatar')}</Label>
          <div className="flex items-center space-x-4">
            <div className="relative">
              <div className="h-20 w-20 overflow-hidden rounded-full border-2 border-border">
                {currentAvatar ? (
                  <Image
                    src={currentAvatar}
                    alt={t('form.avatar')}
                    width={80}
                    height={80}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center bg-muted">
                    <User className="h-8 w-8 text-muted-foreground" />
                  </div>
                )}
              </div>
              <Button
                type="button"
                size="sm"
                variant="secondary"
                className="absolute -bottom-1 -right-1 h-8 w-8 rounded-full p-0"
                onClick={handleAvatarClick}
                disabled={avatarUploading}
              >
                {avatarUploading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Camera className="h-4 w-4" />
                )}
              </Button>
            </div>
            <div className="space-y-1">
              <p className="text-sm font-medium">{t('form.changeAvatar')}</p>
              <p className="text-xs text-muted-foreground">
                {t('form.allowedFormats')}
              </p>
            </div>
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleAvatarChange}
            className="hidden"
          />
        </div>

        {/* Basic Information */}
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="name">{t('form.name')} *</Label>
            <Input
              id="name"
              placeholder={t('form.namePlaceholder')}
              {...register('name', { 
                required: tValidation('required'),
                minLength: { value: 2, message: tValidation('minLength', { min: 2 }) }
              })}
              disabled={profileLoading}
            />
            {errors.name && (
              <p className="text-sm text-destructive">{errors.name.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">{t('form.email')}</Label>
            <Input
              id="email"
              type="email"
              placeholder={t('form.emailPlaceholder')}
              {...register('email', {
                required: tValidation('required'),
                pattern: { value: /^\S+@\S+$/i, message: tValidation('email.invalid') }
              })}
              disabled={true} // Email should not be editable
              className="bg-muted"
            />
            {errors.email && (
              <p className="text-sm text-destructive">{errors.email.message}</p>
            )}
          </div>
        </div>

        {/* Academic Information */}
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="university">{t('form.location')}</Label>
            <Input
              id="university"
              placeholder={t('form.locationPlaceholder')}
              {...register('university')}
              disabled={profileLoading}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="major">{t('form.phone')}</Label>
            <Input
              id="major"
              placeholder={t('form.phonePlaceholder')}
              {...register('major')}
              disabled={profileLoading}
            />
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="graduation_date">{t('form.dateOfBirth')}</Label>
            <Input
              id="graduation_date"
              type="date"
              {...register('graduation_date')}
              disabled={profileLoading}
            />
          </div>
        </div>

        {/* Bio */}
        <div className="space-y-2">
          <Label htmlFor="bio">{t('form.bio')}</Label>
          <Textarea
            id="bio"
            placeholder={t('form.bioPlaceholder')}
            rows={4}
            {...register('bio', {
              maxLength: { value: 500, message: tValidation('maxLength', { max: 500 }) }
            })}
            disabled={profileLoading}
          />
          {errors.bio && (
            <p className="text-sm text-destructive">{errors.bio.message}</p>
          )}
        </div>

        {/* Submit Button */}
        <div className="flex justify-end">
          <Button 
            type="submit" 
            disabled={profileLoading || avatarUploading || !isDirty}
            className="min-w-[120px]"
          >
            {profileLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                {t('form.saving')}
              </>
            ) : (
              <>
                <Save className="mr-2 h-4 w-4" />
                {t('form.save')}
              </>
            )}
          </Button>
        </div>
      </form>
    </div>
  )
}
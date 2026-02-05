'use client'

import { Camera, Loader2, Save } from 'lucide-react'
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

interface ProfileFormData {
  name: string
  email: string
  bio: string
  phone: string
  date_of_birth: string
  gender: string
  age: number | null
  account_type: string
  institution: string
  university: string
  major: string
  graduation_date: string
  timezone: string
}

interface ProfileFormProps {
  onSuccess?: () => void
  avatarColor: string
}

export function ProfileForm({ onSuccess, avatarColor }: ProfileFormProps) {
  const [avatarUploading, setAvatarUploading] = useState(false)
  const [profileLoading, setProfileLoading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const authContext = useAuth() as any
  const { user, updateProfile, uploadAvatar } = authContext
  const { toast } = useToast()
  const t = useTranslations('profile')
  const tValidation = useTranslations('validation')

  // Helper function to format date for input (YYYY-MM-DD)
  const formatDateForInput = (dateString: string | undefined) => {
    if (!dateString) return ''
    // If already in YYYY-MM-DD format, return as is
    if (/^\d{4}-\d{2}-\d{2}$/.test(dateString)) return dateString
    // Otherwise try to parse and format
    try {
      const date = new Date(dateString)
      if (isNaN(date.getTime())) return ''
      return date.toISOString().split('T')[0]
    } catch {
      return ''
    }
  }

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors, isDirty },
  } = useForm<ProfileFormData>({
    defaultValues: {
      name: user?.name || '',
      email: user?.email || '',
      bio: user?.bio || '',
      phone: user?.phone || '',
      date_of_birth: formatDateForInput(user?.date_of_birth),
      gender: user?.gender || '',
      age: user?.age || null,
      account_type: user?.account_type || 'student',
      institution: user?.institution || '',
      university: user?.university || '',
      major: user?.major || '',
      graduation_date: formatDateForInput(user?.graduation_date),
      timezone: user?.timezone || 'UTC',
    },
  })

  const watchGender = watch('gender')
  const watchAccountType = watch('account_type')
  const watchDateOfBirth = watch('date_of_birth')

  const handleAvatarClick = () => {
    fileInputRef.current?.click()
  }

  const handleAvatarChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    console.log('🖼️ Avatar upload initiated')
    console.log('📁 Selected file:', file)
    
    if (!file) {
      console.log('❌ No file selected')
      return
    }

    console.log('📊 File details:', {
      name: file.name,
      type: file.type,
      size: file.size,
      sizeInMB: (file.size / (1024 * 1024)).toFixed(2) + ' MB'
    })

    // Validate file type
    if (!file.type.startsWith('image/')) {
      console.log('❌ Invalid file type:', file.type)
      toast({
        title: tValidation('file.invalidType'),
        description: 'Please upload an image file',
        variant: 'destructive',
      })
      return
    }
    console.log('✅ File type valid:', file.type)

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      console.log('❌ File too large:', (file.size / (1024 * 1024)).toFixed(2) + ' MB')
      toast({
        title: tValidation('file.tooLarge'),
        description: t('form.maxFileSize', { size: '5MB' }),
        variant: 'destructive',
      })
      return
    }
    console.log('✅ File size valid:', (file.size / (1024 * 1024)).toFixed(2) + ' MB')

    setAvatarUploading(true)
    console.log('⏳ Starting upload...')

    try {
      console.log('📤 Calling uploadAvatar function...')
      const result = await uploadAvatar(file)
      console.log('✅ Upload successful!', result)
      
      toast({
        title: t('messages.avatarUpdateSuccess'),
      })
      console.log('✅ Success toast shown')
      
      // Trigger a page refresh to update all avatar instances
      window.location.reload()
    } catch (error: any) {
      console.error('❌ Upload failed:', error)
      console.error('Error details:', {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status,
        stack: error.stack
      })
      
      toast({
        title: t('messages.avatarUpdateError'),
        description: error.message || t('messages.avatarUpdateError'),
        variant: 'destructive',
      })
      console.log('❌ Error toast shown')
    } finally {
      setAvatarUploading(false)
      console.log('✅ Upload process completed')
    }
  }

  const onSubmit = async (data: ProfileFormData) => {
    console.log('💾 Save Changes initiated')
    console.log('📝 Form data:', data)
    console.log('👤 Current user:', user)
    console.log('🔄 Is form dirty:', isDirty)
    
    setProfileLoading(true)
    console.log('⏳ Starting profile update...')

    try {
      // Calculate age from date of birth if provided
      let calculatedAge = data.age
      if (data.date_of_birth) {
        const birthDate = new Date(data.date_of_birth)
        const today = new Date()
        let age = today.getFullYear() - birthDate.getFullYear()
        const monthDiff = today.getMonth() - birthDate.getMonth()
        if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
          age--
        }
        calculatedAge = age
        console.log('🎂 Calculated age from DOB:', calculatedAge)
      }

      const updateData = {
        name: data.name,
        bio: data.bio,
        phone: data.phone,
        date_of_birth: data.date_of_birth,
        gender: data.gender,
        age: calculatedAge,
        account_type: data.account_type,
        institution: data.institution,
        university: data.university,
        major: data.major,
        graduation_date: data.graduation_date,
        timezone: data.timezone,
      }
      
      console.log('📤 Sending update data:', updateData)
      console.log('🔑 Auth token exists:', !!localStorage.getItem('auth_token'))
      
      const result = await updateProfile(updateData)
      console.log('✅ Profile update successful!', result)

      toast({
        title: t('messages.updateSuccess'),
      })
      console.log('✅ Success toast shown')

      if (onSuccess) {
        console.log('🎉 Calling onSuccess callback')
        onSuccess()
      }
    } catch (error: any) {
      console.error('❌ Profile update failed:', error)
      console.error('Error details:', {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status,
        stack: error.stack
      })
      
      toast({
        title: t('messages.updateError'),
        description: error.message || t('messages.updateError'),
        variant: 'destructive',
      })
      console.log('❌ Error toast shown')
    } finally {
      setProfileLoading(false)
      console.log('✅ Profile update process completed')
    }
  }

  const currentAvatar = user?.avatar_url

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      {/* Profile Picture Section */}
      <div>
        <h3 className="text-sm font-semibold text-foreground mb-2">{t('form.avatar')}</h3>
        
        <div className="flex items-center gap-4">
          <div className="relative">
            <div className="h-16 w-16 overflow-hidden rounded-full border-2 border-border">
              {currentAvatar ? (
                <Image
                  src={currentAvatar}
                  alt={t('form.avatar')}
                  width={64}
                  height={64}
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className={`flex h-full w-full items-center justify-center ${avatarColor}`}>
                  <span className="text-xl font-bold text-white">
                    {user?.name?.charAt(0).toUpperCase() || 'U'}
                  </span>
                </div>
              )}
            </div>
            <Button
              type="button"
              size="sm"
              variant="secondary"
              className="absolute -bottom-0.5 -right-0.5 h-6 w-6 rounded-full p-0 shadow-md"
              onClick={handleAvatarClick}
              disabled={avatarUploading}
            >
              {avatarUploading ? (
                <Loader2 className="h-3 w-3 animate-spin" />
              ) : (
                <Camera className="h-3 w-3" />
              )}
            </Button>
          </div>
          <div className="flex-1">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleAvatarClick}
              disabled={avatarUploading}
              className="h-8 text-xs"
            >
              {avatarUploading ? t('form.saving') : t('form.changeAvatar')}
            </Button>
            <p className="text-xs text-muted-foreground mt-1">
              JPG, PNG, GIF (Max 5MB)
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

      {/* Personal Information */}
      <div>
        <h3 className="text-sm font-semibold text-foreground mb-3">{t('form.personalInfo')}</h3>
        
        <div className="space-y-3">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="name" className="text-xs">{t('form.name')} *</Label>
              <Input
                id="name"
                placeholder={t('form.namePlaceholder')}
                {...register('name', { 
                  required: tValidation('required'),
                  minLength: { value: 2, message: tValidation('minLength', { min: 2 }) }
                })}
                disabled={profileLoading}
                className="h-9 text-sm"
              />
              {errors.name && (
                <p className="text-xs text-destructive">{errors.name.message}</p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="email" className="text-xs">{t('form.email')} *</Label>
              <Input
                id="email"
                type="email"
                {...register('email')}
                disabled={true}
                className="h-9 text-sm bg-muted cursor-not-allowed"
              />
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="date_of_birth" className="text-xs">{t('form.dateOfBirth')}</Label>
              <Input
                id="date_of_birth"
                type="date"
                {...register('date_of_birth')}
                disabled={profileLoading}
                className="h-9 text-sm"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="gender" className="text-xs">{t('form.gender')}</Label>
              <Select
                value={watchGender}
                onValueChange={(value) => setValue('gender', value, { shouldDirty: true })}
                disabled={profileLoading}
              >
                <SelectTrigger className="h-9 text-sm">
                  <SelectValue placeholder="Select gender" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="male">{t('form.male')}</SelectItem>
                  <SelectItem value="female">{t('form.female')}</SelectItem>
                  <SelectItem value="other">{t('form.other')}</SelectItem>
                  <SelectItem value="prefer_not_to_say">{t('form.preferNotToSay')}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="bio" className="text-xs">{t('form.bio')}</Label>
            <Textarea
              id="bio"
              placeholder={t('form.bioPlaceholder')}
              rows={2}
              {...register('bio', {
                maxLength: { value: 500, message: tValidation('maxLength', { max: 500 }) }
              })}
              disabled={profileLoading}
              className="resize-none text-sm"
            />
            {errors.bio && (
              <p className="text-xs text-destructive">{errors.bio.message}</p>
            )}
          </div>
        </div>
      </div>

      {/* Contact & Academic Combined */}
      <div>
        <h3 className="text-sm font-semibold text-foreground mb-3">{t('form.contactInfo')} & {t('form.academicInfo')}</h3>
        
        <div className="space-y-3">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="phone" className="text-xs">{t('form.phone')}</Label>
              <Input
                id="phone"
                type="tel"
                placeholder={t('form.phonePlaceholder')}
                {...register('phone')}
                disabled={profileLoading}
                className="h-9 text-sm"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="account_type" className="text-xs">{t('form.accountType')}</Label>
              <Select
                value={watchAccountType}
                onValueChange={(value) => setValue('account_type', value, { shouldDirty: true })}
                disabled={profileLoading}
              >
                <SelectTrigger className="h-9 text-sm">
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="student">{t('form.student')}</SelectItem>
                  <SelectItem value="educator">{t('form.educator')}</SelectItem>
                  <SelectItem value="professional">{t('form.professional')}</SelectItem>
                  <SelectItem value="researcher">{t('form.researcher')}</SelectItem>
                  <SelectItem value="other">{t('form.otherType')}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="institution" className="text-xs">{t('form.institution')}</Label>
              <Input
                id="institution"
                placeholder={t('form.institutionPlaceholder')}
                {...register('institution')}
                disabled={profileLoading}
                className="h-9 text-sm"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="university" className="text-xs">{t('form.university')}</Label>
              <Input
                id="university"
                placeholder={t('form.universityPlaceholder')}
                {...register('university')}
                disabled={profileLoading}
                className="h-9 text-sm"
              />
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="major" className="text-xs">{t('form.major')}</Label>
              <Input
                id="major"
                placeholder={t('form.majorPlaceholder')}
                {...register('major')}
                disabled={profileLoading}
                className="h-9 text-sm"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="graduation_date" className="text-xs">{t('form.graduationDate')}</Label>
              <Input
                id="graduation_date"
                type="date"
                {...register('graduation_date')}
                disabled={profileLoading}
                className="h-9 text-sm"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="timezone" className="text-xs">{t('form.timezone')}</Label>
            <Input
              id="timezone"
              placeholder="UTC, America/New_York, Asia/Tokyo, etc."
              {...register('timezone')}
              disabled={profileLoading}
              className="h-9 text-sm"
            />
          </div>
        </div>
      </div>

      {/* Submit Buttons */}
      <div className="flex justify-end gap-2 pt-4 border-t border-border">
        <Button 
          type="button"
          variant="outline"
          size="sm"
          disabled={profileLoading || !isDirty}
          onClick={() => window.location.reload()}
        >
          {t('form.cancel')}
        </Button>
        <Button 
          type="submit" 
          size="sm"
          disabled={profileLoading || avatarUploading || !isDirty}
          className="min-w-[120px]"
        >
          {profileLoading ? (
            <>
              <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
              {t('form.saving')}
            </>
          ) : (
            <>
              <Save className="mr-2 h-3.5 w-3.5" />
              {t('form.save')}
            </>
          )}
        </Button>
      </div>
    </form>
  )
}

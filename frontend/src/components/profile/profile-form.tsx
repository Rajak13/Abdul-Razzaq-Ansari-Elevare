'use client'

import { Camera, Loader2, User, Save } from 'lucide-react'
import Image from 'next/image'
import { useRef, useState } from 'react'
import { useForm } from 'react-hook-form'

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
  graduationYear: number | undefined
}

interface ProfileFormProps {
  onSuccess?: () => void
}

export function ProfileForm({ onSuccess }: ProfileFormProps) {
  const [avatarUploading, setAvatarUploading] = useState(false)
  const [profileLoading, setProfileLoading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const { user } = useAuth()
  const { toast } = useToast()

  const {
    register,
    handleSubmit,
    formState: { errors, isDirty },
  } = useForm<ProfileFormData>({
    defaultValues: {
      name: user?.name || '',
      email: user?.email || '',
      bio: '',
      university: '',
      major: '',
      graduationYear: undefined,
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
        title: 'Invalid file type',
        description: 'Please select an image file.',
        variant: 'destructive',
      })
      return
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: 'File too large',
        description: 'Please select an image smaller than 5MB.',
        variant: 'destructive',
      })
      return
    }

    setAvatarUploading(true)

    try {
      // Simulate avatar upload
      await new Promise(resolve => setTimeout(resolve, 1000))
      
      toast({
        title: 'Avatar updated',
        description: 'Your profile picture has been updated successfully.',
      })
    } catch (error) {
      toast({
        title: 'Upload failed',
        description: 'Failed to upload avatar',
        variant: 'destructive',
      })
    } finally {
      setAvatarUploading(false)
    }
  }

  const onSubmit = async (data: ProfileFormData) => {
    setProfileLoading(true)

    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000))

      toast({
        title: 'Profile updated',
        description: 'Your profile has been updated successfully.',
      })

      if (onSuccess) {
        onSuccess()
      }
    } catch (error) {
      toast({
        title: 'Update failed',
        description: 'Failed to update profile',
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
          <Label>Profile Picture</Label>
          <div className="flex items-center space-x-4">
            <div className="relative">
              <div className="h-20 w-20 overflow-hidden rounded-full border-2 border-border">
                {currentAvatar ? (
                  <Image
                    src={currentAvatar}
                    alt="Profile picture"
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
              <p className="text-sm font-medium">Change profile picture</p>
              <p className="text-xs text-muted-foreground">
                JPG, PNG or GIF. Max size 5MB.
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
            <Label htmlFor="name">Full Name *</Label>
            <Input
              id="name"
              placeholder="Enter your full name"
              {...register('name', { 
                required: 'Name is required',
                minLength: { value: 2, message: 'Name must be at least 2 characters' }
              })}
              disabled={profileLoading}
            />
            {errors.name && (
              <p className="text-sm text-destructive">{errors.name.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">Email Address</Label>
            <Input
              id="email"
              type="email"
              placeholder="Enter your email"
              {...register('email', {
                required: 'Email is required',
                pattern: { value: /^\S+@\S+$/i, message: 'Invalid email address' }
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
            <Label htmlFor="university">University</Label>
            <Input
              id="university"
              placeholder="Enter your university"
              {...register('university')}
              disabled={profileLoading}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="major">Major</Label>
            <Input
              id="major"
              placeholder="Enter your major"
              {...register('major')}
              disabled={profileLoading}
            />
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="graduationYear">Graduation Year</Label>
            <Input
              id="graduationYear"
              type="number"
              placeholder="2024"
              {...register('graduationYear', { 
                valueAsNumber: true,
                min: { value: 2020, message: 'Year must be 2020 or later' },
                max: { value: 2030, message: 'Year must be 2030 or earlier' }
              })}
              disabled={profileLoading}
            />
            {errors.graduationYear && (
              <p className="text-sm text-destructive">{errors.graduationYear.message}</p>
            )}
          </div>
        </div>

        {/* Bio */}
        <div className="space-y-2">
          <Label htmlFor="bio">Bio</Label>
          <Textarea
            id="bio"
            placeholder="Tell us a bit about yourself..."
            rows={4}
            {...register('bio', {
              maxLength: { value: 500, message: 'Bio must be less than 500 characters' }
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
                Saving...
              </>
            ) : (
              <>
                <Save className="mr-2 h-4 w-4" />
                Save Changes
              </>
            )}
          </Button>
        </div>
      </form>
    </div>
  )
}
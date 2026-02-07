'use client'

import { useEffect } from 'react'
import { useRouter } from '@/navigation'

// Disable static generation for this page since it requires authentication
export const dynamic = 'force-dynamic'

export default function AuthenticatedHomePage() {
  const router = useRouter()

  useEffect(() => {
    router.replace('/dashboard')
  }, [router])

  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
    </div>
  )
}
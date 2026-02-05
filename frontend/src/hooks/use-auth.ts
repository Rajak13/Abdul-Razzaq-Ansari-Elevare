import { useAuth as useAuthContext } from '@/contexts/auth-context'

export function useAuth() {
  const {
    user,
    isLoading,
    login,
    logout,
    register,
    isAuthenticated,
    updateProfile,
    uploadAvatar,
    refreshUser,
  } = useAuthContext()

  return {
    // State
    user,
    loading: isLoading,
    initialized: true,
    isAuthenticated,

    // Actions
    signIn: login,
    signUp: register,
    signOut: logout,
    updateProfile,
    uploadAvatar,
    refreshUser,
  }
}

// Hook for components that require authentication
export function useRequireAuth() {
  const auth = useAuth()

  return auth
}
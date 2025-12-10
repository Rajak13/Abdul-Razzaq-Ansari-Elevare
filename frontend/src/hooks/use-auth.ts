import { useAuth as useAuthContext } from '@/contexts/auth-context'

export function useAuth() {
  const { user, isLoading, login, logout, register, isAuthenticated } = useAuthContext()

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
  }
}

// Hook for components that require authentication
export function useRequireAuth() {
  const auth = useAuth()

  return auth
}
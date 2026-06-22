import * as React from "react"

export interface AuthUser {
  id: string
  displayName: string
  avatarUrl?: string
}

interface AuthContextValue {
  user: AuthUser | null
  unreadCount: number
}

const AuthContext = React.createContext<AuthContextValue>({
  user: null,
  unreadCount: 0,
})

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const value = React.useMemo<AuthContextValue>(
    () => ({
      user: null,
      unreadCount: 0,
    }),
    []
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  return React.useContext(AuthContext)
}

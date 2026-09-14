import * as React from 'react'
import { authedFetch, loadSession, clearSession, type SessionTokens } from './session'

export interface AuthUser {
  id: string
  email: string
  displayName: string
  avatarUrl?: string
  isAdmin: boolean
}

interface AuthContextValue {
  user: AuthUser | null
  session: SessionTokens | null
  loading: boolean
  unreadCount: number
  signOut: () => Promise<void>
  refreshProfile: () => Promise<void>
  refreshSession: () => Promise<void>
}

const AuthContext = React.createContext<AuthContextValue>({
  user: null,
  session: null,
  loading: false,
  unreadCount: 0,
  signOut: async () => {},
  refreshProfile: async () => {},
  refreshSession: async () => {},
})

function emailUsername(email: string): string {
  const at = email.indexOf('@')
  return at > 0 ? email.slice(0, at) : email
}

function toAuthUser(id: string, email: string, profile?: Record<string, unknown> | null, isAdmin = false): AuthUser {
  return {
    id,
    email,
    displayName:
      (profile?.display_name as string) ??
      emailUsername(email) ??
      'Traveler',
    avatarUrl: (profile?.avatar_url as string) ?? undefined,
    isAdmin,
  }
}

// Unread badge polls the thread list (each thread carries unread_count).
// Replaces the Supabase Realtime subscription removed with the backend move.
const UNREAD_POLL_MS = 15_000

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = React.useState<SessionTokens | null>(() => loadSession())
  const [user, setUser] = React.useState<AuthUser | null>(null)
  const [loading, setLoading] = React.useState(true)
  const [unreadCount, setUnreadCount] = React.useState(0)

  const loadProfile = React.useCallback(async () => {
    const res = await authedFetch('/api/profiles/me')
    if (!res.ok) return
    const profile = await res.json()
    const me = await authedFetch('/api/auth/me')
    if (!me.ok) return
    const { id, email, is_admin } = await me.json()
    setUser(toAuthUser(id, email, profile, !!is_admin))
  }, [])

  const loadUnread = React.useCallback(async () => {
    try {
      const res = await authedFetch('/api/threads')
      if (!res.ok) return
      const threads = await res.json()
      setUnreadCount(
        (threads as Array<{ unread_count?: number }>).reduce(
          (sum, t) => sum + (t.unread_count ?? 0),
          0
        )
      )
    } catch {
      // Badge is best-effort; the inbox itself shows per-thread counts.
    }
  }, [])

  const reload = React.useCallback(async () => {
    const me = await authedFetch('/api/auth/me').catch(() => null)
    if (!me) return // unreachable: keep the session, retry on next mount
    if (me.status === 401) {
      // Truly signed out (refresh dead): let go.
      clearSession()
      setSession(null)
      setUser(null)
      setUnreadCount(0)
      return
    }
    if (!me.ok) return // other errors: keep the session
    setSession(loadSession())
    await Promise.all([loadProfile(), loadUnread()])
  }, [loadProfile, loadUnread])

  const refreshProfile = React.useCallback(async () => {
    await loadProfile()
  }, [loadProfile])

  // Restore session on mount (authedFetch refreshes the token if needed).
  React.useEffect(() => {
    if (!loadSession()) {
      setLoading(false)
      return
    }
    reload().finally(() => setLoading(false))
  }, [reload])

  // Poll the unread badge while signed in.
  React.useEffect(() => {
    if (!user) return
    const id = setInterval(loadUnread, UNREAD_POLL_MS)
    return () => clearInterval(id)
  }, [user, loadUnread])

  const signOut = async () => {
    const current = loadSession()
    if (current) {
      await authedFetch('/api/auth/signout', {
        method: 'POST',
        body: JSON.stringify({ refresh_token: current.refresh_token }),
      }).catch(() => {})
    }
    clearSession()
    window.location.href = '/'
  }

  const value = React.useMemo(
    () => ({ user, session, loading, unreadCount, signOut, refreshProfile, refreshSession: reload }),
    [user, session, loading, unreadCount, refreshProfile, reload]
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  return React.useContext(AuthContext)
}

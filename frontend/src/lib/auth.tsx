import * as React from 'react'
import type { User, Session } from '@supabase/supabase-js'
import { supabase } from './supabase'
import { DB, getEmailUsername } from './db_constants'

export interface AuthUser {
  id: string
  email: string
  displayName: string
  avatarUrl?: string
}

interface AuthContextValue {
  user: AuthUser | null
  session: Session | null
  loading: boolean
  unreadCount: number
  signOut: () => Promise<void>
}

const AuthContext = React.createContext<AuthContextValue>({
  user: null,
  session: null,
  loading: true,
  unreadCount: 0,
  signOut: async () => {},
})

function toAuthUser(user: User, profile?: Record<string, unknown> | null): AuthUser {
  return {
    id: user.id,
    email: user.email ?? '',
    displayName:
      (profile?.[DB.FIELDS.PROFILES.DISPLAY_NAME] as string) ??
      user.user_metadata?.full_name ??
      getEmailUsername(user.email ?? '') ??
      'Traveler',
    avatarUrl: (profile?.[DB.FIELDS.PROFILES.AVATAR_URL] as string) ?? undefined,
  }
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = React.useState<Session | null>(null)
  const [user, setUser] = React.useState<AuthUser | null>(null)
  const [loading, setLoading] = React.useState(true)
  const [unreadCount, setUnreadCount] = React.useState(0)

  async function loadProfile(supabaseUser: User) {
    const { data: profile } = await supabase
      .from(DB.TABLES.PROFILES)
      .select(`${DB.FIELDS.PROFILES.DISPLAY_NAME}, ${DB.FIELDS.PROFILES.AVATAR_URL}`)
      .eq('id', supabaseUser.id)
      .single()
    setUser(toAuthUser(supabaseUser, profile))
  }

  async function loadUnread(userId: string) {
    const { count } = await supabase
      .from(DB.TABLES.MESSAGES)
      .select('id', { count: 'exact', head: true })
      .is(DB.FIELDS.MESSAGES.READ_AT, null)
      .neq(DB.FIELDS.MESSAGES.SENDER_ID, userId)
    setUnreadCount(count ?? 0)
  }

  async function handleAuthStateChange(newSession: Session | null) {
    setSession(newSession)
    if (newSession?.user) {
      await Promise.all([
        loadProfile(newSession.user),
        loadUnread(newSession.user.id),
      ])
    } else {
      setUser(null)
      setUnreadCount(0)
    }
  }

  React.useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      handleAuthStateChange(session).finally(() => setLoading(false))
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        handleAuthStateChange(session)
      }
    )

    return () => subscription.unsubscribe()
  }, [])

  const signOut = async () => {
    await supabase.auth.signOut()
    window.location.href = '/'
  }

  const value = React.useMemo(
    () => ({ user, session, loading, unreadCount, signOut }),
    [user, session, loading, unreadCount]
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  return React.useContext(AuthContext)
}
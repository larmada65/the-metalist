'use client'

import { createContext, useContext, useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'

type AuthContextValue = { user: string | null }

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ initialUser, children }: { initialUser: string | null; children: React.ReactNode }) {
  const [user, setUser] = useState<string | null>(initialUser)

  // Sync server initial state; subscribe to client auth changes
  useEffect(() => {
    setUser(initialUser)
  }, [initialUser])

  useEffect(() => {
    const sb = createClient()
    const { data: { subscription } } = sb.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user?.id ?? null)
    })
    return () => subscription.unsubscribe()
  }, [])

  return (
    <AuthContext.Provider value={{ user }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext)
  if (!ctx) {
    return { user: null }
  }
  return ctx
}

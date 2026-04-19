import { useState, useEffect, useCallback } from 'react'
import type { User, Session, AuthError } from '@supabase/supabase-js'
import { supabase } from '../lib/supabase'

interface AuthState {
  user: User | null
  session: Session | null
  loading: boolean
}

interface AuthResult {
  error: AuthError | null
}

export function useAuth() {
  const [state, setState] = useState<AuthState>({
    user: null,
    session: null,
    loading: true,
  })

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setState({ user: session?.user ?? null, session, loading: false })
    })

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setState({ user: session?.user ?? null, session, loading: false })
      },
    )

    return () => subscription.unsubscribe()
  }, [])

  const signUp = useCallback(
    async (email: string, password: string, nom: string, prenom: string): Promise<AuthResult> => {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: { data: { nom: nom.toUpperCase(), prenom: prenom.replace(/\b\w/g, c => c.toUpperCase()) } },
      })
      return { error }
    },
    [],
  )

  const signIn = useCallback(
    async (email: string, password: string): Promise<AuthResult> => {
      const { error } = await supabase.auth.signInWithPassword({ email, password })
      return { error }
    },
    [],
  )

  const signOut = useCallback(async (): Promise<AuthResult> => {
    const { error } = await supabase.auth.signOut()
    return { error }
  }, [])

  return { ...state, signUp, signIn, signOut }
}

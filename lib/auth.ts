'use client'

import { useEffect, useState } from 'react'
import { isConfigured, supabase } from './supabase'

export type Role = 'user' | 'admin'

type BaseSession = { state: 'loading' } | { state: 'out' } | { state: 'in'; userId: string; email: string }

/** role es null mientras se lee de la tabla profiles (sql/002_roles.sql). */
export type Session = { state: 'loading' } | { state: 'out' } | { state: 'in'; userId: string; email: string; role: Role | null }

export function useSession(): Session {
  const [base, setBase] = useState<BaseSession>({ state: 'loading' })
  const [role, setRole] = useState<Role | null>(null)

  useEffect(() => {
    if (!isConfigured) {
      setBase({ state: 'out' })
      return
    }
    const sb = supabase()
    let alive = true
    const apply = (s: { user: { id: string; email?: string } } | null) =>
      setBase(s ? { state: 'in', userId: s.user.id, email: s.user.email ?? '' } : { state: 'out' })
    sb.auth.getSession().then(({ data }) => {
      if (alive) apply(data.session)
    })
    // También avisa cuando el token se renueva o la sesión se cierra en otra pestaña.
    const { data: sub } = sb.auth.onAuthStateChange((_event, s) => apply(s))
    return () => {
      alive = false
      sub.subscription.unsubscribe()
    }
  }, [])

  const userId = base.state === 'in' ? base.userId : null
  useEffect(() => {
    setRole(null)
    if (!userId) return
    let alive = true
    supabase()
      .from('profiles')
      .select('role')
      .eq('id', userId)
      .maybeSingle()
      .then(({ data }) => {
        // Sin fila (o sin la tabla todavía) se trata como usuario normal.
        if (alive) setRole(data?.role === 'admin' ? 'admin' : 'user')
      })
    return () => {
      alive = false
    }
  }, [userId])

  return base.state === 'in' ? { ...base, role } : base
}

/** Devuelve null si entró, o el mensaje que hay que mostrar. */
export async function signIn(email: string, password: string): Promise<string | null> {
  if (!isConfigured) return 'Sign-in isn’t available: the site is missing its Supabase settings.'
  const { error } = await supabase().auth.signInWithPassword({ email, password })
  if (!error) return null
  if (error.status === 400) return 'That email and password don’t match.'
  return 'Couldn’t sign in. Check your connection and try again.'
}

export async function signOut(): Promise<void> {
  if (!isConfigured) return
  await supabase().auth.signOut()
}

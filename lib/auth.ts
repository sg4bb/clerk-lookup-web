'use client'

import { useEffect, useState } from 'react'
import { isDemo, supabase } from './supabase'

export type Session =
  | { state: 'loading' }
  | { state: 'out' }
  | { state: 'in'; email: string }

const DEMO_KEY = 'cl-demo-user'
const demoListeners = new Set<() => void>()

function readDemo(): Session {
  try {
    const email = window.sessionStorage.getItem(DEMO_KEY)
    return email ? { state: 'in', email } : { state: 'out' }
  } catch {
    return { state: 'out' }
  }
}

export function useSession(): Session {
  const [session, setSession] = useState<Session>({ state: 'loading' })

  useEffect(() => {
    if (isDemo) {
      const sync = () => setSession(readDemo())
      sync()
      demoListeners.add(sync)
      return () => {
        demoListeners.delete(sync)
      }
    }
    const sb = supabase()
    let alive = true
    sb.auth.getSession().then(({ data }) => {
      if (!alive) return
      const email = data.session?.user.email
      setSession(data.session ? { state: 'in', email: email ?? '' } : { state: 'out' })
    })
    const { data: sub } = sb.auth.onAuthStateChange((_event, s) => {
      setSession(s ? { state: 'in', email: s.user.email ?? '' } : { state: 'out' })
    })
    return () => {
      alive = false
      sub.subscription.unsubscribe()
    }
  }, [])

  return session
}

/** Devuelve null si entró, o el mensaje que hay que mostrar. */
export async function signIn(email: string, password: string): Promise<string | null> {
  if (isDemo) {
    try {
      window.sessionStorage.setItem(DEMO_KEY, email)
    } catch {
      /* sin almacenamiento: la sesión dura lo que dure la pestaña */
    }
    demoListeners.forEach((fn) => fn())
    return null
  }
  const { error } = await supabase().auth.signInWithPassword({ email, password })
  if (!error) return null
  if (error.status === 400) return 'That email and password don’t match.'
  return 'Couldn’t sign in. Check your connection and try again.'
}

export async function signOut(): Promise<void> {
  if (isDemo) {
    try {
      window.sessionStorage.removeItem(DEMO_KEY)
    } catch {
      /* nada que borrar */
    }
    demoListeners.forEach((fn) => fn())
    return
  }
  await supabase().auth.signOut()
}

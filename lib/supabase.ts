import { createClient, type SupabaseClient } from '@supabase/supabase-js'

const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim()
const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim()

/**
 * Sin las dos variables el sitio no funciona: el login lo avisa y no deja
 * entrar. No hay datos simulados en ningún caso.
 */
export const isConfigured = Boolean(url && key)

let client: SupabaseClient | null = null

export function supabase(): SupabaseClient {
  if (!isConfigured) throw new Error('Supabase is not configured')
  if (!client) client = createClient(url!, key!)
  return client
}

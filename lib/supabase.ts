import { createClient, type SupabaseClient } from '@supabase/supabase-js'

const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim()
const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim()

/** Sin las dos variables, el sitio funciona con datos simulados. */
export const isDemo = !url || !key

let client: SupabaseClient | null = null

export function supabase(): SupabaseClient {
  if (isDemo) throw new Error('Supabase is not configured')
  if (!client) client = createClient(url!, key!)
  return client
}

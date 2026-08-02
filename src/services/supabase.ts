import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

/**
 * True once the app is pointed at a real Supabase project. Until the user
 * fills .env.local, the client still constructs (so the UI renders) but auth
 * calls will fail clearly rather than crashing at import time.
 */
export const isSupabaseConfigured = Boolean(url && anonKey)

if (!isSupabaseConfigured && import.meta.env.DEV) {
  console.warn(
    '[Fynko] Supabase não configurado. Copie .env.example para .env.local e preencha VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY.',
  )
}

export const supabase = createClient(
  url ?? 'https://placeholder.supabase.co',
  anonKey ?? 'placeholder-anon-key',
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
  },
)

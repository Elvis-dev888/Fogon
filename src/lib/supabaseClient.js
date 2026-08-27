import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!url || !anonKey) {
  // This warning shows in the browser console if you forgot to create .env.local
  console.warn(
    '[Kiosko] Faltan VITE_SUPABASE_URL o VITE_SUPABASE_ANON_KEY. Revisa el archivo .env.local (mira .env.example).'
  )
}

export const supabase = createClient(url, anonKey)

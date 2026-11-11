import { createClient } from '@supabase/supabase-js'

export const REMEMBER_KEY = 'pack01_remember'
export const SB_AUTH_KEY = 'sb-owkvioooumcipiyldnmx-auth-token'

// remember-me routing: flag '1' -> localStorage (device remembered), else sessionStorage (dies with tab)
const storage = {
  getItem(key) {
    return localStorage.getItem(REMEMBER_KEY) === '1'
      ? localStorage.getItem(key)
      : sessionStorage.getItem(key)
  },
  setItem(key, value) {
    if (localStorage.getItem(REMEMBER_KEY) === '1') localStorage.setItem(key, value)
    else sessionStorage.setItem(key, value)
  },
  removeItem(key) {
    localStorage.removeItem(key)
    sessionStorage.removeItem(key)
  },
}

export const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY,
  { auth: { storage, persistSession: true, autoRefreshToken: true, detectSessionInUrl: true } }
)

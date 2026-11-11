import { createClient } from '@supabase/supabase-js'

export const REMEMBER_KEY = 'pack01_remember'
export const SB_AUTH_KEY = 'sb-owkvioooumcipiyldnmx-auth-token'

// flag '0' = session-scoped (sessionStorage, mati saat tab ditutup); selain itu = diingat (localStorage)
const remembered = () => localStorage.getItem(REMEMBER_KEY) !== '0'

// heal: pindahkan token yang tersesat ke store yang benar sesuai flag sekarang
if (remembered()) {
  const stranded = sessionStorage.getItem(SB_AUTH_KEY)
  if (stranded && !localStorage.getItem(SB_AUTH_KEY)) localStorage.setItem(SB_AUTH_KEY, stranded)
  sessionStorage.removeItem(SB_AUTH_KEY)
} else {
  localStorage.removeItem(SB_AUTH_KEY)
}

const storage = {
  getItem: (key) => (remembered() ? localStorage : sessionStorage).getItem(key),
  setItem: (key, value) => (remembered() ? localStorage : sessionStorage).setItem(key, value),
  removeItem: (key) => {
    localStorage.removeItem(key)
    sessionStorage.removeItem(key)
  },
}

export const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY,
  { auth: { storage, persistSession: true, autoRefreshToken: true, detectSessionInUrl: true } }
)

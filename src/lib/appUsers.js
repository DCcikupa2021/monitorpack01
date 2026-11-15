import { supabase } from './supabase.js'

export async function createAppUser({ email, password }) {
  const { error } = await supabase.rpc('create_app_user', {
    p_email: email,
    p_password: password,
  })
  return { error }
}

export async function fetchAppUsers() {
  const { data, error } = await supabase
    .from('app_users')
    .select('id, email, password, created_at')
    .order('created_at', { ascending: false })
  return { data: data ?? [], error }
}

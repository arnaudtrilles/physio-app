import { supabase } from '../lib/supabase'

// Renvoie un header Authorization Bearer si une session Supabase active existe.
// Utilisé par les clients (transcribe / claude / checkout) pour que le
// rate-limit serveur soit appliqué par utilisateur, pas par IP — sinon plusieurs
// kinés derrière la même IP (cabinet, 4G/5G CGNAT) partageraient le bucket.
export async function authHeaders(): Promise<Record<string, string>> {
  if (!supabase) return {}
  try {
    const { data } = await supabase.auth.getSession()
    const token = data.session?.access_token
    return token ? { Authorization: `Bearer ${token}` } : {}
  } catch {
    return {}
  }
}

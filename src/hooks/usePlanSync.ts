import { useEffect } from 'react'
import type { User } from '@supabase/supabase-js'
import { supabase } from '../lib/supabase'
import type { ProfileData } from '../types'

// Après connexion, récupère le plan depuis Supabase et le synchronise dans le profil local.
// Sans ça, un utilisateur qui paye ne verrait jamais son plan mis à jour dans l'app.
export function usePlanSync(
  user: User | null,
  profile: ProfileData,
  setProfile: (p: ProfileData) => void,
) {
  useEffect(() => {
    if (!user || !supabase) return

    supabase
      .from('profiles')
      .select('plan')
      .eq('id', user.id)
      .single()
      .then(({ data, error }) => {
        if (error || !data) return
        const remotePlan = data.plan as ProfileData['plan']
        if (remotePlan && remotePlan !== profile.plan) {
          setProfile({ ...profile, plan: remotePlan })
        }
      })
  // On ne veut relancer que quand l'utilisateur change (connexion/déconnexion)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id])
}

/**
 * Purge des données de santé (PHI) stockées localement sur l'appareil.
 *
 * Pourquoi
 * --------
 * À la déconnexion, sans purge, les données patient du praticien A restent dans
 * IndexedDB (base `physio_app`) + l'audio/transcriptions (`physio_vocal`) + le
 * cache de dictée. Sur un poste partagé, deux conséquences :
 *   1. Snoop hors-ligne : le praticien suivant (ou un tiers) peut rouvrir l'app
 *      et consulter les données résiduelles sans authentification.
 *   2. Fuite inter-comptes : à la connexion de B, `mergeWithLocalDocs` fait
 *      l'UNION cloud(B) + local(A) → les patients de A apparaissent dans la
 *      session de B et sont même ré-uploadés sous le compte de B.
 *
 * Stratégie
 * ---------
 * On supprime les deux bases IndexedDB porteuses de PHI et le cache de dictée
 * vocale. Les préférences NON sensibles (thème, tutoriel vu, choix analytics)
 * sont volontairement conservées — ce ne sont pas des données de santé.
 *
 * L'appelant DOIT recharger la page juste après : le cache PDF en mémoire et
 * l'état React détiennent eux aussi des PHI tant que le contexte vit. Un
 * rechargement dur garantit un état mémoire entièrement vierge pour le prochain
 * utilisateur (cf. signOut dans useAuth).
 */

import { closeAppDB, deleteAppDB } from '../hooks/useIndexedDB'
import { closeVocalDB, deleteVocalDB } from '../utils/vocalRecoveryDB'

// Clés localStorage porteuses de PHI à effacer. (Le reste — `physio_theme`,
// `physio_tutorial_done`, `physio_analytics_enabled` — n'est pas de la donnée
// de santé et reste pour préserver l'expérience.)
const PHI_LOCALSTORAGE_KEYS = ['voice_dictation_cache']

export async function purgeLocalPHI(): Promise<void> {
  try {
    await closeAppDB()
    await closeVocalDB()
    await Promise.all([deleteAppDB(), deleteVocalDB()])
  } catch (e) {
    console.error('[purgeLocalPHI] suppression IndexedDB:', e)
  }
  for (const key of PHI_LOCALSTORAGE_KEYS) {
    try { localStorage.removeItem(key) } catch { /* ignore */ }
  }
}

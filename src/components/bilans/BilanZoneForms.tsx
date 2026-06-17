import { lazy, Suspense } from 'react'
import type { RefObject } from 'react'
import type { BilanType } from '../../types'
import { LazyFallback } from '../ui/LazyFallback'

// Composants de bilan : un seul est monté à la fois (rendu exclusif par
// bilanType). Chargés en lazy → un chunk par type, chargé seulement quand ce
// type est ouvert (≈470 Ko sortis du chunk principal). Les *Handle restent en
// import type (effacés au build, aucun coût runtime). Le rendu est enveloppé
// dans un <Suspense>. lazy + forwardRef transmet la ref impérative.
const BilanEpaule = lazy(() => import('./BilanEpaule').then(m => ({ default: m.BilanEpaule })))
import type { BilanEpauleHandle } from './BilanEpaule'
const BilanCheville = lazy(() => import('./BilanCheville').then(m => ({ default: m.BilanCheville })))
import type { BilanChevilleHandle } from './BilanCheville'
const BilanGenou = lazy(() => import('./BilanGenou').then(m => ({ default: m.BilanGenou })))
import type { BilanGenouHandle } from './BilanGenou'
const BilanHanche = lazy(() => import('./BilanHanche').then(m => ({ default: m.BilanHanche })))
import type { BilanHancheHandle } from './BilanHanche'
const BilanCervical = lazy(() => import('./BilanCervical').then(m => ({ default: m.BilanCervical })))
import type { BilanCervicalHandle } from './BilanCervical'
const BilanLombaire = lazy(() => import('./BilanLombaire').then(m => ({ default: m.BilanLombaire })))
import type { BilanLombaireHandle } from './BilanLombaire'
const BilanGenerique = lazy(() => import('./BilanGenerique').then(m => ({ default: m.BilanGenerique })))
import type { BilanGeneriqueHandle } from './BilanGenerique'
const BilanGeriatrique = lazy(() => import('./BilanGeriatrique').then(m => ({ default: m.BilanGeriatrique })))
import type { BilanGeriatriqueHandle } from './BilanGeriatrique'
const BilanDrainageLymphatique = lazy(() => import('./BilanDrainageLymphatique').then(m => ({ default: m.BilanDrainageLymphatique })))
import type { BilanDrainageLymphatiqueHandle } from './BilanDrainageLymphatique'

/**
 * Refs impératives des formulaires de bilan. Déclarées dans App (lues par
 * getBilanData au moment de l'enregistrement), passées ici pour brancher le
 * composant monté. Une seule ref est active à la fois selon `bilanType`.
 */
export interface BilanZoneFormRefs {
  epaule: RefObject<BilanEpauleHandle | null>
  cheville: RefObject<BilanChevilleHandle | null>
  genou: RefObject<BilanGenouHandle | null>
  hanche: RefObject<BilanHancheHandle | null>
  cervical: RefObject<BilanCervicalHandle | null>
  lombaire: RefObject<BilanLombaireHandle | null>
  generique: RefObject<BilanGeneriqueHandle | null>
  geriatrique: RefObject<BilanGeriatriqueHandle | null>
  drainageLymphatique: RefObject<BilanDrainageLymphatiqueHandle | null>
}

interface BilanZoneFormsProps {
  bilanType: BilanType
  /** id du bilan en cours d'édition (null = nouveau) — sert de clé de remontage. */
  bilanId: number | null
  /** données pré-remplies lors d'une réouverture (undefined = bilan vierge). */
  initialData: Record<string, unknown> | undefined
  /** scope les recoveries vocaux à un patient (sinon une dictée orpheline ressort ailleurs). */
  patientKey: string
  refs: BilanZoneFormRefs
}

/**
 * Monte le formulaire de bilan correspondant à la zone sélectionnée.
 *
 * Extraction verbatim du bloc inline d'App.tsx (zone bilan_zone) : mêmes
 * conditions de rendu exclusif par `bilanType`, même clé de remontage
 * (`bilanId ?? 'new'`), même <Suspense> fallback. Comportement identique.
 */
export function BilanZoneForms({ bilanType, bilanId, initialData, patientKey, refs }: BilanZoneFormsProps) {
  const key = bilanId ?? 'new'
  return (
    <Suspense fallback={<LazyFallback />}><>
      {bilanType === 'epaule'   && <BilanEpaule   key={key} ref={refs.epaule}   initialData={initialData} patientKey={patientKey} />}
      {bilanType === 'cheville' && <BilanCheville key={key} ref={refs.cheville} initialData={initialData} patientKey={patientKey} />}
      {bilanType === 'genou'    && <BilanGenou    key={key} ref={refs.genou}    initialData={initialData} patientKey={patientKey} />}
      {bilanType === 'hanche'   && <BilanHanche   key={key} ref={refs.hanche}   initialData={initialData} patientKey={patientKey} />}
      {bilanType === 'cervical' && <BilanCervical key={key} ref={refs.cervical} initialData={initialData} patientKey={patientKey} />}
      {bilanType === 'lombaire' && <BilanLombaire key={key} ref={refs.lombaire} initialData={initialData} patientKey={patientKey} />}
      {bilanType === 'generique'&& <BilanGenerique key={key} ref={refs.generique} initialData={initialData} patientKey={patientKey} />}
      {bilanType === 'geriatrique' && <BilanGeriatrique key={key} ref={refs.geriatrique} initialData={initialData} patientKey={patientKey} />}
      {bilanType === 'drainage-lymphatique' && <BilanDrainageLymphatique key={key} ref={refs.drainageLymphatique} initialData={initialData} patientKey={patientKey} />}
    </></Suspense>
  )
}

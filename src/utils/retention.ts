/**
 * Retention policy — durée légale de conservation du dossier patient.
 *
 * Référentiel :
 * - **France** : Code de la santé publique, art. R.1112-7 — 20 ans à
 *   compter du dernier acte de prise en charge ; pour un patient mineur
 *   au moment du dernier acte, jusqu'à ses 28 ans (donc max(28 ans,
 *   dernier acte + 20 ans)).
 * - **Suisse** : LAMal + lois cantonales — 10 à 20 ans selon canton.
 *   Par défaut, on retient **20 ans** comme borne supérieure (couvre
 *   tous les cantons et harmonise avec le droit français).
 *
 * Ce module expose **uniquement des fonctions pures** : pas d'I/O, pas
 * d'accès DB, pas d'effet de bord. Il sert de **socle** pour brancher
 * progressivement la rétention dans l'application (UI archive, purge
 * automatique, audit). Aucun composant ne l'utilise actuellement, ce
 * qui garantit qu'il n'introduit pas de régression.
 *
 * Documentation associée :
 * - docs/legal/politique-confidentialite.md § 6
 * - docs/legal/registre-traitements.md § II.1.6
 * - docs/legal/aipd.md § C.5
 * - docs/legal/procedure-droits.md § 3.4 (refus d'effacement motivé)
 */

export type RetentionJurisdiction = 'FR' | 'CH'

export interface RetentionConfig {
  /** Juridiction applicable. Détermine la durée par défaut. */
  jurisdiction: RetentionJurisdiction
  /** Durée en années. Par défaut 20 (FR + bord supérieur cantonal CH). */
  yearsToRetain?: number
  /** Âge majorité applicable au seuil mineur (FR : 18). */
  ageOfMajority?: number
  /** Âge limite minimum après lequel un dossier de mineur peut être purgé (FR : 28 ans). */
  minorEndAge?: number
}

export interface PatientActivity {
  /** Date de naissance du patient (ISO ou Date). Optionnelle si on ne connaît pas le statut mineur. */
  dateOfBirth?: string | Date | null
  /** Date du dernier acte de prise en charge (ISO ou Date). Si absente, on considère qu'il n'y a pas eu d'acte. */
  lastActivityDate?: string | Date | null
}

export type RetentionStatus =
  /** Le dossier est dans sa période de conservation active. */
  | 'ACTIVE'
  /** Aucune activité connue : pas de point de départ — état indéterminé, à vérifier. */
  | 'UNKNOWN'
  /** La période légale est dépassée : le dossier doit être détruit ou anonymisé. */
  | 'EXPIRED'

export interface RetentionResult {
  /** Date à partir de laquelle le dossier peut/doit être purgé. Null si UNKNOWN. */
  expiresOn: Date | null
  /** Nombre de jours restants avant expiration (négatif si expiré). Null si UNKNOWN. */
  daysRemaining: number | null
  /** Statut courant du dossier. */
  status: RetentionStatus
  /** Le patient était mineur au dernier acte ? Null si donnée insuffisante. */
  wasMinorAtLastActivity: boolean | null
  /** Raison ayant déterminé la borne (lastActivity+years OU minorEndAge). */
  rule: 'lastActivityPlusYears' | 'minorEndAge' | 'unknown'
}

const DEFAULTS: Required<Omit<RetentionConfig, 'jurisdiction'>> = {
  yearsToRetain: 20,
  ageOfMajority: 18,
  minorEndAge: 28,
}

/**
 * Parse robuste : accepte ISO string, Date, null/undefined.
 * Retourne null si la valeur n'est pas convertible en date valide.
 */
function toDate(value: string | Date | null | undefined): Date | null {
  if (value == null) return null
  const d = value instanceof Date ? value : new Date(value)
  return Number.isNaN(d.getTime()) ? null : d
}

/**
 * Ajoute n années à une date. Préserve mois/jour. Gère 29 février.
 */
function addYears(date: Date, years: number): Date {
  const result = new Date(date.getTime())
  const targetYear = result.getFullYear() + years
  const month = result.getMonth()
  const day = result.getDate()
  result.setFullYear(targetYear, month, day)
  // Si le 29 février n'existe pas l'année cible, JS bascule au 1er mars — on
  // veut alors le 28 février, plus conservateur (= rétention plus courte).
  if (result.getMonth() !== month) {
    result.setDate(0)
  }
  return result
}

/**
 * Renvoie l'âge en années révolues à une date donnée.
 */
function ageAt(birth: Date, at: Date): number {
  let age = at.getFullYear() - birth.getFullYear()
  const m = at.getMonth() - birth.getMonth()
  if (m < 0 || (m === 0 && at.getDate() < birth.getDate())) {
    age -= 1
  }
  return age
}

/**
 * Calcule la date d'expiration du dossier patient selon la juridiction.
 *
 * @example
 *   computeRetention(
 *     { dateOfBirth: '1990-05-12', lastActivityDate: '2024-03-01' },
 *     { jurisdiction: 'FR' }
 *   )
 *   // → { expiresOn: 2044-03-01, status: 'ACTIVE', wasMinorAtLastActivity: false, rule: 'lastActivityPlusYears' }
 */
export function computeRetention(
  activity: PatientActivity,
  config: RetentionConfig,
  now: Date = new Date(),
): RetentionResult {
  const cfg = { ...DEFAULTS, ...config }
  const lastActivity = toDate(activity.lastActivityDate)
  const dob = toDate(activity.dateOfBirth)

  if (!lastActivity) {
    return {
      expiresOn: null,
      daysRemaining: null,
      status: 'UNKNOWN',
      wasMinorAtLastActivity: null,
      rule: 'unknown',
    }
  }

  const baseExpiry = addYears(lastActivity, cfg.yearsToRetain)

  // Cas mineur : le dossier doit aussi être conservé jusqu'à un âge minimum.
  // FR : 28 ans. Si la base (lastActivity + 20 ans) est plus tardive, on garde
  // la base. Sinon, on étend jusqu'aux 28 ans.
  let expiresOn = baseExpiry
  let rule: RetentionResult['rule'] = 'lastActivityPlusYears'
  let wasMinor: boolean | null = null

  if (dob) {
    const ageAtLast = ageAt(dob, lastActivity)
    wasMinor = ageAtLast < cfg.ageOfMajority
    if (wasMinor) {
      const minorEnd = addYears(dob, cfg.minorEndAge)
      if (minorEnd.getTime() > baseExpiry.getTime()) {
        expiresOn = minorEnd
        rule = 'minorEndAge'
      }
    }
  }

  const daysRemaining = Math.ceil(
    (expiresOn.getTime() - now.getTime()) / (1000 * 60 * 60 * 24),
  )

  return {
    expiresOn,
    daysRemaining,
    status: daysRemaining > 0 ? 'ACTIVE' : 'EXPIRED',
    wasMinorAtLastActivity: wasMinor,
    rule,
  }
}

/**
 * Filtre une liste de patients pour ne renvoyer que ceux dont le dossier
 * est expiré (à purger) à la date donnée.
 *
 * Ne supprime rien — renvoie seulement les identifiants à traiter par le
 * Praticien après revue manuelle (CRITIQUE : la purge est irréversible et
 * doit être validée individuellement).
 */
export function listExpiredPatients<T extends PatientActivity & { id: unknown }>(
  patients: T[],
  config: RetentionConfig,
  now: Date = new Date(),
): Array<{ patient: T; expiresOn: Date; daysOverdue: number }> {
  const out: Array<{ patient: T; expiresOn: Date; daysOverdue: number }> = []
  for (const p of patients) {
    const r = computeRetention(p, config, now)
    if (r.status === 'EXPIRED' && r.expiresOn) {
      out.push({
        patient: p,
        expiresOn: r.expiresOn,
        daysOverdue: -(r.daysRemaining ?? 0),
      })
    }
  }
  return out
}

/**
 * Renvoie la dernière date d'activité parmi un ensemble d'évènements.
 * Pratique pour agréger : bilans + séances + lettres + analyses.
 */
export function lastActivityFrom(
  events: Array<{ date?: string | Date | null }>,
): Date | null {
  let latest: Date | null = null
  for (const ev of events) {
    const d = toDate(ev.date)
    if (d && (!latest || d.getTime() > latest.getTime())) {
      latest = d
    }
  }
  return latest
}

/**
 * Helper : config par défaut pour une juridiction donnée.
 */
export function defaultRetentionConfig(
  jurisdiction: RetentionJurisdiction,
): RetentionConfig {
  return { jurisdiction, ...DEFAULTS }
}

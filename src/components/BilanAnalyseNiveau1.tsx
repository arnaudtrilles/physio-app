import { useState, useRef, useEffect } from 'react'
import { DictableTextarea } from './VoiceMic'
import type { AnalyseIA, BilanDocument, AICallAuditEntry } from '../types'
import { buildClinicalPrompt, parseAnalyseIA, roleTitle } from '../utils/clinicalPrompt'
import type { BilanContext } from '../utils/clinicalPrompt'
import { ClaudeAuthError } from '../utils/claudeClient'
import { callClaudeSecure, UnmaskedDocumentsError } from '../utils/claudeSecure'

interface BilanAnalyseNiveau1Props {
  apiKey: string
  context: BilanContext
  profession?: string
  patientKey: string
  documents?: BilanDocument[]
  cached?: AnalyseIA | null
  onAudit?: (entry: AICallAuditEntry) => void
  onUnmaskedDocsConfirm?: (docs: BilanDocument[]) => Promise<boolean>
  onResult: (analyse: AnalyseIA) => void
  onBack: () => void
  onClose?: () => void
  onExport: () => void
  exporting?: boolean
  onGoToProfile: () => void
  onFicheExercice?: () => void
}

function SkeletonBlock({ h, w = '100%' }: { h: number; w?: string }) {
  return <div className="skeleton" style={{ height: h, width: w, borderRadius: 6, marginBottom: 8 }} />
}

function BookIcon({ size = 28, color = 'white' }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/>
      <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/>
    </svg>
  )
}

/**
 * Parse la description « Hypothèse principale : … Hypothèse différentielle : …
 * Surveillance recommandée [concernant <signe>] : … » en blocs distincts.
 * Si aucun marqueur n'est trouvé, retourne le texte brut en fallback.
 */
function parseHypothesesBlocks(description: string): {
  principale: string | null
  differentielle: string | null
  surveillance: string | null
  fallback: string | null
} {
  const principaleMatch = description.match(/Hypothèse principale\s*:\s*([\s\S]*?)(?=Hypothèse différentielle\s*:|Surveillance recommandée\b|$)/i)
  const differentielleMatch = description.match(/Hypothèse différentielle\s*:\s*([\s\S]*?)(?=Surveillance recommandée\b|$)/i)
  const surveillanceMatch = description.match(/Surveillance recommandée\b[^:]*:\s*([\s\S]*?)$/i)

  const principale = principaleMatch?.[1]?.trim() || null
  const differentielle = differentielleMatch?.[1]?.trim() || null
  const surveillance = surveillanceMatch?.[1]?.trim() || null

  if (!principale && !differentielle && !surveillance) {
    return { principale: null, differentielle: null, surveillance: null, fallback: description }
  }
  return { principale, differentielle, surveillance, fallback: null }
}

function HypothesisBlock({ label, text, accent }: { label: string; text: string; accent: 'green' | 'orange' | 'red' }) {
  const palette = {
    green:  { bg: '#f0fdf4', border: '#bbf7d0', text: '#166534', iconBg: '#dcfce7', iconStroke: '#16a34a' },
    orange: { bg: '#fff7ed', border: '#fed7aa', text: '#9a3412', iconBg: '#ffedd5', iconStroke: '#c2410c' },
    red:    { bg: '#fff1f2', border: '#fecdd3', text: '#9f1239', iconBg: '#ffe4e6', iconStroke: '#e11d48' },
  }[accent]
  return (
    <div style={{ background: palette.bg, border: `1.5px solid ${palette.border}`, borderRadius: 12, padding: '0.85rem', marginBottom: 10 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
        <div style={{ width: 28, height: 28, borderRadius: 8, background: palette.iconBg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <BookIcon size={16} color={palette.iconStroke} />
        </div>
        <div style={{ fontSize: '0.82rem', fontWeight: 700, color: palette.text }}>{label}</div>
      </div>
      <p style={{ margin: 0, fontSize: '0.85rem', lineHeight: 1.55, color: 'var(--text-main)' }}>{text}</p>
    </div>
  )
}

/**
 * Niveau 1 — Mitigation DM minimale.
 *
 * Pourquoi : MDR Article 2(1) — la finalité revendiquée fait le DM. En
 * reframant l'analyse comme une **synthèse documentaire et pédagogique**
 * (pas de diagnostic, pas d'hypothèses graduées avec %, pas de plan
 * personnalisé), on sort de la Règle 11 sans changer le moteur technique.
 *
 * Diffs vs BilanAnalyseIA :
 * - Prompt : interdiction explicite d'inférence clinique personnalisée
 * - UI : labels neutres, pas de % de probabilité, pas de barres
 * - Disclaimer renforcé : « rappel pédagogique général »
 */
export function BilanAnalyseNiveau1({ apiKey, context, patientKey, profession, documents, cached, onAudit, onUnmaskedDocsConfirm, onResult, onBack, onClose, onExport, exporting = false, onGoToProfile, onFicheExercice }: BilanAnalyseNiveau1Props) {
  const callWithDocGuard = async (opts: Parameters<typeof callClaudeSecure>[0]): Promise<string> => {
    try {
      return await callClaudeSecure(opts)
    } catch (err) {
      if (err instanceof UnmaskedDocumentsError && onUnmaskedDocsConfirm) {
        const ok = await onUnmaskedDocsConfirm(err.unmaskedDocs)
        if (!ok) throw new Error('UNMASKED_DOCS_CANCELLED')
        return await callClaudeSecure({ ...opts, userAcknowledgedUnmasked: true })
      }
      throw err
    }
  }

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [analyse, setAnalyse] = useState<AnalyseIA | null>(cached ?? null)
  const [retryCount, setRetryCount] = useState(0)
  const [correction, setCorrection] = useState('')
  const [showCorrection, setShowCorrection] = useState(false)
  const [refining, setRefining] = useState(false)
  const [preAnalyseNotes, setPreAnalyseNotes] = useState('')

  const isMountedRef = useRef(true)
  const retryTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  useEffect(() => {
    isMountedRef.current = true
    return () => {
      isMountedRef.current = false
      if (retryTimerRef.current) {
        clearTimeout(retryTimerRef.current)
        retryTimerRef.current = null
      }
    }
  }, [])

  const buildNiveau1SystemPrompt = (role: string, titreInterdit: string, metierInterdit: string, adjInterdit: string) => `Agis comme un assistant DOCUMENTAIRE et PÉDAGOGIQUE pour un ${role}. Tu ne formules AUCUN diagnostic personnalisé, AUCUNE hypothèse hiérarchisée, AUCUN plan de traitement individualisé pour ce patient.

RÔLE STRICTEMENT LIMITÉ :
- Tu reformules MOT POUR MOT les données saisies par le thérapeute en synthèse lisible (champ "diagnostic"). Tu fais du STÉNO-SECRÉTARIAT, pas de la clinique : tu transcris en français narratif ce qui est dans le bilan, sans aucune interprétation, sans étiquette nosologique.
- Tu listes les pathologies que les manuels de référence associent classiquement à ce type de zone et de présentation (champ "hypotheses"), SANS hiérarchisation, SANS probabilité personnalisée. Toutes les probabilités sont fixées à 0 — c'est une liste documentaire neutre, pas un diagnostic différentiel.
- Tu rappelles les techniques que la littérature ${role} cite classiquement pour ce type de zone (champ "priseEnCharge"), en mode RAPPEL PÉDAGOGIQUE GÉNÉRIQUE — pas une prescription pour CE patient.
- Tu listes les red flags GÉNÉRIQUES à vérifier pour cette zone (champ "alertes") — checklist de vigilance, pas alerte ciblée sur le dossier.

INTERDICTIONS ABSOLUES POUR LE CHAMP "diagnostic" :
- AUCUNE étiquette catégorielle ni qualificatif clinique. INTERDIT : « tableau », « syndrome », « tendinopathie », « capsulite », « impingement », « lésion », « pathologie », « atteinte », « probable », « évoquant », « compatible avec », « en faveur de ».
- AUCUN adjectif qualifiant la NATURE du problème. INTERDIT : « mécanique », « inflammatoire », « neurogène », « dégénératif », « post-traumatique », « capsulaire », « tendineux », « musculaire », « articulaire » (sauf si le mot apparaît littéralement dans les données saisies).
- AUCUNE inférence de mécanisme, cause, structure atteinte ou évolution probable. Tu ne diagnostiques PAS, tu DÉCRIS ce qui a été saisi.
- "diagnostic.titre" = phrase courte purement factuelle décrivant la situation (zone + âge + contexte). Exemple acceptable : « Épaule droite — patient de 45 ans, sportif » ou « Cheville gauche — patiente de 32 ans, suite à entorse il y a 3 semaines ». Exemple INTERDIT : « Tableau d'épaule mécanique » ou « Suspicion de tendinopathie ».
- "diagnostic.description" = paragraphe narratif qui RACONTE les données du bilan (douleur, tests positifs, scores, antécédents) telles que saisies. Si EVN pire = 7/10, tu écris « EVN pire à 7/10 ». Tu ne dis pas « douleur intense » ni « douleur sévère ». Tu ne dis pas « ce qui évoque ». Tu transcris.

AUTRES INTERDICTIONS :
- Ne dis JAMAIS « ce patient présente », « il s'agit probablement de », « le diagnostic est », « je recommande ». Reste descriptif et général.
- Ne calcule AUCUNE probabilité personnalisée. Toutes les probabilités du JSON valent 0.
- Ne propose AUCUN plan de traitement pour CE patient. Les contenus de "priseEnCharge" sont des rappels génériques sur ce qu'on lit dans les manuels pour ce type de zone.
- Pas de stigmatisation du clinicien : pas de "Non documenté", "Aucune donnée".

Le thérapeute reste seul responsable du diagnostic clinique et du plan de traitement. Cette sortie est un AIDE-MÉMOIRE, pas une analyse clinique.

VOCABULAIRE PROFESSION — Tu rédiges en tant que ${role}. Tu emploies EXCLUSIVEMENT « ${role} » et ses dérivés. INTERDICTION ABSOLUE des termes « ${titreInterdit} », « ${metierInterdit} », « ${adjInterdit} », ainsi que des abréviations « kiné » et « physio ». Aucune exception.

Accord grammatical selon SEXE_PATIENT en tête de prompt utilisateur — jamais d'inclusif, jamais d'inférence depuis le prénom.`

  const buildNiveau1UserPrompt = (mergedContext: BilanContext) => {
    const base = buildClinicalPrompt(mergedContext)
    const niveau1Tail = `

OVERRIDE NIVEAU 1 — IMPÉRATIF :
Tu réponds dans le MÊME schéma JSON, mais avec les contraintes suivantes :
1. "diagnostic.titre" = STRICTEMENT la chaîne « Hypothèses formulées par le thérapeute ». RIEN D'AUTRE. Pas de zone, pas d'âge, pas de pathologie. C'est un label fixe, point.

2. "diagnostic.description" = REFORMULATION FIDÈLE de ce que le thérapeute a écrit ou dit (cherche dans OBSERVATIONS DU THÉRAPEUTE, NOTES CLINIQUES COMPLÉMENTAIRES, et le bloc de dictée s'il existe). Tu ne formules AUCUNE hypothèse de ton propre chef — tu reformules UNIQUEMENT ce que le thérapeute a mis. Même mécanique que le champ \`hypothesesPraticien\` du compte rendu hors-DM.

   FORMAT DE SORTIE (un seul paragraphe en prose continue) :
   « Hypothèse principale : <reformulation à la voix passive impersonnelle — voir règles>. Hypothèse différentielle : <idem, OMETS si le thérapeute n'en a pas formulé>. Surveillance recommandée [concernant <signe>] : <idem, OMETS si rien>. »

   STYLE — VOIX PASSIVE IMPERSONNELLE OBLIGATOIRE :
   - INTERDICTION de répéter « Le thérapeute… » dans le texte (attribution déjà donnée par le titre du bloc).
   - Tournures à utiliser : « Est retenue une dysfonction… », « Sont retenus… », « Il est évoqué une composante… », « Une composante viscérale est évoquée », « Prévision d'une réévaluation médicale », « Une surveillance est prévue », « Reconsultation envisagée si… », « Est suspectée… », « Est mentionné(e)… ».
   - Tournures INTERDITES : « Le thérapeute retient », « Le thérapeute évoque », « Le thérapeute prévoit », « Le thérapeute mentionne », « Le thérapeute suspecte », « Selon le thérapeute », « D'après le thérapeute ».
   - Tu peux reformuler en améliorant la lisibilité, articuler les éléments, et expliciter ce qui est implicite — mais SANS jamais ajouter de contenu clinique nouveau. Mots cliniques (mécanique, neurodynamique, viscérale, dysfonction, etc.) autorisés ICI car ils viennent du thérapeute, pas de toi.

   RÈGLES IMPÉRATIVES :
   - INTERDICTION ABSOLUE d'ajouter une hypothèse, un mécanisme, une cause, ou une surveillance qui n'est PAS dans les notes du thérapeute. Si le thérapeute ne mentionne qu'une seule hypothèse, tu n'écris QUE « Hypothèse principale : … » et tu t'arrêtes.
   - Pas de numérotation « Hyp. 1 / Hyp. 2 / Hyp. 3 ». Le format est « Hypothèse principale » / « Hypothèse différentielle » / « Surveillance recommandée ».
   - Le mot-clé « Hypothèse principale : » DOIT toujours commencer la description si le thérapeute a formulé une hypothèse.

   EXEMPLES DE BONNES REFORMULATIONS :
   - « Hypothèse principale : Est retenue une dysfonction mécanique costale gauche impliquant les muscles intercostaux, pouvant expliquer les pics douloureux côtiers et la sensation de compression à l'inspiration profonde. Hypothèse différentielle : Est évoquée une composante viscérale résiduelle en lien avec l'antécédent de mononucléose infectieuse. Surveillance recommandée concernant la douleur de compression interne : reconsultation médicale envisagée en cas de persistance ou d'aggravation malgré la prise en charge. »
   - « Hypothèse principale : Sont retenues une cervicalgie mécanique chronique et une dysfonction cervico-dorsale haute, associées à une irritation neurodynamique du nerf médian droit. Hypothèse différentielle : Sont également évoquées des contractures musculaires cervico-scapulaires chroniques entretenues par les contraintes posturales. »

   SI LE THÉRAPEUTE N'A FORMULÉ AUCUNE HYPOTHÈSE (pas de pré-analyse, pas de mention dans les notes) :
   - description = « Le thérapeute n'a pas formulé d'hypothèse diagnostique en pré-analyse. Voir les pistes documentaires ci-dessous pour les pathologies classiquement citées dans la littérature pour ce type de zone. »
3. "hypotheses" = liste de 3 pathologies que les manuels associent CLASSIQUEMENT à ce type de zone et de présentation. ORDRE : de la plus pertinente vis-à-vis de la présentation décrite à la moins pertinente — le rang 1 = la plus pertinente, rang 3 = la moins pertinente. Cet ordre est IMPLICITE : tu n'affiches AUCUN signal de hiérarchie dans les textes (pas de « la plus probable », « en premier lieu », « hypothèse principale », « priorité »). Chaque entrée :
   - "rang" : 1, 2, 3 (index d'ordre, non affiché comme hiérarchie clinique dans le texte)
   - "probabilite" : 0 (TOUJOURS 0 — non applicable en mode documentaire, pas affiché)
   - "titre" : nom de la pathologie, neutre, sans qualificatif d'ordre
   - "justification" : RAPPEL PÉDAGOGIQUE des critères diagnostiques décrits par la littérature pour CETTE pathologie en général — 1 à 2 phrases citant les signes/tests classiquement associés (ex : « Décrit en littérature par une douleur en abduction 60-120°, tests de Neer et Hawkins typiquement positifs, douleur nocturne sur le décubitus latéral homolatéral. »). INTERDICTION ABSOLUE de faire référence à CE patient ou à SES données : pas de « vos tests positifs », « le patient présente », « compatible avec votre bilan ». Tu décris la PATHOLOGIE selon les manuels, pas le cas. Le thérapeute fait lui-même le rapprochement avec ses observations. La justification ne doit JAMAIS mentionner ni suggérer la position dans l'ordre.
4. "priseEnCharge" = 3 phases avec techniques GÉNÉRIQUEMENT citées dans les manuels pour ce type de tableau.
   - Noms de phase EXACTS et SANS JALONS DATÉS : « Phase aiguë », « Phase subaiguë », « Phase fonctionnelle ». INTERDIT : « Phase aiguë (J1–J7) », « (J8–J21) », « (J22–J42) », ou toute mention de durée/semaines/jours.
   - Chaque "points" = nom de la technique uniquement, court et neutre (ex : « Mobilisations passives », « Renforcement isométrique infradouleur », « Étirements analytiques », « Thérapie manuelle articulaire », « Travail proprioceptif »). INTERDIT : doses, séries, répétitions, durées, fréquences (pas de « 3×30s », pas de « 3 séries de 10 », pas de « 2 à 3 fois par semaine »).
   - N'ajoute PAS de préfixe répétitif (pas de « Classiquement décrit : », « En général : », « Selon la littérature : »). Ne cite jamais le patient. Ne mentionne pas les équipements du thérapeute.
5. "alertes" = checklist générique de 2 à 4 red flags à vérifier pour cette zone (ex : « Vérifier l'absence de signe neurologique distal », « Écarter une cause inflammatoire systémique »). Pas d'analyse du dossier.`
    return base + niveau1Tail
  }

  const runAnalysis = async (attempt = 0) => {
    if (!isMountedRef.current) return
    setLoading(true)
    setError(null)
    try {
      const therapistNotes = preAnalyseNotes.trim()
      const mergedNotes = therapistNotes
        ? (context.notesLibres?.trim()
            ? `${context.notesLibres.trim()}\n\n--- OBSERVATIONS DU THÉRAPEUTE (pré-analyse) ---\n${therapistNotes}`
            : `OBSERVATIONS DU THÉRAPEUTE (pré-analyse) :\n${therapistNotes}`)
        : context.notesLibres
      const mergedContext = { ...context, notesLibres: mergedNotes }

      const isPhysioRole = /physio/i.test(profession ?? '')
      const role = roleTitle(profession)
      const titreInterdit = isPhysioRole ? 'kinésithérapeute' : 'physiothérapeute'
      const metierInterdit = isPhysioRole ? 'kinésithérapie' : 'physiothérapie'
      const adjInterdit = isPhysioRole ? 'kinésithérapique' : 'physiothérapique'

      const raw = await callWithDocGuard({
        apiKey,
        systemPrompt: buildNiveau1SystemPrompt(role, titreInterdit, metierInterdit, adjInterdit),
        userPrompt: buildNiveau1UserPrompt(mergedContext),
        maxOutputTokens: 8192,
        jsonMode: true,
        documents,
        patient: { nom: context.patient.nom, prenom: context.patient.prenom, patientKey },
        category: 'bilan_analyse',
        onAudit,
      })
      const parsed = parseAnalyseIA(raw)
      if (!parsed) throw new Error('Réponse invalide — format JSON inattendu')
      if (!isMountedRef.current) return
      setAnalyse(parsed)
      onResult(parsed)
    } catch (err: unknown) {
      if (!isMountedRef.current) return
      if (err instanceof Error && err.message === 'UNMASKED_DOCS_CANCELLED') {
        setLoading(false)
        return
      }
      if (attempt < 2) {
        setRetryCount(attempt + 1)
        retryTimerRef.current = setTimeout(() => {
          retryTimerRef.current = null
          if (isMountedRef.current) runAnalysis(attempt + 1)
        }, 1200)
        return
      }
      if (err instanceof ClaudeAuthError) {
        setError('auth')
      } else {
        const msg = err instanceof Error ? err.message : 'Erreur inconnue'
        if (msg.includes('RESOURCE_EXHAUSTED') || msg.includes('429')) {
          setError('quota')
        } else {
          setError(msg)
        }
      }
    } finally {
      if (isMountedRef.current) setLoading(false)
    }
  }

  const runRefinement = async () => {
    if (!correction.trim() || !analyse) return
    setRefining(true)
    setError(null)
    try {
      const isPhysioRole = /physio/i.test(profession ?? '')
      const role = roleTitle(profession)
      const titreInterdit = isPhysioRole ? 'kinésithérapeute' : 'physiothérapeute'
      const metierInterdit = isPhysioRole ? 'kinésithérapie' : 'physiothérapie'
      const adjInterdit = isPhysioRole ? 'kinésithérapique' : 'physiothérapique'

      const raw = await callWithDocGuard({
        apiKey,
        systemPrompt: buildNiveau1SystemPrompt(role, titreInterdit, metierInterdit, adjInterdit),
        userPrompt: `${buildNiveau1UserPrompt(context)}

PRÉCISIONS DU THÉRAPEUTE :
${correction.trim()}

Reproduit la synthèse documentaire en intégrant ces précisions dans la reformulation, mais SANS produire de diagnostic personnalisé ni d'hypothèses hiérarchisées. Reste dans le mode AIDE-MÉMOIRE.`,
        maxOutputTokens: 8192,
        jsonMode: true,
        documents,
        patient: { nom: context.patient.nom, prenom: context.patient.prenom, patientKey },
        category: 'bilan_analyse_refine',
        onAudit,
      })
      const parsed = parseAnalyseIA(raw)
      if (!parsed) throw new Error('Réponse invalide')
      if (!isMountedRef.current) return
      setAnalyse(parsed)
      onResult(parsed)
      setCorrection('')
      setShowCorrection(false)
    } catch (err: unknown) {
      if (!isMountedRef.current) return
      if (err instanceof Error && err.message === 'UNMASKED_DOCS_CANCELLED') {
        setRefining(false)
        return
      }
      const msg = err instanceof Error ? err.message : 'Erreur inconnue'
      setError(msg)
    } finally {
      if (isMountedRef.current) setRefining(false)
    }
  }

  const isLoading = loading && !analyse

  return (
    <div className="general-info-screen slide-in-left">
      <header className="screen-header">
        <button className="btn-back" onClick={onBack}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 18 9 12 15 6"/>
          </svg>
        </button>
        <div style={{ flex: 1 }}>
          <h2 className="title-section" style={{ marginBottom: 0 }}>Synthèse documentaire</h2>
          <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--text-muted)' }}>{context.zone} · {context.patient.prenom} {context.patient.nom}</p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ background: '#fef3c7', border: '1px solid #fcd34d', borderRadius: 8, padding: '4px 10px', fontSize: 10, fontWeight: 700, color: '#92400e' }}>Niveau 1</div>
          {onClose && (
            <button onClick={onClose} style={{ width: 32, height: 32, borderRadius: 8, background: 'var(--secondary)', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', cursor: 'pointer', flexShrink: 0 }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
              </svg>
            </button>
          )}
        </div>
      </header>

      <div className="scroll-area" style={{ paddingBottom: '5.5rem' }}>

        <div className="ai-hero">
          <div className="ai-hero-icon"><BookIcon /></div>
          <div className="ai-hero-text">
            <h4>Aide-mémoire documentaire</h4>
            <p>Synthèse des données saisies + rappel pédagogique des éléments classiquement décrits dans la littérature pour ce type de tableau. Ne remplace pas votre jugement clinique.</p>
          </div>
        </div>

        {!apiKey && (
          <div style={{ background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 14, padding: 20, marginBottom: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
              <div style={{ width: 36, height: 36, borderRadius: 10, background: '#fef3c7', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#d97706" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
                  <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                </svg>
              </div>
              <div style={{ fontWeight: 700, color: '#92400e', fontSize: '0.95rem' }}>Service IA indisponible</div>
            </div>
            <p style={{ fontSize: '0.85rem', color: '#78350f', margin: '0 0 14px', lineHeight: 1.5 }}>
              La synthèse documentaire n'est pas disponible. Vérifiez votre connexion, puis réessayez.
            </p>
            <button onClick={onGoToProfile}
              style={{ width: '100%', padding: '0.75rem', borderRadius: 10, background: 'linear-gradient(135deg, var(--primary), var(--primary-light))', color: 'white', fontWeight: 700, fontSize: '0.9rem', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
                <circle cx="12" cy="7" r="4"/>
              </svg>
              Configurer dans le Profil
            </button>
          </div>
        )}

        {error === 'quota' && (
          <div style={{ background: '#fef2f2', border: '1px solid #fca5a5', borderRadius: 12, padding: 16, marginBottom: 12 }}>
            <div style={{ fontWeight: 700, color: '#991b1b', marginBottom: 4 }}>Quota dépassé</div>
            <p style={{ fontSize: '0.82rem', color: '#7f1d1d', margin: 0 }}>Quota de requêtes dépassé. Réessayez dans quelques minutes.</p>
          </div>
        )}
        {error && error !== 'quota' && error !== 'auth' && (
          <div style={{ background: '#fef2f2', border: '1px solid #fca5a5', borderRadius: 12, padding: 16, marginBottom: 12 }}>
            <div style={{ fontWeight: 700, color: '#991b1b', marginBottom: 4 }}>Erreur de connexion</div>
            <p style={{ fontSize: '0.82rem', color: '#7f1d1d', margin: 0 }}>{retryCount > 0 ? `Tentative ${retryCount}/2 échouée. ` : ''}{error}</p>
            <button onClick={() => { setRetryCount(0); runAnalysis(0) }} style={{ marginTop: 8, fontSize: '0.82rem', color: 'var(--primary)', fontWeight: 600, background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>Réessayer</button>
          </div>
        )}
        {error === 'auth' && (
          <div style={{ background: '#fef2f2', border: '1px solid #fca5a5', borderRadius: 14, padding: 20, marginBottom: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
              <div style={{ width: 36, height: 36, borderRadius: 10, background: '#fee2e2', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#dc2626" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
                  <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                </svg>
              </div>
              <div style={{ fontWeight: 700, color: '#991b1b', fontSize: '0.95rem' }}>Authentification IA échouée</div>
            </div>
            <p style={{ fontSize: '0.85rem', color: '#7f1d1d', margin: '0 0 14px', lineHeight: 1.5 }}>
              Le service IA a refusé la requête. Réessayez ou contactez le support si le problème persiste.
            </p>
            <button onClick={onGoToProfile}
              style={{ width: '100%', padding: '0.75rem', borderRadius: 10, background: 'linear-gradient(135deg, #6d28d9, #7c3aed)', color: 'white', fontWeight: 700, fontSize: '0.9rem', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
                <circle cx="12" cy="7" r="4"/>
              </svg>
              Ouvrir le profil
            </button>
          </div>
        )}

        {isLoading && (
          <div>
            <div className="ai-section-card">
              <div className="ai-section-header">
                <SkeletonBlock h={30} w="30px" /><SkeletonBlock h={14} w="60%" />
              </div>
              <div className="ai-section-body">
                <SkeletonBlock h={80} /><SkeletonBlock h={14} w="80%" />
              </div>
            </div>
            <div className="ai-section-card">
              <div className="ai-section-header"><SkeletonBlock h={30} w="30px" /><SkeletonBlock h={14} w="50%" /></div>
              <div className="ai-section-body">
                {[1, 2, 3].map(i => (
                  <div key={i} style={{ marginBottom: 12 }}>
                    <SkeletonBlock h={14} w="70%" />
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {analyse && (
          <div className="fade-in-up">
            {/* Synthèse du bilan (ex-Diagnostic) */}
            <div className="ai-section-card">
              <div className="ai-section-header">
                <div className="ai-section-icon" style={{ background: 'var(--info-soft)' }}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--primary)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                    <polyline points="14 2 14 8 20 8"/>
                    <line x1="16" y1="13" x2="8" y2="13"/>
                    <line x1="16" y1="17" x2="8" y2="17"/>
                  </svg>
                </div>
                <h4 style={{ color: 'var(--primary)' }}>Synthèse du bilan</h4>
              </div>
              <div className="ai-section-body">
                <div style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 0.4, marginBottom: 10 }}>
                  {analyse.diagnostic.titre}
                </div>
                {(() => {
                  const blocks = parseHypothesesBlocks(analyse.diagnostic.description)
                  if (blocks.fallback) {
                    return <p style={{ margin: 0, fontSize: '0.85rem', lineHeight: 1.55, color: 'var(--text-main)' }}>{blocks.fallback}</p>
                  }
                  return (
                    <>
                      {blocks.principale && <HypothesisBlock accent="green" label="Hypothèse principale" text={blocks.principale} />}
                      {blocks.differentielle && <HypothesisBlock accent="orange" label="Hypothèse différentielle" text={blocks.differentielle} />}
                      {blocks.surveillance && <HypothesisBlock accent="red" label="Surveillance recommandée" text={blocks.surveillance} />}
                    </>
                  )
                })()}
              </div>
            </div>

            {/* Pistes documentaires (ex-Hypothèses) — pas de %, pas de barre */}
            <div className="ai-section-card">
              <div className="ai-section-header">
                <div className="ai-section-icon" style={{ background: '#f0fdf4' }}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#16a34a" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/>
                    <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/>
                  </svg>
                </div>
                <h4 style={{ color: '#166534' }}>Pistes documentaires à explorer</h4>
              </div>
              <div className="ai-section-body">
                <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', margin: '0 0 10px', lineHeight: 1.5, fontStyle: 'italic' }}>
                  Pathologies classiquement décrites par les manuels pour ce type de tableau — sans hiérarchisation. À confronter à votre examen clinique.
                </p>
                {analyse.hypotheses.map(h => (
                  <div key={h.rang} className="hypo-item">
                    <div style={{ width: 24, display: 'flex', alignItems: 'flex-start', justifyContent: 'center', flexShrink: 0, paddingTop: 2 }}>
                      <BookIcon size={18} color="#16a34a" />
                    </div>
                    <div className="hypo-content" style={{ flex: 1 }}>
                      <div className="title">{h.titre}</div>
                      {h.justification && (
                        <div className="prob" style={{ fontStyle: 'italic', color: 'var(--text-muted)' }}>{h.justification}</div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Techniques classiquement utilisées (ex-Prise en charge) */}
            <div className="ai-section-card">
              <div className="ai-section-header">
                <div className="ai-section-icon" style={{ background: '#fff7ed' }}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#c2410c" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/>
                    <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/>
                  </svg>
                </div>
                <h4 style={{ color: '#9a3412' }}>Techniques classiquement décrites (rappel pédagogique)</h4>
              </div>
              <div className="ai-section-body">
                <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', margin: '0 0 10px', lineHeight: 1.5, fontStyle: 'italic' }}>
                  Rappel des techniques que la littérature cite généralement pour ce type de tableau. Ce n'est pas un plan de traitement personnalisé — la prescription reste votre décision.
                </p>
                {analyse.priseEnCharge.map((p, i) => {
                  const bullets = (p.points && p.points.length > 0)
                    ? p.points
                    : (p.detail ? [p.detail] : [])
                  return (
                    <div key={i} className="treatment-item">
                      <div className="treatment-num">{i + 1}</div>
                      <div className="treatment-content">
                        <div className="title">{p.phase} : {p.titre}</div>
                        {bullets.length > 0 && (
                          <ul className="treatment-points">
                            {bullets.map((b, j) => <li key={j}>{b}</li>)}
                          </ul>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Rappel red flags (ex-Alertes) */}
            {analyse.alertes.length > 0 && (
              <div className="ai-section-card">
                <div className="ai-section-header">
                  <div className="ai-section-icon" style={{ background: '#fff1f2' }}>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#e11d48" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M9 11l3 3L22 4"/>
                      <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/>
                    </svg>
                  </div>
                  <h4 style={{ color: '#be123c' }}>Rappel red flags à vérifier</h4>
                </div>
                <div className="ai-section-body">
                  <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', margin: '0 0 10px', lineHeight: 1.5, fontStyle: 'italic' }}>
                    Checklist générique pour cette zone — à vérifier dans votre examen.
                  </p>
                  {analyse.alertes.map((a, i) => (
                    <div key={i} className="ai-alerte-item">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#e11d48" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, marginTop: 1 }}>
                        <polyline points="9 11 12 14 22 4"/>
                        <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/>
                      </svg>
                      {a}
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="ai-footer">
              <div className="ai-dot" />
              <p>Cette synthèse est un aide-mémoire documentaire et pédagogique. Elle ne constitue ni un diagnostic, ni une prescription, ni un plan de traitement personnalisé. Le jugement clinique et la prise en charge restent de la responsabilité exclusive du thérapeute.</p>
            </div>
          </div>
        )}

        {analyse && !loading && (
          <div style={{ marginTop: 4, marginBottom: 8 }}>
            <button
              onClick={() => setShowCorrection(!showCorrection)}
              style={{ width: '100%', padding: '0.6rem 1rem', borderRadius: 10, background: showCorrection ? 'var(--info-soft)' : 'var(--secondary)', border: `1.5px solid ${showCorrection ? 'var(--border-soft)' : 'var(--border-color)'}`, color: showCorrection ? 'var(--primary)' : 'var(--text-muted)', fontWeight: 600, fontSize: '0.82rem', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
              </svg>
              {showCorrection ? 'Masquer les précisions' : 'Préciser le tableau clinique'}
            </button>
            {showCorrection && (
              <div className="fade-in" style={{ marginTop: 8, background: '#fefce8', border: '1.5px solid #fde68a', borderRadius: 12, padding: '0.85rem' }}>
                <div style={{ fontSize: '0.78rem', color: '#92400e', fontWeight: 600, marginBottom: 6 }}>
                  Précisions sur le tableau saisi
                </div>
                <p style={{ fontSize: '0.75rem', color: '#78350f', margin: '0 0 8px', lineHeight: 1.5 }}>
                  Ajoutez des précisions descriptives sur les données saisies pour affiner la reformulation documentaire. Pas de diagnostic ni de prescription — c'est vous qui décidez cliniquement.
                </p>
                <DictableTextarea
                  value={correction}
                  onChange={e => setCorrection(e.target.value)}
                  rows={3}
                  placeholder="Ex : Ajouter que la douleur s'aggrave en fin de journée et qu'il n'y a pas de signe inflammatoire local."
                  textareaStyle={{ width: '100%', padding: '0.6rem 0.8rem', fontSize: '0.82rem', color: 'var(--text-main)', background: 'white', border: '1px solid #fde68a', borderRadius: 8, resize: 'vertical', boxSizing: 'border-box', lineHeight: 1.5 }}
                />
                <button
                  onClick={runRefinement}
                  disabled={!correction.trim() || refining}
                  style={{ marginTop: 8, width: '100%', padding: '0.7rem', borderRadius: 10, background: !correction.trim() ? 'var(--secondary)' : 'linear-gradient(135deg, #d97706, #b45309)', border: 'none', color: !correction.trim() ? 'var(--text-muted)' : 'white', fontWeight: 700, fontSize: '0.85rem', cursor: !correction.trim() ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, opacity: refining ? 0.7 : 1 }}>
                  {refining ? (
                    <><div className="spinner" /> Reformulation en cours…</>
                  ) : (
                    <><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/></svg>Mettre à jour la synthèse</>
                  )}
                </button>
              </div>
            )}
          </div>
        )}

        {!analyse && !loading && apiKey && !error && (
          <div className="ai-section-card">
            <div className="ai-section-header">
              <div className="ai-section-icon" style={{ background: 'var(--info-soft)' }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--primary)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                  <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                </svg>
              </div>
              <h4 style={{ color: 'var(--primary)' }}>Vos précisions (optionnel)</h4>
            </div>
            <div className="ai-section-body">
              <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', margin: '0 0 10px', lineHeight: 1.5 }}>
                Précisions descriptives à ajouter à la synthèse documentaire. Optionnel.
              </p>
              <DictableTextarea
                value={preAnalyseNotes}
                onChange={e => setPreAnalyseNotes(e.target.value)}
                rows={4}
                placeholder="Ex : Patient indique que la douleur cède partiellement à l'arrêt de l'activité."
                textareaStyle={{ width: '100%', padding: '0.65rem 0.9rem', fontSize: '0.85rem', color: 'var(--text-main)', background: 'var(--secondary)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', resize: 'vertical', boxSizing: 'border-box', lineHeight: 1.5 }}
              />
            </div>
          </div>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {!analyse && !loading && apiKey && !error && (
            <button className="btn-primary-luxe" style={{ marginBottom: 0 }} onClick={() => runAnalysis(0)}>
              Confectionner la synthèse documentaire
            </button>
          )}
          {loading && (
            <button className="btn-primary-luxe" disabled style={{ marginBottom: 0, opacity: 0.7, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10 }}>
              <div className="spinner" />
              Synthèse en cours…
            </button>
          )}
          {analyse && (
            <button
              className="btn-primary-luxe"
              style={{ marginBottom: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, opacity: exporting ? 0.7 : 1, cursor: exporting ? 'wait' : 'pointer' }}
              onClick={onExport}
              disabled={exporting}
            >
              {exporting ? (
                <div className="spinner" />
              ) : (
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                  <polyline points="14 2 14 8 20 8"/>
                  <line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/>
                </svg>
              )}
              {exporting ? 'Génération du rapport…' : 'Exporter le bilan + synthèse'}
            </button>
          )}
          {analyse && onFicheExercice && (
            <button
              onClick={onFicheExercice}
              style={{ width: '100%', padding: '0.75rem', borderRadius: 'var(--radius-lg)', background: '#f0fdf4', border: '1.5px solid #bbf7d0', color: '#15803d', fontSize: '0.9rem', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/>
              </svg>
              Fiche d'exercices
            </button>
          )}
          {analyse && !loading && !refining && (
            <button
              onClick={() => { setAnalyse(null); runAnalysis(0) }}
              style={{ width: '100%', padding: '0.75rem', borderRadius: 'var(--radius-lg)', border: '1.5px solid var(--border-color)', background: 'white', color: 'var(--text-muted)', fontSize: '0.9rem', fontWeight: 600, cursor: 'pointer' }}
            >
              Regénérer la synthèse
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

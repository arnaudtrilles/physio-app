import { useEffect, useRef, useState, type ReactElement, type ReactNode } from 'react'
import type { CompteRendu, CompteRenduData } from '../types'
import { computeAge } from '../utils/clinicalPrompt'
import {
  Chip,
  Badge,
  Accordion,
  EVNBadge,
  MobilityStatus,
  TestCard,
  FlagBadge,
} from './compteRendu/atoms'
import { DictableTextarea } from './VoiceMic'

interface BilanCompteRenduProps {
  patient: { prenom: string; nom: string; dateNaissance?: string; sexe?: string }
  zone?: string
  bilanType?: string
  bilanData?: Record<string, unknown>
  diagnosticPhysio?: string
  notes?: string
  profession?: 'Kinésithérapeute' | 'Physiothérapeute'
  compteRendu: CompteRendu | null
  compteRenduError?: string | null
  generating?: boolean
  apiKey: string
  dateBilan?: string
  onBack: () => void
  onClose?: () => void
  onExport: () => void
  exporting?: boolean
  onGoToProfile: () => void
  /** Régénère le compte rendu. `instructions` = ajustements optionnels saisis
   *  (dictés ou écrits) par le thérapeute via la bulle « Modifier ». */
  onRegenerate?: (instructions?: string) => void
  onFicheExercice?: () => void
}

/**
 * Compte rendu clinique V10 (Knode) — refonte UX/UI 2026-05-16.
 *
 * Consomme le JSON structuré V10 (`compteRendu.data`) et rend des composants
 * visuels interactifs : chips facteurs ↑/↓/→, badges drapeaux pictogrammes,
 * cartes de tests à bordure colorée, accordéons pour les détails secondaires.
 *
 * Principe directeur : l'œil capte l'essentiel en 5 secondes ; le clic révèle
 * les détails techniques.
 */
export function BilanCompteRendu({
  patient, zone, bilanType, profession = 'Kinésithérapeute',
  compteRendu, compteRenduError, generating = false,
  apiKey, dateBilan,
  onBack, onClose, onExport, exporting = false, onGoToProfile,
  onRegenerate, onFicheExercice,
}: BilanCompteRenduProps) {
  const isMountedRef = useRef(true)
  useEffect(() => { isMountedRef.current = true; return () => { isMountedRef.current = false } }, [])

  const [copied, setCopied] = useState(false)
  const data = compteRendu?.data ?? null
  const hasContent = !!data

  const willAutoTrigger = !hasContent && !generating && !compteRenduError && !!apiKey && !!onRegenerate
  const showSkeleton = (generating || willAutoTrigger) && !hasContent

  const autoTriggeredRef = useRef(false)
  useEffect(() => {
    if (autoTriggeredRef.current) return
    if (hasContent || generating || compteRenduError) return
    if (!apiKey || !onRegenerate) return
    autoTriggeredRef.current = true
    onRegenerate()
  }, [hasContent, generating, compteRenduError, apiKey, onRegenerate])

  const age = patient.dateNaissance ? computeAge(patient.dateNaissance) : null
  const sexeSymbol = patient.sexe === 'feminin' ? '♀' : patient.sexe === 'masculin' ? '♂' : null
  const headerSubParts = [
    `${patient.prenom} ${patient.nom}`,
    age !== null ? `${age} ans` : null,
    sexeSymbol,
    zone || bilanType || null,
    dateBilan ? formatDateShort(dateBilan) : null,
  ].filter(Boolean) as string[]

  const handleCopy = async () => {
    if (!data) return
    try {
      await navigator.clipboard.writeText(serializeCompteRendu(data))
      setCopied(true)
      setTimeout(() => { if (isMountedRef.current) setCopied(false) }, 1800)
    } catch {
      // ignore — clipboard peut être bloqué hors HTTPS
    }
  }

  return (
    <div className="general-info-screen slide-in-left">
      <header className="screen-header">
        <button className="btn-back" onClick={onBack} aria-label="Retour">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 18 9 12 15 6"/>
          </svg>
        </button>
        <div style={{ flex: 1, minWidth: 0 }}>
          <h2 className="title-section" style={{ marginBottom: 0 }}>Compte rendu</h2>
          <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--text-muted)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {headerSubParts.join(' · ')}
          </p>
        </div>
        {hasContent && (
          <button
            onClick={handleCopy}
            aria-label="Copier"
            title={copied ? 'Copié !' : 'Copier le compte rendu'}
            style={iconBtnStyle}
          >
            {copied ? (
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#16a34a" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12"/>
              </svg>
            ) : (
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="9" y="9" width="13" height="13" rx="2" ry="2"/>
                <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
              </svg>
            )}
          </button>
        )}
        {onClose && (
          <button onClick={onClose} style={iconBtnStyle} aria-label="Fermer">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        )}
      </header>

      <div className="scroll-area" style={{ paddingBottom: '5.5rem' }}>

        {/* Hero — bandeau introductif style Niveau 1 */}
        <div className="ai-hero">
          <div className="ai-hero-icon">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
              <polyline points="14 2 14 8 20 8"/>
              <line x1="16" y1="13" x2="8" y2="13"/>
              <line x1="16" y1="17" x2="8" y2="17"/>
              <line x1="10" y1="9" x2="8" y2="9"/>
            </svg>
          </div>
          <div className="ai-hero-text">
            <h4>Compte rendu clinique</h4>
            <p>Reformulation et structuration des données saisies. Aucune inférence clinique — le diagnostic et les décisions restent à votre charge.</p>
          </div>
        </div>

        {/* Pas d'API key */}
        {!apiKey && (
          <div style={warnCardStyle}>
            <div style={{ fontWeight: 700, color: '#92400e', fontSize: '0.9rem', marginBottom: 4 }}>Service IA indisponible</div>
            <p style={{ fontSize: '0.82rem', color: '#78350f', margin: '0 0 10px' }}>Configurez votre accès dans le profil pour activer la rédaction.</p>
            <button onClick={onGoToProfile} className="btn-primary-luxe" style={{ marginBottom: 0 }}>Configurer</button>
          </div>
        )}

        {/* Erreur */}
        {compteRenduError && !generating && (
          <div style={errorCardStyle}>
            <div style={{ fontWeight: 700, color: '#991b1b', marginBottom: 4 }}>Rédaction indisponible</div>
            <p style={{ fontSize: '0.8rem', color: '#7f1d1d', margin: 0 }}>{compteRenduError}</p>
            {onRegenerate && (
              <button onClick={() => onRegenerate()} style={{ marginTop: 8, fontSize: '0.82rem', color: 'var(--primary)', fontWeight: 600, background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
                Réessayer
              </button>
            )}
          </div>
        )}

        {/* Sections V10 — style Niveau 1 (ai-section-card) */}
        {data && (
          <div className="fade-in-up">
            <SectionCard title="Anamnèse" icon={<StethoscopeIcon />} accent="indigo">
              <AnamneseSection data={data.anamnese} />
            </SectionCard>

            <SectionCard title="Symptomatologie" icon={<PainIcon />} accent="rose">
              <SymptomatologieSection data={data.symptomatologie} />
            </SectionCard>

            <SectionCard title="Drapeaux" icon={<FlagIcon />} accent="red">
              <DrapeauxSection data={data.drapeaux} />
            </SectionCard>

            <SectionCard title="Examen clinique" icon={<ActivityIcon />} accent="green">
              <ExamenSection data={data.examenClinique} />
            </SectionCard>

            <SectionCard title="Tests spécifiques" icon={<ChecklistIcon />} accent="cyan">
              <TestsSection data={data.testsSpecifiques} />
            </SectionCard>

            <SectionCard title="Projet thérapeutique" icon={<BarsIcon />} accent="orange">
              <ProjetSection data={data.projetTherapeutique} />
            </SectionCard>

            <SectionCard title="Conseils patient" icon={<NoteIcon />} accent="purple">
              <ConseilsSection data={data.conseilsPatient} />
            </SectionCard>
          </div>
        )}

        {/* Skeleton — même structure que les ai-section-card */}
        {showSkeleton && (
          <div>
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="ai-section-card">
                <div className="ai-section-header">
                  <div className="ai-section-icon" style={{ background: 'var(--secondary)' }}>
                    <SkeletonBlock h={18} w="18px" r={4} />
                  </div>
                  <SkeletonBlock h={12} w="40%" />
                </div>
                <div className="ai-section-body">
                  <SkeletonBlock h={11} w="94%" />
                  <SkeletonBlock h={11} w="88%" />
                  <SkeletonBlock h={11} w="62%" />
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Footer */}
        {hasContent && (
          <div className="ai-footer" style={{ marginTop: 14 }}>
            <div className="ai-dot" />
            <p>Reformulation et structuration des données saisies. Aucune inférence clinique IA — le diagnostic et les décisions thérapeutiques restent du ressort du {profession === 'Physiothérapeute' ? 'physiothérapeute' : 'kinésithérapeute'}.</p>
          </div>
        )}

        {/* CTAs */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 14 }}>
          <button
            className="btn-primary-luxe"
            style={{ marginBottom: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, opacity: exporting ? 0.7 : 1, cursor: exporting ? 'wait' : 'pointer' }}
            onClick={onExport}
            disabled={exporting}
          >
            {exporting ? <div className="spinner" /> : (
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                <polyline points="14 2 14 8 20 8"/>
                <line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/>
              </svg>
            )}
            {exporting ? 'Génération du document…' : 'Exporter le compte rendu'}
          </button>
          {onFicheExercice && (
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
          {/* Régénération d'un CR DÉJÀ rempli : le squelette ne s'affiche pas
              (hasContent reste vrai), donc sans ce retour visuel le bouton
              disparaîtrait sans rien montrer. On affiche un bouton « en cours ». */}
          {hasContent && onRegenerate && generating && (
            <button
              disabled
              style={{ width: '100%', padding: '0.65rem', borderRadius: 'var(--radius-lg)', border: '1.5px solid var(--border-color)', background: 'white', color: 'var(--text-muted)', fontSize: '0.82rem', fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, opacity: 0.8, cursor: 'wait' }}
            >
              <div className="spinner" />
              Régénération en cours…
            </button>
          )}
          {hasContent && onRegenerate && !generating && (
            <RegenerateControl onRegenerate={onRegenerate} />
          )}
        </div>
      </div>
    </div>
  )
}

// ── Régénération avec modifications (bulle dictée/écrite) ─────────────

/**
 * Bouton « Regénérer » qui ouvre une bulle de retouche au clic.
 *
 * Le thérapeute peut y indiquer des ajustements précis — soit à la voix
 * (DictableTextarea, même flux dictaphone que le reste de l'app), soit au
 * clavier — puis relancer la génération en les passant au prompt. Champ vide =
 * simple régénération à l'identique.
 */
function RegenerateControl({ onRegenerate }: { onRegenerate: (instructions?: string) => void }) {
  const [open, setOpen] = useState(false)
  const [instructions, setInstructions] = useState('')

  const close = () => { setOpen(false); setInstructions('') }
  const handleConfirm = () => {
    onRegenerate(instructions.trim() || undefined)
    close()
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        style={{ width: '100%', padding: '0.65rem', borderRadius: 'var(--radius-lg)', border: '1.5px solid var(--border-color)', background: 'white', color: 'var(--text-muted)', fontSize: '0.82rem', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}
      >
        <RefreshIcon size={15} color="var(--text-muted)" />
        Regénérer
      </button>
    )
  }

  return (
    <div
      className="fade-in-up"
      style={{
        borderRadius: 'var(--radius-lg)',
        border: '1.5px solid var(--border-color)',
        background: 'white',
        padding: '0.9rem',
        boxShadow: '0 10px 30px rgba(15, 23, 42, 0.10)',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
        <div style={{ width: 28, height: 28, borderRadius: 8, background: 'var(--secondary)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, color: 'var(--primary)' }}>
          <WandIcon size={15} />
        </div>
        <div style={{ flex: 1, minWidth: 0, fontSize: '0.88rem', fontWeight: 700, color: 'var(--text-main)' }}>
          Modifier le compte rendu
        </div>
        <button onClick={close} aria-label="Fermer" style={{ ...iconBtnStyle, width: 26, height: 26 }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
          </svg>
        </button>
      </div>

      <p style={{ margin: '0 0 10px', fontSize: '0.78rem', color: 'var(--text-muted)', lineHeight: 1.45 }}>
        Indiquez les ajustements souhaités — vous pouvez les <strong style={{ fontWeight: 600, color: '#475569' }}>dicter</strong> ou les écrire. Le compte rendu sera regénéré en tenant compte de vos remarques.
      </p>

      <DictableTextarea
        value={instructions}
        onChange={e => setInstructions(e.target.value)}
        placeholder="Ex. « insiste sur la douleur nocturne », « précise que le test de Neer est positif à droite », « raccourcis la partie anamnèse »…"
        minHeight={72}
        textareaStyle={{
          width: '100%',
          padding: '0.6rem 0.7rem',
          borderRadius: 10,
          border: '1.5px solid var(--border-color)',
          fontSize: '0.85rem',
          lineHeight: 1.5,
          color: 'var(--text-main)',
          background: '#f8fafc',
          fontFamily: 'inherit',
        }}
      />

      <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
        <button
          onClick={close}
          style={{ flex: '0 0 auto', padding: '0.65rem 1rem', borderRadius: 'var(--radius-lg)', border: '1.5px solid var(--border-color)', background: 'white', color: 'var(--text-muted)', fontSize: '0.82rem', fontWeight: 600, cursor: 'pointer' }}
        >
          Annuler
        </button>
        <button
          onClick={handleConfirm}
          className="btn-primary-luxe"
          style={{ flex: 1, marginBottom: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}
        >
          <RefreshIcon size={15} color="white" />
          {instructions.trim() ? 'Regénérer avec mes modifications' : 'Regénérer'}
        </button>
      </div>
    </div>
  )
}

function RefreshIcon({ size = 16, color = 'currentColor' }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="23 4 23 10 17 10"/>
      <polyline points="1 20 1 14 7 14"/>
      <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/>
    </svg>
  )
}

function WandIcon({ size = 16, color = 'currentColor' }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M15 4V2"/><path d="M15 16v-2"/><path d="M8 9h2"/><path d="M20 9h2"/>
      <path d="M17.8 11.8 19 13"/><path d="M15 9h.01"/><path d="M17.8 6.2 19 5"/>
      <path d="m3 21 9-9"/><path d="M12.2 6.2 11 5"/>
    </svg>
  )
}

// ── Section renderers (consomment chacun leur slice du JSON V10) ──────

const ANTECEDENT_ICON: Record<string, string> = {
  chirurgical:    '🔧',
  medical:        '🩺',
  physiotherapie: '🏥',
  imagerie:       '📷',
  medicamenteux:  '💊',
  familial:       '👪',
  autre:          '📌',
}
const ANTECEDENT_LABEL: Record<string, string> = {
  chirurgical:    'Chirurgical',
  medical:        'Médical',
  physiotherapie: 'Physiothérapie',
  imagerie:       'Imagerie',
  medicamenteux:  'Médicamenteux',
  familial:       'Familial',
  autre:          'Autre',
}

function AnamneseSection({ data }: { data: CompteRenduData['anamnese'] }) {
  const hasPlainte = !!data.plaintePrincipale
  const hasFacteur = !!data.facteurDeclenchantPousseeActuelle
  const hasCtxPro = data.contextePro && (data.contextePro.actuel || data.contextePro.anterieur)
  const hasCtxSport = !!data.contexteSportif
  const hasAtcd = data.antecedents.length > 0
  const hasTtt = data.traitementsEnCours.length > 0

  if (!hasPlainte && !hasFacteur && !hasCtxPro && !hasCtxSport && !hasAtcd && !hasTtt) {
    return <EmptyState message="Aucune donnée d'anamnèse renseignée" />
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {hasPlainte && (
        <HighlightBox pictogram="stethoscope" label="Plainte principale">
          {data.plaintePrincipale}
        </HighlightBox>
      )}
      {hasFacteur && (
        <HighlightBox pictogram="zap" label="Facteur déclenchant" tint="amber">
          {data.facteurDeclenchantPousseeActuelle}
        </HighlightBox>
      )}
      {hasCtxPro && (
        <Accordion title="Contexte professionnel">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: '0.86rem', color: '#334155', lineHeight: 1.5 }}>
            {data.contextePro?.actuel && (
              <div><strong style={{ color: '#475569', fontWeight: 600 }}>Actuel :</strong> {data.contextePro.actuel}</div>
            )}
            {data.contextePro?.anterieur && (
              <div><strong style={{ color: '#475569', fontWeight: 600 }}>Antérieur :</strong> {data.contextePro.anterieur}</div>
            )}
          </div>
        </Accordion>
      )}
      {hasCtxSport && (
        <Accordion title="Contexte sportif">
          <p style={{ margin: 0, fontSize: '0.86rem', color: '#334155', lineHeight: 1.5 }}>{data.contexteSportif}</p>
        </Accordion>
      )}
      {hasAtcd && (
        <Accordion title="Antécédents" count={data.antecedents.length}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {data.antecedents.map((a, i) => (
              <div key={i} style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
                <span aria-hidden style={{ fontSize: '0.95rem', flexShrink: 0, marginTop: 1 }}>{ANTECEDENT_ICON[a.type] ?? '📌'}</span>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: '0.86rem', color: '#0f172a' }}>
                    <span style={{ fontWeight: 600 }}>{ANTECEDENT_LABEL[a.type] ?? 'Autre'} :</span> {a.libelle}
                  </div>
                  {a.detail && <div style={{ fontSize: '0.8rem', color: '#475569', lineHeight: 1.5, marginTop: 2 }}>{a.detail}</div>}
                  {a.lienAvecPlainte && (
                    <div style={{ fontSize: '0.78rem', color: '#a16207', marginTop: 4, display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                      <span aria-hidden>💡</span>{a.lienAvecPlainte}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </Accordion>
      )}
      <div>
        {hasTtt ? (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {data.traitementsEnCours.map((t, i) => (
              <Chip key={i} variant="neutral" label={t.libelle} detail={t.detail ?? undefined} prefix="💊" />
            ))}
          </div>
        ) : (
          <Badge variant="success" icon={<span aria-hidden>✓</span>}>Aucun traitement médicamenteux en cours</Badge>
        )}
      </div>
    </div>
  )
}

function SymptomatologieSection({ data }: { data: CompteRenduData['symptomatologie'] }) {
  const evnVal = data.evn.actuel ?? data.evn.moyen ?? data.evn.pire ?? null
  const hasFacteurs =
    data.facteursAggravants.length > 0 ||
    data.facteursSoulageants.length > 0 ||
    data.facteursToleres.length > 0
  const hasTopo = !!(data.topographie.principale || data.topographie.predominance || data.topographie.irradiation)

  if (!evnVal && !data.caractere && !data.retentissement && !hasTopo && !hasFacteurs && !data.douleurNocturne && !data.evolutionTemporelle) {
    return <EmptyState message="Aucune donnée de symptomatologie renseignée" />
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      {/* Bloc EVN + caractère + retentissement */}
      {(evnVal || data.caractere || data.retentissement) && (
        <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start', flexWrap: 'wrap' }}>
          {evnVal && (() => {
            const { score, context } = parseEvnValue(evnVal)
            return (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4, alignItems: 'flex-start' }}>
                <EVNBadge value={score} />
                {context && (
                  <span style={{
                    fontSize: '0.74rem',
                    color: '#64748b',
                    fontWeight: 500,
                    lineHeight: 1.3,
                    paddingLeft: 4,
                  }}>
                    {context}
                  </span>
                )}
              </div>
            )
          })()}
          <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 8, justifyContent: 'center' }}>
            {data.caractere && (
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                <span style={{ fontSize: '0.72rem', fontWeight: 600, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Caractère</span>
                <Badge variant="neutral">{data.caractere}</Badge>
              </div>
            )}
            {data.retentissement && (
              <div style={{ display: 'inline-flex', alignItems: 'flex-start', gap: 6, fontSize: '0.82rem', color: '#a16207', lineHeight: 1.4 }}>
                <SubIcon name="zap" size={13} />
                <span>{data.retentissement}</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Topographie */}
      {hasTopo && (
        <div>
          <div style={subLabelStyle}>📍 Topographie</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 2, fontSize: '0.86rem', color: '#334155', lineHeight: 1.5 }}>
            {data.topographie.principale && <div>{data.topographie.principale}</div>}
            {data.topographie.predominance && <div style={{ color: '#475569' }}>Prédominance : {data.topographie.predominance}</div>}
            {data.topographie.irradiation && <div style={{ color: '#475569' }}>Irradiation : {data.topographie.irradiation}</div>}
          </div>
        </div>
      )}

      {/* Facteurs aggravants */}
      {data.facteursAggravants.length > 0 && (
        <FactorGroup title="Facteurs aggravants" items={data.facteursAggravants} variant="aggravant" />
      )}
      {/* Facteurs soulageants */}
      {data.facteursSoulageants.length > 0 && (
        <FactorGroup title="Facteurs soulageants" items={data.facteursSoulageants} variant="soulageant" />
      )}
      {/* Tolérés */}
      {data.facteursToleres.length > 0 && (
        <FactorGroup title="Tolérés" items={data.facteursToleres} variant="tolere" />
      )}

      {/* Douleur nocturne — toujours affichée (traçabilité) */}
      {data.douleurNocturne ? (
        data.douleurNocturne.present ? (
          <Badge variant="danger" icon={<span aria-hidden>🌙</span>}>
            Douleur nocturne{data.douleurNocturne.detail ? ` — ${data.douleurNocturne.detail}` : ''}
          </Badge>
        ) : (
          <Badge variant="success" icon={<span aria-hidden>🌙</span>}>
            Pas de douleur nocturne{data.douleurNocturne.detail ? ` — ${data.douleurNocturne.detail}` : ''}
          </Badge>
        )
      ) : null}

      {data.evolutionTemporelle && (
        <Accordion title="Évolution temporelle">
          <p style={{ margin: 0, fontSize: '0.86rem', color: '#334155', lineHeight: 1.5 }}>{data.evolutionTemporelle}</p>
        </Accordion>
      )}
    </div>
  )
}

function FactorGroup({ title, items, variant }: {
  title: string
  items: string[]
  variant: 'aggravant' | 'soulageant' | 'tolere'
}) {
  const palette = {
    aggravant:  { bg: '#fef2f2', border: '#fecaca', fg: '#b91c1c' },
    soulageant: { bg: '#f0fdf4', border: '#bbf7d0', fg: '#15803d' },
    tolere:     { bg: '#eff6ff', border: '#bfdbfe', fg: '#1d4ed8' },
  }[variant]
  return (
    <div style={{
      background: palette.bg,
      border: `1px solid ${palette.border}`,
      borderRadius: 10,
      padding: '10px 12px',
    }}>
      <div style={{ fontSize: '0.78rem', fontWeight: 700, color: palette.fg, marginBottom: 6 }}>
        {title}
      </div>
      <ul style={{ margin: 0, paddingLeft: 18, fontSize: '0.86rem', color: '#1e293b', lineHeight: 1.55 }}>
        {items.map((label, i) => (
          <li key={i}>{label}</li>
        ))}
      </ul>
    </div>
  )
}

function DrapeauxSection({ data }: { data: CompteRenduData['drapeaux'] }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <FlagBadge flag="rouges" data={data.rouges} />
      <FlagBadge flag="jaunes" data={data.jaunes} />
      <FlagBadge flag="bleus" data={data.bleus} />
      <FlagBadge flag="noirs" data={data.noirs} />
    </div>
  )
}

function ExamenSection({ data }: { data: CompteRenduData['examenClinique'] }) {
  const hasMorpho = !!data.morphostatique
  const hasPalp = data.palpation.positifs.length > 0
  const hasMob = data.mobilite.items.length > 0
  const complementaire = [
    data.mobilite.amplitudesEnDegres,
    !data.neurologique.realise ? (data.neurologique.detail ?? 'Examen neurologique non réalisé') : null,
    !data.force.realise ? (data.force.detail ?? 'Force (MRC) non testée') : null,
  ].filter(Boolean) as string[]

  if (!hasMorpho && !hasPalp && !hasMob && complementaire.length === 0) {
    return <EmptyState message="Aucune donnée d'examen clinique renseignée" />
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      {hasMorpho && (
        <div>
          <div style={{ ...subLabelStyle, display: 'flex', alignItems: 'center', gap: 6 }}>
            <SubIcon name="user-stand" /> Morphostatique
          </div>
          <p style={{ margin: 0, fontSize: '0.86rem', color: '#334155', lineHeight: 1.55 }}>{data.morphostatique}</p>
        </div>
      )}

      {hasPalp && (
        <div>
          <div style={{ ...subLabelStyle, display: 'flex', alignItems: 'center', gap: 6 }}>
            <SubIcon name="hand" /> Palpation <span style={{ fontWeight: 500, color: '#64748b', textTransform: 'none', letterSpacing: 0 }}>(reproduction des symptômes)</span>
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {data.palpation.positifs.map((p, i) => (
              <Chip
                key={i}
                variant="aggravant"
                label={p.localisation}
              />
            ))}
          </div>
        </div>
      )}

      {hasMob && (
        <div>
          <div style={{ ...subLabelStyle, display: 'flex', alignItems: 'center', gap: 6 }}>
            <SubIcon name="rotate" /> Mobilité{data.mobilite.zone ? ` ${data.mobilite.zone}` : ''}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {data.mobilite.items.map((item, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <MobilityStatus statut={item.statut} />
                <div style={{ flex: 1, minWidth: 0, fontSize: '0.86rem', color: '#334155', lineHeight: 1.4 }}>
                  <span style={{ fontWeight: 600, color: '#0f172a' }}>{item.mouvement}</span>
                  {item.detail && <span style={{ color: '#64748b' }}> — {item.detail}</span>}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {complementaire.length > 0 && (
        <Accordion title="Examen complémentaire" rightHint={`${complementaire.length} NR`}>
          <ul style={{ margin: 0, paddingLeft: 16, fontSize: '0.82rem', color: '#64748b', lineHeight: 1.6 }}>
            {complementaire.map((c, i) => <li key={i}>{c}</li>)}
          </ul>
        </Accordion>
      )}
    </div>
  )
}

function TestsSection({ data }: { data: CompteRenduData['testsSpecifiques'] }) {
  if (data.length === 0) {
    return <EmptyState message="Aucun test spécifique réalisé" />
  }
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {data.map((t, i) => (
        <TestCard key={i} nom={t.nom} resultat={t.resultat} cote={t.cote} detail={t.detail} />
      ))}
    </div>
  )
}

function ProjetSection({ data }: { data: CompteRenduData['projetTherapeutique'] }) {
  const hasHyp = !!data.hypothesesPraticien
  const hasTech = data.techniquesRealisees.length > 0

  if (!hasHyp && !hasTech) {
    return <EmptyState message="Aucune hypothèse diagnostique ni technique réalisée énoncée par le thérapeute lors de cette séance" />
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      {hasHyp && (
        <div>
          <div style={subLabelStyle}>💭 Hypothèses formulées par le thérapeute</div>
          <HypothesisBlock text={data.hypothesesPraticien!} />
        </div>
      )}
      {hasTech && (
        <div>
          <div style={subLabelStyle}>🛠️ Techniques réalisées en séance</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            {data.techniquesRealisees.map((t, i) => (
              <div
                key={i}
                style={{
                  display: 'flex', alignItems: 'flex-start', gap: 8,
                  padding: '7px 10px', borderRadius: 8,
                  background: '#f8fafc', border: '1px solid #e2e8f0',
                  fontSize: '0.86rem', color: '#0f172a', lineHeight: 1.4,
                }}
              >
                <span aria-hidden style={{ color: '#15803d', fontWeight: 700, flexShrink: 0 }}>✓</span>
                <span>{t}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

/**
 * Parse la chaîne « Hypothèse principale : … Hypothèse différentielle : …
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

function HypothesisColoredBlock({ label, text, accent }: { label: string; text: string; accent: 'green' | 'orange' | 'red' }) {
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
      <p style={{ margin: 0, fontSize: '0.85rem', lineHeight: 1.55, color: 'var(--text-main)', whiteSpace: 'pre-wrap' }}>{text}</p>
    </div>
  )
}

/**
 * Affiche les hypothèses formulées par le thérapeute.
 * - Si le texte suit le format « Hypothèse principale : … différentielle : … Surveillance recommandée : … »,
 *   rendu en 3 cartes colorées (vert/orange/rouge) avec pictogramme livre.
 * - Sinon, fallback en carte orange unique avec troncature/expansion.
 */
function HypothesisBlock({ text }: { text: string }) {
  // Hooks AVANT tout return conditionnel (Rules of Hooks) : `text` peut alterner
  // entre le format structuré (return anticipé) et le format fallback selon le
  // dossier rendu. Si useState était appelé après le return, le nombre de hooks
  // varierait d'un rendu à l'autre → React « Rendered fewer hooks than expected ».
  const [expanded, setExpanded] = useState(false)
  const blocks = parseHypothesesBlocks(text)
  if (!blocks.fallback) {
    return (
      <div>
        {blocks.principale && <HypothesisColoredBlock accent="green" label="Hypothèse principale" text={blocks.principale} />}
        {blocks.differentielle && <HypothesisColoredBlock accent="orange" label="Hypothèse différentielle" text={blocks.differentielle} />}
        {blocks.surveillance && <HypothesisColoredBlock accent="red" label="Surveillance recommandée" text={blocks.surveillance} />}
      </div>
    )
  }
  const truncateAt = 260
  const isLong = text.length > truncateAt
  const shown = isLong && !expanded ? text.slice(0, truncateAt).trimEnd() + '…' : text
  return (
    <div
      style={{
        padding: '12px 14px',
        background: '#fff7ed',
        border: '1px solid #fed7aa',
        borderRadius: 10,
        fontSize: '0.86rem',
        color: '#1e293b',
        lineHeight: 1.6,
        whiteSpace: 'pre-wrap',
      }}
    >
      {shown}
      {isLong && (
        <button
          type="button"
          onClick={() => setExpanded(e => !e)}
          style={{
            display: 'block',
            marginTop: 6,
            background: 'none',
            border: 'none',
            color: '#c2410c',
            fontWeight: 600,
            fontSize: '0.78rem',
            cursor: 'pointer',
            padding: 0,
          }}
        >
          {expanded ? '◂ Réduire' : 'Voir l\'analyse complète ▸'}
        </button>
      )}
    </div>
  )
}

function ConseilsSection({ data }: { data: CompteRenduData['conseilsPatient'] }) {
  const hasExos = data.exercicesEnseignes.length > 0
  const hasEdu = data.educationTherapeutique.length > 0

  if (!hasExos && !hasEdu) {
    return <EmptyState message="Aucun conseil spécifique énoncé lors de cette séance" />
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      {hasExos && (
        <div>
          <div style={subLabelStyle}>🏋️ Exercices enseignés <span style={{ color: '#94a3b8', fontWeight: 500 }}>({data.exercicesEnseignes.length})</span></div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            {data.exercicesEnseignes.map((e, i) => (
              <Accordion key={i} title={e.nom}>
                <p style={{ margin: 0, fontSize: '0.84rem', color: '#334155', lineHeight: 1.55 }}>
                  {e.detail ? e.detail : <em style={{ color: '#94a3b8' }}>Pas de modalité détaillée renseignée</em>}
                </p>
              </Accordion>
            ))}
          </div>
        </div>
      )}

      {hasEdu && (
        <div style={{
          background: '#eff6ff',
          border: '1px solid #bfdbfe',
          borderRadius: 10,
          padding: '10px 12px',
        }}>
          <div style={{ fontSize: '0.78rem', fontWeight: 700, color: '#1d4ed8', marginBottom: 6, display: 'flex', alignItems: 'center', gap: 6 }}>
            <SubIcon name="book-open" /> Éducation thérapeutique
          </div>
          <ul style={{ margin: 0, paddingLeft: 18, fontSize: '0.86rem', color: '#1e293b', lineHeight: 1.55 }}>
            {data.educationTherapeutique.map((c, i) => (
              <li key={i}>{c}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}

// ── Helpers UI ────────────────────────────────────────────────────────

function HighlightBox({ pictogram, label, children, tint = 'blue' }: { pictogram?: SubIconName; label: string; children: ReactNode; tint?: 'blue' | 'amber' }) {
  const palette = tint === 'amber'
    ? { bg: '#fffbeb', border: '#fde68a', labelFg: '#a16207' }
    : { bg: '#eff6ff', border: '#bfdbfe', labelFg: '#1d4ed8' }
  return (
    <div
      style={{
        padding: '10px 12px',
        background: palette.bg,
        border: `1px solid ${palette.border}`,
        borderRadius: 10,
      }}
    >
      <div style={{ fontSize: '0.78rem', fontWeight: 700, color: palette.labelFg, marginBottom: 4, display: 'flex', alignItems: 'center', gap: 6 }}>
        {pictogram && <SubIcon name={pictogram} size={14} />}{label}
      </div>
      <div style={{ fontSize: '0.86rem', color: '#1e293b', lineHeight: 1.5, fontWeight: 400 }}>
        {children}
      </div>
    </div>
  )
}

// ── SubIcon : pictogrammes thin SVG pour remplacer les emojis ────────

type SubIconName = 'stethoscope' | 'zap' | 'user-stand' | 'hand' | 'rotate' | 'book-open'

function SubIcon({ name, size = 14, color = 'currentColor' }: { name: SubIconName; size?: number; color?: string }) {
  const common = {
    width: size,
    height: size,
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: color,
    strokeWidth: 1.7,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
  }
  switch (name) {
    case 'stethoscope':
      return (
        <svg {...common}>
          <path d="M11 2v2a3 3 0 0 0-3 3v6a3 3 0 0 0 3 3"/>
          <path d="M17 2v2a3 3 0 0 1 3 3v6a3 3 0 0 1-3 3"/>
          <circle cx="14" cy="20" r="2"/>
        </svg>
      )
    case 'zap':
      return (
        <svg {...common}>
          <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>
        </svg>
      )
    case 'user-stand':
      return (
        <svg {...common}>
          <circle cx="12" cy="4" r="2"/>
          <line x1="12" y1="6" x2="12" y2="17"/>
          <line x1="12" y1="17" x2="9" y2="22"/>
          <line x1="12" y1="17" x2="15" y2="22"/>
          <line x1="8" y1="11" x2="16" y2="11"/>
        </svg>
      )
    case 'hand':
      return (
        <svg {...common}>
          <path d="M18 11V6a2 2 0 0 0-4 0v5"/>
          <path d="M14 10V4a2 2 0 0 0-4 0v6"/>
          <path d="M10 10.5V6a2 2 0 0 0-4 0v8"/>
          <path d="M18 8a2 2 0 1 1 4 0v6a8 8 0 0 1-8 8h-2c-2.8 0-4.5-.86-5.99-2.34l-3.6-3.6a2 2 0 0 1 2.83-2.82L7 15"/>
        </svg>
      )
    case 'rotate':
      return (
        <svg {...common}>
          <polyline points="23 4 23 10 17 10"/>
          <polyline points="1 20 1 14 7 14"/>
          <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/>
        </svg>
      )
    case 'book-open':
      return (
        <svg {...common}>
          <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/>
          <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/>
        </svg>
      )
  }
}

function EmptyState({ message }: { message: string }) {
  return (
    <p style={{ margin: 0, fontSize: '0.82rem', color: '#94a3b8', fontStyle: 'italic', lineHeight: 1.5 }}>
      {message}
    </p>
  )
}

const subLabelStyle = {
  fontSize: '0.78rem',
  fontWeight: 700,
  color: '#475569',
  marginBottom: 6,
  letterSpacing: '0.02em',
} as const

// ── Section card ──────────────────────────────────────────────────────

type Accent = 'red' | 'rose' | 'green' | 'orange' | 'indigo' | 'purple' | 'cyan'

const ACCENT_META: Record<Accent, { fg: string; bgIcon: string }> = {
  red:    { fg: '#dc2626', bgIcon: '#fee2e2' },
  rose:   { fg: '#e11d48', bgIcon: '#ffe4e6' },
  green:  { fg: '#16a34a', bgIcon: '#dcfce7' },
  orange: { fg: '#ea580c', bgIcon: '#ffedd5' },
  indigo: { fg: '#4f46e5', bgIcon: '#e0e7ff' },
  purple: { fg: '#9333ea', bgIcon: '#f3e8ff' },
  cyan:   { fg: '#0891b2', bgIcon: '#cffafe' },
}

function SectionCard({ title, icon, accent, children }: { title: string; icon: ReactElement; accent: Accent; children: ReactNode }) {
  const meta = ACCENT_META[accent]
  return (
    <div className="ai-section-card">
      <div className="ai-section-header">
        <div className="ai-section-icon" style={{ background: meta.bgIcon, color: meta.fg }}>
          {icon}
        </div>
        <h4 style={{ color: meta.fg }}>{title}</h4>
      </div>
      <div className="ai-section-body">{children}</div>
    </div>
  )
}

// ── Icons (18px) ──────────────────────────────────────────────────────

function FlagIcon() {
  return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"/><line x1="4" y1="22" x2="4" y2="15"/></svg>
}
function PainIcon() {
  return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/></svg>
}
function ActivityIcon() {
  return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>
}
function BarsIcon() {
  return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="4" y1="20" x2="4" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="20" y1="20" x2="20" y2="14"/></svg>
}
function StethoscopeIcon() {
  return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 2v2a3 3 0 0 0-3 3v6a3 3 0 0 0 3 3"/><path d="M17 2v2a3 3 0 0 1 3 3v6a3 3 0 0 1-3 3"/><circle cx="14" cy="20" r="2"/></svg>
}
function NoteIcon() {
  return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
}
function ChecklistIcon() {
  return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 11 12 14 22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg>
}
function BookIcon({ size = 16, color = 'currentColor' }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/>
      <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/>
    </svg>
  )
}

// ── Skeleton ──────────────────────────────────────────────────────────

function SkeletonBlock({ h, w, r = 4 }: { h: number; w: string; r?: number }) {
  return (
    <div style={{
      height: h,
      width: w,
      borderRadius: r,
      background: 'linear-gradient(90deg, #e2e8f0 0%, #f1f5f9 50%, #e2e8f0 100%)',
      backgroundSize: '200% 100%',
      animation: 'skeleton-pulse 1.5s ease-in-out infinite',
      marginTop: 6,
    }} />
  )
}

// ── Helpers ───────────────────────────────────────────────────────────

/**
 * Sépare la note EVN pure ("8/10", "8-9/10") du contexte éventuel
 * ("pendant la journée", "au repos", entre parenthèses ou non).
 * Le contexte est extrait pour être affiché à côté du carré, pas dedans.
 */
function parseEvnValue(raw: string): { score: string; context: string | null } {
  const m = raw.match(/^\s*(\d+(?:[.,]\d+)?(?:\s*[-–]\s*\d+(?:[.,]\d+)?)?\s*\/\s*\d+)\s*(.*)$/)
  if (m) {
    const score = m[1].replace(/\s+/g, '')
    const rest = m[2].trim().replace(/^[(（]\s*/, '').replace(/\s*[)）]$/, '').trim()
    return { score, context: rest || null }
  }
  return { score: raw.trim(), context: null }
}

function formatDateShort(iso: string): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return iso
  return d.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

/**
 * Sérialise le compte rendu V10 en texte plein pour le presse-papier
 * (export rapide médecin). Pas de markdown, juste un texte lisible.
 */
function serializeCompteRendu(d: CompteRenduData): string {
  const lines: string[] = []
  const push = (s: string) => lines.push(s)
  const heading = (s: string) => { push(''); push(s.toUpperCase()); push('') }

  heading('Anamnèse')
  if (d.anamnese.plaintePrincipale) push(`Plainte : ${d.anamnese.plaintePrincipale}`)
  if (d.anamnese.facteurDeclenchantPousseeActuelle) push(`Facteur déclenchant : ${d.anamnese.facteurDeclenchantPousseeActuelle}`)
  if (d.anamnese.contextePro?.actuel) push(`Contexte pro actuel : ${d.anamnese.contextePro.actuel}`)
  if (d.anamnese.contextePro?.anterieur) push(`Contexte pro antérieur : ${d.anamnese.contextePro.anterieur}`)
  if (d.anamnese.contexteSportif) push(`Contexte sportif : ${d.anamnese.contexteSportif}`)
  if (d.anamnese.antecedents.length > 0) {
    push('ATCD :')
    d.anamnese.antecedents.forEach(a => {
      push(`  - ${ANTECEDENT_LABEL[a.type] ?? 'Autre'} : ${a.libelle}${a.detail ? ` — ${a.detail}` : ''}`)
    })
  }
  if (d.anamnese.traitementsEnCours.length > 0) {
    push('TTT en cours :')
    d.anamnese.traitementsEnCours.forEach(t => push(`  - ${t.libelle}${t.detail ? ` — ${t.detail}` : ''}`))
  } else {
    push('TTT en cours : aucun')
  }

  heading('Symptomatologie')
  const evnVal = d.symptomatologie.evn.actuel ?? d.symptomatologie.evn.moyen ?? d.symptomatologie.evn.pire
  if (evnVal) push(`EVN : ${evnVal}`)
  if (d.symptomatologie.caractere) push(`Caractère : ${d.symptomatologie.caractere}`)
  if (d.symptomatologie.retentissement) push(`Retentissement : ${d.symptomatologie.retentissement}`)
  if (d.symptomatologie.topographie.principale) push(`Topographie : ${d.symptomatologie.topographie.principale}`)
  if (d.symptomatologie.topographie.predominance) push(`  Prédominance : ${d.symptomatologie.topographie.predominance}`)
  if (d.symptomatologie.topographie.irradiation) push(`  Irradiation : ${d.symptomatologie.topographie.irradiation}`)
  if (d.symptomatologie.facteursAggravants.length > 0) push(`↑ Aggravants : ${d.symptomatologie.facteursAggravants.join(' · ')}`)
  if (d.symptomatologie.facteursSoulageants.length > 0) push(`↓ Soulageants : ${d.symptomatologie.facteursSoulageants.join(' · ')}`)
  if (d.symptomatologie.facteursToleres.length > 0) push(`→ Tolérés : ${d.symptomatologie.facteursToleres.join(' · ')}`)
  if (d.symptomatologie.douleurNocturne) {
    push(d.symptomatologie.douleurNocturne.present ? `Douleur nocturne : oui` : `Douleur nocturne : non`)
  }
  if (d.symptomatologie.evolutionTemporelle) push(`Évolution : ${d.symptomatologie.evolutionTemporelle}`)

  heading('Drapeaux')
  ;(['rouges', 'jaunes', 'bleus', 'noirs'] as const).forEach(k => {
    const fl = d.drapeaux[k]
    const label = k === 'rouges' ? '🔴 Rouges' : k === 'jaunes' ? '🟡 Jaunes' : k === 'bleus' ? '🔵 Bleus' : '⚫ Noirs'
    if (fl.statut === 'tous_negatifs') push(`${label} : tous absents`)
    else if (fl.statut === 'non_renseigne') push(`${label} : non renseigné`)
    else push(`${label} : ${(fl.elementsPositifs ?? []).join(' · ')}`)
  })

  heading('Examen clinique')
  if (d.examenClinique.morphostatique) push(`Morphostatique : ${d.examenClinique.morphostatique}`)
  if (d.examenClinique.palpation.positifs.length > 0) {
    push('Palpation :')
    d.examenClinique.palpation.positifs.forEach(p => push(`  + ${p.localisation}${p.detail ? ` — ${p.detail}` : ''}`))
  }
  if (d.examenClinique.palpation.negatifs.length > 0) push(`  Ø ${d.examenClinique.palpation.negatifs.join(' · ')}`)
  if (d.examenClinique.mobilite.items.length > 0) {
    push(`Mobilité${d.examenClinique.mobilite.zone ? ` ${d.examenClinique.mobilite.zone}` : ''} :`)
    d.examenClinique.mobilite.items.forEach(m => push(`  - ${m.mouvement} : ${m.statut}${m.detail ? ` (${m.detail})` : ''}`))
  }
  if (d.examenClinique.mobilite.amplitudesEnDegres) push(`Amplitudes (°) : ${d.examenClinique.mobilite.amplitudesEnDegres}`)
  if (!d.examenClinique.neurologique.realise) push(`Neurologique : ${d.examenClinique.neurologique.detail ?? 'non réalisé'}`)
  if (!d.examenClinique.force.realise) push(`Force MRC : ${d.examenClinique.force.detail ?? 'non testée'}`)

  heading('Tests spécifiques')
  d.testsSpecifiques.forEach(t => {
    const sign = t.resultat === 'positif' ? '+' : t.resultat === 'negatif' ? '−' : 'Ø'
    push(`${t.nom} ${sign}${t.cote ?? ''}${t.detail ? ` — ${t.detail}` : ''}`)
  })

  heading('Projet thérapeutique')
  if (d.projetTherapeutique.hypothesesPraticien) {
    push(`Hypothèses (thérapeute) : ${d.projetTherapeutique.hypothesesPraticien}`)
  }
  if (d.projetTherapeutique.techniquesRealisees.length > 0) {
    push('Techniques réalisées :')
    d.projetTherapeutique.techniquesRealisees.forEach(t => push(`  ✓ ${t}`))
  }

  heading('Conseils patient')
  if (d.conseilsPatient.exercicesEnseignes.length > 0) {
    push('Exercices enseignés :')
    d.conseilsPatient.exercicesEnseignes.forEach(e => push(`  - ${e.nom}${e.detail ? ` — ${e.detail}` : ''}`))
  }
  if (d.conseilsPatient.educationTherapeutique.length > 0) {
    push('Éducation : ' + d.conseilsPatient.educationTherapeutique.join(' · '))
  }
  if (d.conseilsPatient.suivi.frequence) push(`Suivi : ${d.conseilsPatient.suivi.frequence}`)
  if (d.conseilsPatient.suivi.prochainsRDV.length > 0) {
    push('RDV : ' + d.conseilsPatient.suivi.prochainsRDV.join(' · '))
  }

  return lines.join('\n').replace(/^\n+/, '').replace(/\n{3,}/g, '\n\n')
}

// ── Styles partagés ───────────────────────────────────────────────────

const iconBtnStyle: React.CSSProperties = {
  width: 32, height: 32, borderRadius: 8,
  background: 'var(--secondary)', border: 'none',
  display: 'flex', alignItems: 'center', justifyContent: 'center',
  color: 'var(--text-muted)', cursor: 'pointer', flexShrink: 0,
}

const warnCardStyle: React.CSSProperties = {
  marginBottom: 12,
  padding: 14,
  borderRadius: 12,
  background: '#fffbeb',
  border: '1px solid #fde68a',
}

const errorCardStyle: React.CSSProperties = {
  marginBottom: 12,
  padding: 14,
  borderRadius: 12,
  background: '#fef2f2',
  border: '1px solid #fecaca',
}

export type { CompteRendu }

import { useState, useImperativeHandle, forwardRef, useMemo } from 'react'
import type { BilanMode, NarrativeReport } from '../../types'
import { BilanVocalMode } from './BilanVocalMode'
import { BilanModeToggle, SectionHeader } from './shared'
import {
  ContratKineSection, ConseilsSection, PSFSCards,
  mergeContrat, emptyPsfs, mergePsfs,
  inputStyle, lblStyle, sectionTitleStyle,
  type ContratState, type PsfsItem,
} from './bilanSections'
import { DictableTextarea } from '../VoiceMic'
import { InfosGeneralesSection } from './InfosGeneralesSection'
import {
  StepTypeSelection, StepContreIndications, StepAnamnese,
  StepExamenClinique, StepMesures, StepStade, StepFonctionICF,
  StepDxDifferentiel, StepPlanTraitement,
} from './drainageLymphatique/dlmSteps'
import {
  mergeBilanDLM, hasBlockingCI,
  OEDEME_LABELS, DLM_PRESETS,
} from './drainageLymphatique/dlmTypes'
import type {
  BilanDLMData, OedemeType, BodyRegion,
  DlmContreIndications, DlmAnamnese, DlmExamenClinique, DlmMesures,
  DlmICF, DlmDxDifferentiel, DlmPlanTraitement,
  StadeISL, StadeLipo, ClasseCEAP,
} from './drainageLymphatique/dlmTypes'

export interface BilanDrainageLymphatiqueHandle {
  getData: () => Record<string, unknown>
  setData: (d: Record<string, unknown>) => void
}

// Le bilan DLM est dense (9 axes cliniques). On regroupe les étapes en sections
// collapsibles à la manière des autres bilans, pas en wizard linéaire — cohérence
// UX avec BilanGeriatrique / BilanCheville. Le clinicien navigue librement.
type SectionId =
  | 'infosGenerales'
  | 'type'
  | 'contreIndications'
  | 'anamnese'
  | 'examen'
  | 'mesures'
  | 'stade'
  | 'icf'
  | 'dx'
  | 'plan'
  | 'psfs'
  | 'contrat'
  | 'conseils'

type Priority = 'noyau' | 'approfondissement'

interface SectionDef {
  id: SectionId
  title: string
  color: string
  priority: Priority
}

export const BilanDrainageLymphatique = forwardRef<
  BilanDrainageLymphatiqueHandle,
  { initialData?: Record<string, unknown> }
>(({ initialData }, ref) => {
  const [mode, setMode] = useState<BilanMode>(
    (initialData?._mode as BilanMode | undefined) ?? 'noyau'
  )
  const coreMode = mode === 'noyau'
  const [vocalReport, setVocalReport] = useState<NarrativeReport | null>(
    (initialData?.narrativeReport as NarrativeReport) ?? null,
  )

  // ─── State principal ─── parent-owned via mergeBilanDLM (tolérant aux legacy) ─
  const [data, setData] = useState<BilanDLMData>(() => mergeBilanDLM(initialData))

  // PSFS + Contrat + Conseils — partagés avec les autres bilans pour cohérence pipeline IA/PDF
  const [psfs, setPsfs] = useState<PsfsItem[]>(() => mergePsfs((initialData?.psfs as unknown) ?? emptyPsfs()))
  const [contrat, setContrat] = useState<ContratState>(() => mergeContrat((initialData?.contrat as Record<string, unknown>) ?? {}))
  const [conseils, setConseils] = useState<string>(() => {
    const c = initialData?.conseils
    if (typeof c === 'string') return c
    if (c && typeof c === 'object' && 'recos' in (c as Record<string, unknown>)) {
      return ((c as Record<string, unknown>).recos as string) ?? ''
    }
    return ''
  })

  // ─── Sections collapsibles ────────────────────────────────────────────────
  const [open, setOpen] = useState<Record<SectionId, boolean>>({
    infosGenerales: true,
    type: true, contreIndications: false, anamnese: false, examen: false,
    mesures: false, stade: false, icf: false, dx: false, plan: false,
    psfs: false, contrat: false, conseils: false,
  })
  const toggle = (id: SectionId) => setOpen(p => ({ ...p, [id]: !p[id] }))

  const blockingCI = hasBlockingCI(data.contreIndications)

  // ─── Patches immutables ───────────────────────────────────────────────────
  const patch = (partial: Partial<BilanDLMData>) =>
    setData(prev => ({ ...prev, ...partial }))
  const patchCI = (p: Partial<DlmContreIndications>) =>
    setData(prev => ({ ...prev, contreIndications: { ...prev.contreIndications, ...p } }))
  const patchAnamnese = (p: Partial<DlmAnamnese>) =>
    setData(prev => ({ ...prev, anamnese: { ...prev.anamnese, ...p } }))
  const patchExamen = (p: Partial<DlmExamenClinique>) =>
    setData(prev => ({ ...prev, examenClinique: { ...prev.examenClinique, ...p } }))
  const patchMesures = (p: Partial<DlmMesures>) =>
    setData(prev => ({ ...prev, mesures: { ...prev.mesures, ...p } }))
  const patchICF = (p: Partial<DlmICF>) =>
    setData(prev => ({ ...prev, icf: { ...prev.icf, ...p } }))
  const setDx = (next: DlmDxDifferentiel) =>
    setData(prev => ({ ...prev, dxDifferentiel: next }))
  const patchPlan = (p: Partial<DlmPlanTraitement>) =>
    setData(prev => ({ ...prev, plan: { ...prev.plan, ...p } }))

  // ─── Sections ─── Le noyau couvre l'essentiel EBP ; ICF + dx élargi en complet ─
  const allSections: SectionDef[] = useMemo(() => ([
    { id: 'infosGenerales',    title: '0. Infos générales',                   color: '#1A1A1A', priority: 'noyau' },
    { id: 'type',              title: '1. Type d\'œdème, côté & topographie', color: '#7c3aed', priority: 'noyau' },
    { id: 'contreIndications', title: blockingCI
        ? '2. Contre-indications — ALERTE'
        : '2. Contre-indications & encadrement médical',
      color: blockingCI ? '#dc2626' : '#1A1A1A',
      priority: 'noyau' },
    { id: 'anamnese',          title: '3. Anamnèse',                          color: '#1A1A1A', priority: 'noyau' },
    { id: 'examen',            title: '4. Examen clinique',                   color: '#1A1A1A', priority: 'noyau' },
    { id: 'mesures',           title: '5. Mesures (Kuhnke, IMC, bio-impédance)', color: '#1A1A1A', priority: 'noyau' },
    { id: 'stade',             title: '6. Stade & classification',            color: '#1A1A1A', priority: 'noyau' },
    { id: 'icf',               title: '7. Fonction & participation (ICF)',    color: '#1A1A1A', priority: 'approfondissement' },
    { id: 'dx',                title: '8. Diagnostic différentiel',           color: '#1A1A1A', priority: 'approfondissement' },
    { id: 'plan',              title: '9. Plan de traitement (CDT)',          color: '#059669', priority: 'noyau' },
    { id: 'psfs',              title: '10. PSFS — objectifs fonctionnels',    color: '#059669', priority: 'noyau' },
    { id: 'contrat',           title: '11. Contrat kiné & engagement',        color: '#059669', priority: 'noyau' },
    { id: 'conseils',          title: '12. Conseils & recommandations',       color: '#059669', priority: 'noyau' },
  ]), [blockingCI])

  const sections = coreMode ? allSections.filter(s => s.priority === 'noyau') : allSections

  // ─── Imperative API ───────────────────────────────────────────────────────
  useImperativeHandle(ref, () => ({
    getData: () => ({
      ...data,
      psfs,
      contrat,
      conseils: { recos: conseils },
      _mode: mode,
      narrativeReport: vocalReport,
    }),
    setData: (raw: Record<string, unknown>) => {
      if (raw._mode === 'vocal') {
        setMode('vocal')
        if (raw.narrativeReport) setVocalReport(raw.narrativeReport as NarrativeReport)
        return
      }
      setData(mergeBilanDLM(raw))
      if (raw.psfs) setPsfs(mergePsfs(raw.psfs))
      if (raw.contrat) setContrat(mergeContrat(raw.contrat as Record<string, unknown>))
      const cn = raw.conseils
      if (typeof cn === 'string') setConseils(cn)
      else if (cn && typeof cn === 'object' && 'recos' in (cn as Record<string, unknown>)) {
        setConseils(((cn as Record<string, unknown>).recos as string) ?? '')
      }
    },
  }))

  // Synthèse rapide (badge en haut) : nb d'œdèmes sélectionnés + alerte CI
  const synthese = (() => {
    const types = data.oedemeTypes.map(t => OEDEME_LABELS[t]).join(' + ')
    return types || 'Aucun type sélectionné'
  })()

  // Visibilité de la barre presets : quasi-vide (avant remplissage manuel).
  const isFresh = data.oedemeTypes.length === 0 && data.regions.length === 0
    && !data.examenClinique.stemmer && !data.examenClinique.godetGrade
  const [presetsOpen, setPresetsOpen] = useState(false)
  const applyPreset = (preset: typeof DLM_PRESETS[number]) => {
    setData(prev => {
      const partial = preset.apply()
      // Merge profond pour les sous-objets (anamnese, plan, etc.)
      return {
        ...prev,
        ...partial,
        anamnese: partial.anamnese ?? prev.anamnese,
        plan: partial.plan ?? prev.plan,
      }
    })
    setPresetsOpen(false)
  }

  return (
    <div>
      <BilanModeToggle mode={mode} onChange={setMode} />

      {mode === 'vocal' && (
        <BilanVocalMode zone="Drainage Lymphatique" initialReport={vocalReport} onChange={setVocalReport} />
      )}

      {mode !== 'vocal' && (
        <>
          {/* Bandeau de synthèse + alerte CI bloquante */}
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '10px 14px', borderRadius: 10, marginBottom: 12,
            background: blockingCI ? '#fef2f2' : 'rgba(124,58,237,0.06)',
            border: `1px solid ${blockingCI ? '#fecaca' : 'rgba(124,58,237,0.18)'}`,
            color: blockingCI ? '#991b1b' : '#5b21b6',
            fontSize: '0.78rem',
          }}>
            <span style={{ fontWeight: 600 }}>{synthese}</span>
            {blockingCI && (
              <span style={{ fontWeight: 700, fontSize: '0.74rem' }}>
                CI absolue détectée — décision médicale requise
              </span>
            )}
          </div>

          {/* Barre de presets cliniques — visible uniquement si bilan vierge */}
          {isFresh && (
            <div style={{
              padding: '10px 14px', borderRadius: 10, marginBottom: 12,
              background: 'var(--surface)', border: '1px dashed var(--border-color)',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap' }}>
                <div>
                  <div style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-main)' }}>
                    Démarrer depuis un modèle clinique
                  </div>
                  <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                    Pré-remplit le type d'œdème, l'anamnèse-cadre, les régions probables et le plan CDT par défaut. Vous validez et complétez.
                  </div>
                </div>
                <button type="button" onClick={() => setPresetsOpen(o => !o)}
                  style={{
                    padding: '7px 16px', borderRadius: 8, fontSize: '0.78rem', fontWeight: 700,
                    background: 'var(--primary)', color: '#fff', border: 'none', cursor: 'pointer',
                  }}>
                  {presetsOpen ? 'Fermer' : 'Choisir un modèle'}
                </button>
              </div>
              {presetsOpen && (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 8, marginTop: 12 }}>
                  {DLM_PRESETS.map(p => (
                    <button key={p.id} type="button" onClick={() => applyPreset(p)}
                      style={{
                        textAlign: 'left', padding: '10px 12px', borderRadius: 8,
                        background: 'var(--input-bg)', border: '1px solid var(--border-color)',
                        cursor: 'pointer',
                      }}>
                      <div style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--primary-dark)', marginBottom: 4 }}>
                        {p.label}
                      </div>
                      <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', lineHeight: 1.35 }}>
                        {p.description}
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {sections.map(sec => (
            <div key={sec.id} style={{ marginBottom: 4 }}>
              <SectionHeader
                title={sec.title}
                open={!!open[sec.id]}
                onToggle={() => toggle(sec.id)}
                color={sec.color}
                badge={sec.priority === 'approfondissement' ? 'approfondissement' : undefined}
              />
              {open[sec.id] && (
                <div style={{ paddingTop: 12, paddingBottom: 8 }}>
                  {sec.id === 'infosGenerales' && <InfosGeneralesSection />}
                  {sec.id === 'type' && (
                    <StepTypeSelection
                      oedemeTypes={data.oedemeTypes}
                      onChangeOedemeTypes={(v: OedemeType[]) => patch({ oedemeTypes: v })}
                      cote={data.cote}
                      onChangeCote={c => patch({ cote: c })}
                      regions={data.regions}
                      onChangeRegions={(r: BodyRegion[]) => patch({ regions: r })}
                      bodyChartAnnotations={data.bodyChartAnnotations}
                      onChangeAnnotations={v => patch({ bodyChartAnnotations: v })}
                    />
                  )}
                  {sec.id === 'contreIndications' && (
                    <StepContreIndications state={data.contreIndications} onChange={patchCI} />
                  )}
                  {sec.id === 'anamnese' && (
                    <StepAnamnese state={data.anamnese} onChange={patchAnamnese} />
                  )}
                  {sec.id === 'examen' && (
                    <StepExamenClinique state={data.examenClinique} onChange={patchExamen} />
                  )}
                  {sec.id === 'mesures' && (
                    <StepMesures state={data.mesures} onChange={patchMesures} cote={data.cote} />
                  )}
                  {sec.id === 'stade' && (
                    <StepStade
                      oedemeTypes={data.oedemeTypes}
                      stadeISL={data.stadeISL}
                      onChangeStadeISL={(s: StadeISL) => patch({ stadeISL: s })}
                      stadeLipo={data.stadeLipo}
                      onChangeStadeLipo={(s: StadeLipo) => patch({ stadeLipo: s })}
                      typeLipoDistribution={data.typeLipoDistribution}
                      onChangeTypeLipo={v => patch({ typeLipoDistribution: v })}
                      ceap={data.ceap}
                      onChangeCeap={(c: ClasseCEAP) => patch({ ceap: c })}
                      examenClinique={data.examenClinique}
                    />
                  )}
                  {sec.id === 'icf' && (
                    <StepFonctionICF state={data.icf} onChange={patchICF} />
                  )}
                  {sec.id === 'dx' && (
                    <StepDxDifferentiel state={data.dxDifferentiel} onChange={setDx} />
                  )}
                  {sec.id === 'plan' && (
                    <StepPlanTraitement
                      oedemeTypes={data.oedemeTypes}
                      state={data.plan}
                      onChange={patchPlan}
                    />
                  )}
                  {sec.id === 'psfs' && (
                    <PSFSCards items={psfs} onChange={setPsfs} />
                  )}
                  {sec.id === 'contrat' && (
                    <ContratKineSection state={contrat} onChange={p => setContrat(prev => ({ ...prev, ...p }))} />
                  )}
                  {sec.id === 'conseils' && (
                    <>
                      <ConseilsSection value={conseils} onChange={setConseils} />
                      <div style={{ marginTop: 12, padding: '10px 12px', borderRadius: 8, background: 'var(--input-bg)', border: '1px dashed var(--border-color)' }}>
                        <p style={{ ...sectionTitleStyle, marginBottom: 6 }}>Notes libres complémentaires</p>
                        <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)', margin: '0 0 6px' }}>
                          Tout élément de contexte non couvert par les sections précédentes (parcours coordonné, observance pressentie, accès aux soins…)
                        </p>
                        <DictableTextarea
                          value={data.bodyChartAnnotations}
                          onChange={e => patch({ bodyChartAnnotations: e.target.value })}
                          rows={3}
                          textareaStyle={{ ...inputStyle, resize: 'vertical' }}
                          placeholder="—"
                        />
                        <label style={{ ...lblStyle, marginTop: 8 }}>Conseils additionnels libres</label>
                        <DictableTextarea
                          value={data.conseils}
                          onChange={e => patch({ conseils: e.target.value })}
                          rows={3}
                          textareaStyle={{ ...inputStyle, resize: 'vertical' }}
                          placeholder="Conseils spécifiques DLM (gestes du quotidien, voyages, posture, vêtements adaptés)…"
                        />
                      </div>
                    </>
                  )}
                </div>
              )}
            </div>
          ))}
        </>
      )}
    </div>
  )
})

BilanDrainageLymphatique.displayName = 'BilanDrainageLymphatique'

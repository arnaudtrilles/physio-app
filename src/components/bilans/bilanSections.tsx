import { useState } from 'react'
import { OuiNon, ScoreRow } from './shared'
import { SmartObjectifsInline } from '../SmartObjectifsInline'

// ─── Common styles ─────────────────────────────────────────────────────────
export const inputStyle: React.CSSProperties = {
  width: '100%', padding: '0.65rem 0.9rem', fontSize: '0.92rem',
  color: 'var(--text-main)', background: 'var(--secondary)',
  border: '1px solid transparent', borderRadius: 'var(--radius-md)', marginBottom: 8,
}
export const lblStyle: React.CSSProperties = {
  fontSize: '0.82rem', color: 'var(--text-muted)', display: 'block', marginBottom: 4,
}
export const sectionTitleStyle: React.CSSProperties = {
  fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)',
  textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 8,
}
export const subTitleStyle: React.CSSProperties = {
  fontSize: '0.82rem', fontWeight: 600, color: 'var(--primary-dark)',
  display: 'block', margin: '12px 0 6px',
}

export const boolToStr = (v: unknown): string => v === true ? 'oui' : v === false ? 'non' : (v as string) ?? ''

// ─── DOULEUR ───────────────────────────────────────────────────────────────
export interface DouleurState {
  debutSymptomes: string
  facteurDeclenchant: string
  mecanismeLesionnel: string
  localisationInitiale: string
  localisationActuelle: string
  evnPire: string
  evnMieux: string
  evnMoy: string
  douleurType: string
  situation: string
  douleurNocturne: string
  douleurNocturneType: string
  insomniante: string
  derouillageMatinal: string
  derouillageTemps: string
  derouillageFrequence: string
  mouvementsEmpirent: string
  mouvementsSoulagent: string
}
export const emptyDouleur = (): DouleurState => ({
  debutSymptomes: '', facteurDeclenchant: '', mecanismeLesionnel: '',
  localisationInitiale: '', localisationActuelle: '',
  evnPire: '', evnMieux: '', evnMoy: '',
  douleurType: '', situation: '',
  douleurNocturne: '', douleurNocturneType: '', insomniante: '',
  derouillageMatinal: '', derouillageTemps: '', derouillageFrequence: '',
  mouvementsEmpirent: '', mouvementsSoulagent: '',
})
export const mergeDouleur = (raw: Record<string, unknown>): DouleurState => ({
  ...emptyDouleur(),
  ...Object.fromEntries(Object.entries(raw).map(([k, v]) => [k, typeof v === 'boolean' ? boolToStr(v) : String(v ?? '')])),
})

export function DouleurSection({ state, onChange, options }: {
  state: DouleurState
  onChange: (patch: Partial<DouleurState>) => void
  options?: { hasFacteurDeclenchant?: boolean; hasMecanismeLesionnel?: boolean }
}) {
  const hasFacteur = options?.hasFacteurDeclenchant !== false
  const hasMecanisme = options?.hasMecanismeLesionnel === true
  const textFields: [keyof DouleurState, string, string][] = [
    ['debutSymptomes', 'Début des symptômes', 'Date / circonstances…'],
    ...(hasFacteur ? [['facteurDeclenchant', 'Facteur déclenchant (ou aucun)', 'Chute, effort, progressif…'] as [keyof DouleurState, string, string]] : []),
    ...(hasMecanisme ? [['mecanismeLesionnel', 'Mécanisme lésionnel', 'Inversion forcée, valgus, torsion…'] as [keyof DouleurState, string, string]] : []),
    ['localisationInitiale', 'Localisation des symptômes initiaux', 'Zone concernée au départ…'],
    ['localisationActuelle', 'Localisation des symptômes actuels', 'Zone actuelle…'],
  ]
  return (
    <>
      {textFields.map(([k, lbl, ph]) => (
        <div key={k} style={{ marginBottom: 8 }}>
          <label style={lblStyle}>{lbl}</label>
          <input value={state[k]} onChange={e => onChange({ [k]: e.target.value } as Partial<DouleurState>)} placeholder={ph} style={inputStyle} />
        </div>
      ))}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, marginBottom: 12 }}>
        {(['evnPire', 'evnMieux', 'evnMoy'] as const).map((k, i) => (
          <div key={k}>
            <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>{['EVN Pire', 'EVN Mieux', 'EVN Moy.'][i]}</label>
            <input type="number" min="0" max="10" value={state[k]} onChange={e => onChange({ [k]: e.target.value } as Partial<DouleurState>)} style={{ ...inputStyle, textAlign: 'center', marginBottom: 0 }} placeholder="0-10" />
          </div>
        ))}
      </div>
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 8 }}>
        <label style={{ ...lblStyle, width: '100%', marginBottom: 2 }}>Type de douleur</label>
        {['Constante', 'Intermittente'].map(v => {
          const key = v.toLowerCase()
          return (
            <button key={v} className={`choix-btn${state.douleurType === key ? ' active' : ''}`} onClick={() => onChange({ douleurType: state.douleurType === key ? '' : key })}>{v}</button>
          )
        })}
      </div>
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 8 }}>
        <label style={{ ...lblStyle, width: '100%', marginBottom: 2 }}>Situation</label>
        {([["↑ S'améliore", 'ameliore'], ['→ Stationnaire', 'stationnaire'], ['↓ Se dégrade', 'degrade']] as [string, string][]).map(([lbl, v]) => (
          <button key={v} className={`choix-btn${state.situation === v ? ' active' : ''}`} onClick={() => onChange({ situation: state.situation === v ? '' : v })}>{lbl}</button>
        ))}
      </div>
      <OuiNon label="Douleur nocturne" value={state.douleurNocturne} onChange={v => onChange({ douleurNocturne: v })} />
      {state.douleurNocturne === 'oui' && (
        <>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', margin: '6px 0' }}>
            {([['Au mouvement', 'mouvement'], ['Sans bouger', 'sans_bouger']] as [string, string][]).map(([lbl, v]) => (
              <button key={v} className={`choix-btn${state.douleurNocturneType === v ? ' active' : ''}`} onClick={() => onChange({ douleurNocturneType: state.douleurNocturneType === v ? '' : v })}>{lbl}</button>
            ))}
          </div>
          <OuiNon label="Insomniante" value={state.insomniante} onChange={v => onChange({ insomniante: v })} />
        </>
      )}
      <OuiNon label="Dérouillage matinal" value={state.derouillageMatinal} onChange={v => onChange({ derouillageMatinal: v })} />
      {state.derouillageMatinal === 'oui' && (
        <>
          <input value={state.derouillageTemps} onChange={e => onChange({ derouillageTemps: e.target.value })} placeholder="Durée du dérouillage…" style={{ ...inputStyle, marginTop: 6 }} />
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', margin: '4px 0 8px' }}>
            {['Toujours', 'Parfois'].map(v => {
              const key = v.toLowerCase()
              return (
                <button key={v} className={`choix-btn${state.derouillageFrequence === key ? ' active' : ''}`} onClick={() => onChange({ derouillageFrequence: state.derouillageFrequence === key ? '' : key })}>{v}</button>
              )
            })}
          </div>
        </>
      )}
      <div style={{ marginTop: 8, marginBottom: 8 }}>
        <label style={lblStyle}>Mouvements / situations qui EMPIRENT</label>
        <textarea value={state.mouvementsEmpirent} onChange={e => onChange({ mouvementsEmpirent: e.target.value })} rows={2} style={{ ...inputStyle, resize: 'vertical' }} placeholder="Décrire…" />
      </div>
      <div style={{ marginBottom: 8 }}>
        <label style={lblStyle}>Mouvements / situations qui SOULAGENT</label>
        <textarea value={state.mouvementsSoulagent} onChange={e => onChange({ mouvementsSoulagent: e.target.value })} rows={2} style={{ ...inputStyle, resize: 'vertical' }} placeholder="Repos, chaleur…" />
      </div>
    </>
  )
}

// ─── RED FLAGS ─────────────────────────────────────────────────────────────
export interface RedFlagsState {
  tttMedical: string; antecedents: string; comorbidites: string
  sommeilQuantite: string; sommeilQualite: string
  imageries: string
  // booleans (stored as 'oui'|'non'|'')
  traumatismeRecent: string; troublesMarche: string; perteAppetit: string
  pertePoids: string; fatigueInexpliquee: string; csIs: string; atcdCancer: string
  // variants
  tabagisme: string
  cephalees: string; cephaleesIntenses: string
  troublesMotricite: string
  fievre: string
  douleurThoracique: string; douleurDigestion: string
  douleurTouxEternuement: string
  fonctionVesicaleAnale: string; fonctionVesicaleStatus: string; fonctionVesicaleSymptomes: string
  // 5D 3N
  dizziness: string; dropAttacks: string; diplopie: string; dysarthrie: string
  dysphagie: string; nystagmus: string; nausees: string; numbness: string
  // free notes per item
  [k: `${string}_detail`]: string
}
export const emptyRedFlags = (): RedFlagsState => ({
  tttMedical: '', antecedents: '', comorbidites: '', sommeilQuantite: '', sommeilQualite: '', imageries: '',
  traumatismeRecent: '', troublesMarche: '', perteAppetit: '', pertePoids: '', fatigueInexpliquee: '', csIs: '', atcdCancer: '',
  tabagisme: '', cephalees: '', cephaleesIntenses: '',
  troublesMotricite: '', fievre: '',
  douleurThoracique: '', douleurDigestion: '',
  douleurTouxEternuement: '', fonctionVesicaleAnale: '', fonctionVesicaleStatus: '', fonctionVesicaleSymptomes: '',
  dizziness: '', dropAttacks: '', diplopie: '', dysarthrie: '', dysphagie: '', nystagmus: '', nausees: '', numbness: '',
})
export const mergeRedFlags = (raw: Record<string, unknown>): RedFlagsState => {
  const base = emptyRedFlags() as unknown as Record<string, string>
  for (const [k, v] of Object.entries(raw ?? {})) {
    base[k] = typeof v === 'boolean' ? boolToStr(v) : String(v ?? '')
  }
  return base as unknown as RedFlagsState
}

export type RedFlagsVariant = 'upper' | 'lower' | 'ankle'

export function RedFlagsSection({ state, onChange, variant }: {
  state: RedFlagsState
  onChange: (patch: Partial<RedFlagsState>) => void
  variant: RedFlagsVariant
}) {
  const set = (k: keyof RedFlagsState, v: string) => onChange({ [k]: v } as Partial<RedFlagsState>)
  const textRows: [keyof RedFlagsState, string, string][] = [
    ['tttMedical', 'TTT médical actuel', 'Médicaments…'],
    ['antecedents', 'Antécédents', 'Chirurgies, pathologies…'],
    ['comorbidites', 'Comorbidités', 'Diabète, HTA…'],
    ['sommeilQuantite', 'Sommeil — Quantité', 'Nb heures…'],
    ['sommeilQualite', 'Sommeil — Qualité', 'Perturbé, bon…'],
    ['imageries', 'Imagerie(s)', 'Radio, IRM, écho…'],
  ]
  // common booleans
  const commonBools: [keyof RedFlagsState, string][] = [
    ...(variant !== 'ankle' ? [['traumatismeRecent', 'Traumatisme récent'] as [keyof RedFlagsState, string]] : []),
    ['troublesMarche', 'Troubles de la marche'],
    ['perteAppetit', "Perte d'appétit"],
    ['pertePoids', 'Perte de poids inexpliquée'],
    ['fatigueInexpliquee', 'Fatigue inexpliquée / inhabituelle'],
    ['csIs', 'Utilisation prolongée CS / IS'],
    ['atcdCancer', 'ATCD de cancer'],
  ]
  const upperBools: [keyof RedFlagsState, string][] = [
    ['tabagisme', 'Tabagisme'],
    ['troublesMotricite', 'Troubles motricité MS'],
    ['fievre', 'Fièvre'],
    ['cephalees', 'Céphalées'],
  ]
  const lowerBools: [keyof RedFlagsState, string][] = [
    ['douleurTouxEternuement', 'Douleur à la toux / éternuement'],
    ...(variant === 'lower' ? [] : [['fievre', 'Fièvre'] as [keyof RedFlagsState, string]]),
  ]
  const epauleOnly: [keyof RedFlagsState, string][] = [
    ['douleurThoracique', 'Douleur thoracique associée'],
    ['douleurDigestion', 'Douleur aggravée par la digestion'],
  ]
  return (
    <>
      {textRows.map(([k, lbl, ph]) => (
        <div key={k} style={{ marginBottom: 8 }}>
          <label style={lblStyle}>{lbl}</label>
          <input value={state[k]} onChange={e => set(k, e.target.value)} placeholder={ph} style={inputStyle} />
        </div>
      ))}
      {commonBools.map(([k, lbl]) => (
        <OuiNon key={k} label={lbl} value={state[k]} onChange={v => set(k, v)} />
      ))}
      {variant === 'upper' && (
        <>
          {upperBools.map(([k, lbl]) => (
            <OuiNon key={k} label={lbl} value={state[k]} onChange={v => set(k, v)} />
          ))}
          {state.cephalees === 'oui' && (
            <OuiNon label="Plus intenses que d'habitude" value={state.cephaleesIntenses} onChange={v => set('cephaleesIntenses', v)} />
          )}
          {epauleOnly.map(([k, lbl]) => (
            <OuiNon key={k} label={lbl} value={state[k]} onChange={v => set(k, v)} />
          ))}
          <p style={{ ...sectionTitleStyle, margin: '12px 0 6px' }}>5D 3N</p>
          {([
            ['dizziness', 'Dizziness (vertiges)'],
            ['dropAttacks', 'Drop attacks'],
            ['diplopie', 'Diplopie'],
            ['dysarthrie', 'Dysarthrie'],
            ['dysphagie', 'Dysphagie'],
            ['nystagmus', 'Nystagmus'],
            ['nausees', 'Nausée / vomissements'],
            ['numbness', 'Numbness (engourdissement)'],
          ] as [keyof RedFlagsState, string][]).map(([k, lbl]) => (
            <OuiNon key={k} label={lbl} value={state[k]} onChange={v => set(k, v)} />
          ))}
        </>
      )}
      {(variant === 'lower' || variant === 'ankle') && (
        <>
          {lowerBools.map(([k, lbl]) => (
            <OuiNon key={k} label={lbl} value={state[k]} onChange={v => set(k, v)} />
          ))}
          <OuiNon label="Fonction vésicale / anale" value={state.fonctionVesicaleAnale} onChange={v => set('fonctionVesicaleAnale', v)} />
          {state.fonctionVesicaleAnale === 'oui' && (
            <>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', margin: '4px 0 8px' }}>
                {['Normal', 'Anormal'].map(v => {
                  const key = v.toLowerCase()
                  return (
                    <button key={v} className={`choix-btn${state.fonctionVesicaleStatus === key ? ' active' : ''}`} onClick={() => set('fonctionVesicaleStatus', state.fonctionVesicaleStatus === key ? '' : key)}>{v}</button>
                  )
                })}
              </div>
              <input value={state.fonctionVesicaleSymptomes} onChange={e => set('fonctionVesicaleSymptomes', e.target.value)} placeholder="Symptômes (rétention, incontinence, anesthésie en selle…)" style={inputStyle} />
            </>
          )}
        </>
      )}
    </>
  )
}

// ─── YELLOW FLAGS ──────────────────────────────────────────────────────────
export interface YellowFlagsState {
  croyancesOrigine: string; croyancesTtt: string; attentes: string
  autoEfficacite: string; strategieCoping: string
  hypervigilance: string; catastrophisme: string
  peurEvitement: string; peurEvitementMouvements: string
  flexibilitePsy: string; anxiete: string; depression: string
}
export const emptyYellow = (): YellowFlagsState => ({
  croyancesOrigine: '', croyancesTtt: '', attentes: '',
  autoEfficacite: '', strategieCoping: '',
  hypervigilance: '', catastrophisme: '',
  peurEvitement: '', peurEvitementMouvements: '',
  flexibilitePsy: '', anxiete: '', depression: '',
})
export const mergeYellow = (raw: Record<string, unknown>): YellowFlagsState => {
  const base = emptyYellow() as unknown as Record<string, string>
  for (const [k, v] of Object.entries(raw ?? {})) {
    base[k] = typeof v === 'boolean' ? boolToStr(v) : String(v ?? '')
  }
  return base as unknown as YellowFlagsState
}

export function YellowFlagsSection({ state, onChange }: {
  state: YellowFlagsState
  onChange: (patch: Partial<YellowFlagsState>) => void
}) {
  const set = (k: keyof YellowFlagsState, v: string) => onChange({ [k]: v } as Partial<YellowFlagsState>)
  return (
    <>
      <div style={{ marginBottom: 8 }}>
        <label style={lblStyle}>Croyances — Origine de la douleur</label>
        <input value={state.croyancesOrigine} onChange={e => set('croyancesOrigine', e.target.value)} placeholder="Ce que pense le patient…" style={inputStyle} />
      </div>
      <div style={{ marginBottom: 8 }}>
        <label style={lblStyle}>Croyances — TTT qui serait adapté</label>
        <input value={state.croyancesTtt} onChange={e => set('croyancesTtt', e.target.value)} placeholder="Selon le patient…" style={inputStyle} />
      </div>
      <div style={{ marginBottom: 8 }}>
        <label style={lblStyle}>Attentes</label>
        <textarea value={state.attentes} onChange={e => set('attentes', e.target.value)} placeholder="Objectifs du patient…" rows={2} style={{ ...inputStyle, resize: 'vertical' }} />
      </div>
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 8 }}>
        <label style={{ ...lblStyle, width: '100%', marginBottom: 2 }}>Auto-efficacité</label>
        {['Faible', 'Moyen', 'Fort'].map(v => {
          const key = v.toLowerCase()
          return <button key={v} className={`choix-btn${state.autoEfficacite === key ? ' active' : ''}`} onClick={() => set('autoEfficacite', state.autoEfficacite === key ? '' : key)}>{v}</button>
        })}
      </div>
      {([
        ['catastrophisme', 'Catastrophisme'],
        ['peurEvitement', 'Croyance(s) de Peur - Évitement'],
        ['hypervigilance', 'Hypervigilance'],
        ['anxiete', 'Anxiété'],
        ['depression', 'Dépression'],
      ] as [keyof YellowFlagsState, string][]).map(([k, lbl]) => (
        <OuiNon key={k} label={lbl} value={state[k]} onChange={v => set(k, v)} />
      ))}
      {state.peurEvitement === 'oui' && (
        <input value={state.peurEvitementMouvements} onChange={e => set('peurEvitementMouvements', e.target.value)} placeholder="Quel(s) mouvement(s) évité(s)…" style={{ ...inputStyle, marginTop: 6 }} />
      )}
      <div style={{ marginTop: 8, marginBottom: 8 }}>
        <label style={lblStyle}>Stratégie(s) de Coping</label>
        <textarea value={state.strategieCoping} onChange={e => set('strategieCoping', e.target.value)} placeholder="Repos, chaleur, médicaments…" rows={2} style={{ ...inputStyle, resize: 'vertical' }} />
      </div>
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 8 }}>
        <label style={{ ...lblStyle, width: '100%', marginBottom: 2 }}>Flexibilité psychologique</label>
        {['Faible', 'Moyenne', 'Forte'].map(v => {
          const key = v.toLowerCase()
          return <button key={v} className={`choix-btn${state.flexibilitePsy === key ? ' active' : ''}`} onClick={() => set('flexibilitePsy', state.flexibilitePsy === key ? '' : key)}>{v}</button>
        })}
      </div>
    </>
  )
}

// ─── BLUE / BLACK FLAGS ────────────────────────────────────────────────────
export interface BlueBlackState {
  enAt: string; antecedentsAt: string; antecedentsAtDetails: string
  travailExigeant: string; sousEstimeCollegues: string; sousEstimeDirection: string
  manqueControle: string; stressNiveau: number
  travailAggrave: string; politiqueFlexible: string
  difficultesAcces: string; conditionsSocioEco: string; litige: string
}
export const emptyBlueBlack = (): BlueBlackState => ({
  enAt: '', antecedentsAt: '', antecedentsAtDetails: '',
  travailExigeant: '', sousEstimeCollegues: '', sousEstimeDirection: '',
  manqueControle: '', stressNiveau: 0,
  travailAggrave: '', politiqueFlexible: '',
  difficultesAcces: '', conditionsSocioEco: '', litige: '',
})
export const mergeBlueBlack = (raw: Record<string, unknown>): BlueBlackState => {
  const base = emptyBlueBlack() as unknown as Record<string, string | number>
  for (const [k, v] of Object.entries(raw ?? {})) {
    if (k === 'stressNiveau') base[k] = Number(v ?? 0)
    else base[k] = typeof v === 'boolean' ? boolToStr(v) : String(v ?? '')
  }
  return base as unknown as BlueBlackState
}

export function BlueBlackFlagsSection({ state, onChange }: {
  state: BlueBlackState
  onChange: (patch: Partial<BlueBlackState>) => void
}) {
  const set = (k: keyof BlueBlackState, v: string) => onChange({ [k]: v } as Partial<BlueBlackState>)
  const items: [keyof BlueBlackState, string][] = [
    ['enAt', 'Actuellement en AT'],
    ['antecedentsAt', "Antécédents d'AT"],
    ['travailExigeant', 'Travail physiquement exigeant et/ou dangereux'],
    ['sousEstimeCollegues', "Sentiment d'être sous-estimé(e) par les collègues"],
    ['sousEstimeDirection', "Sentiment d'être sous-estimé(e) par la direction"],
    ['manqueControle', 'Manque de contrôle sur ses tâches'],
    ['travailAggrave', 'Croyance que le travail aggrave la douleur'],
    ['politiqueFlexible', "Politique d'entreprise flexible pour reprise"],
    ['difficultesAcces', "Difficulté d'accès aux soins"],
    ['conditionsSocioEco', 'Conditions socio-économiques défavorables'],
    ['litige', 'Litige et/ou conflit liés aux indemnisations'],
  ]
  return (
    <>
      {items.map(([k, lbl]) => (
        <OuiNon key={k} label={lbl} value={state[k] as string} onChange={v => set(k, v)}
          detail={k === 'antecedentsAt' ? state.antecedentsAtDetails : undefined}
          onDetailChange={k === 'antecedentsAt' ? (v => onChange({ antecedentsAtDetails: v })) : undefined} />
      ))}
      <div style={{ marginTop: 12 }}>
        <label style={lblStyle}>
          Niveau de stress au travail (0–100) : <strong style={{ color: 'var(--danger)' }}>{state.stressNiveau}</strong>
        </label>
        <input type="range" min="0" max="100" value={state.stressNiveau}
          onChange={e => onChange({ stressNiveau: Number(e.target.value) })}
          style={{ width: '100%', accentColor: 'var(--primary)' }} />
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 4 }}>
          <span>0</span><span>100</span>
        </div>
      </div>
    </>
  )
}

// ─── CONTRAT KINÉ ──────────────────────────────────────────────────────────
export interface ContratState {
  objectifs: Array<{ id: number; titre: string; cible: string; dateCible: string }>
  autoReeducation: string
  frequenceDuree: string
}
export const emptyContrat = (): ContratState => ({
  objectifs: [], autoReeducation: '', frequenceDuree: '',
})
export const mergeContrat = (raw: Record<string, unknown>): ContratState => {
  const arr = Array.isArray(raw?.objectifs) ? (raw.objectifs as ContratState['objectifs'])
    : Array.isArray(raw?.objectifsItems) ? (raw.objectifsItems as ContratState['objectifs'])
    : (typeof raw?.objectifs === 'string' && (raw.objectifs as string).trim()
        ? [{ id: Date.now(), titre: (raw.objectifs as string).trim(), cible: '', dateCible: '' }]
        : [])
  return {
    objectifs: arr,
    autoReeducation: boolToStr(raw?.autoReeducation ?? raw?.autoReedo),
    frequenceDuree: (raw?.frequenceDuree as string) ?? '',
  }
}

export function ContratKineSection({ state, onChange }: {
  state: ContratState
  onChange: (patch: Partial<ContratState>) => void
}) {
  return (
    <>
      <SmartObjectifsInline objectifs={state.objectifs} onChange={obj => onChange({ objectifs: obj })} />
      <OuiNon label="S'engage à faire l'auto-rééducation" value={state.autoReeducation} onChange={v => onChange({ autoReeducation: v })} />
      {state.autoReeducation === 'oui' && (
        <input value={state.frequenceDuree} onChange={e => onChange({ frequenceDuree: e.target.value })}
          placeholder="Fréquence / Durée… Ex: 3x/semaine, 20 min" style={{ ...inputStyle, marginTop: 6 }} />
      )}
    </>
  )
}

// ─── CONSEILS ──────────────────────────────────────────────────────────────
export function ConseilsSection({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <>
      <label style={lblStyle}>Conseils & recommandations au patient</label>
      <textarea value={value} onChange={e => onChange(e.target.value)}
        placeholder="Hygiène de vie, gestion de la charge, exercices à privilégier, signes d'alerte…"
        rows={6} style={{ ...inputStyle, resize: 'vertical', minHeight: 140 }} />
    </>
  )
}

// ─── PSFS CARDS (the elegant one) ──────────────────────────────────────────
export interface PsfsItem { label: string; score: string; notes: string }
export const emptyPsfs = (): PsfsItem[] => [
  { label: '', score: '', notes: '' },
  { label: '', score: '', notes: '' },
  { label: '', score: '', notes: '' },
]
export const mergePsfs = (raw: unknown): PsfsItem[] => {
  if (Array.isArray(raw) && raw.length > 0) return raw as PsfsItem[]
  return emptyPsfs()
}

export function PSFSCards({ items, onChange }: { items: PsfsItem[]; onChange: (items: PsfsItem[]) => void }) {
  const update = (i: number, patch: Partial<PsfsItem>) => {
    const copy = items.slice()
    copy[i] = { ...copy[i], ...patch }
    onChange(copy)
  }
  return (
    <>
      <div style={{ margin: '14px 0 8px', display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 8 }}>
        <label style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--primary-dark)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
          Patient Specific Functional Scale
        </label>
        <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 500 }}>0 = incapable · 10 = niveau normal</span>
      </div>
      {items.map((item, i) => {
        const scoreNum = item.score === '' ? null : Math.max(0, Math.min(10, Number(item.score)))
        const accent = scoreNum === null ? 'var(--text-muted)' : scoreNum >= 7 ? '#059669' : scoreNum >= 4 ? '#d97706' : '#dc2626'
        return (
          <div key={i} style={{ background: 'var(--secondary)', borderRadius: 'var(--radius-lg)', padding: '0.9rem 1rem', marginBottom: 10 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
              <span style={{ fontSize: '0.7rem', fontWeight: 600, color: 'var(--text-muted)', letterSpacing: '0.06em', flexShrink: 0 }}>0{i + 1}</span>
              <input value={item.label} onChange={e => update(i, { label: e.target.value })}
                placeholder={`Activité ${i + 1} — ex: monter les escaliers, courir 10 min…`}
                style={{ flex: 1, border: 'none', background: 'transparent', fontSize: '0.88rem', fontWeight: 500, color: 'var(--text-main)', outline: 'none', padding: 0 }} />
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 1, flexShrink: 0, fontVariantNumeric: 'tabular-nums' }}>
                <span style={{ fontSize: '0.95rem', fontWeight: 600, color: accent, lineHeight: 1, minWidth: 18, textAlign: 'right' }}>{scoreNum ?? '—'}</span>
                <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 400 }}>/10</span>
              </div>
            </div>
            <input type="range" min={0} max={10} step={1} value={scoreNum ?? 0}
              onChange={e => update(i, { score: e.target.value })}
              className="psfs-slider"
              style={{ width: '100%', ['--psfs-accent' as string]: accent }} />
            <textarea value={item.notes} onChange={e => update(i, { notes: e.target.value })}
              placeholder="Notes (contexte, évolution, conditions…)"
              rows={1}
              style={{ width: '100%', marginTop: 8, padding: '0.4rem 0.6rem', fontSize: '0.78rem', color: 'var(--text-main)', background: 'transparent', border: 'none', borderTop: '1px solid var(--border-color)', borderRadius: 0, resize: 'vertical', boxSizing: 'border-box', fontFamily: 'inherit', outline: 'none' }} />
          </div>
        )
      })}
    </>
  )
}

// ─── MOBILITÉ RACHIS — Maj/Mod/Min/Nulle + Symptômes ───────────────────────
export interface MobiliteRachisRow { perte: string; symptomes: string }
export type MobiliteRachisState = Record<string, MobiliteRachisRow>
export const initMobiliteRachis = (keys: string[], saved?: Record<string, MobiliteRachisRow>): MobiliteRachisState => {
  const base: MobiliteRachisState = {}
  keys.forEach(k => { base[k] = saved?.[k] ?? { perte: '', symptomes: '' } })
  return base
}

export function MobiliteRachisTable({ rows, state, onChange }: {
  rows: [string, string][]
  state: MobiliteRachisState
  onChange: (k: string, patch: Partial<MobiliteRachisRow>) => void
}) {
  const PERTE = ['Maj', 'Mod', 'Min', 'Nulle']
  return (
    <div style={{ overflowX: 'auto', marginBottom: 10 }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.78rem' }}>
        <thead>
          <tr style={{ background: 'var(--secondary)' }}>
            {['Mouvement', "Perte d'amplitude", 'Symptômes'].map(h => (
              <th key={h} style={{ padding: '6px 8px', textAlign: 'left', fontWeight: 600, color: 'var(--text-muted)', fontSize: '0.72rem', borderBottom: '1px solid var(--border-color)', whiteSpace: 'nowrap' }}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map(([k, lbl]) => {
            const r = state[k] ?? { perte: '', symptomes: '' }
            return (
              <tr key={k}>
                <td style={{ padding: '5px 8px', fontSize: '0.78rem', color: 'var(--text-main)', whiteSpace: 'nowrap' }}>{lbl}</td>
                <td style={{ padding: '3px 4px' }}>
                  <div style={{ display: 'flex', gap: 3 }}>
                    {PERTE.map(p => (
                      <button key={p} className={`choix-btn${r.perte === p ? ' active' : ''}`}
                        style={{ fontSize: '0.7rem', padding: '2px 6px', minHeight: 'auto' }}
                        onClick={() => onChange(k, { perte: r.perte === p ? '' : p })}>{p}</button>
                    ))}
                  </div>
                </td>
                <td style={{ padding: '3px 4px' }}>
                  <input value={r.symptomes} onChange={e => onChange(k, { symptomes: e.target.value })}
                    placeholder="—" style={{ width: '100%', border: 'none', borderBottom: '1px solid var(--border-color)', background: 'transparent', fontSize: '0.78rem', color: 'var(--text-main)', padding: '2px 4px', outline: 'none' }} />
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

// ─── MOUVEMENTS RÉPÉTÉS — tableau dynamique 3 colonnes ─────────────────────
export interface MvtRepRow { mouvement: string; avant: string; apres: string }
export const emptyMvtRep = (): MvtRepRow[] => [{ mouvement: '', avant: '', apres: '' }]

export function MvtsRepetesTable({ rows, onChange }: {
  rows: MvtRepRow[]
  onChange: (rows: MvtRepRow[]) => void
}) {
  const update = (i: number, patch: Partial<MvtRepRow>) => {
    const copy = rows.slice()
    copy[i] = { ...copy[i], ...patch }
    onChange(copy)
  }
  const addRow = () => onChange([...rows, { mouvement: '', avant: '', apres: '' }])
  const delRow = (i: number) => onChange(rows.filter((_, idx) => idx !== i))
  const cellStyle: React.CSSProperties = { width: '100%', border: 'none', borderBottom: '1px solid var(--border-color)', background: 'transparent', fontSize: '0.78rem', color: 'var(--text-main)', padding: '4px 4px', outline: 'none' }
  return (
    <div style={{ marginBottom: 10 }}>
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.78rem' }}>
          <thead>
            <tr style={{ background: 'var(--secondary)' }}>
              {['Mouvement répété', 'Marqueurs AVANT', 'APRÈS procédure', ''].map(h => (
                <th key={h} style={{ padding: '6px 8px', textAlign: 'left', fontWeight: 600, color: 'var(--text-muted)', fontSize: '0.72rem', borderBottom: '1px solid var(--border-color)', whiteSpace: 'nowrap' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={i}>
                <td style={{ padding: '3px 4px', width: '30%' }}>
                  <input value={r.mouvement} onChange={e => update(i, { mouvement: e.target.value })} placeholder="ex: extension répétée" style={cellStyle} />
                </td>
                <td style={{ padding: '3px 4px', width: '32%' }}>
                  <input value={r.avant} onChange={e => update(i, { avant: e.target.value })} placeholder="EVN, ROM, marqueurs…" style={cellStyle} />
                </td>
                <td style={{ padding: '3px 4px', width: '32%' }}>
                  <input value={r.apres} onChange={e => update(i, { apres: e.target.value })} placeholder="Évolution / centralisation…" style={cellStyle} />
                </td>
                <td style={{ padding: '3px 4px', width: 28, textAlign: 'right' }}>
                  {rows.length > 1 && (
                    <button onClick={() => delRow(i)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '0.95rem', padding: 2, lineHeight: 1 }} aria-label="Supprimer la ligne">×</button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <button onClick={addRow} style={{ marginTop: 6, fontSize: '0.75rem', color: 'var(--primary)', background: 'transparent', border: '1px dashed var(--border-color)', borderRadius: 6, padding: '4px 10px', cursor: 'pointer' }}>+ Ajouter une ligne</button>
    </div>
  )
}

// ─── MOBILITÉ Active/Passive × Gauche/Droite (4 colonnes) ──────────────────
export interface MobAPGDRow { ag: string; ad: string; pg: string; pd: string }
export type MobAPGDState = Record<string, MobAPGDRow>
export const initMobAPGD = (keys: string[], saved?: Record<string, MobAPGDRow>): MobAPGDState => {
  const base: MobAPGDState = {}
  keys.forEach(k => { base[k] = saved?.[k] ?? { ag: '', ad: '', pg: '', pd: '' } })
  return base
}

// Helper: status + symptoms compound input (functional tests)
export function StatusSymptomes({ label, status, symptomes, onChangeStatus, onChangeSympt, options }: {
  label: string; status: string; symptomes: string
  onChangeStatus: (v: string) => void
  onChangeSympt: (v: string) => void
  options?: string[]
}) {
  const opts = options ?? ['Possible', 'Partiellement', 'Impossible']
  return (
    <div style={{ marginBottom: 10 }}>
      <label style={lblStyle}>{label}</label>
      <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginBottom: 4 }}>
        {opts.map(o => (
          <button key={o} className={`choix-btn${status === o ? ' active' : ''}`} onClick={() => onChangeStatus(status === o ? '' : o)}>{o}</button>
        ))}
      </div>
      <input value={symptomes} onChange={e => onChangeSympt(e.target.value)} placeholder="Symptômes / observations…" style={{ ...inputStyle, marginBottom: 0 }} />
    </div>
  )
}

// Generic single-line ScoreRow with text input (free-form score, not just numeric)
export { ScoreRow }

// useFlatRecord — small helper hook for flat string records (tests, force, etc.)
export function useFlatRecord<T extends Record<string, string>>(initial: T): [T, (k: keyof T, v: string) => void, (patch: Partial<T>) => void] {
  const [s, setS] = useState<T>(initial)
  const update = (k: keyof T, v: string) => setS(p => ({ ...p, [k]: v }))
  const merge = (patch: Partial<T>) => setS(p => ({ ...p, ...patch }))
  return [s, update, merge]
}

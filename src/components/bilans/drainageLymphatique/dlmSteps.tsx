// Step components du Bilan DLM. Tous reçoivent leur slice d'état (immuable) et
// un callback `onChange` qui retourne un nouvel objet — pas de mutation in-place,
// conformément aux règles d'immutabilité du projet.

import { DictableInput, DictableTextarea } from '../../VoiceMic'
import { OuiNon, EVASlider } from '../shared'
import { inputStyle, lblStyle, sectionTitleStyle, subTitleStyle } from '../bilanSections'
import {
  OEDEME_LABELS, OEDEME_COLORS,
  STADE_ISL_LABELS, STADE_LIPO_LABELS, CEAP_LABELS, GODET_LABELS,
  TYPE_LIPO_DISTRIBUTION,
  CI_ABSOLUES_KEYS, CI_RELATIVES_KEYS,
  KUHNKE_DEFAULT_NIVEAUX_MS, KUHNKE_DEFAULT_NIVEAUX_MI,
  computeIMC, computeKuhnkeVolume,
  hasBlockingCI, suggestStadeISL,
} from './dlmTypes'
import type {
  BilanDLMData, OedemeType, BodyRegion,
  DlmContreIndications, DlmAnamnese, DlmExamenClinique, DlmMesures,
  DlmICF, DlmDxDifferentiel, DlmPlanTraitement,
  StadeISL, StadeLipo, ClasseCEAP, GodetGrade, Stemmer,
  CircoSet, CircoLevel,
} from './dlmTypes'
import { BodyChartDLM } from './BodyChartDLM'

const cardStyle: React.CSSProperties = {
  border: '1px solid var(--border-color)', borderRadius: 12,
  padding: 14, background: 'var(--surface)', marginBottom: 14,
}

// ─── Step 1 — Sélection du type d'œdème + côté ─────────────────────────────
export function StepTypeSelection({
  oedemeTypes, onChangeOedemeTypes,
  cote, onChangeCote,
  regions, onChangeRegions,
  bodyChartAnnotations, onChangeAnnotations,
}: {
  oedemeTypes: OedemeType[]
  onChangeOedemeTypes: (next: OedemeType[]) => void
  cote: BilanDLMData['cote']
  onChangeCote: (c: BilanDLMData['cote']) => void
  regions: BodyRegion[]
  onChangeRegions: (r: BodyRegion[]) => void
  bodyChartAnnotations: string
  onChangeAnnotations: (v: string) => void
}) {
  const set = new Set(oedemeTypes)
  const toggleType = (t: OedemeType) => {
    const next = new Set(set)
    if (next.has(t)) next.delete(t)
    else next.add(t)
    onChangeOedemeTypes(Array.from(next))
  }
  return (
    <div>
      <div style={cardStyle}>
        <p style={sectionTitleStyle}>Type d'œdème (multi-sélection si mixte)</p>
        <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', margin: '0 0 12px' }}>
          Lipœdème + lymphœdème ou phlébo-lymphœdème ne sont pas rares — sélectionnez tous les types pertinents.
        </p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: 8 }}>
          {(Object.keys(OEDEME_LABELS) as OedemeType[]).map(t => {
            const selected = set.has(t)
            const c = OEDEME_COLORS[t]
            return (
              <button
                key={t}
                type="button"
                onClick={() => toggleType(t)}
                style={{
                  padding: '12px 10px', borderRadius: 10,
                  border: selected ? `2px solid ${c.fg}` : '1.5px solid var(--border-color)',
                  background: selected ? c.bg : 'var(--input-bg)',
                  color: selected ? c.fg : 'var(--text-main)',
                  fontWeight: selected ? 700 : 500, fontSize: '0.85rem',
                  cursor: 'pointer', textAlign: 'left',
                }}
              >
                {OEDEME_LABELS[t]}
              </button>
            )
          })}
        </div>
      </div>

      <div style={cardStyle}>
        <p style={sectionTitleStyle}>Côté</p>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {([['D','Droit'],['G','Gauche'],['bilateral','Bilatéral']] as const).map(([v, lbl]) => (
            <button
              key={v}
              type="button"
              className={`choix-btn${cote === v ? ' active' : ''}`}
              onClick={() => onChangeCote(cote === v ? '' : v)}
            >{lbl}</button>
          ))}
        </div>
      </div>

      <BodyChartDLM
        regions={regions}
        onChangeRegions={onChangeRegions}
        annotations={bodyChartAnnotations}
        onChangeAnnotations={onChangeAnnotations}
        oedemeTypes={oedemeTypes}
      />
    </div>
  )
}

// ─── Step 2 — Contre-indications (checklist sécurité) ──────────────────────
export function StepContreIndications({
  state, onChange,
}: {
  state: DlmContreIndications
  onChange: (patch: Partial<DlmContreIndications>) => void
}) {
  const set = (k: keyof DlmContreIndications, v: string) =>
    onChange({ [k]: v } as Partial<DlmContreIndications>)
  const blocking = hasBlockingCI(state)
  const labels: Record<keyof DlmContreIndications, string> = {
    thromboseAigue: 'Thrombose veineuse profonde aiguë',
    insuffisanceCardiaqueDecompensee: 'Insuffisance cardiaque décompensée',
    infectionAigue: 'Infection / érysipèle / cellulite active',
    cancerActifNonTraite: 'Cancer évolutif non traité (avis médical)',
    hypotensionSevere: 'Hypotension sévère',
    arythmie: 'Arythmie significative',
    insuffisanceRenaleSevere: 'Insuffisance rénale sévère',
    trombopeniePlaquettes: 'Thrombopénie / troubles de coagulation',
    asthmesevere: 'Asthme sévère non contrôlé',
    hypothyroidieSevere: 'Hypothyroïdie sévère',
    grossesseT1: 'Grossesse — 1er trimestre (éviter abdomen/pelvis)',
    plaiesCutaneesOuvertes: 'Plaies cutanées ouvertes / ulcères infectés',
    mycoseActive: 'Mycose / dermatose active',
    douleurInexpliquee: 'Douleur inexpliquée — étiologie non élucidée',
    prescriptionMedicale: '', prescriptionDate: '', notesMedecin: '', decision: '', motifDecision: '',
  }

  return (
    <div>
      <div style={{
        ...cardStyle,
        borderColor: blocking ? '#dc2626' : 'var(--border-color)',
        background: blocking ? '#fef2f2' : 'var(--surface)',
      }}>
        <p style={{ ...sectionTitleStyle, color: blocking ? '#991b1b' : '#2A2A2A' }}>
          Contre-indications absolues
        </p>
        {blocking && (
          <div style={{ background: '#fee2e2', border: '1px solid #fecaca', color: '#991b1b', borderRadius: 8, padding: '8px 10px', marginBottom: 10, fontSize: '0.78rem', fontWeight: 600 }}>
            Au moins une CI absolue cochée — ne pas réaliser le drainage sans avis médical formalisé.
          </div>
        )}
        {CI_ABSOLUES_KEYS.map(k => (
          <OuiNon key={k} label={labels[k]} value={state[k] as string} onChange={v => set(k, v)} />
        ))}
      </div>

      <div style={cardStyle}>
        <p style={sectionTitleStyle}>Contre-indications relatives / précautions</p>
        {CI_RELATIVES_KEYS.map(k => (
          <OuiNon key={k} label={labels[k]} value={state[k] as string} onChange={v => set(k, v)} />
        ))}
      </div>

      <div style={cardStyle}>
        <p style={sectionTitleStyle}>Encadrement médical</p>
        <OuiNon label="Prescription médicale présente" value={state.prescriptionMedicale} onChange={v => set('prescriptionMedicale', v)} />
        {state.prescriptionMedicale === 'oui' && (
          <>
            <label style={lblStyle}>Date de prescription</label>
            <DictableInput value={state.prescriptionDate} onChange={e => set('prescriptionDate', e.target.value)} placeholder="JJ/MM/AAAA" inputStyle={inputStyle} />
            <label style={lblStyle}>Notes / consignes du prescripteur</label>
            <DictableTextarea value={state.notesMedecin} onChange={e => set('notesMedecin', e.target.value)} rows={2}
              textareaStyle={{ ...inputStyle, resize: 'vertical' }}
              placeholder="Indications particulières, restrictions, durée prévue…"
            />
          </>
        )}
        <p style={{ ...subTitleStyle, marginTop: 12 }}>Décision du kinésithérapeute</p>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 8 }}>
          {([['priseEnCharge','Prise en charge'],['reportee','Reportée'],['refusee','Refusée — réorientation']] as const).map(([v, lbl]) => (
            <button key={v} className={`choix-btn${state.decision === v ? ' active' : ''}`}
              onClick={() => set('decision', state.decision === v ? '' : v)}>{lbl}</button>
          ))}
        </div>
        {state.decision && state.decision !== 'priseEnCharge' && (
          <DictableTextarea value={state.motifDecision} onChange={e => set('motifDecision', e.target.value)} rows={2}
            textareaStyle={{ ...inputStyle, resize: 'vertical' }}
            placeholder="Motif détaillé de la décision (à transmettre au médecin)…"
          />
        )}
      </div>
    </div>
  )
}

// ─── Step 3 — Anamnèse ─────────────────────────────────────────────────────
export function StepAnamnese({
  state, onChange,
}: {
  state: DlmAnamnese
  onChange: (patch: Partial<DlmAnamnese>) => void
}) {
  const set = (k: keyof DlmAnamnese, v: string) => onChange({ [k]: v } as Partial<DlmAnamnese>)
  return (
    <div>
      <div style={cardStyle}>
        <p style={sectionTitleStyle}>Apparition et évolution</p>
        <label style={lblStyle}>Âge à l'apparition</label>
        <DictableInput value={state.ageApparition} onChange={e => set('ageApparition', e.target.value)} placeholder="ex: 42 ans" inputStyle={inputStyle} />
        <label style={lblStyle}>Délai depuis l'apparition</label>
        <DictableInput value={state.delaiDepuisApparition} onChange={e => set('delaiDepuisApparition', e.target.value)} placeholder="ex: 6 mois" inputStyle={inputStyle} />
        <label style={lblStyle}>Mode évolutif</label>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 8 }}>
          {([['progressive','Progressive'],['rapide','Rapide'],['fluctuante','Fluctuante'],['stable','Stable']] as const).map(([v, lbl]) => (
            <button key={v} className={`choix-btn${state.evolutionDecrite === v ? ' active' : ''}`}
              onClick={() => set('evolutionDecrite', state.evolutionDecrite === v ? '' : v)}>{lbl}</button>
          ))}
        </div>
        <label style={lblStyle}>Facteurs aggravants</label>
        <DictableTextarea value={state.facteursAggravants} onChange={e => set('facteursAggravants', e.target.value)} rows={2} textareaStyle={{ ...inputStyle, resize: 'vertical' }} placeholder="Chaleur, station debout prolongée, voyage en avion, cycle…" />
        <label style={lblStyle}>Facteurs améliorants</label>
        <DictableTextarea value={state.facteursAmeliorants} onChange={e => set('facteursAmeliorants', e.target.value)} rows={2} textareaStyle={{ ...inputStyle, resize: 'vertical' }} placeholder="Élévation, fraîcheur, contention…" />
      </div>

      <div style={cardStyle}>
        <p style={sectionTitleStyle}>Symptômes ressentis</p>
        <EVASlider label="Douleur EVA" value={state.douleurEvn} onChange={v => set('douleurEvn', v)} compact />
        <div style={{ height: 8 }} />
        <OuiNon label="Sensation de lourdeur" value={state.lourdeur} onChange={v => set('lourdeur', v)} />
        <OuiNon label="Tension / oppression" value={state.tension} onChange={v => set('tension', v)} />
        <OuiNon label="Paresthésies / fourmillements" value={state.paresthesies} onChange={v => set('paresthesies', v)} />
        <OuiNon label="Prurit" value={state.pruritus} onChange={v => set('pruritus', v)} />
        <OuiNon label="ATCD d'érysipèle / cellulite" value={state.cellulites} onChange={v => set('cellulites', v)} />
        {state.cellulites === 'oui' && (
          <DictableInput value={state.cellulitesEpisodes} onChange={e => set('cellulitesEpisodes', e.target.value)} placeholder="Nombre d'épisodes / contexte" inputStyle={inputStyle} />
        )}
        <OuiNon label="Ulcères" value={state.ulceres} onChange={v => set('ulceres', v)} />
        {state.ulceres === 'oui' && (
          <DictableInput value={state.ulceresLocalisation} onChange={e => set('ulceresLocalisation', e.target.value)} placeholder="Localisation, ancienneté, soins en cours" inputStyle={inputStyle} />
        )}
      </div>

      <div style={cardStyle}>
        <p style={sectionTitleStyle}>Antécédents médicaux & chirurgicaux</p>
        <label style={lblStyle}>Antécédents chirurgicaux</label>
        <DictableTextarea value={state.atcdChirurgicaux} onChange={e => set('atcdChirurgicaux', e.target.value)} rows={2} textareaStyle={{ ...inputStyle, resize: 'vertical' }} placeholder="Mastectomie, prostatectomie, chirurgie pelvienne, abdominale…" />
        <OuiNon label="Curage ganglionnaire" value={state.curageGanglionnaire} onChange={v => set('curageGanglionnaire', v)} />
        {state.curageGanglionnaire === 'oui' && (
          <DictableInput value={state.curageDetail} onChange={e => set('curageDetail', e.target.value)} placeholder="Axillaire / inguinal / iliaque, nb ganglions" inputStyle={inputStyle} />
        )}
        <OuiNon label="Radiothérapie" value={state.radiotherapie} onChange={v => set('radiotherapie', v)} />
        {state.radiotherapie === 'oui' && (
          <DictableInput value={state.radiotherapieZones} onChange={e => set('radiotherapieZones', e.target.value)} placeholder="Zones, doses, dates…" inputStyle={inputStyle} />
        )}
        <OuiNon label="Cancer (actif ou ATCD)" value={state.cancer} onChange={v => set('cancer', v)} />
        {state.cancer === 'oui' && (
          <>
            <DictableInput value={state.cancerType} onChange={e => set('cancerType', e.target.value)} placeholder="Type / localisation" inputStyle={inputStyle} />
            <DictableInput value={state.cancerStatut} onChange={e => set('cancerStatut', e.target.value)} placeholder="Rémission / traitement actuel / surveillance" inputStyle={inputStyle} />
            <OuiNon label="Chimiothérapie en cours" value={state.chimioActuelle} onChange={v => set('chimioActuelle', v)} />
          </>
        )}
        <OuiNon label="Insuffisance veineuse chronique" value={state.insuffisanceVeineuse} onChange={v => set('insuffisanceVeineuse', v)} />
        <OuiNon label="Insuffisance cardiaque" value={state.insuffisanceCardiaque} onChange={v => set('insuffisanceCardiaque', v)} />
        <OuiNon label="Insuffisance rénale" value={state.insuffisanceRenale} onChange={v => set('insuffisanceRenale', v)} />
        <OuiNon label="Diabète" value={state.diabete} onChange={v => set('diabete', v)} />
        <OuiNon label="Obésité" value={state.obesite} onChange={v => set('obesite', v)} />
        {state.obesite === 'oui' && (
          <DictableInput value={state.imc} onChange={e => set('imc', e.target.value)} placeholder="IMC connu (kg/m²)" inputStyle={inputStyle} />
        )}
        <OuiNon label="ATCD thrombose / phlébite" value={state.thromboseATCD} onChange={v => set('thromboseATCD', v)} />
        <OuiNon label="Filariose suspectée / dépistée" value={state.filariose} onChange={v => set('filariose', v)} />
        {(state.filariose === 'oui' || state.filariose === '') && (
          <DictableInput value={state.voyageEndemique} onChange={e => set('voyageEndemique', e.target.value)} placeholder="Voyage en zone endémique (Afrique, Asie, Amérique du Sud)…" inputStyle={inputStyle} />
        )}
      </div>

      <div style={cardStyle}>
        <p style={sectionTitleStyle}>Antécédents familiaux</p>
        <OuiNon label="ATCD familiaux de lymphœdème" value={state.atcdFamiliauxLymphoedeme} onChange={v => set('atcdFamiliauxLymphoedeme', v)} />
        <OuiNon label="ATCD familiaux de lipœdème" value={state.atcdFamiliauxLipoedeme} onChange={v => set('atcdFamiliauxLipoedeme', v)} />
      </div>

      <div style={cardStyle}>
        <p style={sectionTitleStyle}>Médicaments & contention</p>
        <label style={lblStyle}>Traitements actuels</label>
        <DictableTextarea value={state.traitementsActuels} onChange={e => set('traitementsActuels', e.target.value)} rows={2} textareaStyle={{ ...inputStyle, resize: 'vertical' }} placeholder="Médicaments en cours, posologie si pertinente…" />
        <OuiNon label="Hormones (contraception / THS)" value={state.traitementsHormones} onChange={v => set('traitementsHormones', v)} />
        <OuiNon label="Diurétiques" value={state.diuretiques} onChange={v => set('diuretiques', v)} />
        <OuiNon label="Vêtements de contention déjà portés" value={state.vetementsContention} onChange={v => set('vetementsContention', v)} />
        {state.vetementsContention === 'oui' && (
          <DictableInput value={state.vetementsContentionDetail} onChange={e => set('vetementsContentionDetail', e.target.value)} placeholder="Classe, marque, ancienneté, observance…" inputStyle={inputStyle} />
        )}
      </div>

      <div style={cardStyle}>
        <p style={sectionTitleStyle}>Mode de vie</p>
        <OuiNon label="Profession debout / piétinement" value={state.professionDebout} onChange={v => set('professionDebout', v)} />
        <label style={lblStyle}>Activité physique</label>
        <DictableInput value={state.activitePhysique} onChange={e => set('activitePhysique', e.target.value)} placeholder="Type, fréquence, durée…" inputStyle={inputStyle} />
        <label style={lblStyle}>Contexte alimentaire</label>
        <DictableTextarea value={state.alimentationContexte} onChange={e => set('alimentationContexte', e.target.value)} rows={2} textareaStyle={{ ...inputStyle, resize: 'vertical' }} placeholder="Régime, suivi nutritionnel, gestion des œdèmes alimentaires…" />
      </div>

      <div style={cardStyle}>
        <p style={sectionTitleStyle}>Plainte du patient & retentissement</p>
        <label style={lblStyle}>Plainte / mots du patient</label>
        <DictableTextarea value={state.plaintePatient} onChange={e => set('plaintePatient', e.target.value)} rows={3} textareaStyle={{ ...inputStyle, resize: 'vertical' }} placeholder="Citation directe, ressenti, ce qui le gêne le plus…" />
        <label style={lblStyle}>Retentissement sur la qualité de vie</label>
        <DictableTextarea value={state.retentissementQdV} onChange={e => set('retentissementQdV', e.target.value)} rows={3} textareaStyle={{ ...inputStyle, resize: 'vertical' }} placeholder="Travail, vie familiale, vêtements, image corporelle, sommeil…" />
        <label style={lblStyle}>Attentes du patient</label>
        <DictableTextarea value={state.attentes} onChange={e => set('attentes', e.target.value)} rows={2} textareaStyle={{ ...inputStyle, resize: 'vertical' }} placeholder="Objectifs personnels, niveau d'engagement attendu…" />
      </div>
    </div>
  )
}

// ─── Step 4 — Examen clinique ──────────────────────────────────────────────
export function StepExamenClinique({
  state, onChange,
}: {
  state: DlmExamenClinique
  onChange: (patch: Partial<DlmExamenClinique>) => void
}) {
  const set = <K extends keyof DlmExamenClinique>(k: K, v: DlmExamenClinique[K]) =>
    onChange({ [k]: v } as Partial<DlmExamenClinique>)

  return (
    <div>
      <div style={cardStyle}>
        <p style={sectionTitleStyle}>Inspection</p>
        <OuiNon label="Asymétrie visible" value={state.asymetrie} onChange={v => set('asymetrie', v as DlmExamenClinique['asymetrie'])} />
        {state.asymetrie === 'oui' && (
          <DictableInput value={state.asymetrieDetail} onChange={e => set('asymetrieDetail', e.target.value)} placeholder="Différence visuelle estimée, localisation…" inputStyle={inputStyle} />
        )}
        <label style={lblStyle}>Posture / morphostatique</label>
        <DictableTextarea value={state.posture} onChange={e => set('posture', e.target.value)} rows={2} textareaStyle={{ ...inputStyle, resize: 'vertical' }} placeholder="Statique, déhanchement, attitude antalgique…" />
        <label style={lblStyle}>Troubles trophiques</label>
        <DictableTextarea value={state.troublesTrophiques} onChange={e => set('troublesTrophiques', e.target.value)} rows={2} textareaStyle={{ ...inputStyle, resize: 'vertical' }} placeholder="Peau d'orange, fibrose, papillomatose, hyperkératose, vésicules lymphatiques…" />
        <label style={lblStyle}>Couleur cutanée</label>
        <DictableInput value={state.couleurPeau} onChange={e => set('couleurPeau', e.target.value)} placeholder="Érythème, cyanose, dermite ocre, atrophie blanche…" inputStyle={inputStyle} />
        <label style={lblStyle}>Température locale</label>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 8 }}>
          {([['normale','Normale'],['chaude','Chaude'],['froide','Froide']] as const).map(([v, lbl]) => (
            <button key={v} className={`choix-btn${state.temperatureLocale === v ? ' active' : ''}`}
              onClick={() => set('temperatureLocale', state.temperatureLocale === v ? '' : v as DlmExamenClinique['temperatureLocale'])}>{lbl}</button>
          ))}
        </div>
        <OuiNon label="Varices visibles" value={state.varices} onChange={v => set('varices', v as DlmExamenClinique['varices'])} />
        {state.varices === 'oui' && (
          <DictableInput value={state.varicesDetail} onChange={e => set('varicesDetail', e.target.value)} placeholder="Localisation, importance, type (saphènes, télangiectasies)…" inputStyle={inputStyle} />
        )}
        <label style={lblStyle}>Cicatrices</label>
        <DictableInput value={state.cicatrices} onChange={e => set('cicatrices', e.target.value)} placeholder="Localisation, ancienneté, qualité (adhérente, plate, hypertrophique)…" inputStyle={inputStyle} />
      </div>

      <div style={cardStyle}>
        <p style={sectionTitleStyle}>Palpation</p>
        <label style={lblStyle}>Godet (pitting)</label>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 8 }}>
          {(['0','1','2','3','4'] as GodetGrade[]).filter((g): g is Exclude<GodetGrade, ''> => g !== '').map(g => (
            <button key={g} className={`choix-btn${state.godetGrade === g ? ' active' : ''}`}
              onClick={() => set('godetGrade', state.godetGrade === g ? '' : g)}
              title={GODET_LABELS[g]}>
              {g}
            </button>
          ))}
        </div>
        {state.godetGrade && (
          <>
            <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)', margin: '0 0 6px' }}>{GODET_LABELS[state.godetGrade]}</p>
            <DictableInput value={state.godetLocalisation} onChange={e => set('godetLocalisation', e.target.value)} placeholder="Localisation du test (cheville, dos du pied, avant-bras…)" inputStyle={inputStyle} />
          </>
        )}
        <OuiNon label="Fibrose détectable à la palpation" value={state.fibrose} onChange={v => set('fibrose', v as DlmExamenClinique['fibrose'])} />
        {state.fibrose === 'oui' && (
          <DictableInput value={state.fibroseLocalisation} onChange={e => set('fibroseLocalisation', e.target.value)} placeholder="Topographie / extension" inputStyle={inputStyle} />
        )}
        <label style={lblStyle}>Consistance globale</label>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 8 }}>
          {([['molle','Molle'],['fermes','Ferme'],['fibreuse','Fibreuse'],['mixte','Mixte']] as const).map(([v, lbl]) => (
            <button key={v} className={`choix-btn${state.consistance === v ? ' active' : ''}`}
              onClick={() => set('consistance', state.consistance === v ? '' : v as DlmExamenClinique['consistance'])}>{lbl}</button>
          ))}
        </div>
        <OuiNon label="Douleur à la palpation" value={state.douleurPalpation} onChange={v => set('douleurPalpation', v as DlmExamenClinique['douleurPalpation'])} />
        {state.douleurPalpation === 'oui' && (
          <DictableInput value={state.douleurPalpationLocalisation} onChange={e => set('douleurPalpationLocalisation', e.target.value)} placeholder="Localisation et caractère (vif, sourd…)" inputStyle={inputStyle} />
        )}
      </div>

      <div style={cardStyle}>
        <p style={sectionTitleStyle}>Tests pathognomoniques & vasculaires</p>
        <label style={lblStyle}>Signe de Kaposi-Stemmer</label>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 8 }}>
          {([['positif','Positif'],['negatif','Négatif'],['douteux','Douteux']] as const).map(([v, lbl]) => (
            <button key={v} className={`choix-btn${state.stemmer === v ? ' active' : ''}`}
              onClick={() => set('stemmer', state.stemmer === v ? '' : v as Stemmer)}>{lbl}</button>
          ))}
        </div>
        <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)', margin: '-2px 0 8px' }}>
          Pli cutané au dos du 2e orteil / 2e doigt — non décollable = positif (pathognomonique du lymphœdème).
        </p>
        {state.stemmer && (
          <DictableInput value={state.stemmerLocalisation} onChange={e => set('stemmerLocalisation', e.target.value)} placeholder="Côté testé / précisions" inputStyle={inputStyle} />
        )}
        <label style={lblStyle}>Pouls pédieux</label>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 8 }}>
          {([['present','Présent'],['normal','Normal'],['diminue','Diminué'],['aboli','Aboli']] as const).map(([v, lbl]) => (
            <button key={v} className={`choix-btn${state.poulsPedieux === v ? ' active' : ''}`}
              onClick={() => set('poulsPedieux', state.poulsPedieux === v ? '' : v as DlmExamenClinique['poulsPedieux'])}>{lbl}</button>
          ))}
        </div>
        <label style={lblStyle}>Signe de Homans</label>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 8 }}>
          {([['positif','Positif'],['negatif','Négatif'],['non_realise','Non réalisé']] as const).map(([v, lbl]) => (
            <button key={v} className={`choix-btn${state.signeHomans === v ? ' active' : ''}`}
              onClick={() => set('signeHomans', state.signeHomans === v ? '' : v as DlmExamenClinique['signeHomans'])}>{lbl}</button>
          ))}
        </div>
      </div>

      <div style={cardStyle}>
        <p style={sectionTitleStyle}>Mobilité & notes complémentaires</p>
        <label style={lblStyle}>Amplitudes articulaires (synthèse)</label>
        <DictableTextarea value={state.amplitudesArticulaires} onChange={e => set('amplitudesArticulaires', e.target.value)} rows={2} textareaStyle={{ ...inputStyle, resize: 'vertical' }} placeholder="Limitations articulaires significatives liées à l'œdème (cheville, doigts, épaule…)" />
        <label style={lblStyle}>Notes libres d'examen</label>
        <DictableTextarea value={state.notesExamen} onChange={e => set('notesExamen', e.target.value)} rows={3} textareaStyle={{ ...inputStyle, resize: 'vertical' }} placeholder="Tout ce qui mérite d'être consigné et ne rentre pas dans les rubriques précédentes…" />
      </div>
    </div>
  )
}

// ─── Step 5 — Mesures circométriques + bio-impédance ───────────────────────
export function StepMesures({
  state, onChange, cote,
}: {
  state: DlmMesures
  onChange: (patch: Partial<DlmMesures>) => void
  /** Côté principal atteint — pilote la mise en avant des colonnes circométriques. */
  cote: BilanDLMData['cote']
}) {
  const set = <K extends keyof DlmMesures>(k: K, v: DlmMesures[K]) =>
    onChange({ [k]: v } as Partial<DlmMesures>)

  const setCirco = (which: 'circoMS' | 'circoMI', next: CircoSet) =>
    onChange({ [which]: next } as Partial<DlmMesures>)

  const handlePoids = (v: string) => {
    const next = { poids: v, imc: computeIMC(v, state.taille) || state.imc }
    onChange(next)
  }
  const handleTaille = (v: string) => {
    const next = { taille: v, imc: computeIMC(state.poids, v) || state.imc }
    onChange(next)
  }

  return (
    <div>
      <div style={cardStyle}>
        <p style={sectionTitleStyle}>Mesures générales</p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: 8 }}>
          <div>
            <label style={lblStyle}>Poids (kg)</label>
            <DictableInput value={state.poids} onChange={e => handlePoids(e.target.value)} placeholder="kg" inputStyle={inputStyle} />
          </div>
          <div>
            <label style={lblStyle}>Taille (cm)</label>
            <DictableInput value={state.taille} onChange={e => handleTaille(e.target.value)} placeholder="cm" inputStyle={inputStyle} />
          </div>
          <div>
            <label style={lblStyle}>IMC (calculé)</label>
            <DictableInput value={state.imc} onChange={e => set('imc', e.target.value)} placeholder="kg/m²" inputStyle={inputStyle} />
          </div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: 8 }}>
          <div>
            <label style={lblStyle}>Périmètre ombilical</label>
            <DictableInput value={state.perimetreOmbilical} onChange={e => set('perimetreOmbilical', e.target.value)} placeholder="cm" inputStyle={inputStyle} />
          </div>
          <div>
            <label style={lblStyle}>Périmètre hanche</label>
            <DictableInput value={state.perimetreHanche} onChange={e => set('perimetreHanche', e.target.value)} placeholder="cm" inputStyle={inputStyle} />
          </div>
          <div>
            <label style={lblStyle}>Rapport taille/hanche</label>
            <DictableInput value={state.rapportTH} onChange={e => set('rapportTH', e.target.value)} placeholder="ex: 0.85" inputStyle={inputStyle} />
          </div>
        </div>
      </div>

      <CircoSection
        title="Circométrie membre supérieur (Kuhnke)"
        defaultRepere="Processus styloïde radial"
        defaultNiveaux={KUHNKE_DEFAULT_NIVEAUX_MS}
        set={state.circoMS}
        onChange={s => setCirco('circoMS', s)}
        volumeD={state.volumeMSDcm3}
        volumeG={state.volumeMSGcm3}
        onVolumesChange={(d, g) => onChange({ volumeMSDcm3: d, volumeMSGcm3: g, ecartVolumiqueMS: ecartPct(d, g) })}
        ecart={state.ecartVolumiqueMS}
        focusCote={cote === 'bilateral' ? '' : cote}
      />

      <CircoSection
        title="Circométrie membre inférieur (Kuhnke)"
        defaultRepere="Malléole médiale"
        defaultNiveaux={KUHNKE_DEFAULT_NIVEAUX_MI}
        set={state.circoMI}
        onChange={s => setCirco('circoMI', s)}
        volumeD={state.volumeMIDcm3}
        volumeG={state.volumeMIGcm3}
        onVolumesChange={(d, g) => onChange({ volumeMIDcm3: d, volumeMIGcm3: g, ecartVolumiqueMI: ecartPct(d, g) })}
        ecart={state.ecartVolumiqueMI}
        focusCote={cote === 'bilateral' ? '' : cote}
      />

      <div style={cardStyle}>
        <p style={sectionTitleStyle}>Bio-impédance / L-Dex</p>
        <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)', margin: '0 0 8px' }}>
          Seuil pathologique typique : L-Dex {'>'} 6.5 (membre supérieur), {'>'} 10 (membre inférieur).
        </p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 8 }}>
          <div>
            <label style={lblStyle}>Appareil</label>
            <DictableInput value={state.bioImpedance.appareil} onChange={e => set('bioImpedance', { ...state.bioImpedance, appareil: e.target.value })} placeholder="ex: SOZO ImpediMed" inputStyle={inputStyle} />
          </div>
          <div>
            <label style={lblStyle}>Score L-Dex</label>
            <DictableInput value={state.bioImpedance.lDexScore} onChange={e => set('bioImpedance', { ...state.bioImpedance, lDexScore: e.target.value })} placeholder="ex: 8.4" inputStyle={inputStyle} />
          </div>
          <div>
            <label style={lblStyle}>Date</label>
            <DictableInput value={state.bioImpedance.date} onChange={e => set('bioImpedance', { ...state.bioImpedance, date: e.target.value })} placeholder="JJ/MM/AAAA" inputStyle={inputStyle} />
          </div>
        </div>
        <label style={lblStyle}>Note bio-impédance</label>
        <DictableTextarea value={state.bioImpedance.note} onChange={e => set('bioImpedance', { ...state.bioImpedance, note: e.target.value })} rows={2}
          textareaStyle={{ ...inputStyle, resize: 'vertical' }} placeholder="Conditions de mesure, écart vs précédent…" />
      </div>

      <div style={cardStyle}>
        <p style={sectionTitleStyle}>Notes complémentaires sur les mesures</p>
        <DictableTextarea value={state.notesMesures} onChange={e => set('notesMesures', e.target.value)} rows={3} textareaStyle={{ ...inputStyle, resize: 'vertical' }} placeholder="Difficultés de mesure, écart par rapport au précédent bilan…" />
      </div>
    </div>
  )
}

function ecartPct(d: string, g: string): string {
  const a = Number(d), b = Number(g)
  if (!Number.isFinite(a) || !Number.isFinite(b) || a <= 0 || b <= 0) return ''
  const min = Math.min(a, b), max = Math.max(a, b)
  return ((max - min) / min * 100).toFixed(1)
}

function CircoSection({
  title, defaultRepere, defaultNiveaux,
  set, onChange,
  volumeD, volumeG, onVolumesChange,
  ecart,
  focusCote,
}: {
  title: string
  defaultRepere: string
  defaultNiveaux: string[]
  set: CircoSet
  onChange: (next: CircoSet) => void
  volumeD: string
  volumeG: string
  onVolumesChange: (d: string, g: string) => void
  ecart: string
  /** 'D' | 'G' = côté principal atteint, mis en avant. '' = bilatéral équivalent. */
  focusCote: 'D' | 'G' | ''
}) {
  const initRepere = set.repere || defaultRepere
  const niveaux = set.niveaux

  const initLevels = () => {
    const initial: CircoLevel[] = defaultNiveaux.map(n => ({ niveau: n, perimetreD: '', perimetreG: '', note: '' }))
    onChange({ repere: initRepere, niveaux: initial })
  }

  const updateLevel = (idx: number, patch: Partial<CircoLevel>) => {
    const next = niveaux.map((l, i) => i === idx ? { ...l, ...patch } : l)
    const updated: CircoSet = { repere: initRepere, niveaux: next }
    onChange(updated)
    const vd = computeKuhnkeVolume(updated, 'D')
    const vg = computeKuhnkeVolume(updated, 'G')
    onVolumesChange(vd > 0 ? vd.toFixed(0) : '', vg > 0 ? vg.toFixed(0) : '')
  }

  const removeLevel = (idx: number) => {
    const next = niveaux.filter((_, i) => i !== idx)
    const updated: CircoSet = { repere: initRepere, niveaux: next }
    onChange(updated)
    const vd = computeKuhnkeVolume(updated, 'D')
    const vg = computeKuhnkeVolume(updated, 'G')
    onVolumesChange(vd > 0 ? vd.toFixed(0) : '', vg > 0 ? vg.toFixed(0) : '')
  }

  const addLevel = () => {
    const last = niveaux[niveaux.length - 1]
    const lastN = last ? Number(last.niveau) : 0
    const next = [...niveaux, { niveau: String((Number.isFinite(lastN) ? lastN : 0) + 4), perimetreD: '', perimetreG: '', note: '' }]
    onChange({ repere: initRepere, niveaux: next })
  }

  // Ratio de mise en avant — côté atteint en violet, côté contralatéral en gris.
  const styleD = focusCote === 'D'
    ? { background: 'rgba(124,58,237,0.05)', borderColor: 'rgba(124,58,237,0.45)' }
    : focusCote === 'G' ? { background: 'var(--input-bg)', borderColor: 'rgba(148,163,184,0.4)' } : {}
  const styleG = focusCote === 'G'
    ? { background: 'rgba(124,58,237,0.05)', borderColor: 'rgba(124,58,237,0.45)' }
    : focusCote === 'D' ? { background: 'var(--input-bg)', borderColor: 'rgba(148,163,184,0.4)' } : {}

  return (
    <div style={cardStyle}>
      <p style={sectionTitleStyle}>{title}</p>
      <label style={lblStyle}>Repère osseux distal</label>
      <DictableInput value={initRepere} onChange={e => onChange({ ...set, repere: e.target.value })} placeholder="ex: Malléole médiale" inputStyle={inputStyle} />
      {focusCote && (
        <p style={{ fontSize: '0.72rem', color: '#5b21b6', margin: '0 0 6px', fontWeight: 600 }}>
          Côté atteint : {focusCote === 'D' ? 'Droit' : 'Gauche'} — la colonne contralatérale sert de comparatif.
        </p>
      )}
      {niveaux.length === 0 && (
        <button type="button" onClick={initLevels}
          style={{ background: 'var(--primary)', color: '#fff', border: 'none', borderRadius: 8, padding: '6px 14px', fontSize: '0.78rem', fontWeight: 600, cursor: 'pointer' }}>
          Initialiser les niveaux Kuhnke standards
        </button>
      )}
      {niveaux.length > 0 && (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: '60px 1fr 1fr 60px 1fr 32px', gap: 6, alignItems: 'center', fontSize: '0.68rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 6 }}>
            <span>Niv (cm)</span>
            <span style={{ color: focusCote === 'D' ? '#5b21b6' : undefined }}>Périm. D</span>
            <span style={{ color: focusCote === 'G' ? '#5b21b6' : undefined }}>Périm. G</span>
            <span>Δ%</span>
            <span>Note</span>
            <span></span>
          </div>
          {niveaux.map((l, idx) => {
            const e = levelEcart(l.perimetreD, l.perimetreG)
            return (
              <div key={idx} style={{ display: 'grid', gridTemplateColumns: '60px 1fr 1fr 60px 1fr 32px', gap: 6, alignItems: 'center', marginBottom: 6 }}>
                <input value={l.niveau} onChange={ev => updateLevel(idx, { niveau: ev.target.value })} placeholder="0" inputMode="numeric" style={{ ...inputStyle, marginBottom: 0, padding: '6px 8px', fontSize: '0.82rem' }} />
                <input value={l.perimetreD} onChange={ev => updateLevel(idx, { perimetreD: ev.target.value })} placeholder="cm" inputMode="decimal" style={{ ...inputStyle, ...styleD, marginBottom: 0, padding: '6px 8px', fontSize: '0.82rem' }} />
                <input value={l.perimetreG} onChange={ev => updateLevel(idx, { perimetreG: ev.target.value })} placeholder="cm" inputMode="decimal" style={{ ...inputStyle, ...styleG, marginBottom: 0, padding: '6px 8px', fontSize: '0.82rem' }} />
                <span style={{
                  fontSize: '0.78rem', fontWeight: 700, textAlign: 'center',
                  color: e == null ? 'var(--text-muted)' : ecartColor(e),
                }}>
                  {e == null ? '—' : `${e.toFixed(1)}`}
                </span>
                <input value={l.note} onChange={ev => updateLevel(idx, { note: ev.target.value })} placeholder="…" style={{ ...inputStyle, marginBottom: 0, padding: '6px 8px', fontSize: '0.78rem' }} />
                <button type="button" onClick={() => removeLevel(idx)}
                  style={{ background: 'transparent', border: 'none', color: '#dc2626', cursor: 'pointer', fontWeight: 700, fontSize: '0.9rem' }}
                  title="Supprimer ce niveau"
                >×</button>
              </div>
            )
          })}
          <button type="button" onClick={addLevel}
            style={{ background: 'transparent', color: 'var(--primary)', border: '1px dashed var(--primary)', borderRadius: 8, padding: '5px 14px', fontSize: '0.76rem', fontWeight: 600, cursor: 'pointer', marginTop: 4 }}>
            + Ajouter un niveau
          </button>
          <div style={{ marginTop: 12, padding: '8px 12px', borderRadius: 8, background: 'rgba(124,58,237,0.05)', border: '1px solid rgba(124,58,237,0.15)', fontSize: '0.78rem', color: '#5b21b6', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: 6 }}>
            <span><strong>Volume D :</strong> {volumeD ? `${volumeD} cm³` : '—'}</span>
            <span><strong>Volume G :</strong> {volumeG ? `${volumeG} cm³` : '—'}</span>
            <span style={{ color: ecart ? ecartColor(Number(ecart)) : 'var(--text-muted)' }}>
              <strong>Écart total :</strong> {ecart ? `${ecart} %` : '—'}
            </span>
          </div>
        </>
      )}
    </div>
  )
}

function levelEcart(d: string, g: string): number | null {
  const a = Number(d), b = Number(g)
  if (!Number.isFinite(a) || !Number.isFinite(b) || a <= 0 || b <= 0) return null
  const min = Math.min(a, b), max = Math.max(a, b)
  return ((max - min) / min) * 100
}

function ecartColor(pct: number): string {
  if (pct < 5) return '#059669'      // vert : différence négligeable
  if (pct < 10) return '#d97706'     // ambre : à surveiller
  return '#dc2626'                    // rouge : pathologique
}

// ─── Step 6 — Stade(s) ─────────────────────────────────────────────────────
export function StepStade({
  oedemeTypes,
  stadeISL, onChangeStadeISL,
  stadeLipo, onChangeStadeLipo,
  typeLipoDistribution, onChangeTypeLipo,
  ceap, onChangeCeap,
  examenClinique,
}: {
  oedemeTypes: OedemeType[]
  stadeISL: StadeISL
  onChangeStadeISL: (s: StadeISL) => void
  stadeLipo: StadeLipo
  onChangeStadeLipo: (s: StadeLipo) => void
  typeLipoDistribution: string
  onChangeTypeLipo: (v: string) => void
  ceap: ClasseCEAP
  onChangeCeap: (c: ClasseCEAP) => void
  /** Pour proposer une suggestion ISL automatique à partir des signes cliniques. */
  examenClinique?: DlmExamenClinique
}) {
  const has = (t: OedemeType) => oedemeTypes.includes(t)
  const c = (t: OedemeType) => OEDEME_COLORS[t]
  const suggestion = examenClinique ? suggestStadeISL(examenClinique) : null
  return (
    <div>
      {oedemeTypes.length === 0 && (
        <div style={{ ...cardStyle, background: '#fef3c7', border: '1px solid #fde68a', color: '#92400e', fontSize: '0.82rem' }}>
          Sélectionnez au moins un type d'œdème à l'étape 1 pour afficher les classifications correspondantes.
        </div>
      )}
      {has('lymphoedeme') && (
        <div style={{ ...cardStyle, background: c('lymphoedeme').bg, borderColor: c('lymphoedeme').border }}>
          <p style={{ ...sectionTitleStyle, color: c('lymphoedeme').fg }}>Stade ISL — Lymphœdème</p>
          {suggestion && stadeISL !== suggestion.stade && (
            <div style={{
              padding: '8px 10px', borderRadius: 8, marginBottom: 10,
              background: '#fff', border: `1px dashed ${c('lymphoedeme').fg}`,
              fontSize: '0.78rem', color: c('lymphoedeme').fg,
              display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap',
            }}>
              <div>
                <div style={{ fontWeight: 700, marginBottom: 2 }}>
                  Suggestion à partir de l'examen : Stade {suggestion.stade}
                </div>
                <div style={{ fontSize: '0.72rem', opacity: 0.85 }}>{suggestion.rationale}</div>
              </div>
              <button type="button" onClick={() => onChangeStadeISL(suggestion.stade)}
                style={{
                  padding: '6px 14px', borderRadius: 8, fontSize: '0.74rem', fontWeight: 700,
                  background: c('lymphoedeme').fg, color: '#fff', border: 'none', cursor: 'pointer',
                  whiteSpace: 'nowrap',
                }}>
                Appliquer
              </button>
            </div>
          )}
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {(Object.keys(STADE_ISL_LABELS) as Exclude<StadeISL, ''>[]).map(s => (
              <button key={s} type="button"
                onClick={() => onChangeStadeISL(stadeISL === s ? '' : s)}
                style={{
                  padding: '8px 12px', borderRadius: 8, fontSize: '0.78rem', fontWeight: 600,
                  background: stadeISL === s ? c('lymphoedeme').fg : '#fff',
                  color: stadeISL === s ? '#fff' : c('lymphoedeme').fg,
                  border: `1px solid ${c('lymphoedeme').border}`, cursor: 'pointer',
                }}>{`Stade ${s}`}</button>
            ))}
          </div>
          {stadeISL && (
            <p style={{ marginTop: 8, fontSize: '0.78rem', color: c('lymphoedeme').fg }}>
              {STADE_ISL_LABELS[stadeISL]}
            </p>
          )}
        </div>
      )}
      {has('lipoedeme') && (
        <div style={{ ...cardStyle, background: c('lipoedeme').bg, borderColor: c('lipoedeme').border }}>
          <p style={{ ...sectionTitleStyle, color: c('lipoedeme').fg }}>Stade lipœdème (Schmeller)</p>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {(Object.keys(STADE_LIPO_LABELS) as Exclude<StadeLipo, ''>[]).map(s => (
              <button key={s} type="button"
                onClick={() => onChangeStadeLipo(stadeLipo === s ? '' : s)}
                style={{
                  padding: '8px 12px', borderRadius: 8, fontSize: '0.78rem', fontWeight: 600,
                  background: stadeLipo === s ? c('lipoedeme').fg : '#fff',
                  color: stadeLipo === s ? '#fff' : c('lipoedeme').fg,
                  border: `1px solid ${c('lipoedeme').border}`, cursor: 'pointer',
                }}>{`Stade ${s}`}</button>
            ))}
          </div>
          {stadeLipo && (
            <p style={{ marginTop: 8, fontSize: '0.78rem', color: c('lipoedeme').fg }}>
              {STADE_LIPO_LABELS[stadeLipo]}
            </p>
          )}
          <p style={{ ...subTitleStyle, color: c('lipoedeme').fg, marginTop: 12 }}>Type de distribution</p>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {TYPE_LIPO_DISTRIBUTION.map(t => (
              <button key={t} type="button" className={`choix-btn${typeLipoDistribution === t ? ' active' : ''}`}
                onClick={() => onChangeTypeLipo(typeLipoDistribution === t ? '' : t)}>{t}</button>
            ))}
          </div>
        </div>
      )}
      {has('phleboedeme') && (
        <div style={{ ...cardStyle, background: c('phleboedeme').bg, borderColor: c('phleboedeme').border }}>
          <p style={{ ...sectionTitleStyle, color: c('phleboedeme').fg }}>Classification CEAP — Phlébœdème</p>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {(Object.keys(CEAP_LABELS) as Exclude<ClasseCEAP, ''>[]).map(c2 => (
              <button key={c2} type="button"
                onClick={() => onChangeCeap(ceap === c2 ? '' : c2)}
                style={{
                  padding: '8px 12px', borderRadius: 8, fontSize: '0.78rem', fontWeight: 600,
                  background: ceap === c2 ? c('phleboedeme').fg : '#fff',
                  color: ceap === c2 ? '#fff' : c('phleboedeme').fg,
                  border: `1px solid ${c('phleboedeme').border}`, cursor: 'pointer',
                }}>{c2}</button>
            ))}
          </div>
          {ceap && (
            <p style={{ marginTop: 8, fontSize: '0.78rem', color: c('phleboedeme').fg }}>
              {CEAP_LABELS[ceap]}
            </p>
          )}
        </div>
      )}
    </div>
  )
}

// ─── Step 7 — Fonction (ICF) ───────────────────────────────────────────────
export function StepFonctionICF({
  state, onChange,
}: {
  state: DlmICF
  onChange: (patch: Partial<DlmICF>) => void
}) {
  const set = (k: keyof DlmICF, v: string) => onChange({ [k]: v } as Partial<DlmICF>)
  return (
    <div>
      <div style={cardStyle}>
        <p style={sectionTitleStyle}>Cadre ICF (CIF — OMS)</p>
        <p style={{ fontSize: '0.74rem', color: 'var(--text-muted)', margin: '0 0 12px' }}>
          Décrire les déficiences (b/s), limitations d'activité (d), restrictions de participation, et facteurs contextuels.
        </p>
        <label style={lblStyle}>Fonctions corporelles (b)</label>
        <DictableTextarea value={state.fonctionsCorps} onChange={e => set('fonctionsCorps', e.target.value)} rows={2} textareaStyle={{ ...inputStyle, resize: 'vertical' }} placeholder="b720 — fonction circulatoire, b820 — protection cutanée, b780 — sensations musculaires…" />
        <label style={lblStyle}>Structures corporelles (s)</label>
        <DictableTextarea value={state.structuresCorps} onChange={e => set('structuresCorps', e.target.value)} rows={2} textareaStyle={{ ...inputStyle, resize: 'vertical' }} placeholder="s7402 — vaisseaux lymphatiques, s7401 — système circulatoire…" />
        <label style={lblStyle}>Limitations d'activité (d)</label>
        <DictableTextarea value={state.activitesLimitees} onChange={e => set('activitesLimitees', e.target.value)} rows={2} textareaStyle={{ ...inputStyle, resize: 'vertical' }} placeholder="Marche, transferts, habillement, port de charge…" />
        <label style={lblStyle}>Restrictions de participation</label>
        <DictableTextarea value={state.participationRestreinte} onChange={e => set('participationRestreinte', e.target.value)} rows={2} textareaStyle={{ ...inputStyle, resize: 'vertical' }} placeholder="Travail, vie sociale, loisirs, vie sexuelle…" />
        <label style={lblStyle}>Facteurs environnementaux</label>
        <DictableTextarea value={state.facteursEnvironnementaux} onChange={e => set('facteursEnvironnementaux', e.target.value)} rows={2} textareaStyle={{ ...inputStyle, resize: 'vertical' }} placeholder="Climat, accès aux soins, soutien familial, prise en charge sociale…" />
        <label style={lblStyle}>Facteurs personnels</label>
        <DictableTextarea value={state.facteursPersonnels} onChange={e => set('facteursPersonnels', e.target.value)} rows={2} textareaStyle={{ ...inputStyle, resize: 'vertical' }} placeholder="Coping, observance, motivation, image corporelle…" />
        <EVASlider label="Effort fonctionnel ressenti (auto-évaluation)" value={state.echelleEffortFonctionnel} onChange={v => set('echelleEffortFonctionnel', v)} compact />
      </div>
    </div>
  )
}

// ─── Step 8 — Diagnostic différentiel ──────────────────────────────────────
export function StepDxDifferentiel({
  state, onChange,
}: {
  state: DlmDxDifferentiel
  onChange: (next: DlmDxDifferentiel) => void
}) {
  const setPart = (key: 'lymphoedeme' | 'lipoedeme' | 'phleboedeme', patch: Partial<DlmDxDifferentiel[typeof key]>) => {
    onChange({ ...state, [key]: { ...state[key], ...patch } })
  }
  const updateAutre = (idx: number, patch: Partial<DlmDxDifferentiel['autres'][number]>) => {
    const autres = state.autres.map((a, i) => i === idx ? { ...a, ...patch } : a)
    onChange({ ...state, autres })
  }
  const addAutre = () => {
    onChange({ ...state, autres: [...state.autres, { hypothese: '', argumentsPour: '', argumentsContre: '', retenu: '' }] })
  }
  const removeAutre = (idx: number) => {
    onChange({ ...state, autres: state.autres.filter((_, i) => i !== idx) })
  }

  const renderRow = (
    key: 'lymphoedeme' | 'lipoedeme' | 'phleboedeme',
    title: string,
  ) => (
    <div style={{ ...cardStyle, background: OEDEME_COLORS[key].bg, borderColor: OEDEME_COLORS[key].border }}>
      <p style={{ ...sectionTitleStyle, color: OEDEME_COLORS[key].fg }}>{title}</p>
      <label style={lblStyle}>Arguments en faveur</label>
      <DictableTextarea value={state[key].argumentsPour} onChange={e => setPart(key, { argumentsPour: e.target.value })} rows={2} textareaStyle={{ ...inputStyle, resize: 'vertical' }} placeholder="Cliniques / paracliniques" />
      <label style={lblStyle}>Arguments en défaveur</label>
      <DictableTextarea value={state[key].argumentsContre} onChange={e => setPart(key, { argumentsContre: e.target.value })} rows={2} textareaStyle={{ ...inputStyle, resize: 'vertical' }} placeholder="Cliniques / paracliniques" />
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 4 }}>
        {([['oui','Retenu'],['non','Écarté'],['a_explorer','À explorer']] as const).map(([v, lbl]) => (
          <button key={v} type="button" className={`choix-btn${state[key].retenu === v ? ' active' : ''}`}
            onClick={() => setPart(key, { retenu: state[key].retenu === v ? '' : v })}>{lbl}</button>
        ))}
      </div>
    </div>
  )

  return (
    <div>
      {renderRow('lymphoedeme', 'Lymphœdème')}
      {renderRow('lipoedeme', 'Lipœdème')}
      {renderRow('phleboedeme', 'Phlébœdème (IVC)')}

      <div style={cardStyle}>
        <p style={sectionTitleStyle}>Autres hypothèses</p>
        <p style={{ fontSize: '0.74rem', color: 'var(--text-muted)', margin: '0 0 8px' }}>
          Œdème médicamenteux, myxœdème, lipohypertrophie, œdème inflammatoire, allergie, néoplasie locale…
        </p>
        {state.autres.map((a, idx) => (
          <div key={idx} style={{ marginBottom: 10, padding: 10, borderRadius: 8, background: 'var(--input-bg)', border: '1px solid var(--border-color)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
              <DictableInput value={a.hypothese} onChange={e => updateAutre(idx, { hypothese: e.target.value })} placeholder="Hypothèse" inputStyle={{ ...inputStyle, marginBottom: 0 }} />
              <button type="button" onClick={() => removeAutre(idx)} style={{ marginLeft: 8, background: 'transparent', border: 'none', color: '#dc2626', cursor: 'pointer', fontWeight: 700, fontSize: '0.95rem' }}>×</button>
            </div>
            <label style={lblStyle}>Pour</label>
            <DictableTextarea value={a.argumentsPour} onChange={e => updateAutre(idx, { argumentsPour: e.target.value })} rows={2} textareaStyle={{ ...inputStyle, resize: 'vertical' }} placeholder="…" />
            <label style={lblStyle}>Contre</label>
            <DictableTextarea value={a.argumentsContre} onChange={e => updateAutre(idx, { argumentsContre: e.target.value })} rows={2} textareaStyle={{ ...inputStyle, resize: 'vertical' }} placeholder="…" />
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {([['oui','Retenu'],['non','Écarté'],['a_explorer','À explorer']] as const).map(([v, lbl]) => (
                <button key={v} type="button" className={`choix-btn${a.retenu === v ? ' active' : ''}`}
                  onClick={() => updateAutre(idx, { retenu: a.retenu === v ? '' : v })}>{lbl}</button>
              ))}
            </div>
          </div>
        ))}
        <button type="button" onClick={addAutre}
          style={{ background: 'transparent', color: 'var(--primary)', border: '1px dashed var(--primary)', borderRadius: 8, padding: '5px 14px', fontSize: '0.76rem', fontWeight: 600, cursor: 'pointer' }}>
          + Ajouter une hypothèse
        </button>
      </div>

      <div style={cardStyle}>
        <p style={sectionTitleStyle}>Conclusion diagnostique</p>
        <DictableTextarea value={state.conclusionDx} onChange={e => onChange({ ...state, conclusionDx: e.target.value })} rows={4} textareaStyle={{ ...inputStyle, resize: 'vertical' }} placeholder="Synthèse argumentée du diagnostic physiothérapique retenu…" />
      </div>
    </div>
  )
}

// ─── Step 9 — Plan de traitement ───────────────────────────────────────────
export function StepPlanTraitement({
  oedemeTypes,
  state, onChange,
}: {
  oedemeTypes: OedemeType[]
  state: DlmPlanTraitement
  onChange: (patch: Partial<DlmPlanTraitement>) => void
}) {
  const has = (t: OedemeType) => oedemeTypes.includes(t)

  const togglePhase1 = (k: keyof DlmPlanTraitement['phase1Composantes']) => {
    onChange({ phase1Composantes: { ...state.phase1Composantes, [k]: !state.phase1Composantes[k] } })
  }
  const togglePhase2 = (k: keyof DlmPlanTraitement['phase2Composantes']) => {
    onChange({ phase2Composantes: { ...state.phase2Composantes, [k]: !state.phase2Composantes[k] } })
  }
  const toggleLipo = (k: 'nutritionConseil' | 'activitePhysique' | 'psyAccompagnement') => {
    onChange({ lipoSpecifique: { ...state.lipoSpecifique, [k]: !state.lipoSpecifique[k] } })
  }

  const phase1Labels: Record<keyof DlmPlanTraitement['phase1Composantes'], string> = {
    dlm: 'Drainage lymphatique manuel (DLM)',
    bandesPeu: 'Bandages peu élastiques multicouches',
    soinsPeau: 'Soins de peau / hygiène',
    exercicesDecongestifs: 'Exercices décongestifs (mobilisation)',
    education: 'Éducation thérapeutique',
    pressotherapie: 'Pressothérapie',
    bandagesNuit: 'Bandages de nuit',
  }
  const phase2Labels: Record<keyof DlmPlanTraitement['phase2Composantes'], string> = {
    contention: 'Contention élastique sur mesure',
    autoDLM: 'Auto-drainage',
    exercices: 'Programme d\'exercices à domicile',
    suivi: 'Suivi planifié',
    autobandage: 'Auto-bandage occasionnel',
  }

  return (
    <div>
      <div style={cardStyle}>
        <p style={sectionTitleStyle}>Phase 1 — Décongestion intensive (Complex Decongestive Therapy)</p>
        <OuiNon label="Phase 1 indiquée" value={state.phase1Active} onChange={v => onChange({ phase1Active: v as DlmPlanTraitement['phase1Active'] })} />
        {state.phase1Active === 'oui' && (
          <>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 8 }}>
              <div>
                <label style={lblStyle}>Fréquence hebdomadaire</label>
                <DictableInput value={state.phase1FrequenceHebdo} onChange={e => onChange({ phase1FrequenceHebdo: e.target.value })} placeholder="ex: 5 séances/sem" inputStyle={inputStyle} />
              </div>
              <div>
                <label style={lblStyle}>Durée prévue</label>
                <DictableInput value={state.phase1Duree} onChange={e => onChange({ phase1Duree: e.target.value })} placeholder="ex: 4 semaines" inputStyle={inputStyle} />
              </div>
            </div>
            <p style={subTitleStyle}>Composantes</p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 6, marginBottom: 10 }}>
              {(Object.keys(phase1Labels) as (keyof DlmPlanTraitement['phase1Composantes'])[]).map(k => (
                <CheckCard key={k} label={phase1Labels[k]} checked={state.phase1Composantes[k]} onToggle={() => togglePhase1(k)} />
              ))}
            </div>
            <label style={lblStyle}>Objectifs SMART de la phase 1</label>
            <DictableTextarea value={state.phase1Objectifs} onChange={e => onChange({ phase1Objectifs: e.target.value })} rows={3} textareaStyle={{ ...inputStyle, resize: 'vertical' }} placeholder="ex: Réduire le volume MID de 15 % en 4 semaines / Stemmer négatif / EVA <= 2…" />
          </>
        )}
      </div>

      <div style={cardStyle}>
        <p style={sectionTitleStyle}>Phase 2 — Entretien & autonomisation</p>
        <OuiNon label="Phase 2 envisagée" value={state.phase2Active} onChange={v => onChange({ phase2Active: v as DlmPlanTraitement['phase2Active'] })} />
        {state.phase2Active === 'oui' && (
          <>
            <p style={subTitleStyle}>Composantes</p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 6, marginBottom: 10 }}>
              {(Object.keys(phase2Labels) as (keyof DlmPlanTraitement['phase2Composantes'])[]).map(k => (
                <CheckCard key={k} label={phase2Labels[k]} checked={state.phase2Composantes[k]} onToggle={() => togglePhase2(k)} />
              ))}
            </div>
            <label style={lblStyle}>Fréquence du suivi</label>
            <DictableInput value={state.phase2FrequenceSuivi} onChange={e => onChange({ phase2FrequenceSuivi: e.target.value })} placeholder="ex: 1×/mois pendant 6 mois" inputStyle={inputStyle} />
            <label style={lblStyle}>Objectifs SMART de la phase 2</label>
            <DictableTextarea value={state.phase2Objectifs} onChange={e => onChange({ phase2Objectifs: e.target.value })} rows={3} textareaStyle={{ ...inputStyle, resize: 'vertical' }} placeholder="ex: Maintien du volume sous contention 24h/24, autonomie sur l'auto-drainage…" />
          </>
        )}
      </div>

      {has('lipoedeme') && (
        <div style={{ ...cardStyle, background: OEDEME_COLORS.lipoedeme.bg, borderColor: OEDEME_COLORS.lipoedeme.border }}>
          <p style={{ ...sectionTitleStyle, color: OEDEME_COLORS.lipoedeme.fg }}>Spécifique — Lipœdème</p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 6, marginBottom: 10 }}>
            <CheckCard label="Conseil nutritionnel anti-inflammatoire" checked={state.lipoSpecifique.nutritionConseil} onToggle={() => toggleLipo('nutritionConseil')} />
            <CheckCard label="Programme d'activité physique adaptée" checked={state.lipoSpecifique.activitePhysique} onToggle={() => toggleLipo('activitePhysique')} />
            <CheckCard label="Accompagnement psychologique" checked={state.lipoSpecifique.psyAccompagnement} onToggle={() => toggleLipo('psyAccompagnement')} />
          </div>
          <label style={lblStyle}>Liposuccion lymph-épargnante</label>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {([['oui','Indiquée'],['non','Non indiquée'],['a_discuter','À discuter']] as const).map(([v, lbl]) => (
              <button key={v} type="button" className={`choix-btn${state.lipoSpecifique.chirurgieLiposuccionEnvisagee === v ? ' active' : ''}`}
                onClick={() => onChange({ lipoSpecifique: { ...state.lipoSpecifique, chirurgieLiposuccionEnvisagee: state.lipoSpecifique.chirurgieLiposuccionEnvisagee === v ? '' : v } })}>{lbl}</button>
            ))}
          </div>
        </div>
      )}

      {has('phleboedeme') && (
        <div style={{ ...cardStyle, background: OEDEME_COLORS.phleboedeme.bg, borderColor: OEDEME_COLORS.phleboedeme.border }}>
          <p style={{ ...sectionTitleStyle, color: OEDEME_COLORS.phleboedeme.fg }}>Spécifique — Phlébœdème</p>
          <label style={lblStyle}>Classe de contention médicale recommandée</label>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 8 }}>
            {(['1','2','3','4'] as const).map(d => (
              <button key={d} type="button" className={`choix-btn${state.phleboSpecifique.contentionMedicaleDegre === d ? ' active' : ''}`}
                onClick={() => onChange({ phleboSpecifique: { ...state.phleboSpecifique, contentionMedicaleDegre: state.phleboSpecifique.contentionMedicaleDegre === d ? '' : d } })}>{`Classe ${d}`}</button>
            ))}
          </div>
          <OuiNon label="Avis angiologique demandé" value={state.phleboSpecifique.avisAngiologique} onChange={v => onChange({ phleboSpecifique: { ...state.phleboSpecifique, avisAngiologique: v as 'oui' | 'non' | '' } })} />
          <CheckCard label="Élévation déclive ≥ 30 min/jour" checked={state.phleboSpecifique.elevation} onToggle={() => onChange({ phleboSpecifique: { ...state.phleboSpecifique, elevation: !state.phleboSpecifique.elevation } })} />
          <CheckCard label="Mobilisation active de la pompe veineuse" checked={state.phleboSpecifique.activeMobilisation} onToggle={() => onChange({ phleboSpecifique: { ...state.phleboSpecifique, activeMobilisation: !state.phleboSpecifique.activeMobilisation } })} />
        </div>
      )}

      <div style={cardStyle}>
        <p style={sectionTitleStyle}>Éducation thérapeutique & sécurité</p>
        <label style={lblStyle}>Items d'éducation / autosoins (un par ligne)</label>
        <DictableTextarea value={state.educationAutosoinsItems} onChange={e => onChange({ educationAutosoinsItems: e.target.value })} rows={5} textareaStyle={{ ...inputStyle, resize: 'vertical' }} placeholder="Hygiène cutanée quotidienne / Auto-bandage hebdomadaire / Repérage signes d'érysipèle / Port quotidien de la contention…" />
        <label style={lblStyle}>Signes d'alerte — consultation médicale immédiate</label>
        <DictableTextarea value={state.signesAlerte} onChange={e => onChange({ signesAlerte: e.target.value })} rows={3} textareaStyle={{ ...inputStyle, resize: 'vertical' }} placeholder="Fièvre, douleur intense, rougeur extensive, plaie qui ne cicatrise pas, augmentation rapide du volume…" />
        <label style={lblStyle}>Date de la prochaine consultation</label>
        <DictableInput value={state.prochaineConsultation} onChange={e => onChange({ prochaineConsultation: e.target.value })} placeholder="JJ/MM/AAAA" inputStyle={inputStyle} />
        <label style={lblStyle}>Notes complémentaires sur le plan</label>
        <DictableTextarea value={state.notesPlan} onChange={e => onChange({ notesPlan: e.target.value })} rows={3} textareaStyle={{ ...inputStyle, resize: 'vertical' }} placeholder="Coordination avec autres professionnels, contraintes du patient, plan B…" />
      </div>
    </div>
  )
}

function CheckCard({ label, checked, onToggle }: { label: string; checked: boolean; onToggle: () => void }) {
  return (
    <button type="button" onClick={onToggle}
      style={{
        display: 'flex', alignItems: 'center', gap: 8, padding: '8px 10px', borderRadius: 8,
        border: checked ? '1.5px solid var(--primary)' : '1.5px solid var(--border-color)',
        background: checked ? 'rgba(124,58,237,0.10)' : 'var(--input-bg)',
        color: checked ? 'var(--primary)' : 'var(--text-main)',
        fontSize: '0.78rem', fontWeight: 500, cursor: 'pointer', textAlign: 'left',
      }}>
      <span style={{
        width: 16, height: 16, borderRadius: 4, border: '1.5px solid currentColor',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        flexShrink: 0,
      }}>
        {checked && (
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
        )}
      </span>
      <span style={{ flex: 1, lineHeight: 1.3 }}>{label}</span>
    </button>
  )
}

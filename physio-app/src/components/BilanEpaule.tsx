import { useState, forwardRef, useImperativeHandle } from 'react';
import type { ReactNode } from 'react';
import { useSpeechRecognition } from '../hooks/useSpeechRecognition';

export type BilanEpauleHandle = { getData: () => Record<string, any> };
type OuiNon = boolean | null;

export const BilanEpaule = forwardRef<BilanEpauleHandle>((_, ref) => {
  const { activeField, toggleListening } = useSpeechRecognition();

  // ── Douleur ──
  const [debutSymptomes, setDebutSymptomes]           = useState('');
  const [facteurDeclenchant, setFacteurDeclenchant]   = useState('');
  const [localisationInitiale, setLocalisationInitiale] = useState('');
  const [localisationActuelle, setLocalisationActuelle] = useState('');
  const [evnPire, setEvnPire]   = useState(5);
  const [evnMieux, setEvnMieux] = useState(2);
  const [evnMoy, setEvnMoy]     = useState(4);
  const [douleurType, setDouleurType]   = useState<'constante' | 'intermittente' | ''>('');
  const [situation, setSituation]       = useState<'ameliore' | 'stationnaire' | 'degrade' | ''>('');
  const [douleurNocturne, setDouleurNocturne]         = useState<OuiNon>(null);
  const [douleurNocturneType, setDouleurNocturneType] = useState<'mouvement' | 'sans_bouger' | ''>('');
  const [insomniante, setInsomniante]                 = useState<OuiNon>(null);
  const [derouillageMatinal, setDerouillageMatinal]   = useState<OuiNon>(null);
  const [derouillageTemps, setDerouillageTemps]       = useState('');
  const [mouvementsEmpirent, setMouvementsEmpirent]   = useState('');
  const [mouvementsSoulagent, setMouvementsSoulagent] = useState('');

  // ── Red Flags ──
  const [tttMedical, setTttMedical]       = useState('');
  const [antecedents, setAntecedents]     = useState('');
  const [comorbidites, setComorbidites]   = useState('');
  const [sommeilQuantite, setSommeilQuantite] = useState('');
  const [sommeilQualite, setSommeilQualite]   = useState('');
  const [cinqD3N, setCinqD3N]             = useState('');
  const [imageries, setImageries]         = useState('');
  const [tabagisme, setTabagisme]               = useState<OuiNon>(null);
  const [traumatismeRecent, setTraumatismeRecent] = useState<OuiNon>(null);
  const [troublesMotricite, setTroublesMotricite] = useState<OuiNon>(null);
  const [troublesMarche, setTroublesMarche]       = useState<OuiNon>(null);
  const [perteAppetit, setPerteAppetit]           = useState<OuiNon>(null);
  const [pertePoids, setPertePoids]               = useState<OuiNon>(null);
  const [atcdCancer, setAtcdCancer]               = useState<OuiNon>(null);
  const [cephalees, setCephalees]                 = useState<OuiNon>(null);
  const [cephaleesIntenses, setCephaleesIntenses] = useState<OuiNon>(null);
  const [fievre, setFievre]                       = useState<OuiNon>(null);
  const [csIs, setCsIs]                           = useState<OuiNon>(null);
  const [douleurThoracique, setDouleurThoracique] = useState<OuiNon>(null);
  const [douleurDigestion, setDouleurDigestion]   = useState<OuiNon>(null);
  const [fatigueRF, setFatigueRF]                 = useState<OuiNon>(null);

  // ── Yellow Flags ──
  const [croyancesOrigine, setCroyancesOrigine]           = useState('');
  const [croyancesTtt, setCroyancesTtt]                   = useState('');
  const [attentes, setAttentes]                           = useState('');
  const [autoEfficacite, setAutoEfficacite]               = useState<'faible' | 'moyen' | 'fort' | ''>('');
  const [catastrophisme, setCatastrophisme]               = useState<OuiNon>(null);
  const [peurEvitement, setPeurEvitement]                 = useState<OuiNon>(null);
  const [peurEvitementMouvements, setPeurEvitementMouvements] = useState('');
  const [strategieCoping, setStrategieCoping]             = useState('');
  const [hypervigilance, setHypervigilance]               = useState<OuiNon>(null);
  const [flexibilitePsy, setFlexibilitePsy]               = useState<'faible' | 'moyenne' | 'forte' | ''>('');
  const [anxiete, setAnxiete]                             = useState<OuiNon>(null);
  const [depression, setDepression]                       = useState<OuiNon>(null);

  // ── Blue / Black Flags ──
  const [enAt, setEnAt]                             = useState<OuiNon>(null);
  const [antecedentsAt, setAntecedentsAt]           = useState<OuiNon>(null);
  const [antecedentsAtDetails, setAntecedentsAtDetails] = useState('');
  const [stressNiveau, setStressNiveau]             = useState(0);
  const [travailExigeant, setTravailExigeant]       = useState<OuiNon>(null);
  const [sousEstime, setSousEstime]                 = useState<OuiNon>(null);
  const [manqueControle, setManqueControle]         = useState<OuiNon>(null);
  const [travailAggrave, setTravailAggrave]         = useState<OuiNon>(null);
  const [politiqueFlexible, setPolitiqueFlexible]   = useState<OuiNon>(null);
  const [difficultesAcces, setDifficultesAcces]     = useState<OuiNon>(null);
  const [conditionsSocioEco, setConditionsSocioEco] = useState<OuiNon>(null);
  const [litige, setLitige]                         = useState<OuiNon>(null);

  // ── Scores ──
  const [scoreOSS, setScoreOSS]                     = useState('');
  const [scoreConstant, setScoreConstant]           = useState('');
  const [scoreDASH, setScoreDASH]                   = useState('');
  const [scoreRowe, setScoreRowe]                   = useState('');
  const [psfs1, setPsfs1]                           = useState('');
  const [psfs2, setPsfs2]                           = useState('');
  const [psfs3, setPsfs3]                           = useState('');
  const [scoreHAD, setScoreHAD]                     = useState('');
  const [scoreDN4, setScoreDN4]                     = useState('');
  const [scoreSensibilisation, setScoreSensibilisation] = useState('');
  const [autresScores, setAutresScores]             = useState('');

  // ── Contrat Kiné ──
  const [objectifsSMART, setObjectifsSMART]   = useState('');
  const [autoReeducation, setAutoReeducation] = useState<OuiNon>(null);
  const [frequenceDuree, setFrequenceDuree]   = useState('');

  useImperativeHandle(ref, () => ({
    getData: () => ({
      douleur: { debutSymptomes, facteurDeclenchant, localisationInitiale, localisationActuelle, evnPire, evnMieux, evnMoy, douleurType, situation, douleurNocturne, douleurNocturneType, insomniante, derouillageMatinal, derouillageTemps, mouvementsEmpirent, mouvementsSoulagent },
      redFlags: { tttMedical, antecedents, comorbidites, sommeilQuantite, sommeilQualite, cinqD3N, imageries, tabagisme, traumatismeRecent, troublesMotricite, troublesMarche, perteAppetit, pertePoids, atcdCancer, cephalees, cephaleesIntenses, fievre, csIs, douleurThoracique, douleurDigestion, fatigueRF },
      yellowFlags: { croyancesOrigine, croyancesTtt, attentes, autoEfficacite, catastrophisme, peurEvitement, peurEvitementMouvements, strategieCoping, hypervigilance, flexibilitePsy, anxiete, depression },
      blueBlackFlags: { enAt, antecedentsAt, antecedentsAtDetails, stressNiveau, travailExigeant, sousEstime, manqueControle, travailAggrave, politiqueFlexible, difficultesAcces, conditionsSocioEco, litige },
      scores: { scoreOSS, scoreConstant, scoreDASH, scoreRowe, psfs1, psfs2, psfs3, scoreHAD, scoreDN4, scoreSensibilisation, autresScores },
      contratKine: { objectifsSMART, autoReeducation, frequenceDuree },
    })
  }));

  // ─── Helpers ───────────────────────────────────────────────────────────────

  const micBtn = (key: string, val: string, setter: (v: string) => void) => (
    <button
      className={`mic-btn-inline ${activeField === key ? 'recording' : ''}`}
      onClick={() => toggleListening(key, t => setter(val ? `${val} ${t}` : t))}
      aria-label="Dictée vocale"
    >
      {activeField !== key && (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="9" y="2" width="6" height="11" rx="3"/>
          <path d="M5 10a7 7 0 0 0 14 0"/>
          <line x1="12" y1="19" x2="12" y2="22"/>
          <line x1="8" y1="22" x2="16" y2="22"/>
        </svg>
      )}
    </button>
  );

  const textField = (label: string, key: string, val: string, setter: (v: string) => void, ph = '', textarea = false) => (
    <div className="form-group">
      <label>{label}</label>
      <div className="input-with-mic">
        {textarea
          ? <textarea className="input-luxe" placeholder={ph} rows={2} value={val} onChange={e => setter(e.target.value)} />
          : <input type="text" className="input-luxe" placeholder={ph} value={val} onChange={e => setter(e.target.value)} />
        }
        {micBtn(key, val, setter)}
      </div>
    </div>
  );

  const ouiNon = (label: string, val: OuiNon, setter: (v: boolean) => void) => (
    <div className="oui-non-group">
      <span className="oui-non-label">{label}</span>
      <div className="oui-non-btns">
        <button className={`oui-non-btn${val === true ? ' active' : ''}`} onClick={() => setter(true)}>Oui</button>
        <button className={`oui-non-btn${val === false ? ' active' : ''}`} onClick={() => setter(false)}>Non</button>
      </div>
    </div>
  );

  const choix = (label: string, opts: { l: string; v: string }[], val: string, setter: (v: any) => void) => (
    <div className="form-group">
      {label && <label>{label}</label>}
      <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
        {opts.map(o => (
          <button key={o.v} onClick={() => setter(o.v)} className={`choix-btn${val === o.v ? ' active' : ''}`}>
            {o.l}
          </button>
        ))}
      </div>
    </div>
  );

  const evn = (label: string, val: number, setter: (v: number) => void) => (
    <div className="form-group">
      <label>{label} : <strong style={{ color: 'var(--danger)', fontSize: '1.2rem' }}>{val}</strong></label>
      <input type="range" min="0" max="10" value={val} onChange={e => setter(Number(e.target.value))} style={{ width: '100%', accentColor: 'var(--danger)' }} />
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
        <span>0 – Aucune</span><span>10 – Extrême</span>
      </div>
    </div>
  );

  const sectionHeader = (title: string, color: string) => (
    <div className="bilan-section-header" style={{ borderLeftColor: color }}>
      <h3 style={{ color, margin: 0 }}>{title}</h3>
    </div>
  );

  const card = (children: ReactNode) => (
    <div className="bilan-card">{children}</div>
  );

  // ─── Render ────────────────────────────────────────────────────────────────
  return (
    <div>

      {/* ════ DOULEUR ════ */}
      {sectionHeader('Douleur', 'var(--danger)')}

      {textField('Début des symptômes', 'debut', debutSymptomes, setDebutSymptomes, 'Date / circonstances...')}
      {textField('Facteur déclenchant (ou aucun)', 'facteur', facteurDeclenchant, setFacteurDeclenchant, 'Chute, effort, progressif...')}
      {textField('Localisation des symptômes initiaux', 'locInit', localisationInitiale, setLocalisationInitiale, 'Zone concernée au départ...')}
      {textField('Localisation des symptômes actuels', 'locActu', localisationActuelle, setLocalisationActuelle, 'Zone actuelle...')}

      {card(<>
        {evn('EVN — PIRE', evnPire, setEvnPire)}
        {evn('EVN — MIEUX', evnMieux, setEvnMieux)}
        {evn('EVN — MOY', evnMoy, setEvnMoy)}
      </>)}

      {choix('Type de douleur', [{ l: 'Constante', v: 'constante' }, { l: 'Intermittente', v: 'intermittente' }], douleurType, setDouleurType)}
      {choix('Situation', [{ l: "↑ S'améliore", v: 'ameliore' }, { l: '→ Stationnaire', v: 'stationnaire' }, { l: '↓ Se dégrade', v: 'degrade' }], situation, setSituation)}

      {card(<>
        {ouiNon('Douleur nocturne', douleurNocturne, setDouleurNocturne)}
        {douleurNocturne && <>
          {choix('', [{ l: 'Au mouvement', v: 'mouvement' }, { l: 'Sans bouger', v: 'sans_bouger' }], douleurNocturneType, setDouleurNocturneType)}
          {ouiNon('Insomniante', insomniante, setInsomniante)}
        </>}
        {ouiNon('Dérouillage matinal', derouillageMatinal, setDerouillageMatinal)}
        {derouillageMatinal && textField('Durée du dérouillage', 'derouillTemps', derouillageTemps, setDerouillageTemps, 'Ex: 15 min...')}
      </>)}

      {textField('Mouvements / situations qui EMPIRENT', 'empirent', mouvementsEmpirent, setMouvementsEmpirent, 'Élévation, rotation...', true)}
      {textField('Mouvements / situations qui SOULAGENT', 'soulagent', mouvementsSoulagent, setMouvementsSoulagent, 'Repos, chaleur...', true)}


      {/* ════ RED FLAGS ════ */}
      {sectionHeader('Questions Spécifiques — Red Flags 🚩', '#dc2626')}

      {textField('TTT médical actuel', 'tttMedical', tttMedical, setTttMedical, 'Médicaments...')}
      {textField('Antécédents', 'antecedents', antecedents, setAntecedents, 'Chirurgies, pathologies...', true)}
      {textField('Comorbidités', 'comorbidites', comorbidites, setComorbidites, 'Diabète, HTA...')}

      {card(<>
        <label style={{ fontWeight: 600, color: 'var(--primary-dark)', marginBottom: '0.5rem', display: 'block' }}>Sommeil</label>
        {textField('Quantité', 'sommeilQ', sommeilQuantite, setSommeilQuantite, 'Nb heures...')}
        {textField('Qualité', 'sommeilQual', sommeilQualite, setSommeilQualite, 'Perturbé, bon...')}
      </>)}

      {textField('5D 3N', 'cinqD3N', cinqD3N, setCinqD3N, 'Dizziness, Drop attacks, Diplopie, Dysarthrie, Dysphagie, Nystagmus, Nausée, Numbness...')}
      {textField('Imagerie(s)', 'imageries', imageries, setImageries, 'Radio, IRM, écho...')}

      {card(<>
        {ouiNon('Tabagisme', tabagisme, setTabagisme)}
        {ouiNon('Traumatisme récent', traumatismeRecent, setTraumatismeRecent)}
        {ouiNon('Troubles motricité MS', troublesMotricite, setTroublesMotricite)}
        {ouiNon('Troubles de la marche', troublesMarche, setTroublesMarche)}
        {ouiNon("Perte d'appétit", perteAppetit, setPerteAppetit)}
        {ouiNon('Perte de poids inexpliquée', pertePoids, setPertePoids)}
        {ouiNon('ATCD de cancer', atcdCancer, setAtcdCancer)}
        {ouiNon('Céphalées', cephalees, setCephalees)}
        {cephalees && ouiNon("Plus intenses que d'habitude", cephaleesIntenses, setCephaleesIntenses)}
        {ouiNon('Fièvre', fievre, setFievre)}
        {ouiNon('Utilisation prolongée CS / IS', csIs, setCsIs)}
        {ouiNon('Douleur thoracique associée', douleurThoracique, setDouleurThoracique)}
        {ouiNon('Douleur aggravée par la digestion', douleurDigestion, setDouleurDigestion)}
        {ouiNon('Fatigue inexpliquée - inhabituelle', fatigueRF, setFatigueRF)}
      </>)}


      {/* ════ YELLOW FLAGS ════ */}
      {sectionHeader('Yellow Flags 🟡', '#f59e0b')}

      <div className="form-group">
        <label style={{ fontWeight: 600, color: 'var(--primary-dark)' }}>Croyances</label>
        {textField("Origine de la douleur", 'croyOrigine', croyancesOrigine, setCroyancesOrigine, 'Ce que pense le patient...')}
        {textField("TTT qui serait adapté", 'croyTtt', croyancesTtt, setCroyancesTtt, 'Selon le patient...')}
      </div>

      {textField('Attentes', 'attentes', attentes, setAttentes, 'Objectifs du patient...', true)}
      {choix("Sentiment d'auto-efficacité à la douleur", [{ l: 'Faible', v: 'faible' }, { l: 'Moyen', v: 'moyen' }, { l: 'Fort', v: 'fort' }], autoEfficacite, setAutoEfficacite)}

      {card(<>
        {ouiNon('Catastrophisme', catastrophisme, setCatastrophisme)}
        {ouiNon('Croyance(s) de Peur - Évitement', peurEvitement, setPeurEvitement)}
        {peurEvitement && textField('Quel(s) mouvement(s)', 'peurMvt', peurEvitementMouvements, setPeurEvitementMouvements, 'Mouvements évités...')}
        {ouiNon('Hypervigilance', hypervigilance, setHypervigilance)}
        {ouiNon('Anxiété', anxiete, setAnxiete)}
        {ouiNon('Dépression', depression, setDepression)}
      </>)}

      {textField('Stratégie(s) de Coping actuelle(s)', 'coping', strategieCoping, setStrategieCoping, 'Repos, chaleur, médicaments...', true)}
      {choix('Flexibilité psychologique', [{ l: 'Faible', v: 'faible' }, { l: 'Moyenne', v: 'moyenne' }, { l: 'Forte', v: 'forte' }], flexibilitePsy, setFlexibilitePsy)}


      {/* ════ BLUE / BLACK FLAGS ════ */}
      {sectionHeader('Blue Flags & Black Flags', '#3b82f6')}

      {card(<>
        {ouiNon('Actuellement en AT', enAt, setEnAt)}
        {ouiNon("Antécédents d'AT", antecedentsAt, setAntecedentsAt)}
        {antecedentsAt && textField('Nombre / Motifs', 'atDetails', antecedentsAtDetails, setAntecedentsAtDetails, 'Nombre et raisons...')}
        {ouiNon('Travail physiquement exigeant et/ou dangereux', travailExigeant, setTravailExigeant)}
        {ouiNon("Sentiment d'être sous-estimé(e) ou mal soutenu(e)", sousEstime, setSousEstime)}
        {ouiNon('Manque de contrôle sur ses tâches', manqueControle, setManqueControle)}
        {ouiNon('Croyance que le travail aggrave la douleur', travailAggrave, setTravailAggrave)}
        {ouiNon("Politique d'entreprise flexible pour reprise", politiqueFlexible, setPolitiqueFlexible)}
        {ouiNon("Difficulté d'accès aux soins", difficultesAcces, setDifficultesAcces)}
        {ouiNon('Conditions socio-économiques défavorables', conditionsSocioEco, setConditionsSocioEco)}
        {ouiNon('Litige et/ou conflit liés aux indemnisations', litige, setLitige)}
      </>)}

      <div className="form-group">
        <label>Niveau de stress au travail (0–100) : <strong style={{ color: 'var(--danger)' }}>{stressNiveau}</strong></label>
        <input type="range" min="0" max="100" value={stressNiveau} onChange={e => setStressNiveau(Number(e.target.value))} style={{ width: '100%', accentColor: 'var(--primary)' }} />
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
          <span>0</span><span>100</span>
        </div>
      </div>


      {/* ════ SCORES ════ */}
      {sectionHeader('Scores', '#059669')}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.5rem' }}>
        {([
          ["Score d'Oxford Épaule (OSS)", scoreOSS, setScoreOSS],
          ['Constant-Murley', scoreConstant, setScoreConstant],
          ['DASH', scoreDASH, setScoreDASH],
          ['Rowe score', scoreRowe, setScoreRowe],
          ['Échelle HAD', scoreHAD, setScoreHAD],
          ['DN4', scoreDN4, setScoreDN4],
          ['Sensibilisation Centrale', scoreSensibilisation, setScoreSensibilisation],
        ] as [string, string, (v: string) => void][]).map(([lbl, val, setter]) => (
          <div key={lbl} className="form-group" style={{ margin: 0 }}>
            <label style={{ fontSize: '0.82rem' }}>{lbl}</label>
            <input type="text" className="input-luxe" placeholder="—" value={val} onChange={e => setter(e.target.value)} style={{ padding: '0.65rem 0.9rem' }} />
          </div>
        ))}
      </div>

      <div className="form-group">
        <label>Patient Specific Functional Scale (PSFS)</label>
        {textField('Activité 1', 'psfs1', psfs1, setPsfs1, 'Activité + score...')}
        {textField('Activité 2', 'psfs2', psfs2, setPsfs2, 'Activité + score...')}
        {textField('Activité 3', 'psfs3', psfs3, setPsfs3, 'Activité + score...')}
      </div>

      {textField("Autre(s) Score(s)", 'autresScores', autresScores, setAutresScores, 'Nom et score...', true)}


      {/* ════ CONTRAT KINÉ ════ */}
      {sectionHeader('Contrat Kiné 🤝', 'var(--primary)')}

      {textField('Objectif(s) SMART', 'objectifsSMART', objectifsSMART, setObjectifsSMART, 'Spécifique, Mesurable, Atteignable, Réaliste, Temporel...', true)}

      {card(<>
        {ouiNon("S'engage à faire l'auto-rééducation", autoReeducation, setAutoReeducation)}
        {autoReeducation && textField('Fréquence / Durée', 'freqDuree', frequenceDuree, setFrequenceDuree, 'Ex: 3x/semaine, 20 min...')}
      </>)}

    </div>
  );
});

import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';

// ── Label maps for BilanEpaule fields ──────────────────────────────────────
const BILAN_SECTIONS: { title: string; key: string; labels: Record<string, string> }[] = [
  {
    title: 'Douleur',
    key: 'douleur',
    labels: {
      debutSymptomes:       'Début des symptômes',
      facteurDeclenchant:   'Facteur déclenchant',
      localisationInitiale: 'Localisation initiale',
      localisationActuelle: 'Localisation actuelle',
      evnPire:              'EVN — Pire',
      evnMieux:             'EVN — Mieux',
      evnMoy:               'EVN — Moyenne',
      douleurType:          'Type de douleur',
      situation:            'Évolution',
      douleurNocturne:      'Douleur nocturne',
      douleurNocturneType:  'Douleur nocturne — type',
      insomniante:          'Insomniante',
      derouillageMatinal:   'Dérouillage matinal',
      derouillageTemps:     'Durée du dérouillage',
      mouvementsEmpirent:   'Mouvements qui empirent',
      mouvementsSoulagent:  'Mouvements qui soulagent',
    },
  },
  {
    title: 'Red Flags',
    key: 'redFlags',
    labels: {
      tttMedical:        'TTT médical actuel',
      antecedents:       'Antécédents',
      comorbidites:      'Comorbidités',
      sommeilQuantite:   'Sommeil — quantité',
      sommeilQualite:    'Sommeil — qualité',
      cinqD3N:           '5D 3N',
      imageries:         'Imagerie(s)',
      tabagisme:         'Tabagisme',
      traumatismeRecent: 'Traumatisme récent',
      troublesMotricite: 'Troubles motricité MS',
      troublesMarche:    'Troubles de la marche',
      perteAppetit:      "Perte d'appétit",
      pertePoids:        'Perte de poids inexpliquée',
      atcdCancer:        'ATCD de cancer',
      cephalees:         'Céphalées',
      cephaleesIntenses: "Céphalées plus intenses qu'habitude",
      fievre:            'Fièvre',
      csIs:              'Utilisation prolongée CS/IS',
      douleurThoracique: 'Douleur thoracique associée',
      douleurDigestion:  'Douleur aggravée par la digestion',
      fatigueRF:         'Fatigue inexpliquée/inhabituelle',
    },
  },
  {
    title: 'Yellow Flags',
    key: 'yellowFlags',
    labels: {
      croyancesOrigine:        'Croyances — origine de la douleur',
      croyancesTtt:            'Croyances — TTT adapté',
      attentes:                'Attentes du patient',
      autoEfficacite:          "Auto-efficacité face à la douleur",
      catastrophisme:          'Catastrophisme',
      peurEvitement:           'Peur — évitement',
      peurEvitementMouvements: 'Mouvements évités',
      strategieCoping:         'Stratégie(s) de coping',
      hypervigilance:          'Hypervigilance',
      flexibilitePsy:          'Flexibilité psychologique',
      anxiete:                 'Anxiété',
      depression:              'Dépression',
    },
  },
  {
    title: 'Blue Flags & Black Flags',
    key: 'blueBlackFlags',
    labels: {
      enAt:                "En arrêt de travail (AT)",
      antecedentsAt:       "Antécédents d'AT",
      antecedentsAtDetails:"AT — nombre / motifs",
      stressNiveau:        'Niveau de stress au travail (/100)',
      travailExigeant:     'Travail physiquement exigeant',
      sousEstime:          "Sentiment d'être sous-estimé(e)",
      manqueControle:      "Manque de contrôle sur les tâches",
      travailAggrave:      'Croyance que le travail aggrave',
      politiqueFlexible:   "Politique d'entreprise flexible",
      difficultesAcces:    "Difficulté d'accès aux soins",
      conditionsSocioEco:  'Conditions socio-économiques défavorables',
      litige:              'Litige / conflit lié aux indemnisations',
    },
  },
  {
    title: 'Scores',
    key: 'scores',
    labels: {
      scoreOSS:           "Score d'Oxford Épaule (OSS)",
      scoreConstant:      'Constant-Murley',
      scoreDASH:          'DASH',
      scoreRowe:          'Rowe score',
      psfs1:              'PSFS — Activité 1',
      psfs2:              'PSFS — Activité 2',
      psfs3:              'PSFS — Activité 3',
      scoreHAD:           'Échelle HAD',
      scoreDN4:           'DN4',
      scoreSensibilisation:'Sensibilisation Centrale',
      autresScores:       'Autre(s) score(s)',
    },
  },
  {
    title: 'Contrat Kiné',
    key: 'contratKine',
    labels: {
      objectifsSMART: 'Objectif(s) SMART',
      autoReeducation: 'Engagement auto-rééducation',
      frequenceDuree:  'Fréquence / Durée',
    },
  },
];

// Returns a display string for a field value, or null if the field should be skipped.
const displayValue = (key: string, val: unknown): string | null => {
  if (val === null || val === undefined) return null;
  if (typeof val === 'boolean') return val ? 'Oui' : 'Non';
  if (typeof val === 'string') return val.trim() !== '' ? val.trim() : null;
  if (typeof val === 'number') {
    // EVN sliders (evnPire / evnMieux / evnMoy) — always meaningful
    if (key.startsWith('evn') || key.startsWith('score')) return String(val);
    // stressNiveau: skip if 0 (default / untouched)
    if (key === 'stressNiveau') return val > 0 ? `${val} / 100` : null;
    return String(val);
  }
  return null;
};

export type ImprovementEntry = { num: number; date: string; evn: number | null; delta: number | null };

export const generatePDF = async (
  patientId: any,
  generalInfo: any,
  zoneData: any,
  bilanZoneData?: { sectionTitle: string; data: Record<string, any> } | null,
  improvementData?: { generalScore: number | null; bilans: ImprovementEntry[] } | null,
  analyseIA?: { diagnostic: { titre: string; description: string }; hypotheses: Array<{ rang: number; titre: string; probabilite: number; justification: string }>; priseEnCharge: Array<{ phase: string; titre: string; detail: string }>; alertes: string[] } | null,
  notesLibres?: string
) => {
  const doc = new jsPDF();
  let y = 20;

  const addLine = (text: string, isBold = false, size = 12, indent = 0) => {
    if (y > 280) {
      doc.addPage();
      y = 20;
    }
    doc.setFontSize(size);
    doc.setFont("helvetica", isBold ? "bold" : "normal");
    const splitText = doc.splitTextToSize(text, 170 - indent);
    doc.text(splitText, 20 + indent, y);
    y += (7 * splitText.length);
  };

  const addSectionTitle = (title: string) => {
    y += 5;
    addLine(title, true, 16);
    y += 2;
  };

  const addDataLine = (label: string, value: string) => {
    if (value && value.trim() !== '') {
      addLine(`${label} : ${value}`);
    }
  };

  // Format dates
  const today = new Date();
  const dateStrFileName = today.toISOString().split('T')[0];
  const dateStrDocument = today.toLocaleDateString('fr-FR');

  // Header
  addLine("BILAN DE PHYSIOTHÉRAPIE", true, 22);
  y += 2;
  addLine(`Date du rapport : ${dateStrDocument}`, false, 12);
  y += 6;

  // Identity
  addSectionTitle("1. Identité du Patient");
  addDataLine("Nom", patientId.nom);
  addDataLine("Prénom", patientId.prenom);
  addDataLine("Âge / Naissance", patientId.dateNaissance);

  // General Info
  const hasGenInfo = generalInfo.profession || generalInfo.sport || generalInfo.famille || generalInfo.chirurgie || generalInfo.notes;
  if (hasGenInfo) {
    addSectionTitle("2. Informations Générales");
    addDataLine("Profession", generalInfo.profession);
    addDataLine("Activité Physique", generalInfo.sport);
    addDataLine("Antécédents Familiaux", generalInfo.famille);
    addDataLine("Antécédents Chirurgicaux", generalInfo.chirurgie);
    addDataLine("Notes Complémentaires", generalInfo.notes);
  }

  // Visual Body Layout
  const savedZones = Object.keys(zoneData).filter(z => zoneData[z].saved);
  if (savedZones.length > 0) {
    addSectionTitle("3. Bilan Corporel Clinique");

    const renderAnatomyView = async (divId: string, zonesLabelArray: string[], viewLabel: string) => {
      const el = document.getElementById(divId);
      if (!el) return;

      const activeZonesInView = savedZones.filter(z => zonesLabelArray.some(p => z.includes(p)));
      if (activeZonesInView.length === 0) return;

      if (y > 220) { doc.addPage(); y = 20; }

      addLine(`► Cartographie : ${viewLabel}`, true, 14);
      y += 2;
      const initialY = y;

      const canvas = await html2canvas(el, { backgroundColor: null, scale: 2 });
      const imgData = canvas.toDataURL('image/png');
      doc.addImage(imgData, 'PNG', 20, y, 40, 76);

      let textY = y + 5;
      activeZonesInView.forEach(zone => {
        const data = zoneData[zone];
        const backupY = y;
        y = textY;
        addLine(`Zone: ${zone}`, true, 11, 50);
        addLine(`Intensité (0-10): ${data.intensite}`, false, 10, 52);
        if (data.type) addLine(`Type: ${data.type}`, false, 10, 52);
        if (data.fondDouloureux) addLine(`Fond Douloureux: Oui`, false, 10, 52);
        if (data.douleurNocturne) addLine(`Douleur Nocturne: Oui`, false, 10, 52);
        if (data.notes) addLine(`Notes: ${data.notes}`, false, 10, 52);
        y += 4;
        textY = y;
        y = backupY;
      });

      y = Math.max(initialY + 80, textY + 5);
    };

    const faceKeys = ['Face', 'Poitrine', 'Abdomen', 'Genou Droit', 'Tibia Droit', 'Pied Droit', 'Genou Gauche', 'Tibia Gauche', 'Pied Gauche'];
    const dosKeys = ['Dos', 'Lombaires', 'Fessiers', 'Ischio', 'Creux Poplité', 'Mollet', 'Talon'];

    await renderAnatomyView('pdf-face-svg', faceKeys, 'Vue de Face');
    await renderAnatomyView('pdf-dos-svg', dosKeys, 'Vue de Dos');

  } else {
    y += 5;
    addLine("Aucune zone douloureuse n'a été documentée.", false, 11);
  }

  // ── Scores d'amélioration ──────────────────────────────────────────────────
  if (improvementData && (improvementData.generalScore !== null || improvementData.bilans.length > 0)) {
    addSectionTitle(`${improvementData.generalScore !== null ? '4' : '4'}. Suivi & Scores d'amélioration`);

    if (improvementData.generalScore !== null) {
      const gs = improvementData.generalScore;
      addLine(`Score global d'amélioration : ${gs > 0 ? '+' : ''}${gs}%  (${gs > 0 ? 'Amélioration' : gs < 0 ? 'Régression' : 'Stationnaire'})`, true, 13);
      y += 2;
    }

    if (improvementData.bilans.length > 0) {
      addLine('Progression bilan par bilan :', true, 11);
      y += 1;
      improvementData.bilans.forEach(b => {
        const evnStr  = b.evn !== null ? `EVN ${b.evn}/10` : 'EVN —';
        const deltaStr = b.delta === null
          ? '(référence)'
          : b.delta > 0
            ? `+${b.delta}% amélioration`
            : b.delta < 0
              ? `${b.delta}% régression`
              : '= stationnaire';
        addLine(`  Bilan N°${b.num}  ${b.date}  —  ${evnStr}  —  ${deltaStr}`, false, 10, 4);
      });
    }
    y += 4;
  }

  // ── Bilan Zone (Épaule, Genou, etc.) — only filled fields ─────────────────
  if (bilanZoneData) {
    let sectionNumber = 4;
    addSectionTitle(`${sectionNumber}. Bilan Spécifique — ${bilanZoneData.sectionTitle}`);

    for (const section of BILAN_SECTIONS) {
      const sectionData = bilanZoneData.data[section.key];
      if (!sectionData) continue;

      // Collect only filled entries
      const entries: { label: string; value: string }[] = [];
      for (const [field, label] of Object.entries(section.labels)) {
        const raw = sectionData[field];
        const display = displayValue(field, raw);
        if (display !== null) entries.push({ label, value: display });
      }

      if (entries.length === 0) continue; // skip empty sections entirely

      // Sub-section header
      y += 3;
      addLine(`▸ ${section.title}`, true, 13);
      y += 1;
      for (const { label, value } of entries) {
        addDataLine(label, value);
      }
    }
  }

  // ── Notes cliniques complémentaires ───────────────────────────────────────
  if (notesLibres && notesLibres.trim()) {
    addSectionTitle('Notes Cliniques Complémentaires');
    addLine(notesLibres.trim(), false, 11);
    y += 4;
  }

  // ── Analyse IA section ──────────────────────────────────────────────────────
  if (analyseIA) {
    doc.addPage();
    y = 20;
    addSectionTitle('Analyse Clinique Assistée');
    addLine('A titre indicatif uniquement — ne remplace pas le jugement clinique du professionnel de sante.', false, 9);
    y += 4;

    addLine('Diagnostic principal', true, 13);
    addLine(analyseIA.diagnostic.titre, true, 11, 5);
    addLine(analyseIA.diagnostic.description, false, 10, 5);
    y += 3;

    addLine('Hypotheses cliniques', true, 13);
    for (const h of analyseIA.hypotheses) {
      addLine(`H${h.rang} — ${h.titre} (${h.probabilite}%)`, true, 10, 5);
      if (h.justification) addLine(h.justification, false, 9, 10);
    }
    y += 3;

    addLine('Prise en charge suggeree', true, 13);
    for (let i = 0; i < analyseIA.priseEnCharge.length; i++) {
      const p = analyseIA.priseEnCharge[i];
      addLine(`${i + 1}. ${p.phase} — ${p.titre}`, true, 10, 5);
      addLine(p.detail, false, 9, 10);
    }

    if (analyseIA.alertes.length > 0) {
      y += 3;
      addLine('Alertes cliniques', true, 13);
      for (const a of analyseIA.alertes) addLine(`• ${a}`, false, 10, 5);
    }

    y += 5;
    addLine('Cette analyse est fournie a titre indicatif et ne remplace pas le jugement clinique du professionnel de sante.', false, 8);
  }

  // Filename
  const safeName = (patientId.nom || 'Anonyme').replace(/\s+/g, '_');
  const safeFirst = (patientId.prenom || '').replace(/\s+/g, '_');
  const safeTitle = `Bilan_${safeName}_${safeFirst}_${dateStrFileName}`.replace(/_+/g, '_');

  doc.save(`${safeTitle}.pdf`);
};

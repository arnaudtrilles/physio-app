# Cartographie des fonctionnalités — Audit DM (MDR 2017/745, ODim CH)

**Application auditée** : Canode / physio-app-version-finale
**Stack** : React 19 + TypeScript + Vite, IndexedDB local-first, Supabase (backup synchronisé), proxies serverless Vercel `/api/claude` (Anthropic) et `/api/transcribe` (OpenAI Whisper)
**Périmètre** : web app à destination des kinésithérapeutes / physiothérapeutes (FR + CH)
**Auteur de l'audit** : assistant technique (collecte de faits — pas d'opinion juridique)
**Date de l'audit** : 2026-04-30
**Référentiel de qualification** : Règle 11 MDR 2017/745 + MDCG 2019-11 + arrêt CJUE C-329/16 (Snitem)

---

## 0. Note méthodologique

Ce document **liste des faits techniques** sur ce que fait chaque fonctionnalité, qui sont les entrées, qui sont les sorties, et où vit la transformation. Il ne tranche aucune question juridique — la classification 🟢 / 🟡 / 🔴 est une lecture **technique** au regard des critères usuels (donnée patient + finalité décisionnelle ou interprétative + sortie utilisable cliniquement). Les zones de doute sont marquées 🟡 et explicitées.

Légende :
- 🟢 = fonctionnalité qui paraît clairement hors-scope DM (administratif, restitution pure, sans interprétation clinique de la donnée patient)
- 🟡 = zone grise — la finalité ou l'output peut basculer le statut selon l'usage réel et l'interprétation juridique
- 🔴 = fonctionnalité qui présente, factuellement, les attributs typiques d'un logiciel à finalité médicale au sens de Règle 11 (donnée patient + sortie clinique exploitable pour un diagnostic, une prise en charge, ou une décision thérapeutique)

Conventions :
- Toutes les références de fichier sont absolues
- Les extraits de code sont délimités à 10-20 lignes maximum
- Les prompts LLM cités dans le rapport sont **bornés** au texte effectivement envoyé au modèle (pas la génération de UI autour)

---

## 1. Résumé exécutif

**Total fonctionnalités identifiées** : **20** (regroupées en 4 familles : saisie clinique, IA clinique, restitution PDF/courriers, infrastructure)

**Breakdown** :
- 🟢 **6** fonctionnalités a priori hors-scope DM
- 🟡 **4** zones grises (qualification dépendant de l'interprétation de la finalité)
- 🔴 **10** fonctionnalités qui présentent les attributs techniques typiques de Règle 11 MDR

**Top 3 drapeaux rouges (par ordre de criticité technique)** :

1. **Analyse IA du bilan initial** (`BilanAnalyseIA.tsx` + `buildClinicalPrompt` dans `clinicalPrompt.ts:178`) — produit **3 hypothèses diagnostiques classées avec probabilités numériques (somme = 100)** + **plan de traitement en 3 phases avec actions thérapeutiques concrètes** + **alertes cliniques** (red flags). Output JSON structuré directement réutilisé en UI puis exporté en PDF destiné au médecin prescripteur. Le prompt explicite le rôle « expert en musculo-squelettique » et impose un raisonnement diagnostique probabiliste.

2. **Mode vocal d'extraction structurée du bilan** (`voiceBilanClient.ts` — `extractBilanFromTranscription` ligne 317 + `generateNarrativeReport` ligne 347) — transcription audio Whisper → reformulation Haiku → **extraction d'un schéma clinique structuré** (EVN par axe, mobilités en degrés par mouvement, force MRC par muscle, résultats binaires positif/négatif sur tests cliniques nommés Lasègue/FADDIR/Hawkins/Lachman/etc., red/yellow/blue/black flags). La donnée extraite est ensuite utilisée comme entrée des analyses IA. Pipeline qui transforme une dictée orale en jeu de données cliniques exploitables.

3. **Génération de courriers cliniques au médecin prescripteur** (`LetterGenerator.tsx` + `letterPrompts.ts` + `letterZonePrompts.ts`) — 7 types de courriers (`fin_pec`, `demande_avis`, `demande_imagerie`, `demande_prescription`, `echec_pec`, etc.) générés par LLM à partir du dossier patient. Inclut explicitement **demande d'imagerie**, **demande de prescription**, **orientation vers un autre professionnel**, **constat d'échec / réorientation**. Confection par zone via Haiku puis génération du courrier complet via Sonnet. Sortie destinée à la décision médicale d'un tiers.

**Zones grises majeures** :
- **Fiche d'exercices à domicile IA** (`FicheExerciceIA.tsx`) — prescription d'exercices avec dosage et limites de sécurité, adressée directement « au patient (vous) »
- **Mini-analyse de note de séance** (`DatabasePage.tsx:1419`) — sortie inclut « vigilance », « focus », « conseil actionnable »
- **Rapport d'évolution IA** (`BilanEvolutionIA.tsx` + `buildEvolutionPrompt` ligne 393) — produit `tendance` qualitative (`amelioration | stationnaire | regression | mixte`) + recommandations cliniques destinées au médecin prescripteur
- **Note diagnostique intermédiaire** (`BilanNoteIntermediaire.tsx` + `buildIntermediairePrompt` ligne 722) — diagnostic mis à jour + prise en charge ajustée

---

## 2. Tableau récapitulatif

| # | Fonctionnalité | Famille | Fichiers principaux | Sortie principale | Classification |
|---|---|---|---|---|---|
| F1 | Authentification + profil praticien | Infra | `App.tsx` (Step `profile`, `identity`), `supabase` schema `practitioners` | Données praticien | 🟢 |
| F2 | Réglages app + clé API | Infra | `App.tsx` (Step `settings`) | Config locale | 🟢 |
| F3 | Synchronisation Supabase + RLS | Infra | `supabase/migrations/001_initial_schema.sql` | Backup chiffré | 🟢 |
| F4 | Saisie bilan initial structuré (9 zones) | Saisie | `bilans/BilanEpaule.tsx`, `BilanCheville.tsx`, `BilanGenou.tsx`, `BilanHanche.tsx`, `BilanCervical.tsx`, `BilanLombaire.tsx`, `BilanGenerique.tsx`, `BilanGeriatrique.tsx`, `BilanDrainageLymphatique.tsx` | Objet `bilanData` (JSON) | 🟢 |
| F5 | Saisie note de séance + dictée vocale | Saisie | `App.tsx` (Step `note_seance`), `VoiceMic`, `useSpeechRecognition` | Texte structuré | 🟢 |
| F6 | Silhouette corporelle + body chart | Saisie | `BodySilhouette.tsx`, `BodyDrawing.tsx`, `TreatmentBodyChart.tsx` | Image annotée | 🟢 |
| F7 | Mode vocal — extraction bilan structuré | Saisie + IA | `bilans/BilanVocalMode.tsx`, `voiceBilanClient.ts:317`, `voiceBilanClient.ts:347`, `api/transcribe.ts` | JSON clinique structuré + sections narratives | 🔴 |
| F8 | Pseudonymisation + scrub final | Sécurité | `pseudonymize.ts`, `piiScanner.ts`, `claudeSecure.ts` | PII remplacé par placeholders | 🟢 |
| F9 | Masquage manuel des documents | Sécurité | `DocumentMasker.tsx` | Image caviardée | 🟢 |
| F10 | Analyse IA du bilan (diagnostic + plan) | IA | `BilanAnalyseIA.tsx`, `clinicalPrompt.ts:178` | JSON `AnalyseIA` (diagnostic + 3 hypothèses + plan 3 phases + alertes) | 🔴 |
| F11 | Note diagnostique intermédiaire IA | IA | `BilanNoteIntermediaire.tsx`, `clinicalPrompt.ts:722` | JSON `AnalyseIAIntermediaire` | 🔴 |
| F12 | Rapport d'évolution IA | IA | `BilanEvolutionIA.tsx`, `clinicalPrompt.ts:393` | JSON `EvolutionIA` (tendance + recommandations) | 🔴 |
| F13 | Mini-analyse de séance IA | IA | `DatabasePage.tsx:1419` | JSON `AnalyseSeanceMini` (resume + vigilance + focus + conseil) | 🟡 |
| F14 | Fiche d'exercices à domicile IA | IA | `FicheExerciceIA.tsx`, `clinicalPrompt.ts:231` | Markdown structuré (4 exercices max + dosage + limite sécurité) | 🟡 |
| F15 | Synthèse + recommandations bilan de sortie | IA | `App.tsx:3764`, `App.tsx:3805`, `BilanSortie.tsx` | JSON `resumePEC`/`autoExercices`/`infoMedecin` | 🔴 |
| F16 | Génération de courriers cliniques | IA | `letters/LetterGenerator.tsx`, `letterPrompts.ts`, `letterZonePrompts.ts` | Texte courrier (7 types) | 🔴 |
| F17 | Mise au propre PDF bilan (LLM) | Restitution + IA | `App.tsx:1890`, `clinicalPrompt.ts:887` (`buildPDFReportPrompt`) | Markdown 9 sections | 🟡 |
| F18 | Export PDF analyse IA | Restitution + IA | `App.tsx:1273` | Markdown PDF | 🔴 |
| F19 | Génération PDF déterministe (sans IA) | Restitution | `pdfGenerator.ts` | PDF | 🟢 |
| F20 | Tableaux de bord, courbes EVN, scores | Restitution | `EvolutionChart.tsx`, `ScoreEvolutionChart.tsx`, `DashboardStats.tsx`, `PatientTimeline.tsx`, `BilanResumeModal.tsx` | Graphiques | 🟡 |

---

## 3. Fiches détaillées par fonctionnalité

### F1 — Authentification + profil praticien 🟢

- **Fichiers** : `src/App.tsx` (Step `profile` / `identity`), `supabase/migrations/001_initial_schema.sql:7-28`
- **Entrée** : données praticien (nom, prénom, profession, RCC/ADELI, adresse, signature)
- **Sortie** : profil sauvegardé en IndexedDB + miroir Supabase
- **Transformation** : aucune — restitution pure de données saisies
- **Classification** : **🟢** — fonctionnalité administrative pure, pas d'interprétation de donnée patient
- **Justification réglementaire** : aucun élément de Règle 11 (pas de donnée patient transformée)

### F2 — Réglages app + clé API 🟢

- **Fichiers** : `src/App.tsx` (Step `settings`)
- **Entrée** : préférences UI, clé API Anthropic (stockée localement)
- **Sortie** : config locale
- **Transformation** : aucune
- **Classification** : **🟢**
- **Justification réglementaire** : configuration utilitaire, hors scope MDR

### F3 — Synchronisation Supabase + RLS 🟢

- **Fichiers** : `supabase/migrations/001_initial_schema.sql:226-257`
- **Entrée** : tous les enregistrements locaux (patients, bilans, notes, courriers, audit logs)
- **Sortie** : backup distant chiffré (`practitioner_id = auth.uid()` policy sur toutes les tables)
- **Transformation** : aucune — pure persistance avec Row Level Security
- **Classification** : **🟢**
- **Justification réglementaire** : couche d'infrastructure, n'opère aucune interprétation clinique

### F4 — Saisie bilan initial structuré (9 zones anatomiques) 🟢

- **Fichiers** :
  - `src/components/bilans/BilanEpaule.tsx` (69.8 KB)
  - `src/components/bilans/BilanCheville.tsx` (39.6 KB)
  - `src/components/bilans/BilanGenou.tsx` (33.7 KB)
  - `src/components/bilans/BilanHanche.tsx` (35.4 KB)
  - `src/components/bilans/BilanCervical.tsx` (26.7 KB)
  - `src/components/bilans/BilanLombaire.tsx` (29.5 KB)
  - `src/components/bilans/BilanGenerique.tsx` (14.8 KB)
  - `src/components/bilans/BilanGeriatrique.tsx` (48.1 KB)
  - `src/components/bilans/BilanDrainageLymphatique.tsx` (17.2 KB)
  - `src/components/bilans/bilanSections.tsx` (42.2 KB) — sections partagées
  - `src/components/bilans/QuestionnaireModal.tsx` (passation interactive HAD/DN4/DASH/HOOS/etc.)
- **Entrée** : saisie clavier/clic du praticien
- **Sortie** : objet `bilanData` (JSON) avec sections `douleur`, `redFlags`, `yellowFlags`, `examClinique`, `mobilite`, `force`, `testsSpecifiques`, `scores`, `contratKine`
- **Transformation** : aucune (restitution dans des champs structurés). Les questionnaires interactifs (HAD, DN4, etc.) **calculent un score selon une formule statique connue** — pas d'algorithme propriétaire d'interprétation
- **Classification** : **🟢**
- **Justification réglementaire** : la saisie elle-même n'est pas une finalité diagnostique. Les calculs de scores sont des additions/sommations de cases connues, transparentes. Voir cependant F20 (graphiques d'évolution) pour la zone grise quand ces scores sont restitués comme indicateur d'évolution.

### F5 — Saisie note de séance + dictée vocale 🟢

- **Fichiers** : `src/App.tsx` (Step `note_seance` ligne 698+), `src/components/VoiceMic` (DictableInput / DictableTextarea), `src/hooks/useSpeechRecognition`
- **Entrée** : audio (Web Speech API navigateur ou Whisper) + texte
- **Sortie** : texte transcrit injecté dans champs structurés (eva, observance, evolution, interventions, dosage, tolérance, prochaine étape)
- **Transformation** : transcription audio → texte (sans interprétation clinique au stade saisie)
- **Classification** : **🟢**
- **Justification réglementaire** : la dictée vocale ne diagnostique pas. La transcription Whisper utilise un prompt à vocabulaire médical (`api/transcribe.ts:74` — `"EVA, EVN, PSFS, HAD, DN4, DASH, MRC, ROM, PEC, SMART, IRM."`) mais ne tire aucune conclusion clinique.

### F6 — Silhouette corporelle + body chart 🟢

- **Fichiers** :
  - `src/components/BodySilhouette.tsx` (517 lignes) — sélection zone, dessin annotation, recherche vocale
  - `src/components/BodyDrawing.tsx` (439 lignes) — canvas dessin sur fond `body-chart.png`
  - `src/components/TreatmentBodyChart.tsx` (100 lignes) — affichage seul
- **Entrée** : interactions souris/tactile sur SVG/canvas
- **Sortie** : image PNG/SVG annotée (couleurs traits stockées en base64)
- **Transformation** : pure restitution graphique de la saisie utilisateur
- **Classification** : **🟢**
- **Justification réglementaire** : outil de croquis sans algorithme d'interprétation

### F7 — Mode vocal — extraction bilan structuré 🔴

- **Fichiers** :
  - `src/components/bilans/BilanVocalMode.tsx` (37.8 KB) — UI rolling MediaRecorder + recovery IndexedDB
  - `src/utils/voiceBilanClient.ts` (439 lignes) — pipeline complet
  - `api/transcribe.ts` (113 lignes) — proxy Whisper
- **Pipeline** :
  1. **Capture** : rolling MediaRecorder, chunks 30s, recovery IndexedDB (`vocalRecoveryDB.ts`)
  2. **Transcription** : Whisper via `/api/transcribe` (modèle `gpt-4o-transcribe`, langue `fr`, prompt vocabulaire médical, chunks ≤25 MB) — `api/transcribe.ts:38-87`
  3. **Reformulation** (optionnelle, par champ) : Claude Haiku — `voiceBilanClient.ts` `reformulateTranscription`
  4. **Extraction structurée** : Claude Sonnet — `voiceBilanClient.ts:317` `extractBilanFromTranscription`. Schéma cible riche pour zone épaule (cf. extrait), parsing JSON strict
  5. **Rapport narratif** : Claude Sonnet — `voiceBilanClient.ts:347` `generateNarrativeReport` produit 8 sections calquées sur le PDF cible (anamnèse / symptomatologie / drapeaux / examen / tests / diagnostic / projet / conseils)
- **Extrait du prompt d'extraction** (`voiceBilanClient.ts:281-310`) :
  ```
  Tu es un assistant qui aide un kinésithérapeute à remplir un bilan
  clinique à partir d'une dictée orale.
  Ta tâche : extraire de la transcription ci-après les informations
  cliniques et les mapper au schéma JSON suivant.
  RÈGLES STRICTES :
  1. Ne retourne QUE du JSON valide, rien d'autre
  2. N'invente AUCUNE information
  3. Les booléens sont représentés par "oui" ou "non"
  4. EVA/EVN doivent être des chaînes contenant un nombre 0-10.
     Si "EVA à 5" sans préciser pire/mieux/moyenne, mets dans evnMoy.
  5. Les amplitudes articulaires sont en degrés (mobilité)
  6. La force musculaire suit l'échelle MRC 0-5
  7. Les tests spécifiques utilisent EXACTEMENT les clés camelCase
     (bearHug, bellyPress, externalRotLagSign, etc.)
     valeurs "positif" ou "negatif"
  ```
- **Extrait schéma cible épaule** (`voiceBilanClient.ts:200-266`) — fragment :
  ```
  "neurologique": {
    "reflexes": "...",
    "force": "string — territoire concerné, cotation",
    "sensibilite": "string — dermatomes C5-T1, type de déficit",
    "hoffmanTromner": "string — + ou - (test de Hoffman / Tromner)",
    "nerfMedian": "string — ULNT1 / nerf médian : reproduction symptômes",
  },
  "testsSpecifiques": {
    "bearHug": "positif | negatif — Bear Hug Test (subscapulaire)",
    "externalRotLagSign": "positif | negatif — ERLS (sus/infra-épineux)",
    "apprehensionRelocation": "positif | negatif — Apprehension/Relocation",
    "obrien": "positif | negatif — O'Brien (AC / labrum)",
  },
  "scores": {
    "scoreOSS": "string — Oxford Shoulder Score",
    "scoreConstant": "string — Constant-Murley",
    "scoreDASH": "string — DASH",
  }
  ```
- **Classification** : **🔴**
- **Justification réglementaire** : la finalité technique est d'**extraire de la donnée patient (transcription audio) une représentation clinique structurée** (cotations MRC, EVN, résultats binaires sur tests cliniques nommés, drapeaux). Cette représentation est **directement consommée** par F10/F11/F12/F17/F18 comme donnée d'entrée des analyses interprétatives. Au-delà de la simple transcription, le LLM est instruit de **mapper sémantiquement** des énoncés oraux à un schéma clinique, ce qui constitue une transformation de la donnée patient. Critère typique de Règle 11.

### F8 — Pseudonymisation + scrub final 🟢

- **Fichiers** :
  - `src/utils/pseudonymize.ts` (94 lignes) — placeholders `__PATIENT_PRENOM__` / `__PATIENT_NOM__` / `__DESTINATAIRE_NOM__` / `__PRO_RECOMMANDE_NOM__` ; date de naissance → âge calculé
  - `src/utils/piiScanner.ts` (158 lignes) — détection PII heuristique (téléphone FR, email, NIR, adresse postale, mots ALL CAPS hors whitelist médicale)
  - `src/utils/claudeSecure.ts` (141 lignes) — wrapper qui applique un **scrub final** sur system+user prompt, lève `UnmaskedDocumentsError` si documents non masqués, et écrit l'audit (`ai_call_audit` table, schéma `supabase/migrations/001_initial_schema.sql:208-223`)
- **Audit log** : à chaque appel LLM, `AICallAuditEntry` (cf. `src/types/index.ts:351-365`) avec `category`, `pseudonymized`, `scrubReplacements`, `documentsCount`, `documentsUnmasked`, `modelUsed`, `promptLength`, `resultLength`, `success`
- **Classification** : **🟢**
- **Justification réglementaire** : mesure technique de protection (RGPD/HDS), pas une fonctionnalité clinique

### F9 — Masquage manuel des documents 🟢

- **Fichiers** : `src/components/DocumentMasker.tsx` (259 lignes)
- **Sortie** : image avec rectangles noirs aux endroits choisis par le praticien
- **Garde-fou** : `BilanDocument.masked` flag ; `claudeSecure.ts:50-57` lève `UnmaskedDocumentsError` si le flag est absent
- **Classification** : **🟢**

### F10 — Analyse IA du bilan (diagnostic + plan de traitement) 🔴

- **Fichiers** :
  - `src/components/BilanAnalyseIA.tsx`
  - `src/utils/clinicalPrompt.ts:104-227` (`buildClinicalPrompt`)
  - `src/utils/clinicalPrompt.ts:647-693` (`parseAnalyseIA` — normalise les probabilités à somme = 100)
- **Entrée** : `BilanContext` complet (patient pseudonymisé via âge/sexe, zone, bilanData, profil thérapeute, historique PEC clôturées résumées en 1 ligne, mode vocal narrative report)
- **Sortie** (typée `AnalyseIA` — `src/types/index.ts:95-101`) :
  ```ts
  interface AnalyseIA {
    diagnostic: { titre: string; description: string }
    hypotheses: Array<{
      rang: number; titre: string; probabilite: number; justification: string
    }>
    priseEnCharge: Array<{
      phase: string; titre: string; detail: string; points?: string[]
    }>
    alertes: string[]
  }
  ```
- **Transformation** : appel Claude Sonnet (`callClaudeSecure`, category `bilan_analyse`, jsonMode true, max 8192 tokens), system prompt + user prompt construit par `buildClinicalPrompt`
- **Extrait du prompt** (`clinicalPrompt.ts:178` — début du user prompt) :
  ```
  Tu es un ${role} expert en musculo-squelettique. Analyse ce bilan
  clinique et fournis une évaluation précise et personnalisée.
  ```
- **Extrait sur la production probabiliste** (`clinicalPrompt.ts:202`) :
  ```
  1. Les 3 hypothèses doivent avoir des probabilités RÉELLES calculées
  à partir des données cliniques (EVN, tests, scores, flags). Les
  probabilités ne doivent PAS être fixes... La somme des 3
  probabilités DOIT être exactement égale à 100 (ex: 65+25+10=100).
  ```
- **Extrait du schéma de sortie imposé** (`clinicalPrompt.ts:210-226`) :
  ```
  {
    "diagnostic": {
      "titre": "Titre court et précis du diagnostic ${adjMetier} principal",
      "description": "Description clinique détaillée et personnalisée"
    },
    "hypotheses": [
      { "rang": 1, "titre": "...", "probabilite": <calculé>, "justification": "..." },
      { "rang": 2, ... },
      { "rang": 3, ... }
    ],
    "priseEnCharge": [
      { "phase": "Phase aiguë (J1–J7)", "titre": "...",
        "points": ["Action concise 1 (technique + fréquence)", ...] },
      { "phase": "Phase subaiguë (J8–J21)", ... },
      { "phase": "Phase fonctionnelle (J22–J42)", ... }
    ],
    "alertes": ["Red flag CLINIQUE critique nécessitant orientation
                médicale urgente — sinon tableau vide..."]
  }
  ```
- **Mode raffinement** (`BilanAnalyseIA.tsx`) : second appel Claude (category `bilan_analyse_refine`) qui prend la première analyse + correction texte du thérapeute pour produire une version révisée.
- **Classification** : **🔴**
- **Justification réglementaire** : tous les attributs typiques de Règle 11 sont présents :
  - Donnée patient transformée (bilan structuré + flags + scores → analyse clinique)
  - Sortie diagnostique explicite (`diagnostic.titre` + 3 hypothèses **classées et chiffrées en %**)
  - Sortie de prise en charge (3 phases avec actions thérapeutiques)
  - Sortie d'alerte clinique (red flags critiques)
  - Le prompt instruit le modèle à se comporter comme un « expert » qui formule un diagnostic principal + hypothèses différentielles
  - Output JSON structuré directement réutilisé en UI puis exporté en PDF (F18) destiné au médecin prescripteur

### F11 — Note diagnostique intermédiaire IA 🔴

- **Fichiers** :
  - `src/components/BilanNoteIntermediaire.tsx` (2 appels — `category: 'bilan_intermediaire'` ligne 58 et 110)
  - `src/utils/clinicalPrompt.ts:722-856` (`buildIntermediairePrompt`)
- **Entrée** : patient pseudonymisé + zone + données bilan intermédiaire + historique complet (bilans antérieurs, séances entre les bilans, fiches d'exercices prescrites, analyses IA précédentes)
- **Sortie** (typée `AnalyseIAIntermediaire` — `src/types/index.ts:103-108`) :
  ```ts
  {
    noteDiagnostique: { titre: string; evolution: string; description: string }
    priseEnChargeAjustee: Array<{ point: string }>
    alertes: string[]
  }
  ```
- **Extrait du prompt** (`clinicalPrompt.ts:811`) :
  ```
  Tu es un ${role} expert en musculo-squelettique. Rédige une note
  diagnostique intermédiaire en tenant compte de l'historique COMPLET
  du patient pour cette zone : bilans, séances, analyses IA précédentes
  et exercices prescrits.
  ```
- **Extrait des consignes** (`clinicalPrompt.ts:831`) :
  ```
  1. noteDiagnostique.titre : diagnostic ${metierAdj} court et précis,
     mis à jour selon l'évolution.
  2. noteDiagnostique.evolution : 1 phrase courte décrivant la tendance
     (amélioration / stagnation / régression) avec données EVN chiffrées.
  3. noteDiagnostique.description : 2-3 phrases d'analyse clinique.
  4. priseEnChargeAjustee : 4-6 points SYNTHÉTIQUES et directement
     applicables — chaque point = une action ou ajustement concret
     THÉRAPEUTIQUE
  5. alertes : red flag CLINIQUE critique ou évolution défavorable
     nécessitant réorientation
  ```
- **Classification** : **🔴**
- **Justification réglementaire** : produit un **diagnostic mis à jour** + alertes cliniques + ajustement de prise en charge à partir de la trajectoire patient. Mêmes attributs Règle 11 que F10.

### F12 — Rapport d'évolution IA 🔴

- **Fichiers** :
  - `src/components/BilanEvolutionIA.tsx` (`callClaudeSecure` ligne 72, `category: 'bilan_evolution'` ligne 90)
  - `src/utils/clinicalPrompt.ts:393-592` (`buildEvolutionPrompt`)
- **Entrée** : patient + tous les bilans initiaux/intermédiaires + toutes les notes de séance pour la zone, + note libre du thérapeute optionnelle « PRIORITÉ ABSOLUE »
- **Sortie** (typée `EvolutionIA` — `src/types/index.ts:367-398`) :
  ```ts
  {
    resume: string
    tendance: 'amelioration' | 'stationnaire' | 'regression' | 'mixte'
    tableauInitial: string
    evolutionClinique: { syntheseGlobale, evolutionSymptomatique,
                         evolutionFonctionnelle, evolutionObjective }
    progression: Array<{ bilanNum, date, evn, commentaire, etape }>
    interventionsRealisees: { techniquesManuelles, exercicesProgrammes,
                              educationConseils }
    etatActuel: { symptomes, fonctionnel, objectif }
    pointsForts: string[]
    pointsVigilance: string[]
    recommandations: Array<{ titre: string; detail: string }>
    conclusion: string
  }
  ```
- **Extrait du prompt** (`clinicalPrompt.ts:527`) :
  ```
  SECTION 4 — INSTRUCTIONS DE RÉDACTION (16 règles absolues)
  ...
  8. TENDANCE — valeur unique parmi : "amelioration", "stationnaire",
     "regression", "mixte". Évalue sur l'ensemble de la chronologie
     (EVN/EVA, capacité fonctionnelle déclarée, tolérance).
  ...
  15. CONCLUSION ORIENTÉE — La conclusion ne récapitule PAS la
      trajectoire. Elle propose une orientation : poursuite de PEC
      avec axes prioritaires, fin de PEC envisagée avec critères, ou
      réorientation (médicale, imagerie, chirurgicale).
  ```
- **Extrait sur les recommandations** (`clinicalPrompt.ts:587-588`) :
  ```
  "recommandations": [
    { "titre": "Titre court de la recommandation CLINIQUE",
      "detail": "...Recommandations CLINIQUES uniquement :
                 réévaluation à distance, ajustement thérapeutique,
                 concertation médicale, imagerie, orientation
                 chirurgicale, éducation thérapeutique." }
  ]
  ```
- **Classification** : **🔴**
- **Justification réglementaire** : produit une **classification qualitative de la trajectoire clinique** (`tendance`) + recommandations cliniques explicites (incluant recours à l'imagerie ou chirurgie). Le rapport est explicitement **destiné au médecin prescripteur** (cf. system prompt « rapport [...] adressé au médecin prescripteur : il doit pouvoir être lu en 2 minutes et donner une image fidèle de la PEC »).

### F13 — Mini-analyse de note de séance 🟡

- **Fichiers** : `src/components/database/DatabasePage.tsx:1419-1428`
- **Entrée** : note de séance courante + historique complet (bilans, intermédiaires, séances, analyses IA précédentes, fiches d'exercices)
- **Sortie** (typée `AnalyseSeanceMini` — `src/types/index.ts:127-134`) :
  ```ts
  { resume: string; evolution: string; vigilance: string[];
    focus: string; conseil: string }
  ```
- **Extrait du prompt** (`DatabasePage.tsx:1421`) :
  ```
  systemPrompt: 'Tu es un kinésithérapeute expert. Analyse la séance
  actuelle dans le contexte de tout l\'historique COMPLET du patient
  (bilans, bilans intermédiaires, séances précédentes, analyses IA,
  exercices prescrits). Sois concis. Réponds UNIQUEMENT en JSON valide.'
  ```
- **Extrait du userPrompt JSON cible** :
  ```
  {"resume":"1-2 phrases résumant la séance",
   "evolution":"1 phrase sur la tendance globale de l'évolution",
   "vigilance":["point de vigilance 1","point 2 si pertinent"],
   "focus":"1 phrase sur quoi se focaliser à la prochaine séance",
   "conseil":"1-2 phrases de conseil IA basé sur la direction de la
              symptomatologie et l'historique — concret et actionnable"}
  ```
- **Classification** : **🟡**
- **Justification réglementaire** : volume et profondeur cliniques moindres (5 phrases courtes) que F10/F11/F12 — pourrait techniquement être lu comme « aide à la rédaction de note de séance ». Mais : `vigilance[]` est explicitement clinique, `conseil` est « actionnable », et l'output est structuré en JSON pour réutilisation. Selon l'interprétation MDCG 2019-11 sur le critère de finalité décisionnelle, peut basculer 🔴.

### F14 — Fiche d'exercices à domicile IA 🟡

- **Fichiers** :
  - `src/components/FicheExerciceIA.tsx` (`callClaudeSecure` ligne 156, `category: 'fiche_exercice'` ligne 163)
  - `src/utils/clinicalPrompt.ts:231-331` (`buildFicheExercicePrompt`)
  - Variante extraction depuis dictée : `src/App.tsx:638-688` (`handleGenerateExercices`)
- **Entrée** : zone + bilanData + EVN + analyseIA (diagnostic) + historique complet (bilans, séances, observance, tolérance, fiches précédentes)
- **Sortie** : Markdown structuré (max **4 exercices** + `Objectif`/`Position`/`Mouvement`/`Dosage`/`Limite de sécurité`)
- **Extrait du prompt** (`FicheExerciceIA.tsx:125`) :
  ```
  Tu es un ${role} expert en biomécanique et en rééducation
  fonctionnelle. Ton rôle est de traduire un plan de traitement
  technique en une fiche d'exercices à domicile claire,
  professionnelle et sécurisée.
  ```
- **Extrait des règles** (`FicheExerciceIA.tsx:130-137`) :
  ```
  2. Limite-toi à un MAXIMUM STRICT de 4 exercices pour garantir
     l'observance.
  3. La sécurité est absolue : chaque exercice doit avoir une
     limite de douleur claire.
  4. Adresse-toi directement au patient (utilise le "vous").
  ```
- **Extrait du template de sortie** :
  ```
  #### 1. [Nom professionnel de l'exercice]
  - **Objectif :** [Pourquoi on fait ça]
  - **Position de départ :** [...]
  - **Mouvement :** > 1. [Étape 1] > 2. [Étape 2]
  - **Dosage :** [Séries] x [Répétitions] — Repos [Temps]
  - **Limite de sécurité :** [Ex: Arrêtez si douleur > 3/10
                              ou fourmillements].
  ```
- **Classification** : **🟡**
- **Justification réglementaire** : prescription d'exercices avec dosage et limite de sécurité **adressée directement au patient** (« vous »). Un argument hors-DM existe (le thérapeute valide la fiche avant remise) ; un argument intra-DM existe (l'output est destiné au patient et inclut une « limite de sécurité » qui est une consigne de surveillance de symptômes). À trancher au regard de l'usage réel et de la chaîne de validation.

### F15 — Synthèse + recommandations bilan de sortie 🔴

- **Fichiers** :
  - `src/App.tsx:3764` (`onGenerateSynthese` — `category: 'bilan_analyse'`)
  - `src/App.tsx:3805` (`onGenerateRecommandations` — `category: 'bilan_analyse'`)
  - `src/components/BilanSortie.tsx` (843 lignes)
- **Entrée** : historique complet patient (bilans, intermédiaires, séances, fiches d'exercices, dosages, interventions, contrat thérapeutique)
- **Sortie** :
  - Synthèse : `{resumePEC, resultatsObtenus, facteursLimitants}` (JSON)
  - Recommandations : `{autoExercices, precautions, infoMedecin}` (JSON)
- **Extrait du prompt synthèse** (`App.tsx:3766`) :
  ```
  systemPrompt: 'Tu es un kinésithérapeute expert. Génère une
  synthèse clinique de fin de prise en charge. Sois professionnel,
  concis et structuré. Réponds UNIQUEMENT en JSON valide.'
  ```
- **Extrait du userPrompt** (`App.tsx:3767`) :
  ```
  HISTORIQUE COMPLET DU PATIENT :
  ${historiqueStr}

  Génère en JSON :
  {"resumePEC":"résumé complet de la prise en charge (techniques,
                progression, nombre de séances)",
   "resultatsObtenus":"résultats cliniques obtenus (EVN, scores,
                       gains fonctionnels)",
   "facteursLimitants":"facteurs limitants rencontrés..."}
  ```
- **Extrait du prompt recommandations** (`App.tsx:3807`) :
  ```
  Tu es un kinésithérapeute expert. Génère des recommandations de
  fin de prise en charge.
  RÈGLE ABSOLUE : Tu ne dois JAMAIS inventer d'exercices [...]
  Réponds UNIQUEMENT en JSON valide.
  ```
- **Extrait du JSON cible recommandations** (`App.tsx:3826`) :
  ```
  {"autoExercices":"UNIQUEMENT les exercices déjà prescrits ci-dessus
                    avec leurs dosages",
   "precautions":"précautions basées sur l'évolution clinique
                  constatée",
   "infoMedecin":"éléments factuels pour le médecin prescripteur
                  (EVN initial/final, nombre de séances, résultats)"}
  ```
- **Classification** : **🔴**
- **Justification réglementaire** : produit (a) une synthèse clinique de PEC, (b) des **précautions cliniques** adressées au patient et (c) des **éléments factuels pour le médecin prescripteur**. Sortie clinique destinée à orienter la suite du parcours patient.

### F16 — Génération de courriers cliniques 🔴

- **Fichiers** :
  - `src/components/letters/LetterGenerator.tsx`
  - `src/utils/letterPrompts.ts` (~450 lignes)
  - `src/utils/letterZonePrompts.ts` (376 lignes) — confection IA d'**une zone** d'un courrier (Haiku)
- **Types de courriers** (`letterPrompts.ts:4-52`) :
  - `fin_pec` — Fin de prise en charge (objectifs atteints)
  - `fin_pec_anticipee` — Arrêt anticipé pour raison clinique
  - `demande_avis` — Orientation vers un autre professionnel
  - `demande_imagerie` — Demande échographie / IRM / radio / scanner
  - `demande_prescription` — Renouvellement / nouvelle ordonnance
  - `suivi` — Point intermédiaire sur l'évolution
  - `echec_pec` — Échec / dégradation, réorientation nécessaire
- **Pipeline** :
  1. **Confection par zone** (Haiku, 600 tokens, `LetterGenerator.tsx:136`) — `buildZonePrompt` produit un paragraphe par champ (résuméBilanInitial, traitement, recommandations, raisonOrientation, justification, etc. — 19 `ConfectableField`s)
  2. **Génération courrier complet** (Sonnet, 2500 tokens, `LetterGenerator.tsx:213`) — `buildLetterPrompt` produit le courrier final avec salutation et formule de politesse
- **Pseudonymisation** : `pseudonymizeForm` remplace nom/prénom/destinataire par placeholders ; `rehydrateText` réinjecte côté client après réception
- **Audit dédié** : `LetterAuditEntry` (`src/types/index.ts:323-333`) + table `letter_audit` (Supabase migration ligne 194-205)
- **Extrait du system prompt** (`letterPrompts.ts:99`) :
  ```
  Tu es un ${titre} francophone expérimenté (${region}), chargé de
  rédiger un courrier professionnel adressé à un médecin prescripteur
  ou à un confrère. Le courrier doit pouvoir être lu en moins d'une
  minute par son destinataire, tenir sur UNE page A4, et présenter
  une image clinique fidèle, factuelle, confraternelle [...]
  ```
- **Classification** : **🔴**
- **Justification réglementaire** : la production de courriers de **demande d'imagerie**, **demande de prescription**, **orientation médicale**, **constat d'échec / réorientation** influence directement la décision médicale d'un tiers. Critère typique de Règle 11 (sortie destinée à éclairer un acte médical).

### F17 — Mise au propre PDF du bilan (LLM) 🟡

- **Fichiers** :
  - `src/App.tsx:1890` (`category: 'pdf_bilan'`)
  - `src/utils/clinicalPrompt.ts:887-1112` (`buildPDFReportPrompt`)
- **Entrée** : bilanData complet + notes libres + analyseIA (optionnelle, peut être null pour le bilan PDF)
- **Sortie** : Markdown structuré en 9 sections : Profil / Anamnèse / Symptomatologie douloureuse / Drapeaux / Examen clinique / Tests spécifiques / Synthèse diagnostique / Projet thérapeutique / Conclusion
- **Extrait du system prompt** (`App.tsx:1333`, `PDF_BILAN_SYSTEM_PROMPT`) :
  ```
  Tu es un kinésithérapeute expérimenté chargé de rédiger la mise au
  propre d'un bilan de kinésithérapie pour le dossier patient.
  TON RÔLE : transformer des données brutes en un document fluide,
  professionnel et agréable à lire — comme un bilan que tu écrirais
  toi-même.
  RÈGLES ABSOLUES :
  - Tu n'AJOUTES aucune information qui n'est pas dans les données.
  - Tu ne fais AUCUN diagnostic, AUCUNE hypothèse diagnostique,
    AUCUN plan de traitement, AUCUNE recommandation thérapeutique.
  ```
- **Extrait des sections imposées** (`clinicalPrompt.ts:1076`) :
  ```
  TITRES VERBATIM — « 1. Profil du patient et contexte »,
  « 2. Anamnèse », « 3. Symptomatologie douloureuse »,
  « 4. Drapeaux cliniques », « 5. Examen clinique »,
  « 6. Tests spécifiques », « 7. Synthèse diagnostique »,
  « 8. Projet thérapeutique », « 9. Conclusion »
  ```
- **Classification** : **🟡**
- **Justification réglementaire** : le system prompt **interdit explicitement** au modèle de produire diagnostic/hypothèse/plan/recommandation — ce qui pousse vers 🟢 (restitution éditoriale). Mais : (a) le prompt utilisateur (`buildPDFReportPrompt`) fournit la section 7 « Synthèse diagnostique » comme **section générée par raisonnement clinique à partir des sections 1-6** (`clinicalPrompt.ts:1077`), section 8 « Projet thérapeutique » par 3-5 axes thérapeutiques (`clinicalPrompt.ts:1087`), section 9 « Conclusion » clinique. Les deux instructions cohabitent — selon l'output réel observé, peut basculer 🔴. À auditer sur des sorties produites en conditions réelles.

### F18 — Export PDF analyse IA 🔴

- **Fichiers** : `src/App.tsx:1273`, `category: 'pdf_analyse'`
- **Entrée** : bilanData + notesLibres + **analyseIA non-null** (passe explicitement le diagnostic, les hypothèses et le plan)
- **Sortie** : Markdown PDF qui **intègre l'analyse IA dans la section 7 (Synthèse diagnostique)**
- **Extrait** (`clinicalPrompt.ts:1049`) :
  ```ts
  const analyseSection = analyseIA ? `
  ANALYSE CLINIQUE (données issues du bilan — à intégrer au
  diagnostic, SANS rien ajouter, SANS reproduire de pourcentages) :
  - Diagnostic retenu : ${analyseIA.diagnostic.titre}
  - Justification : ${scrub(analyseIA.diagnostic.description)}
  - Hypothèses (classement qualitatif) : ${...}
  - Plan de traitement : ${analyseIA.priseEnCharge.map(...)}` : ''
  ```
- **Classification** : **🔴**
- **Justification réglementaire** : variante export du diagnostic IA (F10) en PDF destiné au médecin prescripteur. Hérite la classification 🔴 de F10 puisque c'est sa sortie qui est mise en forme.

### F19 — Génération PDF déterministe (sans IA) 🟢

- **Fichiers** : `src/utils/pdfGenerator.ts` (99.3 KB), `src/utils/exercicesDomicilePdf.ts`
- **Entrée** : structures de données déjà saisies/calculées
- **Sortie** : PDF (jsPDF)
- **Transformation** : pure mise en forme, aucune interprétation clinique
- **Classification** : **🟢**

### F20 — Tableaux de bord, courbes EVN, scores 🟡

- **Fichiers** :
  - `src/components/EvolutionChart.tsx` (221 lignes) — courbe EVN dans le temps
  - `src/components/ScoreEvolutionChart.tsx` (329 lignes) — sparklines par score (HOOS, OSS, DASH, DN4, etc.)
  - `src/components/DashboardStats.tsx` (292 lignes) — agrégats globaux
  - `src/components/PatientTimeline.tsx` (450 lignes) — timeline chronologique
  - `src/components/BilanResumeModal.tsx` (290 lignes) — résumé patient
- **Entrée** : données déjà saisies/déjà calculées par les questionnaires
- **Sortie** : graphiques (SVG), pourcentages d'amélioration calculés sur formules statiques (ex. `improvDelta(initial, final)`)
- **Transformation** : extraction de séries temporelles + calculs déterministes (delta, médiane)
- **Classification** : **🟡**
- **Justification réglementaire** : la restitution graphique de scores cliniques connus ne crée pas en soi une nouvelle finalité diagnostique (Snitem C-329/16 : la simple compilation/affichage ne suffit pas). Mais selon comment ces graphiques sont étiquetés dans l'UI (« évolution clinique », « score d'amélioration ») et selon qu'ils sont restitués comme aide à la décision, peut basculer.

---

## Annexe A — Inventaire des prompts LLM

Modèles utilisés (cf. `api/claude.ts:73-82`) :
- `claude-sonnet-4-6` (default) — analyses cliniques principales
- `claude-haiku-4-5-20251001` — confection légère par zone (courriers), reformulation vocale
- `claude-opus-4-7` — disponible mais pas le défaut

Tous les appels LLM passent par `callClaudeSecure` (`src/utils/claudeSecure.ts`), qui applique un **scrub final nom/prénom** et écrit l'**audit log** (`AICallAuditEntry`). Toute exception : la confection par zone des courriers (`LetterGenerator.tsx:136`) qui passe par `callClaude` direct mais avec pseudonymisation préalable et audit dédié `LetterAuditEntry`.

| ID | Fichier:ligne | Catégorie audit | Modèle | Finalité | Verdict clinique |
|---|---|---|---|---|---|
| P1 | `clinicalPrompt.ts:178` | `bilan_analyse` | Sonnet 4.6 | Diagnostic principal + 3 hypothèses chiffrées + plan 3 phases + alertes | **Cliniquement exploitable** — produit du contenu décisionnel structuré |
| P2 | `BilanAnalyseIA.tsx:107` | `bilan_analyse_refine` | Sonnet 4.6 | Re-génération de l'analyse en intégrant correction du thérapeute | **Cliniquement exploitable** — variante de P1 |
| P3 | `clinicalPrompt.ts:393` (buildEvolutionPrompt) | `bilan_evolution` | Sonnet 4.6 | Rapport d'évolution structuré + tendance + recommandations adressées au médecin | **Cliniquement exploitable** |
| P4 | `clinicalPrompt.ts:722` (buildIntermediairePrompt) | `bilan_intermediaire` | Sonnet 4.6 | Note diagnostique mise à jour + prise en charge ajustée + alertes | **Cliniquement exploitable** |
| P5 | `clinicalPrompt.ts:231` (buildFicheExercicePrompt) + `FicheExerciceIA.tsx:125` | `fiche_exercice` | Sonnet 4.6 | Fiche d'exercices à domicile (4 max) avec dosage + limite sécurité | **Partiellement exploitable** — prescription d'exercices au patient |
| P6 | `App.tsx:638` (handleGenerateExercices) | `fiche_exercice` | Sonnet 4.6 | Extraction structurée d'une dictée du thérapeute en JSON exercices | **Outil de saisie** (transcription structurée) |
| P7 | `DatabasePage.tsx:1421` | `note_seance_mini` | Sonnet 4.6 (default) | Mini-analyse d'une séance : résumé + tendance + vigilance + focus + conseil | **Partiellement exploitable** |
| P8 | `App.tsx:3766` (onGenerateSynthese) | `bilan_analyse` | Sonnet 4.6 | Synthèse fin de PEC : résumé + résultats + facteurs limitants | **Cliniquement exploitable** (pour info médecin) |
| P9 | `App.tsx:3807` (onGenerateRecommandations) | `bilan_analyse` | Sonnet 4.6 | Recommandations fin de PEC : auto-exercices + précautions + info médecin | **Cliniquement exploitable** |
| P10 | `clinicalPrompt.ts:887` (buildPDFReportPrompt) — sans `analyseIA` | `pdf_bilan` | Sonnet 4.6 | Mise au propre éditoriale du bilan en 9 sections (system prompt interdit diagnostic) | **Zone grise** — sections 7/8/9 sont générées par raisonnement clinique malgré l'interdiction |
| P11 | `clinicalPrompt.ts:887` (buildPDFReportPrompt) — avec `analyseIA` | `pdf_analyse` | Sonnet 4.6 | Mise en forme PDF du bilan **intégrant l'analyse IA F10** | **Cliniquement exploitable** (variante export de F10) |
| P12 | `letterPrompts.ts:99` (`systemPrompt`) + `buildLetterPrompt` | `letter` | Sonnet 4.6 | Génération courrier complet (7 types incluant demande imagerie/prescription/orientation) | **Cliniquement exploitable** |
| P13 | `letterZonePrompts.ts:152` (`zoneSystemPrompt`) + `buildZonePrompt` | `letter` (audit dédié) | Haiku 4.5 | Confection IA d'un paragraphe précis du courrier (19 zones possibles) | **Partiellement exploitable** |
| P14 | `voiceBilanClient.ts:281` (`buildExtractionPrompt`) | (transcription, pas de category formelle) | Sonnet 4.6 | Extraction d'un schéma clinique structuré à partir d'une transcription audio | **Cliniquement exploitable comme transformation de donnée patient** |
| P15 | `voiceBilanClient.ts:347` (`generateNarrativeReport`) | (idem) | Sonnet 4.6 | 8 sections narratives calquées sur le PDF cible | **Cliniquement exploitable** |
| P16 | `voiceBilanClient.ts` (reformulateTranscription, fonction de nettoyage par champ) | (idem) | Haiku 4.5 | Reformulation d'une dictée par champ | **Outil rédactionnel** |
| P17 | `api/transcribe.ts:74` | (n/a — Whisper) | OpenAI `gpt-4o-transcribe` | Transcription audio fr avec prompt vocabulaire médical | **Outil de saisie** (pas de qualification clinique) |

**Note sur le scrub** : `claudeSecure.ts:62-75` construit un regex `\b(nom|prenom)\b` insensible à la casse et remplace par `[PATIENT]` avant envoi. La date de naissance est convertie en âge. Ces opérations sont des protections RGPD/HDS et **ne neutralisent pas la finalité clinique de la sortie**.

---

## Annexe B — Inventaire des champs cliniques en base

### B.1 — Schéma Supabase (source : `supabase/migrations/001_initial_schema.sql`)

| Table | Champs cliniques notables |
|---|---|
| `practitioners` (ligne 7) | Aucune donnée patient. RCC/ADELI, signature, spécialités du praticien |
| `patients` (ligne 31) | nom, prenom, date_naissance, patient_key (généré). **Pas de NIR**, pas d'email patient, pas d'adresse patient |
| `bilans` (ligne 46) | date_bilan, zone, pathologie, evn, **bilan_data jsonb** (cf. B.2), notes, silhouette_data, documents jsonb, **analyse_ia jsonb**, fiche_exercice jsonb |
| `bilans_intermediaires` (ligne 71) | date_bilan, zone, **data jsonb**, notes, **analyse_ia jsonb**, fiche_exercice jsonb |
| `notes_seance` (ligne 89) | date_seance, num_seance, **data jsonb** (eva, observance, evolution, interventions, dosage, tolérance), **analyse_ia jsonb**, fiche_exercice jsonb |
| `objectifs` (ligne 106) | zone, titre, cible, date_cible, status (objectifs SMART) |
| `prescriptions` (ligne 120) | nb_seances, prescripteur, **document jsonb** (photo ordonnance) |
| `closed_treatments` (ligne 136) | bilan_type, zone, closed_at, note |
| `letters` (ligne 148) | type, **form_data jsonb** (incluant identité patient + clinique), **contenu text** (courrier généré) |
| `patient_documents` (ligne 163) | name, mime_type, storage_path (Supabase Storage bucket `patient-docs`), **masked boolean** |
| `exercice_bank` (ligne 176) | banque d'exercices par praticien (sans patient) |
| `letter_audit` (ligne 194) | métadonnées audit RGPD pour courriers IA |
| `ai_call_audit` (ligne 208) | métadonnées audit RGPD pour tous appels IA |

**RLS** : toutes les tables filtrent sur `practitioner_id = auth.uid()` (lignes 245-257). Bucket `patient-docs` filtre sur le 1er segment du path = `auth.uid()::text` (ligne 269-277).

### B.2 — Champs cliniques dans `bilan_data` (JSON dans `bilans.bilan_data`)

Sources de vérité : `src/types/index.ts`, `src/utils/clinicalPrompt.ts:104` (extraction), `src/utils/voiceBilanClient.ts:200-266` (schéma cible épaule complet)

Sections présentes (variables selon `bilanType`) :
- **`douleur`** : evnPire, evnMieux, evnMoy, douleurType, situation, douleurNocturne, derouillageMatinal, derouillageTemps, mouvementsEmpirent, mouvementsSoulagent, debutSymptomes, facteurDeclenchant, localisationInitiale, localisationActuelle, insomniante
- **`redFlags`** : 12-15 items (perte de poids, fièvre, troubles sphinctériens, anesthésie en selle, traumatisme haute énergie, néoplasie ATCD, etc.) — sérialisés en `oui`/`non`
- **`yellowFlags`** : kinésiophobie, catastrophisme, croyances, dépression, anxiété
- **`blueBlackFlags`** : insatisfaction au travail, litiges, indemnisation, accident du travail
- **`examClinique`** : morphostatique, œdème, palpation, mobilité par axe (flexion/extension/abduction/adduction/rotations) en degrés actif/passif G/D, force MRC par muscle, observations
- **`neurologique`** : réflexes ostéotendineux, force, sensibilité par dermatome, ULNT 1/2/3 (médian/radial/ulnaire), Hoffman, Tromner
- **`mecanosensibilite`** : Lasègue (SLR), PKB (Léri), Slump, ULTT 1/2/3/4
- **`testsSpecifiques`** : 30+ tests cliniques par zone (épaule : Bear Hug, Belly Press, ERLS, IRLS, Apprehension/Relocation, O'Brien, etc. — genou : Lachman, Tiroir, Thessaly, McMurray, Apley, Renne, Noble — hanche : FADDIR, FABER, Thomas, Ober — lombaire : Cluster Laslett, Sultive, Extension-Rotation — cheville : Talar Tilt, Kleiger, Squeeze — cervical : Spurling, Adson, Roos)
- **`scores`** : EVN, EVA, PSFS (3 activités personnalisables), Oxford Shoulder Score, Constant-Murley, DASH, Rowe, HOOS, OSS, IKDC, KOOS, FFI, EIFEL, NDI, FABQ, HAD, DN4, CSI, SPPB, Tinetti
- **`contratKine`** : objectifsSMARTItems (avec dateCible), autoReeducation, frequenceDuree, conseils
- **`narrativeReport`** (mode vocal) : `sections[8]` + `transcription` brute
- **`silhouetteData`** : annotations sur silhouette anatomique (PNG/SVG)
- **`documents`** : `BilanDocument[]` — base64 d'images/PDFs masqués + `originalData` non masqué + flag `masked`

### B.3 — IndexedDB local

`src/services/db.ts` (non lu in extenso, référencé par les composants) maintient les mêmes tables que Supabase, plus :
- Cache de PDF générés (`pdfCache.ts`)
- Récupération mode vocal interrompu (`vocalRecoveryDB.ts`)
- Audit local avant sync (`AICallAuditEntry`, `LetterAuditEntry`)

### B.4 — Données envoyées au LLM

Ce qui sort effectivement du poste vers Anthropic / OpenAI :
- **Anonymisé** : nom/prénom remplacés par `[PATIENT]` ou placeholders ; date de naissance → âge ; sexe conservé ; profession + sport + antécédents soumis au scrub final
- **Conservé tel quel** : toute la donnée clinique (EVN, scores, drapeaux, résultats de tests, mobilités en degrés, force MRC, narrative report, transcription audio brute en mode vocal)
- **Conditionnel** : documents `BilanDocument` (base64) — uniquement si `masked === true` ou si l'utilisateur a explicitement consenti via `UnmaskedDocumentsError` (`claudeSecure.ts:50-57`)

### B.5 — Rétention

`src/utils/retention.ts` (227 lignes) implémente la durée légale de conservation : 20 ans après dernier acte (FR + borne supérieure cantonale CH), avec règle « jusqu'à 28 ans » pour les patients mineurs au dernier acte. **Module pur, non branché à l'app actuelle** (lignes 13-17 du commentaire de tête : « Aucun composant ne l'utilise actuellement »).

---

## Annexe C — Synthèse des familles fonctionnelles

| Famille | Fonctionnalités | Note |
|---|---|---|
| **Infrastructure** (auth, settings, sync) | F1, F2, F3 | 🟢 — pas de transformation clinique |
| **Saisie clinique structurée** | F4, F5, F6 | 🟢 — restitution sans interprétation |
| **Saisie clinique IA** | F7 (vocal extraction) | 🔴 — extraction sémantique structurée |
| **Sécurité données** | F8, F9 | 🟢 — protection RGPD/HDS |
| **IA clinique principale** | F10, F11, F12, F15, F16 | 🔴 — diagnostic / plan / évolution / courriers cliniques |
| **IA clinique adjacente** | F13, F14 | 🟡 — finalité interprétative ambiguë |
| **Restitution PDF** | F17, F18, F19 | mixte — F19 🟢, F17 🟡, F18 🔴 |
| **Visualisation** | F20 | 🟡 — selon étiquetage UI |

---

## Annexe D — Flux d'audit RGPD existants

L'app a deux journaux d'audit déjà en place et liés en table Supabase :
- `letter_audit` (table) ↔ `LetterAuditEntry` (`src/types/index.ts:323-333`) — métadonnées des courriers IA
- `ai_call_audit` (table) ↔ `AICallAuditEntry` (`src/types/index.ts:351-365`) — métadonnées de **tous** les appels Claude (catégorie + patient_key + pseudonymized + scrubReplacements + has_documents + documents_unmasked + model_used + prompt_length + result_length + success)

Catégories tracées (`AICallCategory`, `src/types/index.ts:339-349`) : `letter`, `bilan_analyse`, `bilan_analyse_refine`, `bilan_evolution`, `bilan_intermediaire`, `fiche_exercice`, `pdf_bilan`, `pdf_analyse`, `note_seance_mini`, `api_key_test`. La catégorie `voiceBilanClient.extractBilanFromTranscription` n'apparaît pas dans cette enum — à vérifier (peut être un trou de traçabilité).

---

**Fin de la cartographie.**

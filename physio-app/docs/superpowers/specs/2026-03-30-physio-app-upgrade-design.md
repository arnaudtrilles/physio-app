# Design Spec — PhysioApp Upgrade Nec Plus Ultra
**Date:** 2026-03-30
**Statut:** Approuvé
**Périmètre:** Refonte UX/UI + 5 bilans + persistence + module IA Claude

---

## 1. Contexte

Application React/TypeScript (Vite) de bilan physiothérapeutique pour kinésithérapeutes. Mobile-first (430px). Stack : React 19, TypeScript 5, jsPDF, html2canvas, Web Speech API. Actuellement : 1 bilan (Épaule), données en mémoire vive (perdues au refresh), pas d'IA.

**Objectif :** Élever l'app au niveau "nec plus ultra" — interface premium médicale, 6 bilans complets, persistence totale, module IA d'analyse clinique intégré.

---

## 2. Direction visuelle validée

**Style : Clean Medical / Light Mode**
- Fond `#f8fafc`, surfaces blanches, bleu médical `#1e3a8a` / `#2563eb`
- Typographie Inter, hiérarchie nette, espacement généreux
- Icônes SVG stroke-only (zéro emoji dans l'UI clinique)
- Animations fluides : slide + fade sur les transitions d'écrans
- Micro-interactions : feedback immédiat sur chaque action (toast, states)
- Ombres légères multicouches pour la profondeur
- Badges colorés pour les états (amélioration, scores, flags)

---

## 3. Axe 1 — Persistence localStorage

### Hook custom `useLocalStorage`
```typescript
// src/hooks/useLocalStorage.ts
function useLocalStorage<T>(key: string, initialValue: T): [T, (value: T) => void]
```

### Clés stockées
| Clé | Contenu |
|-----|---------|
| `physio_db` | `BilanRecord[]` — tous les patients et bilans |
| `physio_profile` | `{ nom, prenom, profession, photo }` |
| `physio_api_key` | Clé Anthropic (obfusquée, jamais loguée) |
| `physio_bilan_draft` | Brouillon bilan en cours (auto-save temps réel) |

### Comportement
- Auto-save à chaque mutation d'état (via `useEffect` sur les dépendances)
- Hydratation au mount depuis localStorage
- Indicateur discret "Sauvegardé" (toast 2s) après toute écriture
- Gestion des erreurs (quota dépassé) avec message utilisateur

---

## 4. Axe 2 — 6 bilans complets

### Composants à créer / maintenir

#### BilanEpaule.tsx (existant — refactoring mineur)
Scores : OSS, Constant-Murley, DASH, Rowe, PSFS, HAD, DN4
Tests : spécifiques épaule

#### BilanCheville.tsx (nouveau — PDF Entorse de Cheville)
Structure :
- Douleur (EVN, constante/intermittente, nocturne, dérouillage)
- Red Flags (TTT actuel, antécédents, comorbidités, 5D 3N non applicable)
- Critères d'Ottawa (5 items Oui/Non)
- Antécédents d'entorse (même cheville + autre)
- Yellow Flags (croyances, catastrophisme, fear-avoidance, coping, HAD)
- Blue/Black Flags (AT, stress travail, conditions socio-économiques)
- Examen clinique : morphostatique, œdème (technique en 8), fonctionnel, mobilité active/passive
- Tests spécifiques : talo-crurale (ALTD, RALTD, Talar Tilt varus/valgus), syndesmose (Kleiger, Fibular Translation, Squeeze), carrefour postérieur (Grinding, impaction, LFH, Molloy), sub-talaire, médio-tarse (Chopart)
- Force musculaire (G/D)
- Équilibre postural statique (Foot Lift test, BESS) + dynamique (Y Balance test)
- Scores : F-FAAM, Cumberland Ankle Instability Tool, PSFS, autres
- Contrat kiné (objectifs SMART, auto-rééducation)
- Conseils / recommandations

#### BilanGenou.tsx (nouveau — PDF Genou)
- Douleur + Red Flags + Yellow Flags + Blue/Black Flags (identiques structure)
- Examen clinique : morphostatique, mobilité active/passive genou + hanche, rachis lombaire (tableau Maj/Mod/Min/Nulle + symptômes)
- Fonctionnel : accroupissement, sauts, course
- Force musculaire (ilio-psoas, quadriceps, ischios, abducteurs, adducteurs, rotateurs, triceps sural, tibial antérieur, transverse, droits abdomen, obliques)
- Tests ligamentaires : Lachman, tiroir antérieur/postérieur, LCL, LCM
- Neurologique + mécanosensibilité (Lasègue, PKB, Slump)
- Examen mouvements répétés
- Tests spécifiques : Thessaly, Renne, Noble, vague, Hoffa
- Scores : KOOS, F-AKPS, IKDC, ACL-RSI, PSFS, SF-36, HAD, DN4
- Contrat kiné + conseils

#### BilanHanche.tsx (nouveau — PDF Hanche)
- Douleur + Red Flags + Yellow/Blue/Black Flags
- Examen clinique : morphostatique, mobilité hanche active/passive (flexion, abduction, adduction, extension, RE, RI), rachis lombaire (tableau)
- Modifications des symptômes (position lombo-pelvienne, MI, abducteurs, transverse, répartition poids, ROM, taping, chaussage)
- Fonctionnel : accroupissement, sauts, course
- Force musculaire + neurologique + mécanosensibilité
- Tests spécifiques : FADDIR, FABER, THOMAS, Ober, Cluster LASLETT, Cluster Sultive, HEER, ABD-HEER
- Scores : HOOS, Oxford Hip Score, HAGOS, EFMI, HAD, DN4, ISC, PSFS
- Contrat kiné + conseils

#### BilanCervical.tsx (nouveau — PDF Rachis Cervical)
- Douleur + Red Flags spécifiques cervicaux : **5D 3N** (Dizziness, Drop attacks, Diplopie, Dysarthrie, Dysphagie, Nystagmus, Nausées, Numbness) — critique pour risque artère vertébrale
- Yellow/Blue/Black Flags
- Examen clinique : morphostatique (attitude, tête en avant, torticolis), mobilité cervicale (tableau 10 mouvements : flexion, extension, protrusion, rétraction, rétraction-extension, rotations, inclinaisons)
- Neurologique : réflexes (bicipital, brachio-radial, tricipital), déficit moteur C4-T1, sensibilité (nociceptive, thermique, épicritique), Hoffman
- Mécanosensibilité : ULTT 1 (n. médian), ULTT 2 (n. médian), ULTT 3 (n. radial), ULTT 4 (n. ulnaire)
- Examen mouvements répétés (tableau mouvement / avant / après)
- Tests spécifiques : Spurling, Distraction, Adson, Roos, TA
- Scores : NDI, PSFS, HAD, DN4, Pain Detect, ISC
- Contrat kiné + conseils

#### BilanLombaire.tsx (nouveau — PDF Rachis Lombaire)
- Douleur + Red Flags lombaires (fonction vésicale/anale — syndrome queue de cheval)
- Yellow/Blue/Black Flags
- Examen clinique : morphostatique (déformation lombaire : cyphose/lordose/shift), mobilité lombaire (tableau 8 mouvements)
- Neurologique : réflexes (quadriciptal, achiléen), déficit moteur L2-S4, Babinski, sensibilité
- Mécanosensibilité : Lasègue, PKB, Slump
- Examen mouvements répétés (tableau)
- Tests spécifiques : Cluster LASLETT, Test Extension-Rotation, Prone Instability Test, TA
- Scores : Start Back Screening Tool, Orebro, FABQ, HAD, EIFEL-Roland Morris, DN4, Pain Detect, ISC, PSFS
- Contrat kiné + conseils

### Architecture commune des composants bilan
Tous les composants bilan suivent le pattern de `BilanEpaule` :
- `forwardRef` exposant `getBilanData(): BilanData`
- Sections collapsibles avec `useState` pour la navigation dans les longs formulaires
- Champ voix (microphone) sur les zones de texte libre
- Validation en temps réel (indicateurs visuels rouge/vert)
- Sauvegarde automatique du brouillon

---

## 5. Axe 3 — Routing zone corporelle → bilan adapté

### Mapping zone → composant
```typescript
const ZONE_TO_BILAN: Record<string, BilanType> = {
  'Épaule Droite': 'epaule',
  'Épaule Gauche': 'epaule',
  'Genou Droit': 'genou',
  'Genou Gauche': 'genou',
  'Hanche Droite': 'hanche',
  'Hanche Gauche': 'hanche',
  'Cheville Droite': 'cheville',
  'Cheville Gauche': 'cheville',
  'Cervicales': 'cervical',
  'Rachis Lombaire': 'lombaire',
  // Toutes autres zones → bilan générique
}
```

### Flow complet
1. Dashboard → "Nouveau bilan"
2. Identité patient (nouveau / existant)
3. Infos générales (profession, sport, antécédents)
4. Silhouette → sélection zone + EVN + dessin
5. **Bilan spécifique** (composant selon la zone)
6. **Module Analyse IA** (si clé API configurée)
7. Export PDF

---

## 6. Axe 4 — Module IA Claude (Approche A)

### Composant `BilanAnalyseIA.tsx`

#### Déclenchement
Après validation du bilan spécifique, si `apiKey` présente dans localStorage.

#### Appel API
```typescript
import Anthropic from '@anthropic-ai/sdk'

const client = new Anthropic({ apiKey, dangerouslyAllowBrowser: true })

const response = await client.messages.create({
  model: 'claude-opus-4-6',
  max_tokens: 1500,
  messages: [{
    role: 'user',
    content: buildClinicalPrompt(bilanData, patientData)
  }]
})
```

#### Prompt structure `buildClinicalPrompt()`
```
Tu es un assistant clinique expert en physiothérapie. Analyse ce bilan et fournis :
1. Un diagnostic physiothérapeutique principal
2. Trois hypothèses cliniques classées par probabilité (H1 > H2 > H3) avec % estimé
3. Un plan de prise en charge détaillé par phases

DONNÉES DU BILAN :
- Patient : [nom, âge, profession, loisirs]
- Zone : [zone corporelle]
- EVN : [pire / mieux / moyen]
- Douleur : [constante/intermittente, nocturne, dérouillage]
- Red Flags : [liste des positifs]
- Yellow Flags : [liste des positifs]
- Tests cliniques : [résultats]
- Scores : [valeurs]
- Contexte : [antécédents, imagerie]

Réponds en JSON structuré :
{
  "diagnostic": { "titre": "", "description": "" },
  "hypotheses": [
    { "rang": 1, "titre": "", "probabilite": 78, "justification": "" },
    ...
  ],
  "prisEnCharge": [
    { "phase": "Phase aiguë J1-J5", "titre": "", "detail": "" },
    ...
  ],
  "alertes": [] // Red flags nécessitant orientation urgente
}
```

#### Interface
- Hero card bleu navy avec icône SVG neural
- Skeleton loading animé pendant l'appel API (1-3s)
- Section "Diagnostic principal" (fond bleu clair)
- Section "Hypothèses cliniques" H1/H2/H3 avec barres de probabilité
- Section "Prise en charge" — étapes numérotées avec phases temporelles
- Section "Alertes" (si red flags critiques) — fond rouge clair
- Footer disclaimer clinique
- Bouton export PDF bilan complet + analyse

#### Gestion d'erreurs
- Pas de clé API → prompt invitation configuration profil
- Erreur réseau → retry automatique x2, puis message d'erreur
- Quota dépassé → message clair avec fallback (prompt clipboard)

### Configuration dans l'écran Profil
```
Section "Intelligence Artificielle" dans le profil :
- Champ clé API (masquée, type password)
- Bouton "Tester la connexion"
- Indicateur statut (validé / invalide / non configuré)
- Lien vers console.anthropic.com
- Note de confidentialité
```

---

## 7. Axe 5 — Raffinements UI

### Animations et transitions
- Transition entre écrans : `slide-left` (avancer) / `slide-right` (retour) — CSS transform translateX
- Apparition des cards : `fade-in-up` (opacity 0→1 + translateY 10px→0, 200ms)
- Sections collapsibles : `max-height` transition smooth

### Composants UI améliorés
- **Toast notifications** : `useToast()` hook — Sauvegardé, Erreur, Succès
- **Loading skeletons** : pour le chargement IA et les listes de patients
- **Badge de statut** : indicateur "Sauvegardé ✓" discret en haut à droite
- **Boutons** : états hover/active/loading, ripple effect subtil
- **Champs de formulaire** : focus ring bleu, validation inline
- **Sliders EVN** : redesign avec gradient vert→rouge + valeur numérique proéminente
- **Progress bar** : indicateur d'avancement du bilan (étapes 1/6... 6/6)

### Navigation bottom bar
- Icônes SVG uniformes (stroke-only, 1.5px)
- Active state : fond bleu clair + couleur bleue
- Badge numérique sur "Patients" si nouveaux bilans

### Cards patients
- Avatar coloré avec initiales (maintenu)
- Amélioration % avec couleur sémantique (vert/orange/rouge)
- Dernière zone + date du dernier bilan
- Indicateur de progression (sparkline mini)

---

## 8. Structure de fichiers cible

```
src/
├── components/
│   ├── bilans/
│   │   ├── BilanEpaule.tsx       (refactorisé)
│   │   ├── BilanCheville.tsx     (nouveau)
│   │   ├── BilanGenou.tsx        (nouveau)
│   │   ├── BilanHanche.tsx       (nouveau)
│   │   ├── BilanCervical.tsx     (nouveau)
│   │   ├── BilanLombaire.tsx     (nouveau)
│   │   └── BilanGenerique.tsx    (nouveau — zones sans bilan dédié)
│   ├── BilanAnalyseIA.tsx        (nouveau)
│   ├── BodySilhouette.tsx        (maintenu)
│   ├── StaticBodyVisual.tsx      (maintenu)
│   └── ui/
│       ├── Toast.tsx             (nouveau)
│       └── LoadingSkeleton.tsx   (nouveau)
├── hooks/
│   ├── useLocalStorage.ts        (nouveau)
│   ├── useSpeechRecognition.ts   (maintenu)
│   └── useToast.ts               (nouveau)
├── utils/
│   ├── pdfGenerator.ts           (amélioré)
│   ├── bilanRouter.ts            (nouveau — mapping zone→composant)
│   └── clinicalPrompt.ts         (nouveau — construction prompt IA)
├── types/
│   └── index.ts                  (nouveau — types centralisés)
└── App.tsx                       (refactorisé)
```

---

## 9. Types TypeScript centralisés

```typescript
// src/types/index.ts

export type BilanType = 'epaule' | 'cheville' | 'genou' | 'hanche' | 'cervical' | 'lombaire' | 'generique'

export interface BilanRecord {
  id: number
  nom: string
  prenom: string
  dateBilan: string
  dateNaissance: string
  zoneCount: number
  evn?: number
  zone?: string
  pathologie?: string
  avatarBg?: string
  status?: 'incomplet' | 'complet'
  bilanType?: BilanType
  bilanData?: Record<string, unknown>
  analyseIA?: AnalyseIA
}

export interface AnalyseIA {
  generatedAt: string
  diagnostic: { titre: string; description: string }
  hypotheses: Array<{ rang: number; titre: string; probabilite: number; justification: string }>
  priseEnCharge: Array<{ phase: string; titre: string; detail: string }>
  alertes: string[]
}

export interface ProfileData {
  nom: string
  prenom: string
  profession: string
  photo: string | null
}
```

---

## 10. Contraintes et non-objectifs

- **Pas de backend** — 100% frontend, localStorage uniquement
- **Pas d'authentification** — usage mono-praticien
- **Pas de refonte complète** — on améliore ce qui existe, on n'efface pas
- **Mobile-first conservé** — 430px max-width container
- **Stack conservée** — React 19, TypeScript, Vite, jsPDF

---

## 11. Critères de succès

- [ ] Refresh de page → toutes les données présentes
- [ ] 6 zones corporelles → 6 bilans différents avec tous les champs des PDFs
- [ ] Module IA génère diagnostic + 3 hypothèses + plan de traitement en < 5s
- [ ] Export PDF inclut l'analyse IA
- [ ] Aucun emoji dans l'UI clinique (pictogrammes SVG uniquement)
- [ ] Animations fluides sur toutes les transitions
- [ ] App utilisable avec une seule main sur mobile

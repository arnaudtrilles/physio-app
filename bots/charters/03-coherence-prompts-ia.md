# Charter 03 — Cohérence des prompts IA

## Mission
Auditer la cohérence et la robustesse des prompts envoyés à Claude / Whisper. Détecter contradictions internes, règles qui se court-circuitent, vocabulaire qui dérive, et zones où l'IA peut produire un output inutilisable.

## Contexte
L'app utilise Claude pour 6 usages principaux :
1. **Bilan analyse IA** → 3 hypothèses + plan PEC en JSON (`buildClinicalPrompt`)
2. **Bilan évolution IA** → comparaison entre bilans (`buildEvolutionPrompt`)
3. **Note intermédiaire** → résumé inter-bilans (`buildIntermediairePrompt`)
4. **Rapport PDF** → 9 sections texte structuré (`buildPDFReportPrompt`)
5. **Rapport narratif vocal** → 8 sections JSON depuis transcription (`generateNarrativeReport` dans voiceBilanClient.ts)
6. **Courriers** → différents types de courriers médicaux (`letterPrompts.ts` + `letterZonePrompts.ts`)

Règle métier critique : **profession** doit être cohérente — `physiothérapeute` (CH) ou `kinésithérapeute` (FR), avec interdiction explicite de l'autre + des abréviations « kiné » / « physio ».

## Ce que tu dois chercher

### A. Règles contradictoires dans un même prompt
- Une règle qui dit "X obligatoire" et une autre qui dit "X interdit" → l'IA va en violer une.
- Une règle qui s'applique à toute la sortie et une exception qui n'est pas couverte.
- Conflits entre règles numériques (ex: "20 règles absolues" mais en réalité 22).

### B. Désalignement narrative vocal ↔ PDF
- `generateNarrativeReport` produit 8 sections (anamnèse, sympto, drapeaux, examen, tests, diagnostic, projet, conseils).
- `buildPDFReportPrompt` attend 9 sections (Profil, Anamnèse, Sympto, Drapeaux, Examen, Tests, Synthèse, Projet, Conclusion).
- Vérifier que le mapping 1:1 dans le prompt PDF (commit 56d7d2f) est cohérent avec ce que produit le narratif.

### C. Vocabulaire profession
Pour CHAQUE prompt :
- La règle interdiction kiné/physio est-elle formulée de la même manière ?
- Reste-t-il des occurrences hardcodées de « kinésithérapeute » ou « physiothérapeute » qui ne sont pas paramétrées par `${role}` ?
- Les exemples / templates dans le prompt utilisent-ils bien `${role}` plutôt qu'un terme fixe ?

### D. Contraintes de sortie testables
- Les prompts qui exigent du JSON ont-ils un fallback de parsing ? (regex `\`\`\`json` strip, retries…)
- Le prompt impose-t-il EXPLICITEMENT « pas de markdown autour », « commence par `[` » ? Si non, l'IA va parfois ajouter du préambule.

### E. Risques d'hallucination
- Section qui dit « rédige une synthèse » sans donner de garde-fou « UNIQUEMENT à partir des données fournies » → l'IA va broder.
- Section qui demande des pourcentages ou des dates précises → vérifier qu'il y a une règle anti-invention.

### F. Pseudonymisation incohérente
- Le `scrub()` est-il appliqué à TOUS les champs texte libres avant injection ?
- Notamment : `notesLibres`, `narrativeReport.transcription`, contenus de sections narratives.

### G. Longueur / coût
- Quel est le `max_tokens` ? Y a-t-il des prompts qui pourraient produire bien plus que la limite et donc se faire tronquer en plein JSON ? (cassage du parser).
- Quelle taille de contexte d'entrée typique ? Un bilan vocal de 30 min = ~10k tokens de transcription + 10k de prompt = OK, mais 1h ?

## Format de sortie
Mêmes catégories (🔴 / 🟠 / 🟡 / ✅).

Pour chaque finding, citer l'extrait du prompt (≤ 3 lignes) + le risque concret pour l'utilisateur.

## Fichiers prioritaires
- `src/utils/clinicalPrompt.ts` (le plus gros — ~1200 lignes)
- `src/utils/voiceBilanClient.ts`
- `src/utils/letterPrompts.ts` + `src/utils/letterZonePrompts.ts`
- `src/utils/claudeClient.ts` (parsing / retry)
- `src/utils/claudeModels.ts`

## Limite
≤ 800 mots. Priorité aux risques de **production cassée** (JSON invalide, profession qui dérive, hallucination de tests inexistants).

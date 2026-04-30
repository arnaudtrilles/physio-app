# Charter 02 — Sécurité PHI / RGPD / nLPD / HDS

## Mission
Auditer le traitement des **données patient identifiantes (PHI)** : pseudonymisation, transit vers les API IA externes, persistance locale, et fuite potentielle dans les logs/erreurs. L'app cible FR (RGPD) + CH (nLPD), avec hébergement Vercel + Supabase. Pas de certification HDS active.

## Contexte
- Données sensibles : nom, prénom, date de naissance, adresse, profession, téléphone, antécédents médicaux, contenus de transcription vocale.
- L'app appelle Anthropic (Claude) et OpenAI (Whisper transcription) via des proxies serverless `/api/claude`, `/api/transcribe`.
- Une fonction `scrub` / `anonymizePatientData` doit retirer toute PHI avant tout envoi à l'IA.
- Les bilans + documents PDF sont stockés en base locale (IndexedDB via Dexie ?) + synchro Supabase.

## Ce que tu dois chercher

### A. Fuite PHI vers les API IA
Pour CHAQUE appel à `callClaude(...)`, `transcribeAudio(...)`, ou tout fetch vers `/api/claude` ou `/api/transcribe` :
1. Vérifier que le payload passe par `scrub` ou équivalent.
2. Reporter tout call site où le nom/prénom/âge non-pseudonymisé peut être envoyé.
3. Cas insidieux : un `notesLibres` saisi par le kiné peut contenir le vrai nom du patient — est-il scrubbé ?

### B. Fuite PHI dans les logs
- `console.log`, `console.error`, `console.warn` qui dump un objet contenant nom/prénom/dob.
- `Sentry.captureException(err, { contexts: { patient } })` ou équivalent.
- Messages d'erreur affichés à l'écran qui leak des données.

### C. Stockage base locale
- IndexedDB / localStorage : qu'est-ce qui est stocké en clair ?
- Pas d'attente de chiffrement at-rest (browser ne fournit pas de chiffrement IndexedDB), mais vérifier qu'aucun champ sensible inutile est persisté (audio brut ?).

### D. Synchronisation Supabase
- Auth : RLS (Row-Level Security) par `user_id` ? Vérifier que les requêtes filtrent sur `auth.uid()`.
- Sont-ce les VRAIES données patient ou des hash/IDs qui sont synchronisées ? Si vraies données → exigence HDS pour la France (audit warning, pas blocage si docs RGPD/nLPD à jour).

### E. Headers + transit
- `/api/claude` et `/api/transcribe` : CORS configuré strict (whitelist de domaines) ?
- Les clés API Anthropic / OpenAI sont-elles côté client ? (Si oui = fuite critique).

### F. Export PDF / partage
- Le PDF généré contient-il bien le nom du patient en clair (normal pour le PDF qui sort de l'app) — vérifier qu'on ne télécharge PAS le PDF non-pseudonymisé sur un service tiers.

### G. Effacement / droit à l'oubli RGPD
- Existe-t-il un flow "supprimer ce patient" qui purge tout : bilans, documents, narrativeReport.transcription, logs ?
- Synchro Supabase : cascade DELETE ?

## Format de sortie
Mêmes catégories que charter 01 (🔴 / 🟠 / 🟡 / ✅), focus sécurité.

Pour chaque finding 🔴, donner explicitement :
- **Quelle PHI fuit** (nom, transcription, etc.)
- **Où** (file:line)
- **Vers quoi** (API externe, localStorage, log…)
- **Mitigation immédiate** (ajouter scrub, retirer log, etc.)

## Fichiers prioritaires
- `src/utils/claudeClient.ts`, `src/utils/voiceBilanClient.ts`
- `src/utils/clinicalPrompt.ts` (chercher `scrub` et `anonymizePatientData`)
- `src/utils/letterPrompts.ts` + `src/utils/letterZonePrompts.ts`
- `api/*.ts` ou `api/*.js` (proxies serverless)
- `src/utils/supabase*.ts`, `src/utils/pdfPersistence.ts`
- `src/types/index.ts` — chercher `Patient`, `BilanRecord`
- Fichiers de doc RGPD/HDS racine du repo

## Limite
≤ 800 mots, priorité aux fuites réelles vs hypothétiques.

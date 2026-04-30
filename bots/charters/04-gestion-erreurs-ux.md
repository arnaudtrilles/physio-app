# Charter 04 — Gestion d'erreurs et feedback UX

## Mission
Auditer comment l'app gère les erreurs (réseau, IA, parsing, permissions) et ce que l'utilisateur voit en retour. Détecter erreurs silencieuses, écrans figés, messages techniques exposés au kiné, et flows où l'utilisateur perd son travail.

## Contexte
L'utilisateur est un thérapeute qui travaille en cabinet, parfois en mobilité (PWA), avec connexion intermittente. Une erreur silencieuse pendant un enregistrement vocal de 30 min = catastrophe.

## Ce que tu dois chercher

### A. Erreurs silencieuses
- `try { ... } catch { /* swallow */ }` ou `catch (e) { /* nothing */ }`.
- Promesses non-await/non-catch (`fetch(...).then(...)` sans `.catch`).
- `useEffect(() => { fetchData() }, [])` sans gestion d'erreur sur fetchData.

### B. Pertes de travail
Scénarios à vérifier :
- Enregistrement vocal en cours + perte de connexion → l'audio est-il préservé localement avant envoi à Whisper ?
- Génération PDF qui plante au milieu → données du bilan préservées ?
- Multiples onglets ouverts sur le même patient → quelle source de vérité ?
- Refresh page pendant la saisie → IndexedDB autosave ? localStorage ?

### C. Messages d'erreur exposés
- Stack traces brutes affichées au kiné (`error.message` injecté dans la modale).
- Codes HTTP techniques (`fetch failed: 502`) sans traduction.
- Erreurs Anthropic (`Anthropic Error: rate_limit_exceeded`) sans humanisation.

### D. États de chargement bloquants
- Spinners qui peuvent rester infinis si le réseau timeout sans erreur (pas de timeout côté client ?).
- Boutons « Confectionner » qui restent disabled après erreur réseau.
- Modales qui ne se ferment plus si une action throw.

### E. Permissions non-gérées
- Microphone refusé → message clair ?
- Caméra refusée (scan documents) → fallback fichier upload ?
- Notifications PWA refusées → l'app continue à fonctionner ?
- IndexedDB plein → message ?

### F. Race conditions
- Click rapide multiple sur « Confectionner » → 2 appels Claude en parallèle, 2 résultats qui s'écrasent ?
- Sauvegarde auto pendant qu'une mutation utilisateur est en cours.
- Navigation entre patients pendant un appel API qui retourne plus tard et écrase l'état.

### G. Offline-first
- L'app est PWA. Service worker en place ?
- Que se passe-t-il offline : peut-on créer un bilan ? Sera-t-il synchronisé au retour ?
- Conflit de sync (modification offline + modification autre device) ?

### H. Validation entrées
- Champs date qui acceptent des dates impossibles (1900-01-01 par défaut, 2099-…) ?
- Numéros téléphone non formatés ?
- Saisies trop longues qui cassent le PDF ou l'IA prompt ?

## Format de sortie
Mêmes catégories (🔴 / 🟠 / 🟡 / ✅).

Pour chaque finding, indiquer le **scénario utilisateur** qui déclenche le problème (raconter en 1 phrase un cas réel : "kiné en cabinet, perte 4G en plein enregistrement, …").

## Fichiers prioritaires
- `src/components/bilans/BilanVocalMode.tsx` (recovery logic critique)
- `src/utils/claudeClient.ts`, `src/utils/voiceBilanClient.ts` (retry / timeout ?)
- `src/utils/pdfGenerator.ts` (plantage en plein render)
- `src/components/letters/LetterGenerator.tsx`
- `src/utils/supabaseSync.ts`
- `vite.config.ts` ou `vite-plugin-pwa` config — service worker

## Limite
≤ 800 mots. Priorité aux scénarios qui **font perdre du travail au kiné** ou exposent des messages techniques.

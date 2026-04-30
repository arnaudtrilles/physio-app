# Charter 06 — Edge cases bilans & PDF

## Mission
Trouver les cas de bord qui ne plantent pas, mais produisent des **rendus dégradés** ou des **outputs cliniquement faux** — la pire catégorie de bug parce que le kiné les signe sans s'en rendre compte.

## Contexte
Le PDF clinique est signé par le kiné et envoyé au médecin. Une dérive (mauvais sexe, mauvaise zone, valeur inversée) peut avoir un impact réel sur le patient.

## Ce que tu dois chercher

### A. Sexe / accords grammaticaux
- Si `patient.sexe = 'inconnu'` → fallback masculin (correct selon les prompts) ?
- Si `patient.sexe` change après création (kiné corrige) → re-générations futures cohérentes ?
- Patient mineur : termes adaptés ? Pas de "âgé(e)" si 8 ans ?
- Génération PDF qui mélange les pronoms entre sections (commence "elle" puis "il") — détecter prompts qui n'imposent pas la cohérence inter-section.

### B. Zone bilatérale
- Bilan Cheville droite + Cheville gauche du même patient → 2 bilans distincts ou 1 ?
- Si même patient, même zone, deux côtés → confusion possible dans le PDF (« le patient présente une douleur » sans préciser le côté) ?

### C. EVN / valeurs numériques
- EVN mieux > EVN pire (saisie inversée par erreur) → l'app détecte ?
- EVN > 10 ou négatif → validation ?
- Champs qui acceptent virgule ET point comme séparateur décimal → parsing variable.

### D. Dates
- Date de bilan dans le futur → autorisé ?
- Date de naissance dans le futur ou il y a > 110 ans → autorisé ?
- Calcul d'âge : timezone shift → 1 an de différence selon que le serveur est UTC ou Europe/Paris.

### E. Champs vides vs « non renseigné »
- Un champ qui n'a JAMAIS été ouvert → forme dans la donnée : `undefined`, `''`, `'N/R'` ?
- Le prompt PDF traite-t-il ces 3 cas pareil ?
- Un test renseigné « négatif » doit produire « négatif » dans le PDF, pas « non renseigné » (règle 1 du prompt PDF).

### F. Bilan vocal — cas de bord
- Transcription vide ou < 50 mots → l'app génère quoi ?
- Transcription qui ne mentionne aucune zone anatomique alors qu'on est dans BilanGenou → IA va-t-elle inventer ?
- Transcription qui mentionne 2 zones (« on a fait genou et hanche ») dans un seul bilan → quelle zone est attribuée ?

### G. Évolution / comparaison
- Bilan d'évolution sans bilan initial → message clair ou erreur cryptique ?
- Bilan initial supprimé après évolution → l'évolution reste cohérente ?
- Plusieurs bilans le même jour → ordre stable ?

### H. Documents attachés
- Document de 10 Mo → upload + persistance OK ?
- PDF protégé par mot de passe attaché → preview cassée ?
- Image rotation EXIF iPhone → s'affiche correctement ?

### I. Caractères spéciaux & encodage
- Nom patient avec apostrophe (`O'Brien`) → injection prompt cassé ?
- Caractères accentués dans noms (Müller, François) → PDF rend bien ?
- Emoji dans notes libres → cassent le PDF ?

### J. Multi-patients homonymes
- Deux patients « Jean Dupont » → l'UI permet de les distinguer (DOB visible) ?
- Recherche patient → fuzzy match ou strict ?

## Format de sortie
Mêmes catégories (🔴 / 🟠 / 🟡 / ✅).

Pour les findings 🔴 (cliniques/PHI), indiquer **l'impact patient** concret.

## Fichiers prioritaires
- `src/utils/clinicalPrompt.ts` (les règles métier)
- `src/components/bilans/Bilan*.tsx`
- `src/components/PatientForm*.tsx` ou équivalent
- `src/utils/pdfGenerator.ts`
- `src/utils/dateUtils.ts` (s'il existe)
- `src/components/BilanEvolutionIA.tsx`

## Limite
≤ 800 mots. Priorité aux **erreurs cliniquement fausses** (mauvais côté, mauvais sexe, mauvaise valeur).

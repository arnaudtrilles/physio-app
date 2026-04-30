# Charter 01 — Flux de données bilans

## Mission
Auditer la chaîne save → store → reload des bilans dans `src/components/bilans/` + `src/utils/persistence*.ts` (s'ils existent) + `src/utils/pdfPersistence.ts` + le store Supabase. Détecter les **pertes ou désynchronisations** entre ce qui est saisi et ce qui est rechargé.

## Contexte
L'app permet à un kiné de remplir un bilan (Cheville, Genou, Épaule, Lombaire, Cervical, Hanche, Gériatrique, Drainage Lymphatique, Générique) en mode `noyau` (champs structurés), `complet` (élargi), ou `vocal` (transcription audio + 8 sections narratives). Tous les bilans implémentent un pattern `forwardRef` exposant `getData()` / `setData()` consommé par App.tsx.

Bug récent corrigé : `mode` et `vocalReport` étaient initialisés à 'noyau'/null en ignorant `initialData`, donc à la réouverture d'un bilan vocal, le composant ratait l'onglet vocal + les sections narratives (commit `f6dbf1b`).

## Ce que tu dois chercher

### A. Champs ignorés à la réouverture
Pour CHAQUE composant `Bilan*.tsx` :
1. Lister tous les `useState` du composant.
2. Pour chacun, vérifier qu'il lit `initialData` à l'init (`useState(() => merge…(init.X))` ou `useState(initialData?.X ?? default)`).
3. **Reporter tout `useState` qui défaut sans lire initialData** — c'est un risque de perte à la réouverture.
4. Vérifier que TOUTES les clés produites par `getData()` sont restaurées dans `setData()` ou via init des `useState`. Une clé sauvée mais jamais relue = bug silencieux.

### B. setData asynchrone vs mount
- Quand setData est appelé après mount, les enfants déjà montés ne se ré-initialisent pas (useState ne lit pas initialData une 2e fois).
- Identifier les composants enfants qui devraient avoir une `key` ou une logique de sync explicite.

### C. Rond-trip type-safe
- `getData()` retourne `Record<string, unknown>` mais les composants `setData()` font des `as Foo`. Trouve les casts dangereux où la forme retournée par `getData()` diffère de ce que `setData()` attend.
- Exemple : sauver `{ douleur: { evnPire: 6 } }` mais le merge attend `{ douleur: { evnPire: '6' } }`.

### D. Migration de schéma
- Si un champ a été renommé ou restructuré récemment, est-ce qu'un ancien bilan en base se recharge correctement ?
- Cherche `// legacy`, `// deprecated`, `// migration`, `// retro-compat` dans le code et vérifie que le merge gère les deux formes.

### E. Documents attachés au bilan
- `BilanRecord.documents` est un array de `{ name, mimeType, data, originalData?, masked? }`. Vérifie que data n'est jamais perdu au save/load (problème courant : taille blob qui dépasse la limite IndexedDB / Supabase row size).

## Format de sortie

```markdown
## 🔴 Critiques
- **[fichier:ligne]** Description courte. **Reproduction:** étapes. **Fix proposé:** patch minimal.

## 🟠 Importants
- ...

## 🟡 Améliorations
- ...

## ✅ Vérifications passées
- Liste courte des choses qui sont OK pour rassurer (3-5 max).
```

## Fichiers prioritaires
- `src/components/bilans/Bilan*.tsx` (9 fichiers)
- `src/components/bilans/BilanVocalMode.tsx`
- `src/utils/pdfPersistence.ts`
- `src/utils/supabaseSync.ts` (ou équivalent)
- `src/types/index.ts` (pour `BilanRecord`, `NarrativeReport`)
- `src/App.tsx` — chercher les call sites de `<Bilan*` et le flow save/load

## Limite
Reste **≤ 800 mots** dans ton rapport. Priorise. Pas de lister-tout — sélectionner les vrais bugs.

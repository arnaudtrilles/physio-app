# Charter 05 — Accessibilité, mobile, ergonomie cabinet

## Mission
Auditer l'usabilité de l'app dans le contexte réel d'un thérapeute en cabinet : iPad/iPhone (PWA iOS Safari), mains parfois mouillées/gantées, peu de temps entre patients, lumière ambiante variable.

## Contexte
- App déployée sur Vercel, installable comme PWA.
- Cible principale : kiné FR, physio CH.
- Devices typiques : iPhone (sortie en cabinet), iPad (consultation), MacBook (rédaction courriers).
- Pas de stylet attendu — tout doit fonctionner au doigt.

## Ce que tu dois chercher

### A. Tap targets trop petits
- Boutons / liens / icônes avec hitbox < 44×44 px (norme Apple HIG).
- Boutons collés (pas de marge entre eux) → mistap.
- Icônes seules sans label texte ni aria-label.

### B. Inputs mobile défaillants
- `<input type="text">` qui devrait être `type="number"`, `type="tel"`, `type="email"` (mauvais clavier).
- Champs date non-utilisable : `<input type="date">` est-il bien partout pour les dates ?
- Champs sans `inputmode` sur mobile.
- Auto-correction iOS qui pourrit le contenu médical (« kiné » → « finit ») — `autoCorrect="off"` requis.
- Auto-cap qui met une majuscule à chaque mot.

### C. iOS Safari / PWA quirks
- `100vh` qui inclut la barre URL et coupe le contenu sur iOS — utiliser `dvh` ou env(safe-area).
- `position: fixed` qui rebondit avec l'overscroll.
- Iframe `data:` URL qui ne montre que la 1ʳᵉ page (déjà fixé pour les documents — vérifier qu'on a pas d'autre cas).
- `<a download="...">` qui ne marche pas sur data: URL (déjà fixé pour les documents — autres usages ?).
- Microphone : permissions PWA iOS sont fragiles, vérifier qu'on demande explicitement.

### D. Performance perceived
- Re-renders coûteux quand on tape dans un textarea (memo manquant) → lag sur iPhone moyen.
- Listes de patients/bilans non virtualisées qui rament au-delà de 200 entrées.
- Bundle JS > 1.7 MB (vu dans build) — temps de boot ?
- Images non optimisées dans documents (capture iPhone = 4 Mo).

### E. Accessibilité de base
- Contraste texte < 4.5:1 (WCAG AA).
- Couleurs portant l'information seules (rouge/vert sans icône).
- Focus visible (`:focus-visible` outline) — au clavier sur Mac, peut-on naviguer ?
- Modales sans focus trap (Tab sort de la modale).
- Boutons icon-only sans `aria-label`.

### F. Workflows multi-tâches
- Le kiné parle au patient pendant qu'il saisit : voice dictation marche-t-elle dans tous les champs longs ?
- Le kiné est interrompu : peut-il reprendre une saisie là où il l'a laissée ?
- Liste de tâches : l'app sauve-t-elle automatiquement ? Indicateur visuel "✓ Sauvegardé" ?

### G. Densité d'information
- Sur iPhone SE (375 px), tout passe ?
- Tableaux qui débordent en x sans scroll ?
- Modales qui prennent 95 % de l'écran et qu'on ne peut plus défiler ?

## Format de sortie
Mêmes catégories (🔴 / 🟠 / 🟡 / ✅).

Pour chaque finding, indiquer le **device/OS** où ça se manifeste.

## Fichiers prioritaires
- `src/App.tsx` (layout principal)
- `src/components/letters/LetterGenerator.tsx` (champs nombreux)
- `src/components/bilans/Bilan*.tsx`
- `src/components/DossierDocuments.tsx` (viewer mobile)
- `index.html` (viewport meta)
- `vite.config.ts` (PWA manifest)
- Fichiers CSS / styled / theme

## Limite
≤ 800 mots. Priorité aux **frustrations cabinet** vs problèmes théoriques de perf.

# Refonte UI — Command Center

Branche : `refonte-ui-command-center`
Objectif : refondre l'ergonomie et le design de tout SAUF les bilans et la note de séance.

## Scope

**IN** :
- Dossier patient (vue principale)
- Liste patients
- Accueil / Dashboard
- Profil utilisateur
- Navigation globale
- Design system (tokens couleurs, spacing, typo)

**OUT** :
- `src/components/bilans/**`
- `src/components/NoteSeance.tsx` (le formulaire lui-même)
- `src/components/BilanSortie.tsx`
- Tout ce qui est lié au PDF generator

## Plan en 5 phases

### Phase 1 — Design system foundations
- [ ] Créer `src/design/tokens.ts` (couleurs, spacing, typo, radius, shadows)
- [ ] Créer `src/design/components.tsx` (Button, Card, Badge, Chip, IconButton, BottomSheet, ActionSheet)
- [ ] Vérifier que tout est accessible depuis App.tsx sans casser l'existant

### Phase 2 — Dossier patient Command Center
- [ ] Créer `src/components/patient/PatientHeader.tsx` — header compact sticky
- [ ] Créer `src/components/patient/PatientHeroCard.tsx` — état actuel + CTA "Consultation du jour"
- [ ] Créer `src/components/patient/ZoneTabs.tsx` — tabs zones si multi-zones
- [ ] Créer `src/components/patient/ZoneTimeline.tsx` — timeline condensée
- [ ] Créer `src/components/patient/TimelineCard.tsx` — carte compacte bilan/séance/interm.
- [ ] Créer `src/components/patient/ConsultationChooser.tsx` — bottom sheet choix séance/interm/nouveau bilan
- [ ] Créer `src/components/patient/CardActionsSheet.tsx` — action sheet sur carte (Modifier/Résumé/Supprimer/PDF/Analyser/Fiche)
- [ ] Créer `src/components/patient/PatientAccordions.tsx` — Prescriptions / Documents / Courriers repliés
- [ ] Créer `src/components/patient/PatientDossier.tsx` — orchestrateur qui remplace le bloc "dossier patient" dans App.tsx
- [ ] Brancher dans App.tsx (remplacer le JSX dossier patient existant)

### Phase 3 — Accueil dashboard
- [ ] Créer `src/components/home/HomeDashboard.tsx` — agenda implicite + alertes + quick actions + mini-stats
- [ ] Hooks pour calculer les "alertes" (prescriptions bientôt finies, bilans incomplets, patients sans activité)
- [ ] Brancher dans App.tsx (remplacer le bloc dashboard)

### Phase 4 — Liste patients
- [ ] Créer `src/components/patients/PatientsList.tsx`
- [ ] Filter chips (Tous / Actifs / À revoir / Clôturés + zones)
- [ ] Tri (alpha / récents / urgence)
- [ ] Carte patient remaniée (badge statut au lieu du score %)
- [ ] Brancher dans App.tsx

### Phase 5 — Profil
- [ ] Créer `src/components/profile/ProfileView.tsx` — split "Mon profil" / "Mes données"
- [ ] Édition inline (fin du mode modifier/annuler)
- [ ] Stats en haut, export/import/suppression en bas
- [ ] Brancher dans App.tsx

## Validation continue
- [ ] `rtk tsc -b --force` vert après chaque phase
- [ ] Dev server `pnpm dev` testé manuellement
- [ ] Tous les workflows existants toujours fonctionnels (créer patient, bilan, séance, etc.)
- [ ] Push incrémental sur `refonte-ui-command-center`

## Validation finale par l'utilisateur
- [ ] Deploy preview Vercel sur la branche
- [ ] Utilisateur teste + valide
- [ ] Merge sur `main`

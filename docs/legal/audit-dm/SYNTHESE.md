# Synthèse — Audit DM Canode

> Document de **synthèse stratégique** des deux volets d'audit. À valider
> par un avocat spécialisé MDR/Swissmedic — l'auteur n'est pas juriste.
>
> Volets sources :
> - [`01-cartographie.md`](01-cartographie.md) — 20 features inventoriées
> - [`02-finalite-usage.md`](02-finalite-usage.md) — 46 citations classées
>
> **Date** : 2026-04-30 — commit `d4c85d5`.

---

## 1. Verdict factuel

**Canode présente, en l'état actuel du code et des textes, les
caractéristiques typiques d'un dispositif médical de classe IIa au sens
de la Règle 11 MDR (logiciel d'aide à la décision diagnostique et
thérapeutique sur patient individuel).**

Cette qualification probable repose sur un **faisceau d'éléments
techniques et textuels convergents**, pas sur une seule feature isolée :

### 1.1 Côté technique (cartographie)

| Indicateur | Constat |
|---|---|
| Features avec attributs Règle 11 | **10 sur 20** (50 %) |
| Output structuré « hypothèses diagnostiques » avec probabilités numériques | F10 — `BilanAnalyseIA.tsx` + `clinicalPrompt.ts:178` |
| Output « plan de traitement en 3 phases » avec actions thérapeutiques | F10, F15 |
| Extraction structurée de signes cliniques à partir d'audio (red/yellow/blue/black flags, scores cliniques nommés) | F7 — `voiceBilanClient.ts:317, 347` |
| Génération de courriers cliniques au médecin prescripteur (demande imagerie, prescription, orientation) | F16 — `letterPrompts.ts` |
| Rapport d'évolution avec « tendance » qualitative + recommandations cliniques | F12 — `BilanEvolutionIA.tsx` |

### 1.2 Côté finalité d'usage déclarée (textes)

| Indicateur | Constat |
|---|---|
| Citations à forte revendication clinique 🔴 | **18** dans le corpus textuel |
| Prompts LLM positionnant le système comme « expert en musculo-squelettique » | `clinicalPrompt.ts:178`, `clinicalPrompt.ts:811`, `BilanAnalyseIA.tsx:107`, etc. |
| PDF exporté au médecin prescripteur avec sections imposées « Synthèse diagnostique » et « Projet thérapeutique » | `App.tsx:1448-1834` |
| Document juridique publié déclarant que l'IA produit des « hypothèses diagnostiques » | `politique-confidentialite.md:355-356` |
| Notice patient déclarant des « suggestions d'analyse, de plan de soins ou de courrier » | `information-patient.md:75-83` |

### 1.3 Le disclaimer existant ne protège pas

`docs/legal/mentions-legales.md §6` revendique explicitement *« outil
documentaire et bureautique, AUCUN diagnostic »* — et ce disclaimer
est en contradiction directe avec les prompts LLM, les libellés UI
(`<h4>Hypothèses cliniques</h4>`, `Note diagnostique`,
`ai-diagnostic-box`), et deux autres documents juridiques publiés.

**Au sens MDCG 2019-11 §2.3, les prompts LLM constituent de la
documentation fabricant.** Un logiciel ne peut pas avoir deux finalités
contradictoires : c'est l'**ensemble** du discours et du comportement
qui définit la finalité d'usage. Et CJUE *Snitem* C-329/16 ferme la
porte de secours « le professionnel valide derrière » : la qualification
DM ne dépend pas de la validation humaine en aval.

---

## 2. Conséquences pour la stratégie « raison individuelle »

La RI a été choisie sur l'hypothèse que Canode n'est pas un DM. Si
Canode est qualifié DM, **l'hypothèse est invalidée**, avec deux
conséquences principales :

### 2.1 Responsabilité illimitée

En RI suisse, le patrimoine personnel du dirigeant répond des dettes
professionnelles — y compris les dommages-intérêts en cas d'incident
clinique imputé au logiciel, ou les amendes Swissmedic pour mise sur le
marché d'un DM non conforme. **Niveau de risque : catastrophique** au
regard du gain fiscal/administratif d'une RI vs Sàrl.

### 2.2 Mise sur le marché illégale en l'état

Sans marquage CE médical (UE) ni déclaration ODim (CH), commercialiser
un DM expose à :
- amendes Swissmedic ;
- retrait forcé du marché ;
- responsabilité civile et pénale en cas d'incident clinique ;
- impossibilité de vendre via les canaux institutionnels.

---

## 3. Trois options stratégiques

### Option A — Re-cadrer le produit en non-DM **(recommandée pour RI)**

**Principe** : aligner le code et les textes sur le disclaimer existant
des mentions légales. Garder Canode comme **outil documentaire et de
mise au propre rédactionnelle**, sans aucune production de contenu
clinique nouveau.

**Effort** : 4-8 semaines de dev + revue textuelle.

**Conserve** :
- saisie structurée des bilans par le physio (F4, F5, F6, F8, F9, F19)
- bibliothèque d'exercices statique sélectionnée manuellement
- génération de PDF déterministe à partir de saisie (F19)
- gestion administrative (F1, F2, F3)
- mise au propre rédactionnelle d'un texte saisi par le physio (forme
  uniquement, pas de production de raisonnement clinique nouveau)

**Suppressions / refonte requises** :

| # | Ce qui doit changer | Comment |
|---|---|---|
| 1 | Plus de production d'**hypothèses diagnostiques** par l'IA | Supprimer F10, F11. Ou : le physio saisit ses propres hypothèses, l'IA reformule en français médical sans modifier le contenu clinique. |
| 2 | Plus de **probabilités numériques** sur des hypothèses | Supprimer le champ `probabilite` du JSON de sortie + UI. |
| 3 | Plus de **plan de traitement structuré** produit par l'IA | Le physio rédige son plan, l'IA met au propre. |
| 4 | Section « Synthèse diagnostique » + « Projet thérapeutique » du PDF | Renommer en « Notes du physiothérapeute » et alimenter à partir de la saisie physio uniquement. |
| 5 | Prompts LLM « Tu es un expert ... fournis une évaluation » | Réécrire en « Tu es un assistant rédactionnel. Mets au propre le texte saisi par le physio en respectant son contenu. Ne propose AUCUNE hypothèse, ne juge AUCUN diagnostic, n'ajoute AUCUNE recommandation. » |
| 6 | UI labels « Hypothèses cliniques », « Note diagnostique », « ai-diagnostic-box » | Renommer en « Notes du praticien », « Compte rendu », `notes-box`. |
| 7 | Extraction structurée vocale de signes cliniques (Lasègue, FADDIR, MRC, etc.) | Garder la transcription brute du physio, supprimer l'extraction sémantique en JSON clinique. |
| 8 | Courriers `demande_imagerie`, `demande_prescription`, `echec_pec` | Garder ces courriers mais à partir d'un canevas pré-rempli par le physio, sans génération IA de la justification clinique. |
| 9 | Politique de confidentialité § « hypothèses diagnostiques » | Réécrire : « l'IA met en forme le texte rédigé par le praticien sans produire de contenu clinique. » |
| 10 | Notice patient § « suggestions d'analyse, plan de soins » | Idem. |
| 11 | Prompt counter (`App.tsx:1339`) | Aligner avec un counter-prompt cohérent partout : « Tu n'es pas un système d'aide à la décision médicale. » |

**Ce qui reste après refonte** : un outil d'efficacité bureautique pour
kiné — saisie structurée + dictée vocale + mise au propre + PDF +
courriers. Comparable à un Word spécialisé pour la kiné. **Hors scope
MDR.**

**Avantages** :
- Compatible RI.
- Pas de marquage CE, pas d'ISO 13485, pas de Notified Body.
- Time-to-market réel.
- Le pitch « assistant rédactionnel pour kinés » reste vendeur.

**Inconvénient** : on perd le différenciateur « IA qui propose des
hypothèses ». Mais c'est précisément ce différenciateur qui crée le
risque DM, donc c'est cohérent.

---

### Option B — Assumer le DM et engager la conformité MDR

**Principe** : reconnaître la qualification DM, basculer en Sàrl,
engager la mise en conformité ODim/MDR.

**Effort** : 12-24 mois + 50-200 k€.

**Étapes** :
1. Création Sàrl (protection responsabilité) — 2-4 semaines.
2. Désignation d'un **PRRC** (Person Responsible for Regulatory
   Compliance) au sens art. 15 MDR.
3. Système qualité **ISO 13485** — 6-12 mois.
4. Documentation technique MDR Annexe II.
5. **Évaluation clinique** MDR Annexe XIV (revue de littérature
   minimum, idéalement étude de performance clinique).
6. Engagement avec un **Notified Body** suisse ou UE (SQS, TÜV SÜD,
   etc.) — 6-12 mois.
7. Marquage CE médical + déclaration Swissmedic ODim.
8. Système de **surveillance après commercialisation** (PMS) + matériovigilance.
9. **Pas de commercialisation** avant fin de procédure.

**Avantages** :
- Différenciateur IA conservé.
- Statut professionnel accru auprès des établissements de santé.
- Vente possible via canaux institutionnels.

**Inconvénients** :
- Coût et délai prohibitifs pour un solo-fondateur.
- Charge réglementaire continue post-launch.
- Exige expertise dédiée (RAQA — Regulatory Affairs / Quality Assurance).

---

### Option C — Pivot stratégique

**Principe** : changer la cible ou la finalité.

Variantes :
- **C1** — Repositionner Canode comme outil purement administratif :
  agenda, dossier patient simple, facturation. Aucune IA clinique.
- **C2** — Pivoter vers le bien-être / fitness général (non médical),
  audience non-thérapeute. Incohérent avec le code actuel et l'audience
  kiné — implique une refonte plus lourde que l'Option A.
- **C3** — Pivoter en B2B vers les **éditeurs de logiciels existants
  déjà en MDR** (intégration via API), en se positionnant comme
  composant et non comme fabricant DM final.

**Évaluation** : C1 est faisable mais détruit l'unicité du produit ; C2
est incohérent ; C3 est intéressant à explorer si Arnaud veut conserver
la R&D IA sans porter le risque DM.

---

## 4. Recommandation

**Option A (re-cadrer en non-DM)** est l'option la plus alignée avec :
- la stratégie RI ;
- le time-to-market visé ;
- le profil solo-fondateur ;
- le disclaimer juridique déjà présent dans `mentions-legales.md §6`.

Elle exige une **refonte ciblée mais bornée** : ~10-12 sites de code et
~20 chaînes UI à modifier (cartographie précise dans la section 5).

Avant tout changement de code : **valider la stratégie avec un avocat
MDR/Swissmedic** (consultation 1-2 h, ~300-600 €). C'est non négociable
— l'audit ci-dessus est un travail technique, pas un avis juridique.

---

## 5. Plan d'action proposé (Option A)

### Phase 0 — Validation juridique (avant tout)

1. Consultation avocat MDR/Swissmedic basé en Suisse romande.
2. Présenter ce dossier d'audit + les deux rapports volet 01 et 02.
3. Obtenir un **avis écrit** sur :
   - la qualification DM probable en l'état ;
   - la stratégie de re-cadrage (Option A) — est-elle suffisante ?
   - les éléments minimum à supprimer/modifier pour sortir du scope.
4. **Documenter cet avis** et le verser au registre de traitement et à l'AIPD.

### Phase 1 — Refonte du code (Option A)

1. **Désactiver** F10, F11, F12, F15 (analyses IA cliniques) en
   fonctionnalité expérimentale derrière un flag `enableClinicalAI`
   défaut `false`. Permet de garder le code pendant la transition.
2. **Réécrire** les prompts dans `clinicalPrompt.ts`, `voiceBilanClient.ts`,
   `letterPrompts.ts` selon le canevas « assistant rédactionnel sans
   contenu clinique ajouté ».
3. **Renommer** les UI : `Hypothèses cliniques` → `Notes du praticien`,
   `Note diagnostique` → `Compte rendu`, etc. (cf. tableau § 3, lignes 4-6).
4. **Modifier** le méta-prompt PDF (`App.tsx:1448-1834`) pour supprimer
   les sections imposées « Synthèse diagnostique » + « Projet
   thérapeutique » et les remplacer par « Notes du physiothérapeute »
   alimenté par la saisie physio.
5. **Conserver** la pseudonymisation, le scrub, la sécurité — sans
   changement.
6. **Tests E2E** Playwright sur la nouvelle finalité : vérifier qu'aucune
   sortie IA ne contient `hypothèse`, `diagnostic`, `plan de traitement`,
   `recommandation thérapeutique` (test de non-régression de finalité).

### Phase 2 — Alignement textuel

1. Réécrire **politique-confidentialite.md** § 11 (IA) : décrire
   l'IA comme assistant rédactionnel.
2. Réécrire **information-patient.md** § 3 (finalités IA) idem.
3. Vérifier **mentions-legales.md** § 6 : déjà aligné, garder.
4. Réécrire **CGU §3.2 et §6** : supprimer toute formulation
   d'« assistance clinique ».
5. Mettre à jour **AIPD** : la finalité change, refaire le volet 1
   description du traitement.

### Phase 3 — Documentation de la décision

1. Verser dans `docs/legal/audit-dm/` :
   - l'avis avocat (Phase 0) ;
   - la décision de classification non-DM motivée ;
   - le diff des prompts avant/après ;
   - la cartographie post-refonte avec attendu 0 features 🔴.
2. Conserver ce dossier indéfiniment — preuve de bonne foi en cas de
   contestation Swissmedic future.

### Phase 4 — Maintien en non-DM

1. **Process de revue de finalité** à chaque PR : toute modification de
   prompt, de label UI clinique ou de doc juridique déclenche une revue
   « est-ce que cette modification réintroduit une finalité DM ? ».
2. **Bot de pre-commit** : grep pour les mots-clés `hypothèse`,
   `diagnostic`, `plan de traitement`, `expert clinique`, `recommandation`
   dans le code modifié — alerte si réapparition.
3. **Revue annuelle** par le Référent + relecture avocat.

---

## 6. Risques résiduels même après re-cadrage Option A

Trois risques persistent et doivent être documentés :

1. **Risque de re-qualification ultérieure** : si Canode ajoute plus
   tard une feature qui réintroduit du raisonnement clinique (un peu
   à la fois — *creeping scope*), la qualification peut basculer. D'où
   l'importance du process de revue continue (Phase 4).
2. **Risque d'usage hors finalité** : un kiné peut utiliser un outil
   documentaire pour s'aider quand même au diagnostic. Le fabricant
   n'est pas responsable de l'usage non conforme tant que la finalité
   déclarée et l'output sont neutres — d'où l'importance d'un disclaimer
   clair dans l'UI ET dans les CGU.
3. **Évolutions réglementaires** : Swissmedic et la Commission
   européenne durcissent la qualification des logiciels avec IA.
   Surveillance veille réglementaire annuelle requise (alertes
   Swissmedic, MDCG, ENVI European Parliament).

---

## 7. Annexes

- Volet 1 — Cartographie : [01-cartographie.md](01-cartographie.md)
- Volet 2 — Finalité d'usage : [02-finalite-usage.md](02-finalite-usage.md)

### Références consultées
- Règlement (UE) 2017/745 — MDR — annexe VIII Règle 11
- ODim (RS 812.213) — révision 2021 alignée MDR
- LPTh (RS 812.21)
- MDCG 2019-11 — *Guidance on Qualification and Classification of
  Software in Regulation (EU) 2017/745*
- CJUE C-329/16 — *Snitem & Philips* — 7 décembre 2017
- Swissmedic — Information sur les dispositifs médicaux logiciels
  (MDSW)

---

> **Disclaimer** : ce document est un travail technique d'audit
> interne. Il ne constitue pas un avis juridique. Toute décision de
> qualification ou de mise en conformité doit être validée par un
> avocat spécialisé MDR/Swissmedic avant exécution.

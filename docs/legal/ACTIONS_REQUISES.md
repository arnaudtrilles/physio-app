# ACTIONS REQUISES — côté Arnaud

> **À quoi sert ce document.** Tout ce qui reste pour la mise en conformité (RGPD / HDS / nLPD)
> et la commercialisation FR + CH se divise en deux : ce que **Claude peut faire dans le code/les
> fichiers** (fait, ou prêt à câbler), et ce que **toi seul peux faire** — décisions juridiques,
> contrats à signer, accès production, choix business. Ce document liste **uniquement la seconde
> catégorie**, classée par priorité, avec pour chaque point : *quoi, pourquoi, comment, ma
> recommandation, effort/coût estimé*.

**Date** : 2026-06-19 · **Maintenu par** : généré depuis l'audit code + `CONFORMITE.md`.

**Légende priorité** : 🔴 bloquant (avant tout lancement) · 🟠 important (lancement risqué sans) · 🟢 confort.

---

## A. À APPLIQUER MAINTENANT — artefacts prêts (accès base = toi seul)

J'ai écrit les fichiers ; leur application nécessite l'accès à ta base Supabase (la clé
`SUPABASE_SERVICE_ROLE_KEY` est vide en local, je ne peux donc pas les exécuter). Tout est
idempotent, additif et **sans régression** : l'app continue de fonctionner à l'identique tant que
le code n'est pas câblé (voir §H).

### A1. 🟠 Appliquer les 3 migrations SQL

**Comment** : Supabase → Dashboard → SQL Editor. **Avant tout : déclencher un backup**
(Database → Backups). Puis exécuter, dans l'ordre, le contenu de :

| Fichier | Effet | Risque |
|---|---|---|
| `supabase/migrations/003_patient_sexe_column.sql` | Colonne `patients.sexe` + backfill depuis l'historique | Nul (additif, backfill ne touche que les NULL) |
| `supabase/migrations/004_patient_consents.sql` | Table `patient_consents` (traçabilité consentement) + RLS | Nul (table neuve, dormante) |
| `supabase/migrations/005_patient_erasure.sql` | Journal `erasure_log` + fonction `erase_patient()` (droit à l'effacement art.17) | Nul (fonction dormante, non appelée) |

Chaque fichier contient sa **requête de vérification** et son **rollback** en commentaire de fin.
Après application, lance les requêtes de vérification et garde une capture (preuve pour le dossier).

### A2. 🟠 Purger les contenus DM historiques

**Pourquoi** : finir le re-cadrage hors-dispositif-médical — le code n'écrit plus de contenu
diagnostique, mais d'anciens bilans peuvent en contenir encore en base (`bilans.analyse_ia`).

**Comment** : exécuter `supabase/maintenance/2026-06-19_purge_dm_historical.sql` **étape par étape**.
La discipline est imposée par le fichier :

1. **Backup** (obligatoire).
2. **Dry-run** (étape 1) : me donner / noter le nombre `a_purger_contenu_dm`. Vérifier que
   `non_null_sans_marqueur = 0` (sinon, m'envoyer un échantillon avant de continuer).
3. **Inspecter** un échantillon (étape 2).
4. **Purge** (étape 4) seulement après revue ; transaction avec `commit`/`rollback`.
5. **Vérifier** que le reste = 0 (étape 5).
6. **PDF d'analyse** (étape 6) : revue **manuelle** (pas de suppression automatique possible).

> ⏱️ Le **comptage réel** était le seul point bloqué : il dépend de l'accès base. Une fois le
> dry-run lancé, dis-moi les chiffres si tu veux que je documente la purge dans le dossier.

---

## B. DÉCISIONS JURIDIQUES & STRATÉGIQUES (D1–D8)

Ces arbitrages t'appartiennent (parfois avec un avocat). Pour chacun : ma recommandation est une
position de départ défendable, **à valider** juridiquement. Réf. détaillée : `CONFORMITE.md §14`.

### D1 — 🔴 Hébergeur de santé (HDS)
- **Question** : Supabase n'est pas certifié HDS → bloquant pour le marché **FR** (données de santé).
- **Options** : (a) migrer vers un hébergeur certifié HDS (Clever Cloud, OVHcloud HDS, Scaleway,
  Outscale) ; (b) lancer **CH d'abord** (la nLPD n'exige pas la certification HDS) et migrer FR en
  parallèle ; (c) repousser le marché FR.
- **Ma reco** : **(b) puis (a)** — lancer CH-first pour ne pas bloquer le go-to-market, et engager
  en parallèle la migration HDS (Clever Cloud = bon rapport effort/coût pour un éditeur solo).
- **Impact** : +50–300 €/mois et 1–2 mois de migration pour FR.

### D2 — 🟠 Transferts IA hors-UE
- **État** : audio = **Azure OpenAI Whisper, région UE** ✅ · Gemini/Vertex = **supprimé et
  déprovisionné** ✅ · texte = **Anthropic Claude, endpoint US** ⚠️.
- **Options pour Claude** : (a) renforcer la **pseudonymisation systématique** avant envoi (le scrub
  existe déjà — voir §H le correctif des 3 fonctions vocales) ; (b) **consentement explicite** art.
  9.2.a ; (c) migrer vers **AWS Bedrock région UE** (Claude hébergé UE).
- **Ma reco** : (a) **immédiat** (pseudonymisation = ceinture) **+** signer le **DPA Anthropic** avec
  clauses de transfert (DPF/SCC) **+** viser (c) Bedrock UE à moyen terme.
- **Impact** : (a) faible · (c) +coût et quelques jours de dev.

### D3 — 🟠 Base légale du traitement
- **Question** : quelle base RGPD pour les données de santé ?
- **Ma reco** : traitement par un **professionnel de santé** → **art. 9.2.h** (soins) combiné à
  l'art. 6.1.b/c. Le **praticien = responsable de traitement**, l'**éditeur = sous-traitant**. À
  acter dans le registre et le DPA. **À confirmer par l'avocat.**

### D4 — 🟠 Durées de conservation / rétention
- **Question** : combien de temps conserver le dossier patient + politique de backups ?
- **Ma reco** : **FR** 20 ans après le dernier contact (réf. dossier de soins) ; **CH** aligner sur
  le canton (10–20 ans). Backups : **7 jours glissants + archives mensuelles 1 an**. La purge
  automatique post-rétention reste **à implémenter** (`src/utils/retention.ts` à câbler — §H).

### D5 — 🟠 Mode d'effacement (droit à l'oubli)
- **Question** : comment exécuter une demande d'effacement de bout en bout ?
- **Ma reco** : câbler la fonction **`erase_patient()`** (migration 005) à un bouton « Supprimer
  définitivement » qui (1) appelle la RPC, (2) purge les objets Storage retournés, (3) consigne dans
  `erasure_log`. **À câbler par Claude** une fois la migration appliquée (§H).

### D6 — 🟠 Chiffrement local (au repos sur l'appareil)
- **Question** : les données en IndexedDB sont en clair sur l'appareil.
- **Options** : (a) chiffrer côté client (Web Crypto, clé dérivée du mot de passe / en mémoire) ;
  (b) s'appuyer sur le chiffrement disque OS + verrouillage de l'app.
- **Ma reco** : **(a)** pour les champs sensibles (projet de code à cadrer ensemble). **Décision +
  arbitrage UX** requis avant que je l'implémente.

### D7 — 🔴 Validation « hors-DM » par un avocat MDR
- **Question** : confirmer que le re-cadrage hors-dispositif-médical tient juridiquement.
- **Contexte** : l'audit interne conclut probablement **classe IIa, Règle 11 MDR** si l'inférence
  clinique était présente — d'où son retrait (Option A, 7 pivots). À **faire valider**.
- **Ma reco** : consultation **avocat spécialisé dispositif médical** (Suisse romande / FR).
  Apporter : `docs/legal/audit-dm/SYNTHESE.md`, la liste des fonctionnalités retirées, l'app.
- **Coût** : ~300–600 € (1–2 h). **Obtenir un avis écrit.**

### D8 — 🟠 Registre art. 30 + AIPD/DPIA
- **Question** : finaliser et signer le registre des traitements et l'analyse d'impact.
- **État** : templates **déjà rédigés** (`docs/legal/registre-traitements.md`, `aipd.md`) à ~70-80 %.
  Les trous restants sont des **décisions** (voir §D ci-dessus et §C/§D ci-dessous), pas de la rédaction.
- **Ma reco** : compléter une fois D1–D7 tranchés, puis **signer** (qui signe = dépend du DPO, §D).

---

## C. CONTRATS SOUS-TRAITANTS — DPA à signer 🟠

Pour chaque sous-traitant actif, récupérer et signer le **DPA** (Data Processing Agreement) et
vérifier le statut transferts hors-UE. À consigner dans `registre-traitements.md` §III.2 et
`dpa-praticien.md` Annexe 1.

| Sous-traitant | Rôle | DPA | Transferts |
|---|---|---|---|
| **Vercel** | Hébergement front + serverless | À signer (self-service) | US → DPF/SCC |
| **Supabase** | Base de données + Storage + Auth | À signer | UE (vérifier région du projet) |
| **Anthropic** | IA texte (Claude) | **À signer** | US → DPF/SCC (cf. D2) |
| **Microsoft Azure** | IA audio (Whisper) | À signer | **UE** ✅ |
| **Stripe** (si paiement activé) | Paiement | À signer | US → DPF/SCC |
| **Upstash** (si rate-limit actif) | Rate-limiting | À vérifier/ signer | vérifier région |
| **Sentry** (si monitoring actif) | Suivi d'erreurs | À vérifier/ signer | vérifier région/scrubbing |

> Google Cloud / Gemini : **retiré du dossier** (code + compte de service GCP + variables d'env
> supprimés) — plus aucun DPA à signer de ce côté.

---

## D. IDENTITÉ SOCIÉTÉ & DPO 🔴

Ces informations **débloquent ~50 champs `[À COMPLÉTER]`** répétés dans tous les documents légaux
(registre, AIPD, CGU, DPA, politique de confidentialité, information patient…).

**À fournir une fois pour toutes :**
- [ ] **Forme juridique** (SAS / SARL / EI…) + **raison sociale**
- [ ] **SIREN / SIRET** (ou équivalent CH)
- [ ] **Adresse du siège**
- [ ] **Représentant légal** (nom + qualité)
- [ ] **Nom commercial de l'app** (confirmer la marque retenue)
- [ ] **DPO / Référent protection des données** : toi en Phase 1, ou DPO mutualisé (Dipeeo,
      Captain DPO… ~100-250 €/mois) — + une **adresse e-mail RGPD** dédiée (ex. `rgpd@<domaine>`)
- [ ] **Ville du tribunal compétent** (clause de juridiction des CGU/DPA)
- [ ] **Inscription CNIL** (FR) et, si marché CH, **déclaration PFPDT**

> Dès que tu me donnes ce bloc, je peux remplir automatiquement tous les `[À COMPLÉTER]` factuels
> des documents légaux (§H).

---

## E. HÉBERGEMENT HDS — exécution (cf. D1) 🔴 (marché FR)
- [ ] Demander 2-3 devis (Clever Cloud recommandé pour solo) ; choisir.
- [ ] Signer le contrat HDS (et l'avenant sous-traitance).
- [ ] Planifier la migration (fenêtre, test de restauration, bascule).
- [ ] Fixer le **trimestre cible** et le reporter dans les docs (placeholders « migration HDS »).

---

## F. SUISSE (nLPD) — si marché CH 🟠
- [ ] Annexe « Swiss rider » aux SCC + évaluation TIA pour les transferts.
- [ ] Déclaration **PFPDT** si clients CH.
- [ ] Vérifier les spécificités **cantonales** (GE/VD/FR) sur la durée de conservation.

---

## G. SÉCURITÉ — décisions/paramètres à fixer 🟠
- [ ] **MFA (TOTP)** : décider si obligatoire au lancement (recommandé). Statut à acter dans
      `politique-confidentialite.md`.
- [ ] **Rétention des logs d'accès** : fixer la durée (6-12 mois) et le support immuable.
- [ ] **PRA / backups** : valider la stratégie 3-2-1 + fréquence de test de restauration (trim.).

---

## H. CE QUE CLAUDE FERA ENSUITE (après tes décisions / l'application des migrations)

Pour que la répartition soit claire — ceci est **mon travail**, pas le tien. Je le déclenche dès
que le prérequis est levé :

| Tâche | Prérequis | Risque |
|---|---|---|
| Câbler la sync sur `patients.sexe` (lire/écrire la colonne au lieu de `bilan_data._patientSexe`) | Migration 003 appliquée + tester sur la vraie base | À tester (sync) |
| Câbler l'UI de recueil de consentement → `patient_consents` | Migration 004 + décision UX | Moyen |
| Câbler le bouton « Supprimer définitivement » → `erase_patient()` + purge Storage | Migration 005 + décision UX | Moyen |
| Corriger les **3 fonctions du pipeline vocal** qui ne passent pas par le scrub (signalé dans l'AIPD) | Aucun — je peux le faire maintenant | Faible (à tester) |
| Remplir les `[À COMPLÉTER]` **factuels** des docs légaux | Bloc identité société (§D) | Nul (docs) |
| Créer `mentions-legales.md` + `cgv.md` (liens cassés dans le README légal) | Identité société + tarifs (§D) | Nul (docs) |
| Câbler la **purge automatique** post-rétention (`retention.ts`) | Durées tranchées (D4) | Moyen |

> **Dis-moi par quoi commencer.** Le correctif des 3 fonctions vocales (scrub) et le remplissage
> des docs sont les seuls que je peux faire **sans attendre** ; je te conseille de me lancer le
> correctif scrub en premier (renforce D2 et c'est un point d'audit ouvert).

---

## Récapitulatif — top priorités (ordre conseillé)

1. 🔴 **D7** — RDV avocat MDR (valide toute la stratégie hors-DM).
2. 🔴 **§D** — identité société + DPO (débloque ~50 champs).
3. 🔴 **D1/§E** — décision hébergement (CH-first + migration HDS FR).
4. 🟠 **§A** — appliquer les 3 migrations + lancer le dry-run de purge DM.
5. 🟠 **§C** — signer les DPA (Anthropic en priorité).
6. 🟠 **D2–D6, D8** — arbitrages restants, puis je câble le code (§H).

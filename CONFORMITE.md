# Dossier de conformité — Application Canode (physio-app)

> **Objet** — Ce document présente l'état factuel des mesures de protection des
> données personnelles de santé mises en œuvre dans l'application Canode, en vue
> d'une revue par un conseil juridique spécialisé en droit du numérique (RGPD /
> CNIL, référentiel HDS, nLPD suisse) avant commercialisation en France et en
> Suisse.
>
> **Nature du document** — État des lieux technique destiné au conseil. Les
> affirmations « ✅ en place » sont sourcées par référence au code
> (`fichier:ligne`). Les qualifications juridiques (licéité, suffisance d'une
> mesure, base légale retenue) relèvent du conseil ; ce document fournit les
> faits, pas les conclusions de droit.
>
> **Version** — v1.3 · 19 juin 2026 · remédiations code : **worker PDF.js
> auto-hébergé** (jsDelivr retiré comme sous-traitant), **identité patient retirée de
> l'URL `wa.me`** (partage WhatsApp), **fonction Gemini/Vertex dormante supprimée**.
> Cartographie IA : **Azure OpenAI** (audio, région UE) + **Anthropic Claude** (texte,
> US). v1.2 (18 juin) : inventaire des sous-traitants complété via audit des flux
> sortants. À mettre à jour à chaque évolution des traitements.

---

## 1. Synthèse pour le conseil

L'application est un **carnet de bilans kinésithérapiques** avec assistance IA à
visée **administrative** (transcription, rédaction de courriers, synthèse de
dossier). Le moteur d'inférence clinique (diagnostic, probabilités, pronostic) a
été **retiré** pour rester hors du champ « dispositif médical » (voir §3).

État global :

| Domaine | Statut |
|---|---|
| Minimisation / pseudonymisation avant envoi IA | ✅ flux **texte** (4 mécanismes) · ⚠️ **audio brut** envoyé à Azure (non scrubbable) |
| Sécurité applicative (RLS, purge locale, API) | ✅ en place |
| Statut dispositif médical (re-cadrage hors-DM) | ✅ en place |
| Consentement verbal documenté | ✅ en place |
| **Hébergement certifié HDS (France)** | ❌ **écart bloquant** (Supabase non HDS) |
| **Transfert IA hors UE** | ⚠️ **écart résiduel ciblé** : audio → **Azure région UE** (confirmée par l'exploitant ✅) · reste le texte → Anthropic **US** (pseudonymisé) |
| **Droit à l'effacement effectif en cloud** | ⚠️ **partiel** (soft-delete only) |
| Conservation / archivage | ⚠️ politique écrite mais non appliquée |
| Chiffrement au repos local (IndexedDB) | ❌ absent |
| Registre des traitements (art. 30) / AIPD (art. 35) | ⬜ à produire (hors code) |

**Trois écarts conditionnent le lancement France** : hébergement HDS (§8),
transfert IA hors UE (§7.2), droit à l'effacement (§9.3). Ils appellent des
**décisions** (§14), pas seulement du code.

---

## 2. Nature du traitement et données concernées

- **Catégorie** : données de santé → **données sensibles** (RGPD art. 9 ;
  données particulièrement sensibles nLPD art. 5 let. c).
- **Personnes concernées** : patients du kinésithérapeute (utilisateur =
  praticien, responsable de traitement ou co-responsable selon le modèle retenu
  — à qualifier par le conseil).
- **Données traitées** : identité patient (nom, prénom, date de naissance),
  données cliniques de bilan (douleur EVN/EVA, tests, scores, red flags, zone,
  pathologie), notes de séance, objectifs, prescriptions, documents joints
  (radios, comptes rendus), courriers générés.
- **Stockage** :
  - **Local** : IndexedDB (`physio_app`, `physio_vocal`) — sur l'appareil du
    praticien. Schéma : voir `src/hooks/useIndexedDB.ts`.
  - **Cloud** : Supabase (PostgreSQL + Storage). Schéma :
    `supabase/migrations/001_initial_schema.sql` (tables `patients`, `bilans`,
    `bilans_intermediaires`, `notes_seance`, `objectifs`, `prescriptions`,
    `closed_treatments`, `letters`, `patient_documents`, `exercice_bank`, +
    journaux d'audit `letter_audit`, `ai_call_audit`).

---

## 3. Statut « Dispositif Médical » (MDR 2017/745, Règle 11)

**Position retenue** : re-cadrage **hors dispositif médical** — l'IA est un
assistant **administratif**, l'inférence clinique relève du praticien.

Preuves dans le code :

- `src/utils/clinicalPrompt.ts:110-191` — `buildBilanDataSummary()` ne produit
  qu'un **résumé de données anonymisé** (âge, zone, EVN, tests, scores). Aucun
  diagnostic, aucune probabilité chiffrée, aucun plan, aucun pronostic.
- `BilanChatBubble` (system prompt) — interdit explicitement le diagnostic,
  l'hypothèse diagnostique, la probabilité, le plan de traitement, l'orientation
  et le pronostic (« CE QUE TU NE FAIS JAMAIS »).
- Moteur d'inférence clinique historique **supprimé** (archivable via tag git
  `dm-clinical-inference-archive`), composants `BilanAnalyse*` retirés du dépôt.

> **À valider par le conseil** : la qualification hors-DM doit être confirmée par
> un avocat MDR. L'audit interne conclut à une probabilité de classe IIa
> (Règle 11) **si** une inférence clinique était présente ; le retrait de cette
> inférence est la mesure qui soutient le re-cadrage. Reste à purger les
> **contenus historiques** produits avant le retrait (§11).

---

## 4. Finalités et bases légales (à arbitrer avec le conseil)

| Finalité | Base légale envisageable |
|---|---|
| Tenue du dossier de soin | Mission de soin / obligation légale (CSP) ; nLPD : exécution du contrat de soin |
| Assistance IA administrative (transcription, courriers) | Consentement du patient (§10) + intérêt légitime du praticien |
| Paiement de l'abonnement (praticien) | Exécution du contrat |
| Mesure d'audience (PostHog, sans PHI) | Consentement / intérêt légitime, opt-out disponible |

> **Décision requise** : retenir la base légale du traitement principal (mission
> de soin vs consentement) — détermine le régime applicable au droit
> d'opposition et à l'effacement.

---

## 5. Minimisation et pseudonymisation (RGPD art. 5.1.c et art. 25)

Quatre mécanismes limitent les données identifiantes transmises à l'IA **pour les
flux texte**. **Aucune donnée nominative n'est censée parvenir à Anthropic (Claude,
texte).**

> ⚠️ **Réserve audio (importante)** : la transcription envoie l'**audio brut** de la
> séance — la donnée la **moins** minimisée du pipeline, car elle peut contenir le
> nom du patient prononcé à voix haute — à **Azure OpenAI** (`api/transcribe.ts`).
> Le scrubbing (#1) s'applique au **texte retourné** par Azure, **avant** envoi à
> Claude ; il ne masque **pas** l'audio lui-même. La maîtrise de ce flux repose donc
> sur la **région UE d'Azure** (§7.2) et le DPA Microsoft, pas sur la pseudonymisation.
> La ressource Azure est **configurée en région UE** (confirmée par l'exploitant) ;
> **archiver la preuve** (capture portail Azure de la région + DPA Microsoft).

| # | Mécanisme | Fichier | Ce qu'il fait |
|---|---|---|---|
| 1 | Scrubbing de transcription | `src/utils/transcriptionScrub.ts:70-96` (appelé `voiceBilanClient.ts:122,419,454`) | Masque, sur le **texte de transcription retourné par Azure** (avant transmission à Claude) : nom/prénom (depuis le contexte patient) → `[PATIENT]`, téléphone FR → `[TELEPHONE]`, e-mail → `[EMAIL]`, NIR → `[NIR]`, adresse → `[ADRESSE]`, code postal+ville → `[VILLE]` |
| 2 | Pseudonymisation des courriers | `src/utils/pseudonymize.ts:36-85` | Remplace nom/prénom/destinataire par des placeholders et la date de naissance par l'âge ; l'IA ne voit que le formulaire pseudonymisé ; réinjection des vraies valeurs **côté client** après génération |
| 3 | Scanner PII pré-envoi | `src/utils/piiScanner.ts:102-157` | Détecte 13 catégories de PII dans les champs libres avant envoi, avec liste blanche de ~80 acronymes cliniques (EVN, EVA, IRM, KOOS…) pour éviter les faux positifs ; alerte le praticien |
| 4 | Masquage de documents | `src/components/DocumentMasker.tsx:18-162` | Outil de caviardage des zones sensibles (nom, DDN, n° sécu, signature) sur les documents joints avant analyse IA ; confirmation forcée |

Journalisation : `ai_call_audit` conserve la trace des appels IA (avec compteur
de remplacements de scrubbing), sans réintroduire les données nominatives.

---

## 6. Mesures techniques de sécurité (RGPD art. 32 / nLPD art. 8)

| Mesure | Fichier | État |
|---|---|---|
| **RLS (cloisonnement par praticien)** sur les 13 tables de santé/audit | `supabase/migrations/002_rls_with_check.sql:25-80` | ✅ `USING` + `WITH CHECK` sur `practitioner_id = auth.uid()` (interdit lecture **et** écriture cross-praticien) |
| **Purge locale du PHI à la déconnexion** | `src/lib/localDataPurge.ts:35-46`, appelée dans `src/hooks/useAuth.ts:78` | ✅ supprime IndexedDB `physio_app` + `physio_vocal` et le cache vocal localStorage ; conserve uniquement thème/tutoriel/opt-out analytics |
| **Webhook Stripe** | `api/stripe-webhook.ts:23-42` | ✅ `bodyParser` désactivé + vérification cryptographique de signature (`constructEvent`) |
| **Création de session de paiement** | `api/create-checkout-session.ts:36-61` | ✅ `userId` **dérivé du JWT vérifié serveur** (`auth.getUser`), jamais du corps client ; price IDs et URLs de redirection en liste blanche |
| **Rate-limiting** | `api/claude.ts:9-15`, `api/create-checkout-session.ts:11-15` | ✅ par utilisateur + repli par IP (Upstash Redis) |
| **Authentification** | `src/hooks/useAuth.ts` + Supabase Auth | ✅ gestion de session, refresh et validation côté Supabase |

**Réserves :**

- ⚠️ **rls-1** : la migration `002_rls_with_check.sql` est **écrite** ; son
  application effective sur l'instance Supabase de production est **à confirmer**
  (non vérifiable depuis le poste de dev — clé service-role absente).
- ⚠️ **sec-api-3** : pour le rate-limiting, le `sub` du JWT est décodé sans
  vérification de signature (segmentation best-effort) ; le repli par IP limite
  l'abus. Le conseil appréciera si cette mesure est suffisante (le risque est
  l'abus de quota, pas l'accès aux données — celui-ci est protégé par la RLS).
- ❌ **Chiffrement au repos local** : IndexedDB n'est **pas** chiffré au niveau
  applicatif (voir §12).

---

## 7. Sous-traitants et transferts (RGPD art. 28 et chapitre V)

### 7.1 Liste des sous-traitants / destinataires

| Sous-traitant | Rôle | Données reçues | Localisation | Référence code |
|---|---|---|---|---|
| **Supabase** | Base de données, auth, stockage documents | Toutes les données patient (synchronisées) | ❌ **non certifié HDS** (voir §8) | `src/lib/supabase.ts` |
| **Anthropic (Claude)** | IA **texte** : chat assistant, courriers, synthèses, fiches exercices | Prompts **pseudonymisés** (§5) + documents masqués | ⚠️ **endpoint US par défaut** (aucun épinglage UE) | `api/claude.ts`, `src/utils/claudeClient.ts` |
| **Azure OpenAI** | IA **audio→texte** : transcription des dictées et séances | **Audio brut** de la séance (non scrubbé — voir §5) | ✅ **région UE** (confirmée par l'exploitant ; archiver preuve portail + DPA Microsoft) | `api/transcribe.ts` |
| **Vercel** | Hébergement front + fonctions serverless | Trafic applicatif, logs | UE/US selon config | `/api/*` |
| **Stripe** | Paiement abonnement praticien | Métadonnées d'abonnement (userId), **pas de PHI** | UE/US, DPC Stripe | `api/stripe-webhook.ts`, `api/create-checkout-session.ts` |
| **PostHog** | Mesure d'audience | Événements d'usage, **pas de PHI** | ✅ **hôte UE** (`eu.i.posthog.com`), enregistrement de session **désactivé** | `src/lib/posthog.ts:4,16-20` |
| **Sentry** | Suivi d'erreurs / monitoring (frontend + dashboard admin) | Erreurs, stack traces, contexte d'exécution ; **replays de session sur erreur** (`maskAllText` + `blockAllMedia` ; session replay off, erreur 100 %) — pas de PHI en principe, replay à qualifier | ⚠️ **câblé, actif uniquement si `VITE_SENTRY_DSN` est défini** (prod — vide en local) ; **sentry.io US par défaut** (région EU non épinglée) → transfert hors UE (§7.2) | `src/main.tsx:9-23`, `vite.config.ts:398-401`, `api/admin-stats.ts:153-179` |
| **Upstash Redis** | Rate-limiting (quotas par utilisateur/IP) | Clés `physio:<endpoint>:user:<userId>` / `:ip:<ip>` + compteurs = **identifiants** (userId, IP) ; **pas de PHI clinique** | ⚠️ **câblé, actif si `UPSTASH_REDIS_REST_URL/TOKEN` définis** (repli mémoire sinon) ; région managée à confirmer (UE vs US) ; DPA à obtenir | `api/_ratelimit.ts:24-52` |
| **WhatsApp / Meta** (`wa.me`) | Partage de courriers (déclenché par le praticien) | **Aucune identité patient dans l'URL** depuis le 19/06/2026 (seul le **type de courrier** transite dans `wa.me?text=`) ; le PDF nominatif est téléchargé localement puis **attaché manuellement** par le praticien, hors application | ⚠️ infrastructure Meta (hors UE) — canal grand public, **pas de DPA / pas HDS** ; usage sous la responsabilité du praticien | `src/components/letters/LetterGenerator.tsx:402-455` |

> **Action** : constituer/centraliser les **DPA** (accords de sous-traitance
> art. 28) pour chaque sous-traitant et tenir le registre des sous-traitants. DPA
> manquants à obtenir en priorité : **Anthropic, Azure (Microsoft), Sentry,
> Upstash** ; **Supabase, Vercel, Stripe, PostHog** à vérifier. **WhatsApp/Meta**
> n'offre **pas** de DPA exploitable pour du PHI → cf. §7.2.

### 7.2 Transferts IA hors UE — cartographie réelle (écart hds-2)

L'application utilise **deux fournisseurs IA en production** :

- **Texte → Anthropic Claude (`api/claude.ts`) — hors UE (US).** Le client
  Anthropic est initialisé sans épinglage de région ; les appels (chat assistant,
  courriers, synthèses, fiches exercices) partent vers l'infrastructure **US** par
  défaut. *Atténuation* : **pseudonymisation** systématique (§5) → les prompts ne
  contiennent en principe pas de données nominatives. *Écart résiduel* : un
  transfert hors UE, même de données pseudonymisées de santé, appelle un
  encadrement (chap. V) — options en §14 (D2).
- **Audio → Azure OpenAI (`api/transcribe.ts`) — région UE confirmée.** La
  transcription envoie l'**audio brut** de la séance (donnée la **moins** minimisée
  du pipeline : elle peut contenir le nom prononcé) à la ressource Azure
  `physio-app-bilan`, **configurée en région UE** (confirmé par l'exploitant). La
  région n'étant pas lisible dans le code (le hostname `*.openai.azure.com` ne
  l'encode pas), **archiver une preuve** : capture du portail Azure montrant la
  région de la ressource + **DPA Microsoft / CCT**. Sous réserve de cette preuve,
  le flux audio (le plus identifiant) **reste dans l'UE** → écart hors-UE **fermé**
  pour l'audio.
- **Gemini / Vertex AI — supprimé et déprovisionné (19/06/2026).** La fonction
  serverless `api/gemini.ts` et le proxy de développement ont été **retirés du code**
  (le client texte utilise exclusivement Claude). Le **compte de service GCP**, le
  projet Vertex et les **variables d'environnement** (`.env.local` + Vercel) ont été
  **supprimés** (déclaré par l'exploitant). → sous-traitant **clos**.

**Autres transferts hors UE (non-IA)** — au-delà des deux flux IA ci-dessus,
l'inventaire (§7.1) recense deux autres destinations hors UE **actives** (Sentry,
WhatsApp/Meta) ; une troisième (jsDelivr) a été **supprimée** :

- **Sentry (suivi d'erreurs)** — s'il est activé en prod (`VITE_SENTRY_DSN`
  défini), il appelle le **même encadrement chap. V que Claude** (sentry.io US par
  défaut). Atténuation : `maskAllText` + `blockAllMedia`, replay **sur erreur
  seulement** ; le risque résiduel (replay déclenché sur une page affichant un
  dossier patient) reste à qualifier. Option : projet Sentry en **région UE**.
- **WhatsApp / Meta — résolu côté code (19/06/2026).** L'URL `wa.me` ne contient
  plus que le **type de courrier** (aucun nom ni prénom patient) ; le PDF nominatif
  reste téléchargé localement puis **attaché manuellement** par le praticien, hors
  application. Le canal demeure grand public **sans DPA ni garantie HDS** : son usage
  pour des documents de santé relève de la responsabilité du praticien.
- **jsDelivr (CDN) — supprimé (19/06/2026).** Le worker PDF.js est désormais
  **auto-hébergé** (bundlé par Vite via `?url`, servi en même origine et précaché par
  le PWA). Plus aucun chargement de script depuis un CDN tiers → ce sous-traitant est
  retiré de l'inventaire (§7.1).

---

## 8. Hébergement des données de santé — HDS (France) / nLPD (Suisse)

- **France (écart bloquant hds-1)** : l'hébergement de données de santé à
  caractère personnel pour le compte d'un professionnel de santé impose un
  **hébergeur certifié HDS** (art. L.1111-8 CSP). **Supabase n'est pas certifié
  HDS.** En l'état, le lancement France n'est pas conforme.
- **Suisse** : la nLPD n'impose pas de certification équivalente, mais exige des
  garanties appropriées et, pour un transfert à l'étranger, un niveau de
  protection adéquat.

> **Décision requise (§14)** : choix de l'hébergeur HDS cible (ex. OVHcloud HDS,
> Scaleway, AWS offre HDS, Azure HDS) et planification de la migration. Tant que
> cet écart n'est pas levé, n'exposer l'app en France qu'en pilote sans données
> réelles de patients, ou réserver le lancement à la Suisse.

---

## 9. Droits des personnes concernées (RGPD art. 15 à 22)

| Droit | État | Détail |
|---|---|---|
| Accès (art. 15) | ⚠️ via praticien | Les données sont consultables/exportables (PDF) par le praticien ; pas de portail patient |
| Rectification (art. 16) | ✅ | Édition du dossier patient dans l'app |
| **Effacement (art. 17)** | ⚠️ **partiel — écart erasure-1** | Voir §9.3 |
| Portabilité (art. 20) | ⚠️ partiel | Export PDF ; pas d'export structuré réutilisable (JSON) côté patient |
| Opposition (art. 21) | dépend de la base légale (§4) | À cadrer |

### 9.3 Droit à l'effacement (écart erasure-1)

- La suppression d'un patient est un **soft-delete** : la clé patient est ajoutée
  à une liste locale (`physio_deleted_patients`), l'UI masque le patient, **mais
  les lignes correspondantes restent en base Supabase** (aucune suppression en
  cascade côté cloud).
- **Conséquence** : le droit à l'effacement n'est pas pleinement effectif sans
  intervention manuelle. Remédiation = migration DB (cascade `ON DELETE` +
  flux « suppression définitive ») — voir §13 et §14.

---

## 10. Consentement (RGPD art. 6/9, recueil documenté)

- **Recueil verbal documenté** : `src/components/consent/VerbalConsentStep.tsx`
  — le praticien lit un script d'information au patient (finalité de l'assistant
  numérique) et confirme deux cases : information délivrée + consentement libre,
  éclairé et oral recueilli.
- **Persistance de la preuve** : un marqueur de consentement
  (`application/json`, source `consentement`, horodatage + version de script) est
  enregistré comme document patient (`src/utils/pdfPersistence.ts`), stocké en
  IndexedDB et synchronisé vers `patient_documents`.

> **Réserve (consent-1)** : la robustesse de l'opposabilité de la preuve en cloud
> dépend de sa persistance fiable côté serveur (et de sa survie à une
> réinstallation/changement d'appareil). À renforcer avec la migration DB (§13).

---

## 11. Contenus historiques à purger (lié à §3 — DM)

Le moteur d'inférence clinique ayant été retiré, les **bilans/PDF créés avant ce
retrait** peuvent encore contenir diagnostic/probabilités/pronostic. Pour soutenir
le re-cadrage hors-DM, ces contenus historiques doivent être identifiés puis
purgés ou neutralisés.

> **Statut** : le **périmètre exact** (nombre, emplacement local/cloud) doit être
> établi et présenté **avant toute suppression** de données patient. Étape
> dédiée, non réalisée dans ce document.

---

## 12. Chiffrement au repos

- **Local (IndexedDB)** : ❌ **pas de chiffrement applicatif**. Les données
  reposent en clair sur l'appareil ; la protection repose sur le contrôle d'accès
  de l'OS + la purge à la déconnexion (§6).
- **Cloud (Supabase/PostgreSQL)** : chiffrement disque par défaut de
  l'infrastructure (pas de couche de chiffrement applicative supplémentaire).
- **Transport** : HTTPS (Supabase SDK + Vercel).

> **À arbitrer** : opportunité d'un chiffrement applicatif local (ex. champ
> sensible chiffré) au regard du modèle de menace « appareil partagé/volé ». La
> purge à la déconnexion couvre déjà l'essentiel de ce risque.

---

## 13. Conservation et archivage (RGPD art. 5.1.e)

- **Module présent mais dormant** : `src/utils/retention.ts` (226 lignes) encode
  déjà une politique — France **20 ans** depuis la dernière activité (réf.
  R.1112-7 CSP ; règle « âge + 28 ans » si mineur), Suisse **20 ans** — avec des
  fonctions `computeRetention()`, `listExpiredPatients()`, `lastActivityFrom()`.
- ⚠️ **Non intégré** : **aucun composant ne l'utilise** (vérifié : zéro import).
  Pas de purge automatique, pas d'alerte d'expiration en UI.

> **Décisions requises (§14)** : (a) confirmer les **durées** avec le conseil ;
> (b) décider du **mode d'application** (alerte praticien vs purge auto) ;
> (c) câbler `retention.ts` dans l'app.

---

## 14. Décisions requises (à trancher avec le conseil / par l'éditeur)

> Ces points ne sont **pas** des tâches de code pur : ils appellent un arbitrage.

| # | Décision | Impact | Options |
|---|---|---|---|
| D1 | **Hébergeur HDS** cible (France) | Bloquant lancement FR | OVHcloud HDS · Scaleway · AWS HDS · Azure HDS · (pilote CH d'abord) |
| D2 | **Encadrement transferts IA hors UE** | Conformité chap. V | **Texte (Claude)** : Anthropic via **AWS Bedrock** / **GCP Vertex** région UE + DPA, ou CCT + AIPD documentant la pseudonymisation · **Audio (Azure)** : région UE **confirmée** par l'exploitant — archiver preuve portail + DPA Microsoft · **Gemini** : ✅ supprimé et déprovisionné (code + compte de service GCP + variables d'env, 19/06/2026) |
| D3 | **Base légale** du traitement principal | Régime des droits | Mission de soin · Consentement |
| D4 | **Durées de conservation** | art. 5.1.e | Confirmer 20 ans FR/CH ou ajuster |
| D5 | **Mode d'effacement** (erasure-1) | art. 17 | Suppression cascade auto · suppression sur demande tracée |
| D6 | **Chiffrement local** | art. 32 | Statu quo (purge logout) · chiffrement applicatif des champs sensibles |
| D7 | **Validation hors-DM par avocat MDR** | Qualification réglementaire | Confirmer le re-cadrage et la purge des contenus historiques |
| D8 | **Registre des traitements (art. 30)** et **AIPD/DPIA (art. 35)** | Obligatoires (santé à grande échelle) | À produire (documents hors-code) |

---

## 15. Plan d'action priorisé (proposition)

1. **Bloquants lancement FR** — D1 (hébergeur HDS) + D2 (région UE pour l'IA :
   région UE d'Azure **confirmée** pour l'audio — archiver la preuve — reste à
   encadrer le flux texte Claude US ; fonction Gemini dormante **supprimée**). Sans
   eux : lancer en **pilote CH** ou sans données réelles.
2. **Droits & preuve** — migration DB pour D5 (effacement en cascade) et le
   renforcement de la persistance du consentement (§10).
3. **DM** — D7 (validation avocat) + **purge des contenus historiques** (§11,
   périmètre à présenter d'abord).
4. **Conservation** — D4 + câblage de `retention.ts` (§13).
5. **Documentaire** — D8 (registre art. 30 + AIPD art. 35).
6. **Optionnel** — D6 (chiffrement local), selon le modèle de menace.

---

*Document de travail — à faire viser par le conseil juridique. Les références
`fichier:ligne` reflètent l'état du dépôt au 18 juin 2026 (branche `main`).*

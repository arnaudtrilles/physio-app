# Politique de confidentialité

> Document publiable — à intégrer dans le footer du site, dans le tunnel
> d'inscription du praticien, et accessible en permanence dans les paramètres
> de l'application.
>
> Conforme au **RGPD (UE 2016/679) art. 13 et 14**, à la **loi française
> Informatique et Libertés** (LIL) modifiée et à la **nLPD suisse** (LPD du
> 25 septembre 2020, en vigueur depuis le 1er septembre 2023).
>
> Dernière mise à jour : **2026-04-30**. Version : `1.0`.

---

## Sommaire

1. [Préambule — qui fait quoi](#1-préambule--qui-fait-quoi)
2. [Données traitées](#2-données-traitées)
3. [Finalités et bases légales](#3-finalités-et-bases-légales)
4. [Sous-traitants et destinataires](#4-sous-traitants-et-destinataires)
5. [Transferts hors UE / hors Suisse](#5-transferts-hors-ue--hors-suisse)
6. [Durées de conservation](#6-durées-de-conservation)
7. [Sécurité et hébergement](#7-sécurité-et-hébergement)
8. [Droits des personnes concernées](#8-droits-des-personnes-concernées)
9. [Cookies et traceurs](#9-cookies-et-traceurs)
10. [Mineurs](#10-mineurs)
11. [Profilage et décision automatisée](#11-profilage-et-décision-automatisée)
12. [Délégué à la protection des données](#12-délégué-à-la-protection-des-données)
13. [Recours et plainte](#13-recours-et-plainte)
14. [Modifications](#14-modifications)

---

## 1. Préambule — qui fait quoi

L'application `[À COMPLÉTER : nom commercial]` (« l'**Application** ») est
éditée par `[À COMPLÉTER : raison sociale]` (« l'**Éditeur** »), dont les
mentions complètes figurent dans les [Mentions légales](mentions-legales.md).

L'Application est destinée à des **professionnels de santé** (kinésithérapeutes
et physiothérapeutes en exercice libéral ou salarié, ci-après le « **Praticien** »)
pour la tenue informatisée du dossier patient.

Au sens du RGPD :

| Acteur | Qualité | Données concernées |
|---|---|---|
| **Praticien** (kiné/physio) | **Responsable de traitement** | Données de santé de ses patients qu'il saisit dans l'Application. |
| **Éditeur** (`[À COMPLÉTER : nom]`) | **Sous-traitant** au sens de l'art. 28 RGPD | Traite les données patient pour le compte du Praticien, dans le cadre exclusif des CGU et du DPA. |
| **Éditeur** | **Responsable de traitement** | Pour les données du **Praticien lui-même** (compte, paiement, logs de connexion, support). |
| **Patient** | **Personne concernée** | Personne dont les données de santé sont traitées par le Praticien via l'Application. |

> **Cette politique** couvre :
> - les données du **Praticien** (dont l'Éditeur est responsable),
> - et les engagements de l'Éditeur en tant que **sous-traitant** vis-à-vis
>   des données patient.
>
> Pour les patients, le Praticien doit en outre fournir une notice
> spécifique : voir [`information-patient.md`](information-patient.md).

---

## 2. Données traitées

### 2.1 Données du Praticien (Éditeur = responsable de traitement)

| Catégorie | Exemples | Origine |
|---|---|---|
| Identification | Nom, prénom, email, téléphone | Saisie au compte |
| Profession | Kinésithérapeute / Physiothérapeute, n° RPPS / GLN, pays d'exercice | Saisie au compte |
| Authentification | Mot de passe **haché** (bcrypt côté Supabase Auth), historique de connexion | Génération automatique |
| Paramètres | Préférences UI, profession affichée, signature professionnelle | Saisie en cours d'usage |
| Facturation | Adresse, raison sociale, n° TVA si applicable | Saisie à l'abonnement |
| Logs techniques | Adresse IP, user-agent, horodatages d'accès, types d'actions | Collecte automatique |

### 2.2 Données patient (Éditeur = sous-traitant — saisies par le Praticien)

> Ces données sont **des données de santé** au sens de l'art. 9 RGPD et de
> l'art. 5.c nLPD — catégorie particulière imposant un niveau de protection
> renforcé.

| Catégorie | Exemples |
|---|---|
| Identification patient | Nom, prénom, date de naissance, sexe, profession, contacts |
| Antécédents médicaux | Antécédents personnels, familiaux, traitements, allergies |
| Données cliniques | Bilans (EVN, MRC, ROM, tests cliniques), évolutions, notes du Praticien |
| Documents | Ordonnances, comptes-rendus médicaux, imageries, photos cliniques |
| Transcriptions vocales | Enregistrement et transcription textuelle des consultations |
| Plans de soins | Objectifs, séances, exercices, courriers médicaux générés |
| Métadonnées | Dates de prise en charge, prescripteur, zones traitées |

### 2.3 Ce que l'Éditeur **ne traite pas**

- ❌ Pas de **donnée biométrique** au sens de l'art. 9.1 RGPD (empreintes,
  reconnaissance faciale).
- ❌ Pas de **donnée génétique**.
- ❌ Pas de **donnée bancaire** côté serveur — le paiement est délégué à
  `[À COMPLÉTER : Stripe / autre PSP]` qui agit en responsable de traitement
  conjoint pour la transaction (sa propre politique s'applique).
- ❌ Pas de **réutilisation des données patient** pour entraîner les modèles
  IA, alimenter des statistiques agrégées, ou les céder à un tiers.

---

## 3. Finalités et bases légales

| Finalité | Base légale | Référence légale |
|---|---|---|
| Création et gestion du compte Praticien | Exécution du contrat (CGU) | art. 6.1.b RGPD ; art. 31.2.a nLPD |
| Tenue du dossier patient (par le Praticien) | Mission d'intérêt public + obligation légale du Praticien | art. 6.1.c+e + art. 9.2.h RGPD ; art. 31.2.c nLPD ; art. R.4321-86 CSP |
| Traitement des données de santé patient | Nécessité aux fins de la médecine préventive, du diagnostic médical et de l'administration de soins | art. 9.2.h RGPD ; art. 6.7.b nLPD |
| Aide à la rédaction par IA (Claude / Whisper) | Sous-traitance encadrée + intérêt légitime du Praticien | art. 28 RGPD |
| Sauvegarde et synchronisation cloud | Exécution du contrat | art. 6.1.b RGPD |
| Sécurité, lutte contre la fraude, journaux d'audit | Intérêt légitime de l'Éditeur | art. 6.1.f RGPD |
| Facturation et obligations comptables | Obligation légale | art. 6.1.c RGPD ; art. L.123-22 C. com. |
| Communication produit (newsletter) | Consentement opt-in | art. 6.1.a RGPD ; art. L.34-5 CPCE |
| Cookies non strictement nécessaires | Consentement | art. 82 LIL ; art. 5.3 ePrivacy |

---

## 4. Sous-traitants et destinataires

L'Éditeur fait appel aux sous-traitants suivants. Chacun a signé (ou signera
avant la mise en production) un **DPA** (Data Processing Agreement) au titre
de l'art. 28 RGPD :

| Sous-traitant | Rôle | Localisation des serveurs | Statut HDS | Garanties |
|---|---|---|---|---|
| **Vercel Inc.** | Hébergement front + functions serverless | Région principale `cdg1` (Paris, FR). CDN global pour les statiques. | ❌ Non HDS | DPA Vercel + SCC (transfert US si fallback) + DPF certified |
| **Supabase Inc.** | Base Postgres + Storage + Auth | `eu-west-1` (Irlande) | ❌ Non HDS | DPA Supabase + SCC + ISO 27001 + SOC 2 |
| **Anthropic, PBC** (Claude) | Génération de contenus IA (analyses, courriers, narratifs) | États-Unis (`us-east`) | ❌ Non HDS | DPA Anthropic + SCC + DPF (Data Privacy Framework) certified ; rétention 30 jours, pas d'entraînement sur les inputs API |
| **OpenAI, LLC** (Whisper) | Transcription audio | États-Unis | ❌ Non HDS | DPA OpenAI Enterprise + SCC + DPF ; rétention 30 jours, pas d'entraînement sur les inputs API |
| **`[À COMPLÉTER : Stripe / autre PSP]`** | Paiement | Selon le PSP retenu | N/A | Politique propre du PSP |
| **`[À COMPLÉTER : fournisseur emailing]`** (transactionnels) | Emails de service | `[À COMPLÉTER : EU si possible]` | N/A | DPA + SCC |

> ⚠️ **Statut HDS — information transparente au Praticien**
>
> À la date de la présente politique, **aucun sous-traitant n'est certifié
> HDS** (Hébergeur de Données de Santé) au sens de l'article L.1111-8 du
> Code de la santé publique français. La certification HDS est obligatoire
> en France pour héberger des données de santé identifiantes.
>
> L'Éditeur **a engagé une roadmap de migration** vers un hébergeur HDS
> certifié (Scaleway, Clever Cloud ou OVHcloud) avant la commercialisation
> à grande échelle. La date cible est `[À COMPLÉTER : trimestre cible]`.
>
> En attendant, l'Éditeur applique une **pseudonymisation systématique**
> des données patient avant tout envoi aux sous-traitants IA (cf. § 7.3).
>
> Le Praticien est informé de ce statut au moment de l'inscription et est
> invité à donner son consentement explicite à cette situation transitoire
> (CGU § 9).

### 4.1 Pseudonymisation avant envoi IA

Avant tout envoi à Anthropic ou OpenAI :
- Les **noms, prénoms, dates de naissance, adresses et numéros de téléphone**
  sont remplacés par des marqueurs génériques (`[PATIENT]`, `[ADRESSE]`, etc.)
  par la fonction `anonymizePatientData` côté serveur applicatif.
- Les contenus libres (notes du Praticien, transcription vocale) sont
  filtrés par un scanner de PII supplémentaire.
- Les documents joints (PDFs, images) sont **par défaut non transmis** à l'IA ;
  le Praticien doit explicitement consentir à leur inclusion.

> ⚠️ Au 2026-04-30, un audit interne a identifié **3 fonctions du pipeline
> vocal qui ne passent pas encore par la pseudonymisation** (`reformulateTranscription`,
> `extractBilanFromTranscription`, `generateNarrativeReport`). La correction
> est en cours et doit être déployée **avant** la commercialisation ouverte.

### 4.2 Pas de cession à des tiers commerciaux

L'Éditeur **ne vend pas, ne loue pas, ne cède pas** les données traitées à
quelque tiers commercial que ce soit. Les seuls destinataires sont les
sous-traitants strictement nécessaires listés ci-dessus.

### 4.3 Transmissions aux autorités

Les données ne sont transmises à des autorités administratives ou judiciaires
qu'en exécution d'une obligation légale (art. 6.1.c RGPD), notamment sur
réquisition judiciaire dûment motivée.

---

## 5. Transferts hors UE / hors Suisse

Certains sous-traitants (Anthropic, OpenAI, Vercel pour son CDN global) sont
situés **aux États-Unis**. Les transferts vers ces pays sont encadrés par :

1. **Standard Contractual Clauses (SCC)** — Décision de la Commission
   européenne 2021/914 du 4 juin 2021, signées entre l'Éditeur et chaque
   sous-traitant US.
2. **Data Privacy Framework (DPF)** — Adequacy decision du 10 juillet 2023.
   Anthropic et OpenAI sont **certifiés DPF** : `dataprivacyframework.gov`.
3. **Mesures techniques complémentaires** : pseudonymisation préalable
   (cf. § 4.1), chiffrement TLS 1.3 en transit, restriction des données
   transmises au strict nécessaire.

Pour la **Suisse**, les transferts vers l'UE sont libres (décision
d'adéquation OFPDP). Les transferts vers les États-Unis sont couverts par
la décision d'adéquation **Swiss-US Data Privacy Framework** du
15 septembre 2024 (PFPDT).

L'utilisateur peut, sur demande à `[À COMPLÉTER : email DPO]`, obtenir
copie des SCC signées.

---

## 6. Durées de conservation

| Donnée | Durée | Référence |
|---|---|---|
| **Dossier patient (FR)** — bilans, courriers, documents | **20 ans** après la fin de la prise en charge (ou les 28 ans du patient si mineur) | art. R.1112-7 CSP |
| **Dossier patient (CH)** — selon canton | 10 ans min. (LAMal) à 20 ans (GE/VD) après dernier acte | Loi cantonale santé + LAMal art. 31 |
| Compte Praticien | Durée de l'abonnement + **3 ans** après résiliation (preuves en cas de litige) | Recommandation CNIL |
| Logs de connexion Praticien | **1 an max** | LCEN art. L.34-1 ; recommandation CNIL |
| Logs d'audit accès patient | **3 ans** | Référentiel HDS §6.7 |
| Données prospect (newsletter, contact) | 3 ans après dernier contact | Recommandation CNIL |
| Comptabilité (factures, reçus paiement) | **10 ans** | C. com. art. L.123-22 |
| Données support (tickets) | 5 ans | Recommandation CNIL |

> **Restriction de traitement plutôt qu'effacement** — Lorsqu'un patient
> demande la suppression de son dossier au Praticien, et que la durée légale
> de conservation n'est pas écoulée, le dossier est **placé en archivage
> restreint** (art. 18 RGPD) : il est sorti de la vue active mais conservé
> en archive froide pour répondre aux obligations légales (continuité des
> soins, défense en justice). Le Praticien et l'Éditeur ne peuvent y accéder
> que sur demande motivée tracée dans le journal d'audit.

À l'issue des durées ci-dessus, les données sont :
- **anonymisées de manière irréversible** si elles présentent un intérêt
  statistique pour l'Éditeur (sans aucune réutilisation commerciale), ou
- **détruites définitivement** (purge logique + écrasement physique sur les
  sauvegardes lors du cycle de rotation suivant).

---

## 7. Sécurité et hébergement

### 7.1 Mesures techniques

- **Chiffrement en transit** : TLS 1.3 pour tous les flux client/serveur et
  inter-services.
- **Chiffrement au repos** : AES-256 sur les volumes Supabase (eu-west-1).
- **Authentification Supabase** avec mot de passe haché bcrypt et option
  MFA (`[À COMPLÉTER : status MFA — disponible / obligatoire]`).
- **Row-Level Security (RLS)** Postgres : chaque ligne est filtrée par
  `auth.uid()` du Praticien — un Praticien ne peut techniquement pas accéder
  aux données d'un autre.
- **Sauvegardes** quotidiennes Supabase, rétention `[À COMPLÉTER : 7/30/90]`
  jours, restauration testée tous les `[À COMPLÉTER : trimestre]`.
- **Journal d'audit IA** (`AICallAuditEntry`) tracé pour chaque appel IA :
  longueur du payload, scrub appliqué, modèle, horodatage. Sans contenu PHI.
- **Stockage local** : la majorité des données reste sur le device du
  Praticien (IndexedDB navigateur). Pas de chiffrement applicatif local — le
  device doit être verrouillé par mot de passe / Touch ID.

### 7.2 Mesures organisationnelles

- L'Éditeur est seul à pouvoir accéder à l'infrastructure de production. Pas
  de tiers admin externe.
- Pas de personnel salarié au 2026-04-30 — l'Éditeur opère en solo. Tout
  recrutement futur s'accompagnera d'une clause de confidentialité et d'une
  formation RGPD obligatoire.
- Les développements suivent un principe de **moindre exposition** : les
  données patient ne sortent jamais du navigateur sauf pour la sync cloud
  chiffrée et les appels IA pseudonymisés.

### 7.3 Pseudonymisation pour appels IA

Cf. § 4.1.

### 7.4 Notification de violation

En cas de violation de données susceptible d'engendrer un risque pour les
droits et libertés des personnes :
- L'Éditeur **notifie le Praticien** (en sa qualité de responsable de
  traitement) dans les **24 heures** suivant la prise de connaissance.
- Il fournit toutes les informations nécessaires pour permettre au Praticien
  de notifier la CNIL sous 72 heures (art. 33 RGPD).
- Il assiste le Praticien dans la communication aux patients (art. 34 RGPD)
  si la violation présente un risque élevé.

Procédure interne complète : voir [`procedure-violation.md`](procedure-violation.md).

---

## 8. Droits des personnes concernées

Conformément aux articles **15 à 22 RGPD** et aux articles **25 à 30 nLPD**,
le Praticien (en tant qu'utilisateur de l'Application) et le Patient (en
tant que personne concernée) disposent des droits suivants :

| Droit | Exercice | Délai max |
|---|---|---|
| Accès (art. 15) | Sur demande à `[À COMPLÉTER : email DPO]` | 1 mois (extensible 2 mois) |
| Rectification (art. 16) | Sur demande au DPO + via l'interface utilisateur | 1 mois |
| Effacement / droit à l'oubli (art. 17) | Sur demande — sauf obligation légale de conservation 20 ans (cf. § 6) | 1 mois |
| Limitation du traitement (art. 18) | Sur demande | 1 mois |
| Portabilité (art. 20) | Export JSON / PDF des données via l'interface (`[À COMPLÉTER : statut feature]`) | 1 mois |
| Opposition (art. 21) | Sur demande, motivée | 1 mois |
| Décision automatisée (art. 22) | Cf. § 11 — pas de décision automatisée seule | — |
| Retrait du consentement | À tout moment, sans rétroactivité | Immédiat |
| Définition du sort post-mortem (art. 85 LIL) | Sur demande | — |

### 8.1 Comment exercer ses droits ?

- **Patient** : exercer les droits **directement auprès du Praticien** qui
  est le responsable de traitement de son dossier. Si le Praticien ne donne
  pas suite, le Patient peut écrire au DPO de l'Éditeur (contact ci-dessous)
  qui transmettra et facilitera la réponse.
- **Praticien** : écrire à `[À COMPLÉTER : email DPO]` ou utiliser le menu
  Paramètres → Mes données → Exercer mes droits.

L'Éditeur peut demander une **preuve d'identité** (copie de la carte d'identité
**hors numéro de pièce et signature**, ou méthode équivalente) pour traiter
les demandes — et uniquement à cette fin.

Procédure interne complète : voir [`procedure-droits.md`](procedure-droits.md).

---

## 9. Cookies et traceurs

Voir le document détaillé : [`cookies.md`](cookies.md).

En résumé :
- **Cookies strictement nécessaires** (session Supabase Auth, préférences UI) :
  pas de consentement requis.
- **Pas de cookie publicitaire**, pas de pixel de tracking marketing,
  pas d'analytics tiers (Google Analytics, Meta Pixel, etc.).
- Une bannière de consentement s'affiche au premier accès au site marketing
  pour les cookies de mesure d'audience anonyme `[À COMPLÉTER : Plausible /
  Matomo on-premise / aucun]`.

---

## 10. Mineurs

L'Application n'est **pas destinée aux mineurs comme utilisateurs directs**.
Le Praticien doit être un professionnel de santé majeur diplômé d'État.

Les **patients mineurs** peuvent en revanche faire l'objet d'un dossier dans
l'Application, sous la responsabilité du Praticien et conformément aux
règles déontologiques applicables (consentement parental, information adaptée
à l'âge). L'Éditeur ne traite pas ces données de manière différenciée mais
applique les mêmes garanties de sécurité.

---

## 11. Profilage et décision automatisée

L'Éditeur **ne réalise aucune décision automatisée produisant des effets
juridiques** au sens de l'art. 22 RGPD.

Les **suggestions générées par l'IA** (analyses cliniques, hypothèses
diagnostiques, courriers, transcriptions) sont :
- **non contraignantes** ;
- **toujours validées et signées par le Praticien** avant d'être utilisées
  ou transmises à un tiers (médecin destinataire, patient) ;
- **affichées avec une mention d'origine IA** dans l'interface lorsque c'est
  le cas.

Le Praticien reste seul responsable de l'interprétation clinique et de la
décision thérapeutique.

---

## 12. Délégué à la protection des données

`[À COMPLÉTER : NOM DPO ou cabinet de DPO mutualisé]`

- **Email** : `[À COMPLÉTER : dpo@…]`
- **Adresse postale** : `[À COMPLÉTER]`

> ⚠️ **Désignation obligatoire** car traitement à grande échelle de données
> de santé (art. 37.1.c RGPD). À nommer **avant** la commercialisation.
> En attendant, le contact référent est l'Éditeur lui-même via
> `[À COMPLÉTER : email contact]`.

---

## 13. Recours et plainte

Si vous estimez, après avoir contacté le Praticien et/ou le DPO de l'Éditeur,
que vos droits ne sont pas respectés :

### France
**CNIL** — Commission nationale de l'informatique et des libertés
- 3 place de Fontenoy, 75007 Paris
- `cnil.fr/fr/plaintes` (formulaire en ligne gratuit)
- Tél : 01 53 73 22 22

### Suisse
**PFPDT** — Préposé fédéral à la protection des données et à la transparence
- Feldeggweg 1, 3003 Berne
- `edoeb.admin.ch/edoeb/fr/home.html`

### Union européenne
**EDPB** (chef de file pour l'Éditeur résident France = CNIL).

---

## 14. Modifications

L'Éditeur peut modifier la présente politique pour refléter une évolution
légale, technique ou contractuelle. Toute modification substantielle
(nouveau sous-traitant, nouvelle finalité, allongement de durée de
conservation) sera notifiée par email au Praticien **30 jours avant entrée
en vigueur**, lui laissant la possibilité de résilier sans frais s'il
n'accepte pas les nouvelles conditions.

L'historique des versions est consultable sur demande à
`[À COMPLÉTER : email contact]`.

---

**Version** : 1.0 — 2026-04-30
**Prochaine revue prévue** : 2027-04-30 ou avant si événement majeur.

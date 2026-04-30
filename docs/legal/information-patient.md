# Notice d'information patient — Traitement informatisé du dossier de soin

> Document destiné à être **remis (papier ou affichage cabinet) ou affiché
> en téléchargement libre** par le Praticien à ses patients.
>
> Conforme à l'**art. 13 RGPD** (information de la personne concernée) et à
> l'**art. 19 nLPD**.
>
> Version : `1.0` — 2026-04-30.

---

## À l'attention du Patient

Votre kinésithérapeute / physiothérapeute (« le **Praticien** ») utilise
l'application `[À COMPLÉTER : nom commercial]` pour tenir votre dossier
de soin de manière informatisée. Cette notice vous informe :
- des données traitées,
- des finalités,
- des destinataires,
- de vos droits.

Conservez cette notice ou consultez-la à tout moment sur
`[À COMPLÉTER : URL public]`.

---

## 1. Qui traite mes données ?

Votre **Praticien** est le **responsable** du traitement de votre dossier
au sens du Règlement européen RGPD et de la loi suisse nLPD. Ses
coordonnées vous ont été communiquées au cabinet.

Pour la tenue informatisée du dossier, votre Praticien utilise une
application éditée par `[À COMPLÉTER : raison sociale]` (« l'Éditeur »).
L'Éditeur agit en tant que **sous-traitant** de votre Praticien, c'est-à-dire
qu'il traite vos données **uniquement sur instruction** du Praticien et
**dans le cadre exclusif** des prestations contractualisées.

L'Éditeur n'a **pas le droit** d'utiliser vos données pour ses propres fins
(commercialisation, statistiques publiques, entraînement d'IA, etc.).

---

## 2. Quelles données sont traitées ?

| Catégorie | Exemples |
|---|---|
| Identification | Nom, prénom, date de naissance, sexe, adresse, contacts |
| Antécédents médicaux | Antécédents personnels, familiaux, traitements en cours, allergies |
| Données cliniques | Bilans (douleur, mobilité, force), tests, plans de soins, courriers |
| Documents | Ordonnances, comptes-rendus, imageries (sur autorisation) |
| Transcriptions vocales | Si votre Praticien enregistre vos consultations (avec votre **consentement explicite**) |

Ces données sont des **données de santé**, qui bénéficient d'un niveau
de protection renforcé (art. 9 RGPD).

Vous n'avez **pas l'obligation** de communiquer toutes ces données : seules
celles strictement nécessaires à votre prise en charge le sont. Toutefois,
un refus de communiquer certaines informations peut empêcher votre
Praticien de vous proposer un traitement adapté.

---

## 3. Pourquoi mes données sont-elles traitées ?

Les finalités sont les suivantes :

- **Tenue de votre dossier de soin** (obligation légale du Praticien — art.
  R.4321-86 CSP en France ; LAMal en Suisse) ;
- **Continuité des soins** entre praticiens du cabinet ou avec des confrères
  associés à votre prise en charge ;
- **Communication avec votre médecin prescripteur** ou d'autres
  professionnels de santé (avec votre accord) via courriers générés ;
- **Aide à la rédaction par intelligence artificielle** : votre dossier
  peut être analysé par des outils d'IA (Claude d'Anthropic, Whisper
  d'OpenAI) **après pseudonymisation préalable** (suppression de votre
  nom, prénom et date de naissance) — l'IA produit des suggestions
  d'analyse, de plan de soins ou de courrier que votre Praticien
  **vérifie, corrige et signe** systématiquement.

Aucune **décision automatisée** n'est prise par l'IA seule. Toute
suggestion est validée par le Praticien.

---

## 4. Sur quelle base légale ?

| Finalité | Base légale |
|---|---|
| Tenue du dossier patient | Mission d'intérêt public en santé + nécessité aux fins du diagnostic / soins (art. 6.1.e + 9.2.h RGPD ; art. 6.7.b nLPD) |
| Aide à la rédaction par IA pseudonymisée | Intérêt légitime du Praticien à fournir un soin de qualité, après pseudonymisation (art. 6.1.f + 9.2.h RGPD) |
| Inclusion dans le dossier de documents que vous fournissez | Votre **consentement explicite** (art. 9.2.a RGPD) |
| Enregistrement vocal des consultations | Votre **consentement explicite** (art. 9.2.a RGPD) — vous pouvez vous y opposer à tout moment |

Vous pouvez **retirer votre consentement** à tout moment, sans rétroactivité
sur les traitements déjà effectués.

---

## 5. Qui peut accéder à mes données ?

### 5.1 Personnes habilitées

- **Votre Praticien** principalement, et le cas échéant ses associés du
  cabinet en cas de prise en charge partagée déclarée.
- **L'Éditeur** uniquement dans le cadre du support technique nécessaire
  et **sur demande explicite du Praticien**, jamais en accès libre.

### 5.2 Sous-traitants techniques

Pour l'hébergement et le fonctionnement de l'application :

| Sous-traitant | Rôle | Localisation |
|---|---|---|
| Vercel Inc. | Hébergement de l'interface | Paris (FR) + CDN global |
| Supabase Inc. | Base de données + sauvegardes | Irlande (UE) |
| Anthropic, PBC | IA Claude — analyses (données pseudonymisées) | États-Unis |
| OpenAI, LLC | IA Whisper — transcription (données pseudonymisées) | États-Unis |

Les transferts vers les États-Unis sont encadrés par les clauses
contractuelles types européennes (SCC) et la décision d'adéquation
**Data Privacy Framework**.

> ⚠️ **Information transparente** : à la date de cette notice, ces
> sous-traitants ne sont pas certifiés HDS (Hébergeurs de Données de Santé)
> au sens de la loi française. L'Éditeur a engagé une migration vers un
> hébergeur HDS certifié à `[À COMPLÉTER : trimestre]`. En attendant, des
> mesures techniques compensatoires sont appliquées (pseudonymisation,
> chiffrement renforcé, restriction des données transmises). Vous pouvez
> demander à votre Praticien de **ne pas utiliser** les fonctions IA si
> vous le souhaitez.

### 5.3 Personne ne reçoit vos données à des fins commerciales

Vos données ne sont **jamais cédées, vendues, louées** à des tiers
commerciaux. Pas de publicité ciblée, pas de revente de fichiers.

---

## 6. Combien de temps sont-elles conservées ?

| Donnée | Durée |
|---|---|
| Dossier patient (FR) | **20 ans** après votre dernier acte de soin (ou jusqu'à vos 28 ans si vous étiez mineur) — art. R.1112-7 CSP |
| Dossier patient (CH) | 10 à 20 ans selon canton — LAMal + lois cantonales |

Cette durée est **imposée par la loi** : votre Praticien ne peut pas
supprimer votre dossier avant son terme, même à votre demande, sauf
exception.

Vous pouvez en revanche demander la **limitation du traitement** (art. 18
RGPD) : votre dossier est alors placé en **archive restreinte**, sorti des
vues actives, et ne peut être consulté que sur demande motivée
(continuité de soins, réquisition judiciaire).

Au terme de la durée légale, vos données sont **détruites définitivement**
ou **anonymisées de manière irréversible**.

---

## 7. Quels sont mes droits ?

Vous disposez à tout moment des droits suivants :

| Droit | Description |
|---|---|
| **Accès** (art. 15 RGPD) | Obtenir une copie de votre dossier |
| **Rectification** (art. 16) | Corriger une donnée inexacte |
| **Effacement** (art. 17) | Demander la suppression — sous réserve de la conservation 20 ans |
| **Limitation** (art. 18) | Geler le traitement, mise en archive restreinte |
| **Opposition** (art. 21) | Vous opposer à un traitement spécifique (ex: IA, transcription vocale) |
| **Portabilité** (art. 20) | Recevoir vos données dans un format structuré (JSON, PDF) |
| **Définition du sort post-mortem** (art. 85 LIL) | Indiquer ce que vous souhaitez qu'il advienne de vos données après votre décès |

### 7.1 Comment exercer mes droits ?

**En priorité, contactez votre Praticien** : il est votre interlocuteur
direct comme responsable du traitement.

Si votre Praticien ne donne pas suite dans le délai d'un mois, vous pouvez
écrire au Référent protection des données de l'Éditeur :

- **Référent protection des données de l'Éditeur** :
  `[À COMPLÉTER : Arnaud Trilles, dirigeant et fondateur]`
- **Email** : `[À COMPLÉTER : email pro — exemple rgpd@<domaine>]`
- **Adresse postale** : `[À COMPLÉTER]`

> À ce stade de l'activité, l'Éditeur n'a pas désigné de Délégué à la
> protection des données (DPO) au sens de l'art. 37 RGPD, le seuil de
> traitement « à grande échelle » n'étant pas encore atteint. Le
> Référent ci-dessus traite l'ensemble des demandes RGPD avec les
> délais légaux applicables.

Une preuve d'identité peut vous être demandée (copie de pièce d'identité,
**en masquant numéro et signature**) pour traiter votre demande en
sécurité.

### 7.2 Délai de réponse

Votre demande sera traitée dans **un mois** à compter de sa réception
(extensible à 3 mois en cas de complexité, vous serez informé).

Le traitement de votre demande est **gratuit**, sauf demande manifestement
infondée ou excessive.

---

## 8. Sécurité de mes données

L'Éditeur applique :
- chiffrement TLS 1.3 lors des échanges réseau ;
- chiffrement AES-256 sur les sauvegardes de la base de données ;
- contrôle d'accès strict par identifiant Praticien (RLS Postgres) ;
- pseudonymisation systématique avant tout envoi à l'IA ;
- sauvegardes quotidiennes ;
- journal d'audit des accès aux données.

Votre Praticien doit en outre respecter le **secret professionnel** (art.
L.1110-4 CSP / art. 321 CP suisse).

---

## 9. Et si une violation de mes données se produit ?

En cas d'incident susceptible d'engendrer un risque pour vos droits, et
si la violation présente un risque élevé, l'Éditeur et votre Praticien
sont **tenus de vous en informer** sans délai injustifié (art. 34 RGPD).

L'autorité de contrôle (CNIL en France, PFPDT en Suisse) est notifiée
sous 72 h (art. 33 RGPD).

---

## 10. Plainte auprès de l'autorité de contrôle

Si vous estimez que vos droits ne sont pas respectés, après avoir
contacté votre Praticien et/ou le DPO de l'Éditeur :

### France
**CNIL** — `cnil.fr/fr/plaintes`
3 place de Fontenoy, 75007 Paris.

### Suisse
**PFPDT** — `edoeb.admin.ch`
Feldeggweg 1, 3003 Berne.

---

## 11. Où trouver plus d'informations ?

- **Politique de confidentialité complète de l'Éditeur** :
  `[À COMPLÉTER : URL]`
- **Mentions légales** : `[À COMPLÉTER : URL]`

---

> Notice établie en application des articles 13 et 14 RGPD et de l'art. 19
> nLPD. Cette information vous est délivrée **avant le démarrage du
> traitement**. La poursuite de la prise en charge vaut acceptation du
> traitement informatisé décrit ci-dessus, sans préjudice de votre droit
> de retirer votre consentement à tout moment.

Date de remise : `[à compléter par le Praticien]`
Signature pour réception (facultatif) : ____________________

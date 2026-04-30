# Accord de sous-traitance des données (DPA) — Praticien

> Document à signer électroniquement (ou case à cocher avec horodatage et
> traçabilité de l'IP) **au moment de l'inscription** du Praticien.
>
> Conforme à l'**article 28 RGPD** et à l'**article 9 nLPD**.
>
> Ce DPA forme un tout indissociable avec les [CGU](cgu-praticien.md), les
> [CGV](cgv.md) et la [Politique de confidentialité](politique-confidentialite.md).
>
> Version : `1.0` — 2026-04-30.

---

## Identification des parties

**Le Responsable de traitement** (« le Praticien »)
- Identifié dans son compte par : nom, prénom, email, RPPS/GLN.
- Pour la **France** : kinésithérapeute libéral ou salarié, responsable du
  traitement des données patient au titre de l'art. R.4321-86 CSP.
- Pour la **Suisse** : physiothérapeute responsable au sens de l'art. 5.j nLPD.

**Le Sous-traitant** (« l'Éditeur »)
- `[À COMPLÉTER : raison sociale]`
- `[À COMPLÉTER : SIREN/SIRET]`
- `[À COMPLÉTER : adresse]`
- Représenté par Arnaud Trilles, en qualité de
  `[À COMPLÉTER : gérant / président / EI]`.

---

## Article 1 — Objet et durée

### 1.1 Objet

Le présent DPA encadre le **traitement de données à caractère personnel
des patients** opéré par l'Éditeur **pour le compte** du Praticien, dans
le cadre de la fourniture de l'application `[À COMPLÉTER : nom commercial]`
(« l'**Application** »).

### 1.2 Durée

Le DPA prend effet à compter de l'acceptation par le Praticien et reste en
vigueur **tant que l'abonnement** au service est actif. Il survit à la
résiliation pour la durée nécessaire à la restitution ou destruction des
données (art. 11 ci-dessous).

### 1.3 Documentation

Le Praticien doit conserver le présent DPA et la preuve de son acceptation
au titre de son **registre des traitements** (art. 30 RGPD), comme
document attestant la conformité de son sous-traitant.

---

## Article 2 — Description du traitement (art. 28.3 RGPD)

| Élément | Détail |
|---|---|
| **Nature du traitement** | Hébergement, sauvegarde, traitement et restitution des données du dossier patient. Génération assistée de contenus (analyses, courriers, transcriptions) par appel à des modèles d'IA externes pseudonymisés. |
| **Finalité** | Fournir au Praticien un outil documentaire et bureautique pour la tenue informatisée du dossier patient. |
| **Catégories de données** | Identification (nom, prénom, DOB, sexe, contacts), antécédents médicaux, données cliniques (EVN, MRC, ROM, tests), documents joints, transcriptions vocales, plans de soins, courriers. |
| **Catégories de personnes concernées** | Patients du Praticien (incluant patients mineurs sous responsabilité parentale, adultes vulnérables, personnes majeures). |
| **Données de catégorie particulière (art. 9 RGPD)** | **Oui — données de santé**. Traitement nécessaire aux fins de la médecine préventive, du diagnostic médical et de l'administration de soins (art. 9.2.h RGPD), sous le contrôle d'un professionnel de santé soumis au secret professionnel. |
| **Localisation des données** | Base Postgres : Supabase région `eu-west-1` (Irlande). CDN front : Vercel `cdg1` (Paris) + global. Données de santé pseudonymisées en transit vers Anthropic (US) et OpenAI (US). Cf. § 4. |
| **Durée de conservation** | 20 ans après la fin de la prise en charge (FR — art. R.1112-7 CSP) ; selon canton pour la CH (typiquement 10–20 ans). |

---

## Article 3 — Obligations du Sous-traitant

L'Éditeur s'engage à :

### 3.1 Confidentialité et secret

- Traiter les données patient **uniquement sur instructions documentées du
  Praticien** (les présentes CGU/DPA et l'usage normal de l'Application
  valent instructions).
- **Ne pas réutiliser** les données patient à des fins propres, commerciales,
  analytiques ou d'entraînement de modèle.
- Garantir que toute personne autorisée à accéder aux données s'engage à la
  confidentialité (engagement contractuel de l'Éditeur, et de tout salarié
  futur).

### 3.2 Sécurité (art. 32 RGPD)

Mettre en œuvre les mesures techniques et organisationnelles décrites dans
la [Politique de confidentialité § 7](politique-confidentialite.md) :
- chiffrement TLS 1.3 en transit ;
- chiffrement AES-256 au repos sur Supabase ;
- Row-Level Security Postgres par `auth.uid()` ;
- pseudonymisation préalable avant tout envoi à un sous-traitant IA ;
- sauvegardes quotidiennes ;
- journal d'audit des appels IA ;
- principe du moindre privilège pour les accès admin.

### 3.3 Sous-traitance ultérieure (art. 28.2 et 28.4 RGPD)

Le Praticien autorise par les présentes l'Éditeur à recourir aux
sous-traitants ultérieurs listés en **Annexe 1**.

L'Éditeur s'engage à :
- imposer **par contrat** à chaque sous-traitant ultérieur des obligations
  équivalentes à celles du présent DPA ;
- informer le Praticien **30 jours avant** tout ajout, remplacement ou
  modification substantielle d'un sous-traitant ;
- permettre au Praticien de **s'opposer** à un nouveau sous-traitant
  pendant ce délai. En cas d'opposition légitime, le Praticien peut
  résilier sans frais.

### 3.4 Coopération aux droits des personnes (art. 28.3.e RGPD)

Aider le Praticien, par des mesures techniques et organisationnelles
appropriées, à donner suite aux demandes d'exercice des droits (accès,
rectification, effacement, limitation, portabilité, opposition).

Procédure : [`procedure-droits.md`](procedure-droits.md).

### 3.5 Notification des violations (art. 28.3.f + 33 RGPD)

Notifier au Praticien toute violation de données dans les **24 heures**
suivant la prise de connaissance, en lui transmettant :
- la nature de la violation ;
- les catégories et le volume approximatif de données et de personnes
  concernées ;
- les conséquences probables ;
- les mesures prises et envisagées.

Procédure : [`procedure-violation.md`](procedure-violation.md).

### 3.6 AIPD (art. 28.3.f + 35 RGPD)

Fournir au Praticien toute information utile à la réalisation de son AIPD
(analyse d'impact). L'AIPD du présent traitement est documentée dans
[`aipd.md`](aipd.md) et tenue à disposition.

### 3.7 Audit (art. 28.3.h RGPD)

L'Éditeur :
- met à disposition du Praticien toute information nécessaire pour
  démontrer le respect du présent DPA ;
- permet et contribue à des **audits**, y compris sur place, réalisés par
  le Praticien ou par un auditeur tiers indépendant qu'il aurait mandaté.

L'audit est limité à 1 par an, doit être notifié 30 jours à l'avance,
réalisé en heures ouvrées sans perturber le service, et soumis à un
engagement de confidentialité du Praticien et de l'auditeur. Les coûts
sont à la charge du Praticien sauf si l'audit révèle un manquement
substantiel de l'Éditeur.

L'Éditeur peut **proposer en alternative** un rapport d'audit indépendant
(certifications ISO 27001, SOC 2 ou rapport DPO) si jugé suffisant par le
Praticien.

### 3.8 Information et conformité

Informer immédiatement le Praticien si une instruction donnée constitue,
à son avis, une violation du RGPD ou d'autres dispositions de protection
des données.

---

## Article 4 — Transferts hors UE / hors Suisse

L'Éditeur recourt à des sous-traitants situés aux **États-Unis** (Anthropic,
OpenAI) et utilisant des **CDN globaux** (Vercel). Ces transferts sont
encadrés par :

1. **Standard Contractual Clauses (SCC)** — Décision UE 2021/914 du
   4 juin 2021, modules 2 ou 3 selon les rôles.
2. **Data Privacy Framework (DPF)** — Adequacy decision du 10 juillet 2023.
   Les sous-traitants concernés sont **certifiés DPF**.
3. **Mesures techniques complémentaires** :
   - **Pseudonymisation préalable** des données avant transmission IA ;
   - **Restriction au strict nécessaire** : seules les données utiles à la
     génération sont transmises ;
   - **Pas de rétention longue** chez les sous-traitants IA :
     - Anthropic : 30 jours max ;
     - OpenAI : 30 jours max ;
   - **Pas d'entraînement** sur les inputs API (clauses contractuelles).

Pour la **Suisse**, la décision d'adéquation **Swiss-US DPF** du 15 septembre
2024 (PFPDT) couvre les transferts vers les sous-traitants US certifiés.

Copie des SCC sur demande à `[À COMPLÉTER : email DPO]`.

---

## Article 5 — Engagements particuliers liés au statut HDS

> ⚠️ **Information cruciale au Praticien :**
>
> Les sous-traitants de l'Éditeur **ne sont pas certifiés HDS** au sens de
> l'art. L.1111-8 CSP français à la date du présent DPA.
>
> En contrepartie, l'Éditeur :
> 1. **applique des mesures compensatoires** renforcées (cf. § 3.2) ;
> 2. **a engagé une migration vers un hébergeur HDS certifié** dont la date
>    cible est `[À COMPLÉTER : trimestre]` ;
> 3. **assume la responsabilité** d'informer chaque Praticien si la
>    situation devait se prolonger au-delà du délai annoncé ou se dégrader ;
> 4. **garantit** que cette situation n'engendre **aucune perte de
>    contrôle** sur les données et **aucun transfert non encadré** vers
>    un tiers non couvert par le présent DPA.
>
> Le Praticien :
> 1. **reconnaît avoir été informé** de ce statut ;
> 2. **accepte d'utiliser l'Application en l'état** comme une décision
>    éclairée de sa pratique professionnelle ;
> 3. **informe ses patients** dans la notice qu'il leur remet
>    ([`information-patient.md`](information-patient.md)) ;
> 4. **peut résilier sans frais** si l'engagement de migration HDS n'est
>    pas tenu dans le délai annoncé.

---

## Article 6 — Responsabilité

Chaque partie est responsable des dommages qu'elle cause à l'autre par
non-respect du présent DPA, dans les limites fixées par les
[CGU art. 8](cgu-praticien.md).

Conformément à l'art. 82 RGPD, en cas de dommage causé à une personne
concernée, chaque partie est responsable proportionnellement à sa part
dans le manquement.

L'Éditeur **n'est pas responsable** des décisions cliniques prises par le
Praticien sur la base des suggestions IA.

---

## Article 7 — Documentation et registre

L'Éditeur tient à la disposition du Praticien :
- la liste à jour de ses sous-traitants (Annexe 1) ;
- le registre des activités de traitement de l'Éditeur (extraits sur demande) ;
- l'AIPD du traitement principal ([`aipd.md`](aipd.md)) ;
- les preuves de signature des SCC avec les sous-traitants US.

Le Praticien tient à jour son **propre registre** (art. 30 RGPD) en y
intégrant le présent DPA comme preuve de conformité de la sous-traitance.
Modèle proposé : [`registre-traitements.md`](registre-traitements.md).

---

## Article 8 — Modifications

Toute modification substantielle du présent DPA (nouveau sous-traitant,
nouvelle catégorie de données, modification des transferts) est notifiée
au Praticien **30 jours avant** entrée en vigueur, avec droit de
résiliation sans frais.

L'Éditeur publie la dernière version sur `[À COMPLÉTER : URL]` et met à
jour la **date de version** à chaque modification.

---

## Article 9 — Loi applicable et juridiction

Le présent DPA est soumis au **droit français**. Tout litige relève des
tribunaux de `[À COMPLÉTER : ville]` après tentative de résolution amiable.

Les dispositions impératives du droit suisse (nLPD, jurisprudence du
Tribunal fédéral) restent applicables au Praticien suisse pour les
questions touchant à la souveraineté des données helvétiques.

---

## Article 10 — Restitution / destruction des données (art. 28.3.g RGPD)

À la fin du contrat, le Praticien peut choisir entre :

1. **Restitution complète** : export JSON + PDF de toutes les données du
   dossier patient, mis à disposition pendant 90 jours après résiliation.
2. **Transfert** vers un autre prestataire désigné par le Praticien, avec
   l'assistance technique de l'Éditeur (frais
   `[À COMPLÉTER : montant ou « gratuit »]`).
3. **Destruction** : suppression complète des données dans les 30 jours,
   sous réserve des **données dont la conservation est imposée par la loi**
   (factures, logs d'audit). Pour les données patient soumises à la
   conservation 20 ans, voir art. 11 ci-dessous.

L'Éditeur fournit, sur demande, une **attestation écrite** de la suppression
ou du transfert.

---

## Article 11 — Cas particulier de la conservation 20 ans

Les données du dossier patient sont, en France, soumises à une obligation
légale de conservation de **20 ans** après la fin de la prise en charge
(art. R.1112-7 CSP). En Suisse, la durée varie selon les cantons mais
est typiquement de 10 à 20 ans.

Conformément à cette obligation :

- Au terme du contrat, l'Éditeur **conserve les dossiers patients en
  archive froide** pour la durée légale restant à courir.
- Cette archive est :
  - inaccessible par défaut, en lecture seule, hors de l'environnement de
    production ;
  - accessible uniquement sur **demande motivée** d'une autorité compétente
    (réquisition judiciaire, demande CNIL/PFPDT, etc.) ou du Patient
    exerçant son droit d'accès (art. 15 RGPD) via le Praticien
    archivant.
- Les frais d'archivage longue durée sont
  `[À COMPLÉTER : pris en charge par l'Éditeur sur la durée légale / facturés
  forfaitairement à la résiliation]`.
- Au terme de la durée légale, les données sont **détruites définitivement**
  avec attestation transmise au Praticien si encore identifiable.

Cette disposition prévaut sur l'art. 10 ci-dessus en cas de contradiction.

---

## Annexe 1 — Liste des sous-traitants ultérieurs autorisés

Version : `1.0` — 2026-04-30.

| # | Nom | Rôle | Localisation | Garanties |
|---|---|---|---|---|
| 1 | **Vercel Inc.** | Hébergement front + functions | `cdg1` (Paris) + CDN global | DPA Vercel + SCC + DPF |
| 2 | **Supabase Inc.** | Postgres + Storage + Auth | `eu-west-1` (Irlande) | DPA Supabase + SCC + ISO 27001 + SOC 2 |
| 3 | **Anthropic, PBC** | Claude — génération IA | États-Unis | DPA Anthropic Enterprise + SCC + DPF + zero-retention training |
| 4 | **OpenAI, LLC** | Whisper — transcription | États-Unis | DPA OpenAI + SCC + DPF + zero-retention training |
| 5 | **`[À COMPLÉTER : Stripe / autre PSP]`** | Paiement (responsable conjoint) | Selon PSP | Politique propre du PSP |
| 6 | **`[À COMPLÉTER : Postmark / Resend / SES]`** | Emails transactionnels | `[À COMPLÉTER]` | DPA + SCC |

Toute modification de cette annexe est notifiée 30 jours avant.

---

## Acceptation

> ☐ J'accepte le présent DPA en qualité de **responsable de traitement**
> au sens du RGPD, pour les données patient saisies dans l'Application.
>
> ☐ Je reconnais avoir été informé du **statut HDS actuel** des
> sous-traitants (article 5).
>
> ☐ J'autorise l'Éditeur à recourir aux **sous-traitants ultérieurs**
> listés en Annexe 1.

Date d'acceptation : `[automatique]`
Praticien (nom, RPPS/GLN) : `[automatique]`
Version DPA acceptée : `1.0`

# Conditions Générales de Vente (CGV) — Abonnement Praticien

> Document à faire **accepter au moment de la souscription d'un abonnement
> payant** (case à cocher distincte des CGU). Conserver l'acceptation 10 ans
> au titre de la preuve comptable.
>
> Version : `1.0` — 2026-04-30.

---

## Article 1 — Champ d'application

Les présentes CGV régissent la **vente de l'abonnement** à l'application
`[À COMPLÉTER : nom commercial]` éditée par `[À COMPLÉTER : raison sociale]`
(« l'**Éditeur** »), au profit de tout professionnel de santé
(« le **Praticien** ») souscrivant un abonnement payant.

Elles complètent les [CGU](cgu-praticien.md) et la [Politique de
confidentialité](politique-confidentialite.md).

L'abonnement est **B2B** (entre professionnels) — les dispositions du Code
de la consommation relatives aux contrats à distance B2C ne s'appliquent pas,
sauf si l'Éditeur en décide expressément. Le Praticien renonce
expressément au droit de rétractation de 14 jours (art. L.221-18 C. conso)
qui ne lui est pas applicable en sa qualité de professionnel.

---

## Article 2 — Description du service

L'abonnement donne accès, pour la durée souscrite et selon le plan choisi, à
l'ensemble des fonctionnalités de l'Application :

| Fonctionnalité | Plan `[Solo]` | Plan `[Pro]` | Plan `[Cabinet]` |
|---|---|---|---|
| Nombre de praticiens | 1 | 1 | `[À COMPLÉTER]` |
| Nombre de patients actifs | `[À COMPLÉTER]` | Illimité | Illimité |
| Bilans IA Claude / Whisper | `[À COMPLÉTER : quota mensuel]` | Illimité | Illimité |
| Stockage Supabase | `[À COMPLÉTER : Go]` | `[Go]` | `[Go]` |
| Sauvegarde quotidienne | ✔ | ✔ | ✔ |
| Support | Email | Email + Chat | Email + Chat + Téléphone |
| Multi-praticiens / partage cabinet | — | — | ✔ |

`[À COMPLÉTER : ajuster cette grille selon les plans réels.]`

> ⚠️ **Aucun plan ne donne accès à un hébergement HDS certifié** au
> 2026-04-30. Cf. CGU § 4. La feuille de route prévoit la migration vers un
> hébergeur HDS certifié à `[À COMPLÉTER : trimestre]`. À cette date, les
> grilles tarifaires pourront être révisées dans les conditions de l'art. 6.

---

## Article 3 — Tarifs et facturation

### 3.1 Tarifs

Les tarifs en vigueur sont publiés sur `[À COMPLÉTER : URL page tarifs]`.
Ils sont indiqués **HT** et **TTC** (TVA française à 20 % le cas échéant —
mention « TVA non applicable, art. 293 B du CGI » si l'Éditeur n'est pas
assujetti).

Pour la **Suisse**, la TVA n'est généralement pas applicable au titre de
l'export de services à un professionnel suisse (régime international).
Le Praticien suisse peut être tenu de **déclarer la TVA suisse** sur
l'achat (mécanisme du « reverse charge »).

### 3.2 Modalités de paiement

- **Mensuel** ou **annuel** (`[À COMPLÉTER : remise % éventuelle]`) ;
- Prélèvement automatique via `[À COMPLÉTER : Stripe / autre PSP]` ;
- Carte bancaire ou prélèvement SEPA selon disponibilité.

L'Éditeur n'a **aucun accès aux données de carte bancaire** — celles-ci
sont gérées exclusivement par le PSP, qui agit en responsable de traitement
pour la transaction.

### 3.3 Factures

Une facture électronique est mise à disposition du Praticien dans son
espace **Paramètres → Facturation** sous 7 jours à chaque échéance.
Conformément à l'art. L.123-22 C. com., les factures sont conservées
10 ans.

### 3.4 Échec de paiement

En cas d'échec de prélèvement :
- une nouvelle tentative est effectuée à J+3 ;
- si l'échec persiste, un email est envoyé invitant le Praticien à régulariser ;
- à défaut de régularisation à J+15, l'accès à l'Application est **suspendu** ;
- à J+45, le compte est **résilié de plein droit** sans préjudice du
  recouvrement des sommes dues, qui peuvent être majorées des pénalités
  légales (art. L.441-10 C. com. — taux d'intérêt légal × 3 + indemnité
  forfaitaire de 40 €).

---

## Article 4 — Durée et reconduction

L'abonnement est souscrit pour la durée choisie au moment du paiement
(mensuel ou annuel).

Il est **reconduit tacitement** pour des périodes équivalentes, sauf
résiliation par le Praticien dans les conditions de l'article 5.

Conformément à la **loi Chatel** (art. L.215-1 C. conso) — applicable
même en B2B pour les contrats à reconduction tacite — l'Éditeur informe
le Praticien :
- au plus tôt **3 mois** et au plus tard **1 mois** avant la date d'échéance,
- de la possibilité de ne pas reconduire le contrat.

À défaut de cette information, le Praticien peut résilier sans frais à
tout moment à compter de la date de reconduction tacite, et obtenir
remboursement des sommes prélevées au-delà de cette date.

---

## Article 5 — Résiliation

### 5.1 Résiliation par le Praticien

Le Praticien peut résilier à tout moment via :
- Paramètres → Mon abonnement → Résilier ;
- ou par email à `[À COMPLÉTER : email]` ;
- ou par lettre recommandée avec accusé de réception à l'adresse du siège.

La résiliation prend effet à **la fin de la période en cours payée** —
aucun remboursement prorata pour la période entamée n'est dû, sauf cas
prévus à l'art. 7 (manquement de l'Éditeur).

### 5.2 Résiliation par l'Éditeur

L'Éditeur peut résilier sans préavis ni indemnité en cas de :
- défaut de paiement (cf. art. 3.4) ;
- manquement grave aux CGU (usage illicite, partage d'identifiants
  systématique, démarchage de patients tiers, etc.) ;
- décision judiciaire ou administrative (radiation de l'Ordre, etc.).

L'Éditeur peut également résilier moyennant un **préavis de 90 jours** en
cas d'arrêt de l'activité ou de l'Application. Dans ce cas :
- les sommes prélevées au-delà du dernier jour effectif sont remboursées
  prorata ;
- un export complet des données est mis à disposition pendant 90 jours
  supplémentaires ;
- la procédure de continuité décrite à l'art. 8 est appliquée.

### 5.3 Sort des données après résiliation

- **Données du Praticien** (compte, facturation, logs) : conservées 3 ans
  après résiliation puis purgées (sauf factures = 10 ans).
- **Données patient** : conservées au titre de l'obligation légale de
  20 ans après la fin de la prise en charge (cf. Politique de confidentialité
  § 6). Sur demande motivée, l'Éditeur peut transférer les dossiers à un
  autre hébergeur HDS choisi par le Praticien (frais
  `[À COMPLÉTER : montant ou « gratuit »]`).

---

## Article 6 — Évolution des prix et fonctionnalités

L'Éditeur se réserve le droit de modifier ses tarifs et le contenu des
plans. Toute modification substantielle est :
- notifiée par email **60 jours avant** son entrée en vigueur ;
- assortie d'un droit de résiliation sans pénalité dans ce délai.

L'absence de résiliation dans les 60 jours vaut acceptation des nouvelles
conditions.

Les abonnements en cours, déjà payés, ne sont **pas** affectés rétroactivement.
La nouvelle tarification s'applique au prochain renouvellement uniquement.

---

## Article 7 — Garanties et engagements de service (SLA)

### 7.1 Disponibilité

L'Éditeur s'engage sur une **disponibilité ≥ 99 % par mois civil**, calculée
hors maintenance planifiée (notifiée 48 h avant) et hors cas de force majeure.

| Disponibilité mensuelle constatée | Avoir au prorata sur la facture suivante |
|---|---|
| 99 % – 100 % | 0 % |
| 95 % – 98,99 % | 10 % |
| 90 % – 94,99 % | 20 % |
| < 90 % | 50 % |

L'avoir est appliqué automatiquement à la facture suivante, ou crédité au
compte en cas de résiliation. Aucun dommage indirect (perte de patientèle,
perte de chiffre d'affaires, etc.) n'est indemnisé au-delà de cet avoir.

### 7.2 Restitution des données

À tout moment, et au plus tard **30 jours après la résiliation**, l'Éditeur
met à disposition du Praticien un **export complet** de ses données :
- format **JSON** structuré pour réimport éventuel ;
- format **PDF** consolidé pour archivage ;
- documents joints en pièces jointes ou archive ZIP.

Le Praticien dispose de 90 jours pour télécharger l'export après
résiliation. Au-delà, l'export est purgé (les données restent toutefois
soumises aux durées légales de conservation).

### 7.3 Support

| Plan | Délai de réponse cible |
|---|---|
| `[Solo]` | 48 h ouvrées |
| `[Pro]` | 24 h ouvrées |
| `[Cabinet]` | 4 h ouvrées (en jour ouvré 9 h – 18 h) |

Pour les **incidents de sécurité ou indisponibilité majeure**, le délai est
inférieur à 4 h tous plans confondus.

---

## Article 8 — Continuité d'activité

En cas de défaillance de l'Éditeur (cessation d'activité, faillite, etc.) :

1. L'**hébergement Supabase est conservé** pour la durée légale de
   conservation des dossiers patients (20 ans) en lecture seule, financée
   par `[À COMPLÉTER : provision dédiée / assurance / accord avec un
   confrère éditeur]`.
2. Un **export complet** est mis à disposition de chaque Praticien dans
   les 30 jours suivant la cessation.
3. Une procédure de **transfert vers un éditeur tiers** est mise en place
   si possible.

Cette continuité est **un engagement éthique fort** au-delà des minima
légaux, compte tenu du caractère sensible des données concernées.

---

## Article 9 — Force majeure

Aucune des parties ne pourra être tenue responsable d'un manquement causé
par un cas de force majeure au sens de l'art. 1218 C. civ. (et de la
jurisprudence du Tribunal fédéral suisse), à savoir un événement
extérieur, imprévisible et irrésistible :
- catastrophe naturelle, conflit armé, pandémie déclarée par les autorités ;
- défaillance majeure d'un fournisseur tiers (Vercel, Supabase, opérateur
  réseau) **non substituable dans un délai raisonnable** ;
- décision administrative ou judiciaire empêchant l'exécution.

La partie empêchée notifie l'autre dans les 7 jours. Si la situation
perdure plus de **60 jours**, chaque partie peut résilier de plein droit
sans indemnité.

---

## Article 10 — Données personnelles

Le traitement des données personnelles dans le cadre de l'abonnement
(facturation, support, marketing) suit la
[Politique de confidentialité](politique-confidentialite.md).

Le traitement des données patient suit le [DPA](dpa-praticien.md).

---

## Article 11 — Loi applicable et juridiction

Les présentes CGV sont soumises au **droit français**.

Tout litige entre l'Éditeur et un Praticien français est de la compétence
exclusive des tribunaux de `[À COMPLÉTER : ville]`.

Pour un Praticien suisse, en application de la **Convention de Lugano**,
le tribunal compétent peut être celui du domicile du Praticien — sauf
clause attributive de compétence acceptée expressément. Les parties
s'efforcent de résoudre tout différend à l'amiable préalablement.

---

## Article 12 — Acceptation

> ☐ J'ai lu et j'accepte les présentes Conditions Générales de Vente,
> indissociables des [CGU](cgu-praticien.md), de la [Politique de
> confidentialité](politique-confidentialite.md) et du
> [DPA praticien](dpa-praticien.md).
>
> ☐ Je reconnais que la qualité de professionnel exclut le bénéfice du
> droit de rétractation de 14 jours.

Date d'acceptation : `[automatique]`
Plan choisi : `[automatique]`
Montant : `[automatique]`
Version CGV acceptée : `1.0`

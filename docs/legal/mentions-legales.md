# Mentions légales

> Document publiable — à intégrer dans le footer du site marketing et dans
> Paramètres → À propos de l'application.
>
> Conforme à la **LCEN art. 6-III** (loi pour la confiance dans l'économie
> numérique) et au **CGI art. 1635** (mentions fiscales).
>
> Dernière mise à jour : 2026-04-30.

---

## 1. Éditeur du site et de l'application

**[À COMPLÉTER : raison sociale]** — `[À COMPLÉTER : EI / EURL / SASU / SAS]`

- **Numéro [SIREN/SIRET]** : `[À COMPLÉTER : 9 ou 14 chiffres]`
- **Code APE/NAF** : `86.90E` (Activités des kinésithérapeutes en cabinet) ou
  `62.01Z` (Programmation informatique) selon l'objet social déclaré.
- **N° TVA intracommunautaire** : `[À COMPLÉTER : FR + 11 chiffres]`
  *(à remplir uniquement si l'éditeur est assujetti — mention « TVA non
  applicable, art. 293 B du CGI » sinon).*
- **Capital social** : `[À COMPLÉTER : montant en euros]` *(uniquement pour SARL/EURL/SAS/SASU).*
- **Siège social** : `[À COMPLÉTER : adresse postale complète]`
- **RCS** : `[À COMPLÉTER : ville d'immatriculation]`
- **Représentant légal** : Arnaud Trilles, en qualité de `[À COMPLÉTER : gérant /
  président / entrepreneur individuel]`.

### Contact éditeur

- **Email** : `[À COMPLÉTER : contact@…]`
- **Téléphone** : `[À COMPLÉTER : numéro professionnel]`
- **Adresse postale** : voir siège social.

### Mentions complémentaires — qualité de professionnel de santé

L'éditeur, M. Arnaud Trilles, est par ailleurs **kinésithérapeute** inscrit
au Conseil départemental de l'Ordre des masseurs-kinésithérapeutes :

- **Numéro RPPS** : `[À COMPLÉTER : 11 chiffres]`
- **Numéro ADELI** : `[À COMPLÉTER si applicable]`
- **Conseil de l'Ordre** : `[À COMPLÉTER : département d'inscription]`

Cette qualité est mentionnée à titre informatif. Elle n'implique pas que
l'application soit un dispositif médical au sens du Règlement (UE) 2017/745.
Cf. § 6 ci-dessous.

---

## 2. Directeur de la publication

Arnaud Trilles, en qualité de représentant légal de l'éditeur.

Adresse de contact : voir § 1.

---

## 3. Hébergement

### 3.1 Hébergeur du site web (front-end)

**Vercel Inc.** — *fournisseur d'hébergement et de CDN*
- 340 S Lemon Ave #4133, Walnut, CA 91789, États-Unis
- Site : `https://vercel.com`
- L'éditeur opère sur la région `cdg1 (Paris)` pour les fonctions serverless
  qui appellent les API d'IA. Les fichiers statiques sont distribués par CDN
  global Vercel.

### 3.2 Hébergeur de la base de données et du stockage

**Supabase Inc.** — *hébergement Postgres + stockage objet*
- 970 Toa Payoh North #07-04, Singapore 318992 (siège mondial)
- Données stockées dans la région **`eu-west-1` (Irlande, AWS)**.
- Site : `https://supabase.com`

> ⚠️ **Statut HDS** : Vercel et Supabase ne sont pas, à la date de la présente
> mention, certifiés HDS (Hébergeurs de Données de Santé) au titre de
> l'article L.1111-8 du Code de la santé publique français. Cette information
> est communiquée en toute transparence aux praticiens utilisateurs. La
> roadmap de migration vers un hébergeur HDS certifié est documentée dans la
> politique de confidentialité (§ 4 sous-traitants).

### 3.3 Sous-traitants techniques

Voir la **[Politique de confidentialité](politique-confidentialite.md) § 4**
pour la liste complète et à jour des sous-traitants (Anthropic, OpenAI, etc.)
et les transferts de données associés.

---

## 4. Propriété intellectuelle

### 4.1 Code source et marque

L'application (code, design, contenus textuels, illustrations, logos, marque
`[À COMPLÉTER : nom commercial de l'app]`) est la propriété exclusive de
l'éditeur, sauf indication contraire (composants open source listés au § 4.3).

Toute reproduction, représentation, modification, publication, transmission
ou exploitation totale ou partielle des contenus de l'application est
strictement interdite sans autorisation écrite préalable de l'éditeur,
conformément aux articles **L.122-4 et L.335-2** du Code de la propriété
intellectuelle.

### 4.2 Données entrées par le praticien

Les **données patient** saisies par le praticien restent la **propriété
exclusive du praticien** (responsable de traitement) et de son patient
(personne concernée au sens du RGPD). L'éditeur n'acquiert aucun droit sur
ces données et n'en fait aucun usage en dehors du strict cadre de la
fourniture du service défini par les CGU et le DPA.

L'éditeur **ne réutilise pas** les données patient pour entraîner ses
propres modèles d'IA, ni pour générer des statistiques agrégées, ni pour
les céder à un tiers à quelque fin que ce soit.

### 4.3 Composants open source

L'application embarque des composants logiciels open source dont la liste
exhaustive est disponible sur demande (`[À COMPLÉTER : email]`) ou en
consultant le fichier `package.json` du dépôt. Les principales bibliothèques
sont React (MIT), TypeScript (Apache 2.0), Vite (MIT), jsPDF (MIT),
html2canvas (MIT). Les licences sont respectées.

---

## 5. Liens externes

L'application peut contenir des liens vers des sites tiers (Claude.ai,
OpenAI, ressources EBP, etc.). L'éditeur n'exerce aucun contrôle sur ces
sites et décline toute responsabilité quant à leur contenu, leur politique
de confidentialité ou leur disponibilité.

---

## 6. Statut juridique de l'application — non dispositif médical

L'application **n'est pas un dispositif médical** au sens du Règlement (UE)
2017/745 (MDR). Elle ne pose pas de diagnostic médical, ne prescrit pas de
traitement et ne constitue pas un outil d'aide à la décision diagnostique
au sens réglementaire.

Elle est un **outil documentaire et bureautique** destiné à assister le
praticien kinésithérapeute / physiothérapeute dans :
- la rédaction de bilans cliniques,
- la rédaction de courriers médicaux,
- la transcription assistée de consultations vocales,
- la tenue du dossier patient.

Les contenus générés par les modèles d'intelligence artificielle (analyses,
hypothèses diagnostiques, plans de prise en charge) sont des **suggestions**
non contraignantes. Leur **validation, leur correction et leur signature
relèvent de la seule responsabilité du praticien**. L'éditeur ne peut être
tenu responsable d'une décision clinique prise sur la base d'une suggestion
IA non vérifiée.

Cette qualification est confirmée par référence aux lignes directrices
**MDCG 2019-11** et au guide HAS « Bonnes pratiques sur les applications de
santé » (2024).

---

## 7. Crédit photographique et iconographique

`[À COMPLÉTER : crédits photos / icônes / illustrations utilisées]`

Les illustrations cliniques (planches anatomiques, schémas) sont :
- soit des œuvres originales de l'éditeur,
- soit utilisées sous licence Creative Commons (référencer la source),
- soit acquises auprès de banques d'images (référencer le contrat).

---

## 8. Médiation à la consommation

Conformément aux articles **L.616-1 et R.616-1** du Code de la consommation,
en cas de litige avec un consommateur, l'éditeur propose le recours au
médiateur suivant :

- **Médiateur** : `[À COMPLÉTER : nom et coordonnées du médiateur de la
  consommation choisi — ex: CMAP, Médiation FNAIM, etc.]`
- **Plateforme RLL européenne** : `https://ec.europa.eu/consumers/odr`

> Cette mention est applicable lorsque l'utilisateur final est un
> consommateur. Lorsque l'utilisateur est un professionnel (cas standard
> des praticiens libéraux), c'est le tribunal compétent désigné aux CGV
> qui s'applique.

---

## 9. Droit applicable et juridiction

Les présentes mentions sont soumises au **droit français**. Tout litige
relatif à leur interprétation ou à leur exécution relève de la compétence
exclusive des tribunaux de `[À COMPLÉTER : ville du siège social]`, sous
réserve des dispositions impératives applicables au consommateur.

---

## 10. Contact pour signaler un contenu illicite

Conformément à l'article **6-I-5** de la LCEN, tout contenu manifestement
illicite peut être signalé à :

- **Email** : `[À COMPLÉTER : contact@…]`
- **Adresse postale** : voir § 1.

L'éditeur s'engage à examiner toute notification dans les meilleurs délais
et à retirer le contenu si son caractère illicite est avéré.

# Procédure interne — Traitement des demandes d'exercice des droits

> Document **interne** à l'Éditeur (et au Praticien, en tant que
> responsable de traitement de son dossier patient). À ne pas publier.
>
> Conforme aux **art. 12, 15-22 RGPD** et **art. 25-30 nLPD**.
>
> Version : `1.0` — 2026-04-30.

---

## 1. Cadre

Toute personne concernée (patient, Praticien) peut exercer ses droits
RGPD/nLPD :

- **Accès** (art. 15) : copie des données
- **Rectification** (art. 16) : correction
- **Effacement** (art. 17) : suppression
- **Limitation** (art. 18) : gel du traitement
- **Opposition** (art. 21) : opposition à un traitement
- **Portabilité** (art. 20) : export structuré
- **Sort post-mortem** (art. 85 LIL)

Le **délai légal de réponse** est de **1 mois** à compter de la
réception, extensible à **3 mois** en cas de complexité (art. 12.3 RGPD).

---

## 2. Répartition des rôles

| Demande | Premier interlocuteur | Escalade |
|---|---|---|
| Patient → ses données | Praticien (responsable de traitement) | DPO Éditeur si le Praticien ne répond pas sous 1 mois |
| Praticien → ses données (compte, factures) | Éditeur (responsable de traitement direct) | DPO Éditeur |
| Patient → demande générale (ex: subir une faille) | DPO Éditeur | Direction |

---

## 3. Workflow par type de demande

### 3.1 Réception

**Canaux acceptés** :
- email DPO (`[À COMPLÉTER : dpo@…]`)
- courrier postal (`[À COMPLÉTER : adresse]`)
- formulaire `[À COMPLÉTER : URL si publié]`

**Action immédiate** :
1. Accusé de réception sous **48 h** (template ci-dessous § 7).
2. Création d'un ticket dans `[À COMPLÉTER : système de tickets]` avec ID.
3. Démarrage du chrono de **1 mois**.

### 3.2 Vérification d'identité

**Principe** : ne pas demander plus que nécessaire (CNIL — délibération
2018-303).

| Cas | Justificatif requis |
|---|---|
| Patient connu du cabinet | Aucun (le Praticien identifie via dossier) |
| Patient non confirmé / contestation | Copie pièce d'identité avec **numéro et signature masqués** |
| Demande d'effacement / portabilité | Justificatif systématique |
| Demande au nom d'un tiers (mineur, défunt) | Justificatif de la qualité (livret de famille, mandat, acte de décès) |

Le justificatif doit être **détruit** dès la demande traitée. **Ne pas
archiver** la pièce d'identité.

### 3.3 Vérification de la base légale

| Droit | Recevable ? | Conditions |
|---|---|---|
| Accès | Toujours | — |
| Rectification | Toujours | Inexactitude prouvée |
| Effacement | **Sous réserve** | Conservation 20 ans imposée par art. R.1112-7 CSP — refus motivé en règle générale, sauf : retrait du consentement initial (ex: enregistrement vocal), erreur d'identité, données illégalement traitées |
| Limitation | Toujours | Mise en archive restreinte |
| Opposition | Selon traitement | Recevable pour les traitements basés sur intérêt légitime (ex: refus de l'IA), pas pour les obligations légales |
| Portabilité | Sur les données traitées par consentement ou contrat | Format JSON structuré |
| Post-mortem | Toujours après décès | Justificatif d'acte de décès + qualité de l'ayant-droit |

### 3.4 Cas particulier : refus d'effacement du dossier de soin

Le **dossier de soin** doit être conservé **20 ans après le dernier
acte** (art. R.1112-7 CSP). L'Éditeur et le Praticien **doivent refuser**
toute demande d'effacement total de dossier en cours de validité légale.

**Réponse type** :
> Madame, Monsieur,
> Conformément à l'article R.1112-7 du Code de la santé publique, votre
> dossier de soin doit être conservé 20 ans à compter de votre dernier
> acte de prise en charge (ou jusqu'à vos 28 ans si vous étiez mineur).
> Cette obligation prévaut sur le droit à l'effacement (art. 17.3.b
> RGPD : traitement nécessaire au respect d'une obligation légale).
>
> En revanche, vous pouvez exercer votre **droit à la limitation** :
> votre dossier sera placé en archive restreinte, hors des vues actives,
> et ne sera consulté qu'en cas de stricte nécessité (continuité des
> soins, réquisition judiciaire). Confirmez-vous ce choix ?

### 3.5 Limitation = mise en archive restreinte

Implémentation technique :

1. Patient identifié dans la base.
2. Application d'un flag `archived_at` dans la table `patients` (à coder
   si pas encore en place).
3. Filtrage RLS : les patients `archived_at IS NOT NULL` ne remontent que
   sur requête explicite avec motif.
4. Notification au Praticien : « Le patient X demande l'archivage. Confirmez. »

### 3.6 Portabilité

Format de sortie :

- **JSON** structuré (schéma documenté dans `docs/data-model.md`),
- **PDF** consolidé pour archivage humain,
- **archive ZIP** avec documents joints,
- transmission par **email chiffré** ou **lien WeTransfer expirant 7 jours**.

---

## 4. Délais

| Étape | Délai |
|---|---|
| Accusé de réception | 48 h |
| Réponse complète | 1 mois (max 3 mois si complexité) |
| Notification de l'extension | Avant la fin du 1ᵉʳ mois, motivée |
| Si refus | Réponse motivée + voies de recours |

Le compteur démarre à **réception complète** (justificatif d'identité
fourni si demandé).

---

## 5. Refus motivé — modèle

> Madame, Monsieur,
>
> Nous avons bien reçu le `[date]` votre demande relative à `[droit]`.
>
> Après instruction, votre demande **ne peut être satisfaite** pour le
> motif suivant : `[motif précis avec référence légale]`.
>
> Vous disposez du droit de :
> - introduire une réclamation auprès de la **CNIL**
>   (`cnil.fr/fr/plaintes` — 3 place de Fontenoy, 75007 Paris) ou de la
>   **PFPDT** suisse (`edoeb.admin.ch`) ;
> - exercer un recours juridictionnel.
>
> Cordialement,
> `[Signataire]`

---

## 6. Journalisation

Toute demande, qu'elle aboutisse ou non, est consignée dans un **registre
des demandes d'exercice de droits** (fichier interne, accès restreint
DPO + Direction) avec :

- date de réception ;
- identifiant du demandeur ;
- type de droit exercé ;
- décision motivée ;
- date de réponse ;
- pièce(s) justificative(s) `[À DÉTRUIRE après traitement]`.

Ce registre sert de preuve de conformité (art. 5.2 RGPD —
accountability). **Conservation : 5 ans**.

---

## 7. Modèles d'emails

### 7.1 Accusé de réception

> Objet : [`[À COMPLÉTER : nom]`] Accusé de réception de votre demande
> d'exercice de droits — Réf. `<ID>`
>
> Madame, Monsieur,
>
> Nous accusons réception de votre demande du `<date>` relative à
> `<droit demandé>`.
>
> Votre demande sera instruite et une réponse vous sera apportée sous
> **un mois** à compter de ce jour, soit au plus tard le `<date+1mois>`,
> sauf nécessité d'extension dont vous seriez informé(e) avant.
>
> Si vous ne nous avez pas encore communiqué de justificatif d'identité,
> nous vous invitons à nous adresser une copie de pièce d'identité
> **avec numéro et signature masqués** à `[À COMPLÉTER : email]`.
>
> Référence à rappeler : `<ID>`.
>
> Cordialement,
> Le DPO — `[À COMPLÉTER]`

### 7.2 Réponse positive (accès)

> Objet : [`[À COMPLÉTER : nom]`] Réponse à votre demande d'accès — Réf. `<ID>`
>
> Madame, Monsieur,
>
> Suite à votre demande du `<date>`, vous trouverez en pièce jointe
> une copie complète des données vous concernant traitées dans
> l'application `[À COMPLÉTER]` :
> - format JSON structuré pour réimport,
> - format PDF lisible.
>
> Cette copie est gratuite. Vous pouvez à tout moment exercer vos autres
> droits (rectification, limitation, opposition, portabilité,
> post-mortem) en répondant à ce mail.
>
> Cordialement,
> Le DPO — `[À COMPLÉTER]`

### 7.3 Réponse négative (effacement de dossier)

(cf. § 3.4 ci-dessus)

---

## 8. Escalade

Si une demande pose question juridique ou technique :

1. DPO consulte le Conseil juridique `[À COMPLÉTER : cabinet]`.
2. Pour décision politique : Direction Éditeur.
3. Pour question CNIL : ligne d'écoute CNIL (`+33 1 53 73 22 22`).

---

## 9. Indicateurs de pilotage

Suivi mensuel par le DPO :

- nombre de demandes reçues (par type) ;
- délai moyen de réponse ;
- taux de demandes traitées dans les délais ;
- nombre de réclamations ouvertes auprès de la CNIL.

Reporting annuel à la Direction.

---

> Procédure approuvée le 2026-04-30. Révision annuelle obligatoire ou à
> chaque évolution réglementaire majeure.

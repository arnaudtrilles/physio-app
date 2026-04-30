# Procédure interne — Notification de violation de données

> Document **interne** à l'Éditeur. À ne pas publier mais à diffuser
> à toute l'équipe technique.
>
> Conforme aux **art. 33 et 34 RGPD** et **art. 24 nLPD**.
>
> Version : `1.0` — 2026-04-30.

---

## 1. Définition

Une **violation de données à caractère personnel** est :

> *Une violation de la sécurité entraînant, de manière accidentelle ou
> illicite, la destruction, la perte, l'altération, la divulgation non
> autorisée de données à caractère personnel transmises, conservées ou
> traitées d'une autre manière, ou l'accès non autorisé à de telles
> données.* (art. 4.12 RGPD)

Trois types :
- **Confidentialité** (fuite, accès non autorisé)
- **Intégrité** (corruption, altération)
- **Disponibilité** (perte, indisponibilité prolongée)

---

## 2. Délais imposés par la loi

| Action | Délai | Référence |
|---|---|---|
| Notification à la CNIL/PFPDT | **72 h** après prise de connaissance | art. 33.1 RGPD ; art. 24 nLPD |
| Information des personnes concernées | Sans délai injustifié si **risque élevé** | art. 34.1 RGPD |
| Information du Praticien (responsable) par l'Éditeur (sous-traitant) | Sans délai injustifié | art. 33.2 RGPD ; DPA art. 7 |

> ⚠️ **72 h, c'est très court**. Ce délai inclut les week-ends et jours
> fériés. Le compteur démarre à la **prise de connaissance**, non à la
> survenue.

---

## 3. Workflow — phase par phase

### Phase 1 — Détection (T0)

**Sources possibles** :
- alerte de monitoring (Sentry, alertes Supabase, alertes Vercel) ;
- rapport interne (équipe support, DevOps) ;
- signalement externe (chercheur en sécurité, utilisateur, presse) ;
- décision judiciaire ;
- détection par un sous-traitant.

**Action immédiate** :
1. **Geler les modifications** : passer le compte concerné en lecture
   seule si nécessaire, sans détruire de preuves.
2. **Préserver les logs** : vider Vercel/Supabase logs de la fenêtre
   concernée avant rotation (Vercel = 30 jours).
3. **Notifier le DPO** dans l'heure (`[À COMPLÉTER : email DPO]`,
   téléphone d'astreinte `[À COMPLÉTER]`).

### Phase 2 — Qualification (T0 → T+24 h)

Le DPO et l'équipe technique constituent une **cellule de crise** et
qualifient l'incident :

| Question | Réponse |
|---|---|
| Quelles catégories de données ? | Identification ? Santé ? Financier ? |
| Volume estimé ? | Nombre de personnes concernées |
| Cause technique ? | Intrusion, erreur de configuration, bug, perte de support, malveillance interne |
| Mesures prises ? | Endiguement, restauration |
| Risque pour les personnes ? | Faible / Modéré / **Élevé** |
| Données chiffrées ? | Oui (réduit drastiquement le risque) / Non |
| Pseudonymisées ? | Oui (réduit le risque) / Non |

**Critère de risque élevé** (CNIL — Lignes directrices WP250) :
- volume important + données de santé,
- possibilité d'usurpation d'identité,
- risque pour la sécurité ou la santé physique,
- atteinte à la réputation,
- discrimination possible.

### Phase 3 — Notification CNIL/PFPDT (T+72 h max)

Si l'incident est **probable d'engendrer un risque pour les droits et
libertés**, le DPO notifie l'autorité de contrôle.

#### CNIL (France)

**Téléservice obligatoire** :
- URL : `https://www.cnil.fr/fr/notifier-une-violation-de-donnees-personnelles`
- Compte CNIL : `[À COMPLÉTER : identifiant]`

**Informations à fournir (art. 33.3 RGPD)** :
- nature de la violation, catégories et nombre approximatif de personnes
- catégories et nombre approximatif d'enregistrements
- coordonnées du DPO
- conséquences probables
- mesures prises ou envisagées pour atténuer

Si toutes les informations ne sont pas disponibles à 72 h, **notifier
quand même** avec ce qui est connu, et compléter au fil de l'enquête
(notification en plusieurs vagues — autorisée art. 33.4).

#### PFPDT (Suisse)

**Téléservice** :
- URL : `https://databreach.edoeb.admin.ch`

**Notification** : sans délai « si la violation entraîne vraisemblablement
un risque élevé pour la personnalité ou les droits fondamentaux »
(art. 24.1 nLPD).

> ⚠️ Le seuil suisse est plus élevé que celui de l'UE : **risque élevé
> seulement**, pas tout risque.

### Phase 4 — Information des personnes concernées

Si **risque élevé** confirmé : informer **directement** chaque personne
concernée sans délai injustifié (art. 34 RGPD).

**Forme** : email, courrier, ou message dans l'application.

**Contenu (art. 34.2)** :
- nature de la violation, en termes clairs et simples ;
- coordonnées du DPO ;
- conséquences probables ;
- mesures prises ;
- recommandations à la personne (changer mot de passe, surveiller relevés, etc.).

**Modèle** : voir § 8 ci-dessous.

**Exceptions à l'information directe** (art. 34.3) :
- chiffrement adéquat des données (les rendant inintelligibles) ;
- mesures ultérieures rendant le risque non probable ;
- effort disproportionné — à défaut, communication publique.

### Phase 5 — Notification du Praticien (sous-traitant → responsable)

L'Éditeur, en tant que **sous-traitant**, doit notifier chaque Praticien
dont les données patient sont concernées **sans délai injustifié**
(art. 33.2 RGPD ; DPA art. 7).

**Canal** : email à l'adresse de contact, double appel téléphonique pour
les incidents majeurs.

**Contenu** :
- description de la violation ;
- catégories et nombre de patients impactés ;
- mesures prises par l'Éditeur ;
- recommandations au Praticien (notamment : qui doit informer le patient).

> En droit, **c'est le Praticien (responsable de traitement)** qui doit
> notifier la CNIL pour les données patient et informer le patient en
> cas de risque élevé. L'Éditeur peut le faire à sa place, sur mandat.

### Phase 6 — Documentation interne (toujours)

**Quel que soit le résultat de la qualification**, documenter dans le
**registre des violations** (art. 33.5 RGPD) :

- date de prise de connaissance ;
- date de survenue (si différente) ;
- nature, cause ;
- catégories et nombre de personnes ;
- mesures prises ;
- décision de notification (oui/non) avec justification ;
- copies des notifications envoyées.

**Conservation : illimitée** (en pratique = vie de l'entreprise).

### Phase 7 — Retour d'expérience (T+1 mois)

Réunion REX cellule de crise + équipe technique :

- analyse cause racine ;
- mesures correctives techniques (patch, refonte) ;
- mesures organisationnelles (formation, procédure) ;
- mise à jour de l'AIPD ;
- mise à jour des contrats de sous-traitance si responsabilité d'un sous-traitant.

---

## 4. Cas types pré-qualifiés

### 4.1 Sous-traitant nous notifie

| Sous-traitant | Procédure |
|---|---|
| **Supabase** | Email à `security@supabase.com` reçu → notif DPO < 1 h → déclencher Phase 2 |
| **Vercel** | Page status + email security → idem |
| **Anthropic** | Notification via API ou email → idem |
| **OpenAI** | idem |
| **Stripe** | idem (impact = données de facturation) |

### 4.2 Phishing / compromission d'un compte Praticien

- Forcer le reset du mot de passe ;
- Invalider toutes les sessions actives (Supabase admin) ;
- Vérifier les accès en logs sur les 30 derniers jours ;
- **Risque élevé** si exfiltration confirmée → notifier CNIL + patient ;
- **Pas de risque élevé** si tentative bloquée par MFA ou rate limiting → registre interne uniquement.

### 4.3 Bug applicatif révélant des données entre comptes

- **Risque élevé immédiat** (rupture de cloisonnement RLS).
- Geler la fonctionnalité.
- Identifier précisément qui a vu quoi via les logs.
- Notifier CNIL sous 72 h.
- Notifier les Praticiens dont les données ont été exposées.
- Patcher + tests de non-régression renforcés.

### 4.4 Perte de support physique (laptop, sauvegarde)

- Si **chiffré** (FileVault, BitLocker) : pas de risque élevé → registre.
- Si **non chiffré** : **risque élevé** → notifier sous 72 h.

### 4.5 Erreur d'envoi (mauvais destinataire d'un courrier)

- Demander la destruction au destinataire (preuve écrite).
- Notifier le patient concerné.
- Si destruction confirmée + données limitées : risque modéré → décision DPO sur notif CNIL.

---

## 5. Acteurs et coordonnées

| Rôle | Personne | Contact |
|---|---|---|
| DPO | `[À COMPLÉTER]` | `[email]` / `[téléphone d'astreinte]` |
| Direction technique | `[À COMPLÉTER]` | `[email]` / `[téléphone]` |
| Conseil juridique | `[À COMPLÉTER : cabinet]` | `[contact]` |
| Cyber-assurance | `[À COMPLÉTER : assureur]` | `[hotline 24/7]` |
| CNIL — service violations | — | `+33 1 53 73 22 22` ou téléservice |
| PFPDT (CH) | — | `+41 58 463 74 84` ou `databreach.edoeb.admin.ch` |

---

## 6. Outils et points de surveillance

- **Sentry** : alertes erreurs serveur `[À COMPLÉTER : URL]`
- **Supabase logs** : `dashboard.supabase.com → projet → Logs`
- **Vercel logs** : `vercel.com → projet → Logs`
- **Page d'incident publique** : `[À COMPLÉTER : URL si statut public]`
- **Mot-clé alerte** : `[À COMPLÉTER : Slack channel ou équivalent]`

---

## 7. Indicateurs de pilotage

Reporting trimestriel DPO → Direction :

- nombre d'incidents qualifiés ;
- nombre de notifications CNIL/PFPDT ;
- délai moyen de notification ;
- nombre de personnes informées directement ;
- causes racines principales.

---

## 8. Modèles

### 8.1 Notification au patient (risque élevé)

> Objet : URGENT — Information importante concernant la sécurité de vos
> données de santé
>
> Madame, Monsieur,
>
> Nous vous informons qu'un incident de sécurité est survenu le
> `<date>` sur l'application `[À COMPLÉTER]` utilisée par votre
> kinésithérapeute / physiothérapeute, votre Praticien.
>
> **Nature de l'incident** : `<description claire et simple>`
>
> **Données potentiellement concernées** : `<liste précise>` vous
> concernant.
>
> **Conséquences possibles** : `<exemples : usurpation d'identité,
> exposition d'informations médicales, etc.>`
>
> **Mesures déjà prises** : `<liste>`
>
> **Ce que nous vous recommandons** :
> - `<actions concrètes pour la personne>`
>
> Pour toute question, vous pouvez contacter notre Délégué à la
> protection des données :
> - email : `[À COMPLÉTER]`
> - téléphone : `[À COMPLÉTER]`
>
> Vous disposez par ailleurs du droit de saisir la CNIL
> (`cnil.fr/fr/plaintes`) ou la PFPDT suisse (`edoeb.admin.ch`).
>
> Nous vous prions de nous excuser pour cet incident et restons à votre
> entière disposition.
>
> Cordialement,
> Le Délégué à la protection des données — `[À COMPLÉTER]`

### 8.2 Notification au Praticien

> Objet : URGENT — Notification de violation de données patient au sens
> de l'art. 33 RGPD — Réf. `<ID>`
>
> Cher Praticien,
>
> En notre qualité de sous-traitant au sens de l'art. 28 RGPD, nous vous
> informons sans délai d'une violation de données concernant votre
> dossier patient sur l'application `[À COMPLÉTER]`.
>
> **Description** : `<…>`
> **Date de prise de connaissance** : `<date>`
> **Patients impactés (estimation)** : `<nombre>` — liste détaillée en pièce jointe.
> **Mesures techniques prises** : `<…>`
> **Recommandations pour vous** :
> 1. Notifier la CNIL sous 72 h via `cnil.fr` (procédure simplifiée
>    en pièce jointe).
> 2. Si risque élevé : informer chaque patient concerné selon le modèle
>    fourni (pièce jointe).
> 3. Conserver cette notification dans votre registre des violations.
>
> Notre DPO reste à votre disposition pour vous accompagner.
>
> `[Signature DPO Éditeur]`

---

## 9. Tests et exercices

- **Exercice annuel** de simulation de violation (table-top).
- **Test trimestriel** de la procédure d'astreinte DPO (appel test).
- **Mise à jour** de la procédure à chaque incident significatif.

---

> Procédure approuvée le 2026-04-30. Référents : DPO + Direction
> technique. Diffusion : équipe technique, support, direction.
> Révision : annuelle ou après tout incident majeur.

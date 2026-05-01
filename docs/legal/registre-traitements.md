# Registre des activités de traitement

> Document **interne**, à tenir à jour, à présenter sur demande de la CNIL
> ou de la PFPDT.
>
> Conforme à l'**art. 30 RGPD** (responsable de traitement et
> sous-traitant) et à l'**art. 12 nLPD**.
>
> Version : `1.0` — 2026-04-30. **Date de dernière mise à jour : `[À COMPLÉTER]`**.
>
> **Phase 1 (pas de DPO formellement désigné)** : la tenue du registre
> est assurée par le **Référent protection des données** de l'Éditeur,
> à savoir `[À COMPLÉTER : Arnaud Trilles, dirigeant et fondateur]`. Le
> registre devra être mis à jour par le DPO dès sa désignation.

---

## A — Identification du responsable du registre

| Champ | Valeur |
|---|---|
| Raison sociale | `[À COMPLÉTER]` |
| Forme juridique | `[À COMPLÉTER : SAS / SARL / EI / etc.]` |
| SIREN / SIRET | `[À COMPLÉTER]` |
| Adresse | `[À COMPLÉTER]` |
| Représentant légal | `[À COMPLÉTER : nom + qualité]` |
| Référent protection des données (Phase 1) | `[À COMPLÉTER : Arnaud Trilles]` — `[email pro]` |

---

# Partie I — Traitements en qualité de **responsable** (art. 30.1 RGPD)

> Pour les traitements opérés pour les besoins propres de l'Éditeur :
> facturation, marketing, support, gestion des comptes Praticiens.

---

## I.1 — Gestion des comptes Praticiens et facturation

| Champ | Valeur |
|---|---|
| **Finalité principale** | Permettre l'accès à l'application, gérer la souscription, facturer |
| **Finalités sous-jacentes** | Authentification, support technique, gestion de la relation client |
| **Base légale** | Art. 6.1.b RGPD — exécution du contrat (CGU/CGV) |
| **Catégories de personnes** | Praticiens (kinésithérapeutes, physiothérapeutes) — clients de l'Éditeur |
| **Catégories de données** | Identification (nom, email, téléphone), professionnelles (RPPS, GLN, Ordre), facturation (IBAN/CB via Stripe), logs de connexion |
| **Données sensibles** | Non (données professionnelles, pas de données de santé du Praticien) |
| **Destinataires internes** | Service support, comptabilité, direction |
| **Sous-traitants** | Supabase (hébergement DB), Vercel (hébergement appli), Stripe (paiement), `[À COMPLÉTER : email provider]` |
| **Transferts hors UE** | Stripe (US) — DPF + SCC ; Anthropic/OpenAI (US) **non concernés ici** |
| **Durée de conservation** | Compte actif + 3 ans (prospection commerciale) ; factures = 10 ans (art. L.123-22 C. com.) |
| **Mesures de sécurité** | Authentification forte, chiffrement TLS, logs d'accès, MFA recommandé, isolation RLS |

---

## I.2 — Support et gestion des incidents

| Champ | Valeur |
|---|---|
| **Finalité** | Répondre aux demandes d'assistance, traiter les incidents techniques |
| **Base légale** | Art. 6.1.b RGPD — exécution du contrat |
| **Catégories de personnes** | Praticiens, secondairement patients via le Praticien |
| **Catégories de données** | Tickets, logs techniques, captures d'écran (anonymisées si possible) |
| **Destinataires internes** | Équipe support |
| **Sous-traitants** | `[À COMPLÉTER : helpdesk si externe]` |
| **Transferts hors UE** | `[À COMPLÉTER]` |
| **Durée de conservation** | 3 ans après clôture du ticket |
| **Mesures de sécurité** | Accès restreint, anonymisation systématique des extraits de données patient |

---

## I.3 — Prospection commerciale et marketing

| Champ | Valeur |
|---|---|
| **Finalité** | Information commerciale auprès de Praticiens prospects, communication produit |
| **Base légale** | Art. 6.1.f RGPD — intérêt légitime (B2B, profession identifiée) ; consentement explicite pour newsletter |
| **Catégories de personnes** | Prospects Praticiens |
| **Catégories de données** | Email professionnel, Ordre, opt-in newsletter |
| **Destinataires internes** | Marketing |
| **Sous-traitants** | `[À COMPLÉTER : outil emailing — Brevo / Mailjet / etc.]` |
| **Transferts hors UE** | Selon outil — `[À COMPLÉTER]` |
| **Durée de conservation** | 3 ans depuis dernier contact ou désinscription |
| **Mesures de sécurité** | Lien de désinscription dans chaque email, gestion des opt-out |

---

## I.4 — Sécurité et journalisation

| Champ | Valeur |
|---|---|
| **Finalité** | Détecter les intrusions, prévenir la fraude, garantir la disponibilité |
| **Base légale** | Art. 6.1.f RGPD — intérêt légitime à la sécurité du système |
| **Catégories de personnes** | Toute personne accédant au service |
| **Catégories de données** | IP, user-agent, horodatages, requêtes HTTP, codes de réponse |
| **Destinataires internes** | Équipe DevOps / sécurité |
| **Sous-traitants** | Vercel, Supabase |
| **Transferts hors UE** | Anonymisation IP à 24 h chez Vercel |
| **Durée de conservation** | 30 jours (Vercel logs) ; 6 mois pour logs applicatifs ; 3 ans pour incidents notables |
| **Mesures de sécurité** | Logs en mode lecture seule, accès tracé, alertes automatiques |

---

# Partie II — Traitements en qualité de **sous-traitant** (art. 30.2 RGPD)

> Pour les traitements opérés **pour le compte du Praticien** dans le
> cadre de la tenue informatisée du dossier patient.

---

## II.1 — Tenue du dossier patient informatisé

### II.1.1 — Identification

| Champ | Valeur |
|---|---|
| **Responsables de traitement** | Chaque Praticien souscrivant un abonnement, identifié dans la base par son `tenant_id` |
| **Sous-traitant** | `[À COMPLÉTER : raison sociale]` |
| **DPO sous-traitant** | `[À COMPLÉTER]` |

### II.1.2 — Description du traitement

| Champ | Valeur |
|---|---|
| **Nom du traitement** | Tenue informatisée du dossier patient |
| **Finalité** | Permettre au Praticien de constituer, mettre à jour et consulter le dossier de soin de ses patients ; produire bilans et courriers ; assurer la continuité des soins |
| **Base légale (responsable)** | Art. 9.2.h RGPD — médecine préventive et soins ; obligation légale (art. R.4321-86 CSP, LAMal) |
| **Catégories de personnes** | Patients du Praticien |
| **Catégories de données** | Identification (nom, prénom, date de naissance, sexe, contacts) ; antécédents médicaux ; bilans cliniques ; tests et mesures ; plans de soins ; correspondances ; transcriptions vocales (sur consentement) ; documents joints (ordonnances, imageries) |
| **Catégories sensibles** | **Données de santé** (art. 9 RGPD) — niveau de protection renforcé |
| **Mineurs** | Possible — autorisation parentale ; durée allongée |

### II.1.3 — Destinataires et accès

| Catégorie | Détail |
|---|---|
| Praticien (et associés du cabinet le cas échéant) | Lecture/écriture, isolation par RLS |
| Éditeur (support technique) | Accès uniquement sur demande explicite du Praticien |
| Sous-traitants techniques | Voir tableau II.1.4 |
| Tiers à des fins commerciales | **Aucun** |

### II.1.4 — Sous-traitants ultérieurs (art. 28.4 RGPD)

| Sous-traitant | Localisation | Rôle | Garanties |
|---|---|---|---|
| Vercel Inc. | Paris (FR) + CDN global | Hébergement appli web | DPA Vercel, SCC, DPF |
| Supabase Inc. | Irlande (UE) | DB + Storage + Backup | DPA Supabase, infra OVH/AWS UE |
| Anthropic, PBC | États-Unis | IA Claude — analyses pseudonymisées | DPA Anthropic, SCC, DPF |
| OpenAI, LLC | États-Unis | IA Whisper — transcription pseudonymisée | DPA OpenAI, SCC, DPF |

> **Statut HDS** : à la date de mise à jour, **aucun sous-traitant n'est
> certifié HDS** au sens de la loi française. Mesures compensatoires :
> pseudonymisation systématique avant envoi aux IA, chiffrement TLS 1.3,
> chiffrement AES-256 au repos, RLS Postgres, journalisation. Migration
> HDS planifiée à `[À COMPLÉTER : trimestre]`.

### II.1.5 — Transferts hors UE

| Pays | Outil | Encadrement |
|---|---|---|
| États-Unis | Anthropic, OpenAI, Vercel CDN, Stripe | Clauses contractuelles types UE 2021/914 + Décision d'adéquation Data Privacy Framework (DPF) |
| États-Unis (depuis CH) | idem | Swiss-US DPF |

### II.1.6 — Durée de conservation

| Donnée | Durée | Référence |
|---|---|---|
| Dossier patient FR | 20 ans après dernier acte (28 ans pour mineur) | Art. R.1112-7 CSP |
| Dossier patient CH | 10 à 20 ans selon canton | LAMal + lois cantonales |
| Logs applicatifs | 6 mois | Bonnes pratiques |
| Sauvegardes | 30 jours rolling, sauvegardes annuelles 1 an | Procédure interne |
| Transcriptions vocales originales | Effacement à 30 jours après validation (texte conservé dans dossier) | Procédure interne |

### II.1.7 — Mesures de sécurité (art. 32 RGPD)

| Mesure | Détail |
|---|---|
| Chiffrement en transit | TLS 1.3 |
| Chiffrement au repos | AES-256 (Supabase + sauvegardes) |
| Pseudonymisation | Systématique avant tout appel IA externe (suppression nom/prénom/dob) |
| Authentification | Email + mot de passe ; MFA optionnelle (à généraliser) |
| Contrôle d'accès | Row-Level Security Postgres par `tenant_id` |
| Journalisation | Logs d'accès et de modification, conservés 6 mois |
| Sauvegardes | Quotidiennes, restauration testée trimestriellement |
| Anonymisation IP | À 24 h pour les logs Vercel |
| Sensibilisation | Charte interne signée par tout collaborateur ayant accès |
| Test d'intrusion | Annuel `[À COMPLÉTER : prestataire]` |

### II.1.8 — Procédures associées

- [Procédure droits](procedure-droits.md)
- [Procédure violation](procedure-violation.md)
- [DPA praticien](dpa-praticien.md)
- [Politique de confidentialité](politique-confidentialite.md)

---

## II.2 — Aide à la rédaction par intelligence artificielle

| Champ | Valeur |
|---|---|
| **Finalité** | Suggérer au Praticien des analyses cliniques, plans de soins ou courriers à partir d'un dossier pseudonymisé |
| **Base légale (responsable)** | Art. 9.2.h RGPD — soins ; intérêt légitime du Praticien ; pas de décision automatisée individuelle (validation systématique) |
| **Personnes concernées** | Patients dont le dossier est traité |
| **Données traitées** | **Pseudonymisées** : pas de nom, prénom, date de naissance ; conservation des champs cliniques |
| **Sous-traitants** | Anthropic (Claude), OpenAI (Whisper) |
| **Transferts** | États-Unis — SCC + DPF |
| **Durée de conservation côté IA** | Selon contrats : Anthropic = pas de stockage prolongé hors logs sécurité ; OpenAI = 30 jours puis suppression. Pas d'usage pour entraînement (opt-out activé). |
| **Mesures spécifiques** | Pseudonymisation `anonymizePatientData` + `scrub()` ; refus de l'IA exerçable patient par patient (consentement) |

---

## II.3 — Transcription vocale des consultations

| Champ | Valeur |
|---|---|
| **Finalité** | Saisir le bilan via dictée vocale traitée par Whisper |
| **Base légale** | Art. 9.2.a RGPD — **consentement explicite** du patient |
| **Personnes concernées** | Patients ayant consenti |
| **Données traitées** | Audio + transcription textuelle pseudonymisée |
| **Sous-traitant** | OpenAI (Whisper) |
| **Transferts** | États-Unis — SCC + DPF |
| **Durée audio** | Effacement à 30 jours après validation du texte |
| **Durée texte** | Versée au dossier — durée légale du dossier |
| **Retrait du consentement** | Possible à tout moment, sans rétroactivité sur transcriptions déjà intégrées |

---

# Partie III — Annexes

## III.1 — Liste des analyses d'impact (AIPD) réalisées

| AIPD | Date | Statut |
|---|---|---|
| Tenue du dossier patient + IA | 2026-04-30 | Voir [aipd.md](aipd.md) — `[À COMPLÉTER : statut]` |
| Transcription vocale | À planifier | — |

## III.2 — Liste des contrats de sous-traitance

| Sous-traitant | Type de contrat | Référence | Date |
|---|---|---|---|
| Vercel | DPA + SCC | `[À COMPLÉTER]` | `[À COMPLÉTER]` |
| Supabase | DPA + SCC | `[À COMPLÉTER]` | `[À COMPLÉTER]` |
| Anthropic | DPA + SCC + DPF | `[À COMPLÉTER]` | `[À COMPLÉTER]` |
| OpenAI | DPA + SCC + DPF + opt-out training | `[À COMPLÉTER]` | `[À COMPLÉTER]` |
| Stripe | DPA | `[À COMPLÉTER]` | `[À COMPLÉTER]` |

## III.3 — Politique de mise à jour du registre

- Le DPO met à jour le registre **à chaque** :
  - création ou modification substantielle d'un traitement,
  - ajout / changement de sous-traitant,
  - modification réglementaire majeure,
  - revue annuelle obligatoire (avant le 31 décembre de chaque année).

- Une copie horodatée est archivée à chaque mise à jour pour garder la
  traçabilité (`docs/legal/registre-traitements-archive/<YYYY-MM-DD>.md`).

---

> Registre établi en application de l'art. 30 RGPD. Tenu à disposition de
> l'autorité de contrôle (CNIL / PFPDT) sur demande.
> Date de mise à jour : `[À COMPLÉTER]`.
> Signature DPO : `[À COMPLÉTER]`.

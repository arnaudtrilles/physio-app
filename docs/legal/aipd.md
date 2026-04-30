# AIPD — Analyse d'Impact relative à la Protection des Données

> Document **interne** obligatoire au titre de l'art. 35 RGPD. À tenir à
> disposition de la CNIL/PFPDT en cas de contrôle. À transmettre à la
> CNIL pour avis si le risque résiduel reste élevé (art. 36 RGPD).
>
> Méthodologie : guide CNIL **PIA** (Privacy Impact Assessment) — 3
> volets : description, conformité aux principes, analyse des risques.
>
> Version : `1.0` — 2026-04-30.

---

## A — Pourquoi cette AIPD est obligatoire

L'art. 35.3 RGPD impose une AIPD pour :
- (a) le traitement systématique et à grande échelle de **données de santé**,
- (b) l'évaluation systématique d'aspects personnels par des décisions automatisées,
- (c) la surveillance systématique à grande échelle d'un lieu accessible au public.

Notre traitement « **Tenue informatisée du dossier patient + aide à la
rédaction par IA** » coche le critère (a) : données de santé à grande
échelle. Une AIPD est donc **obligatoire**.

> ⚠️ La CNIL liste également le **traitement de données de santé**
> comme cas requérant systématiquement une AIPD (Délibération
> 2018-327 — annexe « Liste des traitements pour lesquels une AIPD est
> requise »).

---

## B — Volet 1 : Description du traitement

### B.1 Objet

Permettre à un kinésithérapeute / physiothérapeute (« le Praticien »)
de tenir le dossier de soin de ses patients de manière informatisée, et
de bénéficier de suggestions d'analyse, de plan de soins et de courriers
générées par intelligence artificielle (Anthropic Claude + OpenAI Whisper).

### B.2 Acteurs

| Rôle | Acteur |
|---|---|
| Responsable de traitement | Le Praticien (chacun) |
| Sous-traitant principal | `[À COMPLÉTER : Éditeur]` |
| Sous-traitants ultérieurs | Vercel (hébergement), Supabase (DB), Anthropic (Claude), OpenAI (Whisper), Stripe (facturation) |

### B.3 Périmètre fonctionnel

- création et mise à jour de la fiche patient,
- saisie de bilans cliniques (9 zones, 3 modes : noyau / complet / vocal),
- transcription vocale Whisper (sur consentement patient),
- analyse pseudonymisée Claude (synthèse, plan de soins, courrier),
- export PDF du dossier ou de pièces,
- partage entre praticiens d'un même cabinet (lecture ou lecture/écriture selon paramétrage).

### B.4 Flux de données

```
Patient ──(consultation)──> Praticien ──saisie──> App (PWA local + Supabase EU)
                                                    │
                                                    ├── Vercel CDN (CDG1 + global)
                                                    │
                                                    ├── Supabase (DB EU-West Irlande)
                                                    │
                                                    ├── Anthropic Claude (US) ◄─ pseudonymisé
                                                    │   (suggestion analyse / plan / courrier)
                                                    │
                                                    └── OpenAI Whisper (US) ◄─ audio + texte
                                                        (transcription, opt-out training)
```

### B.5 Catégories de données

| Catégorie | Volume | Sensibilité |
|---|---|---|
| Identification patient | Standard | Standard |
| Antécédents médicaux | Riche | **Sensible (santé, art. 9)** |
| Bilans cliniques | Riche | **Sensible (santé)** |
| Tests/mesures | Standard | **Sensible (santé)** |
| Plans de soins | Standard | **Sensible (santé)** |
| Documents (ordonnances, imageries) | Variable | **Sensible (santé)** |
| Transcriptions vocales | Variable | **Sensible (santé) + biométrique (voix)** |
| Données pratiquant | Standard | Standard |
| Facturation / paiement | Standard | Financière |

### B.6 Catégories de personnes concernées

- **Patients** (mineurs et majeurs) — sujet principal du traitement.
- **Praticiens** — utilisateurs et responsables de traitement.

### B.7 Durées de conservation

cf. [Politique de confidentialité § 6](politique-confidentialite.md) et
[Registre](registre-traitements.md).

### B.8 Volumétrie estimée à pleine charge

- `[À COMPLÉTER : nb praticiens cible]` praticiens
- `[À COMPLÉTER : nb patients moyens / praticien]` patients par praticien
- `[À COMPLÉTER : nb consultations / mois / praticien]`
- soit `[À COMPLÉTER]` **dossiers patients** au total à pleine charge.

---

## C — Volet 2 : Conformité aux principes (art. 5 RGPD)

### C.1 Licéité, loyauté, transparence (art. 5.1.a)

| Mesure | État |
|---|---|
| Information patient (notice art. 13) | ✅ [information-patient.md](information-patient.md) |
| Information praticien (CGU + DPA) | ✅ [cgu-praticien.md](cgu-praticien.md), [dpa-praticien.md](dpa-praticien.md) |
| Bases légales documentées | ✅ Politique conf. § 4 |

### C.2 Limitation des finalités (art. 5.1.b)

Finalités strictement limitées :
- tenue du dossier de soin,
- continuité des soins,
- aide à la rédaction par IA (avec validation Praticien),
- facturation et support.

**Pas de réutilisation à des fins commerciales, de revente, de profilage
ou d'entraînement IA externe** (opt-out OpenAI training confirmé).

✅ Conforme.

### C.3 Minimisation (art. 5.1.c)

| Pratique | État |
|---|---|
| Pseudonymisation systématique avant tout appel IA externe | ✅ `anonymizePatientData` + `scrub()` |
| Champs facultatifs non requis tant que non nécessaires | ✅ partiellement — `[À VÉRIFIER : audit champs]` |
| Pas de tracking analytics | ✅ Aucun analytics tiers |
| Pas de revente / publicité | ✅ Garantie contractuelle |

⚠️ **Point de vigilance** : auditer périodiquement que les champs
collectés restent strictement nécessaires.

### C.4 Exactitude (art. 5.1.d)

- Le Praticien peut corriger toute donnée à tout moment (UI bilan/fiche).
- Le patient peut demander la rectification (art. 16 RGPD), procédure
  documentée ([procedure-droits.md](procedure-droits.md)).

✅ Conforme.

### C.5 Limitation de la conservation (art. 5.1.e)

| Donnée | Durée légale |
|---|---|
| Dossier FR | 20 ans (R.1112-7 CSP) |
| Dossier CH | 10-20 ans selon canton |
| Audio transcription | 30 jours puis purge |
| Logs | 6 mois max |

⚠️ **Point de vigilance** : la procédure d'archivage et de purge
automatique post-20 ans **n'est pas encore implémentée** dans le code
applicatif. À développer avant le seuil de 20 ans (T+20 ans).
**Pour le démarrage commercial, ce point n'est pas bloquant** mais doit
être tracé en backlog.

### C.6 Intégrité et confidentialité (art. 5.1.f)

cf. § D ci-dessous (analyse des risques).

### C.7 Responsabilité (art. 5.2)

Documentation :
- registre des traitements ✅
- DPA ✅
- procédures droits / violation ✅
- présente AIPD ✅
- conventions sous-traitants `[À COMPLÉTER : signer]`

---

## D — Volet 3 : Analyse des risques

### D.1 Méthodologie CNIL

3 risques principaux à évaluer (CNIL — *Guide PIA* méthode) :
1. **Accès illégitime** aux données
2. **Modification non désirée** des données
3. **Disparition** des données

Pour chacun : sources, événements redoutés, menaces, vulnérabilités,
mesures, gravité résiduelle, vraisemblance résiduelle.

Échelle CNIL : 1 = négligeable / 2 = limitée / 3 = importante / 4 = maximale.

---

### D.2 Risque 1 — Accès illégitime aux données

| Item | Évaluation |
|---|---|
| **Impact potentiel** | Atteinte à la vie privée, divulgation de données de santé sensibles, atteinte à la réputation du patient, risque pour sa carrière (assurances), risque psychologique |
| **Sources** | Attaquant externe, collaborateur Éditeur malveillant, autre Praticien (rupture cloisonnement), perte de mot de passe Praticien, vol de poste, fuite sous-traitant |
| **Événements redoutés** | Exfiltration massive de la base, accès cross-tenant, leak transcription audio |
| **Mesures techniques** | TLS 1.3, AES-256 au repos, RLS Postgres par `tenant_id`, MFA optionnelle, pseudonymisation IA, opt-out training, isolation comptes |
| **Mesures organisationnelles** | Charte sécurité interne, procédure violation, formation, accès logs |
| **Gravité avant mesures** | 4 — maximale (santé, sensible) |
| **Vraisemblance avant mesures** | 3 — importante |
| **Gravité résiduelle** | **3 — importante** (résiduelle car HDS non encore certifié et MFA non obligatoire) |
| **Vraisemblance résiduelle** | **2 — limitée** |

**Mesures complémentaires recommandées** :
- Rendre **MFA obligatoire** pour tout Praticien (BLOQUANT à la
  généralisation, à planifier avant launch grand public).
- **Migration HDS** sous `[À COMPLÉTER : trimestre]`.
- **Audit pen-test** annuel par tiers indépendant.
- **Bug bounty** programme (si volume le justifie).

---

### D.3 Risque 2 — Modification non désirée des données

| Item | Évaluation |
|---|---|
| **Impact potentiel** | Erreur de diagnostic, mauvais traitement, perte de chance pour le patient, contestation médicolégale |
| **Sources** | Bug applicatif, suggestion IA non corrigée, manipulation malveillante, conflit de synchronisation offline/online |
| **Événements redoutés** | Données du patient X écrites dans dossier patient Y, suggestion IA hallucinée intégrée sans relecture, écrasement par sync offline |
| **Mesures techniques** | Validation de schéma, transactions Postgres, journal de modification, signature humaine systématique sur output IA, gestion du conflit de sync (`[À COMPLÉTER : stratégie offline-first]`) |
| **Mesures organisationnelles** | Engagement contractuel du Praticien à relire toute suggestion IA (CGU art. 6) |
| **Gravité avant mesures** | 4 — maximale |
| **Vraisemblance avant mesures** | 2 — limitée |
| **Gravité résiduelle** | **3 — importante** |
| **Vraisemblance résiduelle** | **2 — limitée** |

**Mesures complémentaires recommandées** :
- Audit régulier du moteur d'anonymisation (tests automatiques sur
  jeux de données réalistes — voir ressources audit `Charter 04`).
- Tests E2E sur la sync offline/online.
- Affichage prominent dans l'UI : « Suggestion IA — à valider par le
  Praticien ».

---

### D.4 Risque 3 — Disparition des données

| Item | Évaluation |
|---|---|
| **Impact potentiel** | Perte de continuité de soins, contentieux avec patient, manquement à l'obligation R.1112-7 CSP, atteinte à la mémoire médicale (20 ans) |
| **Sources** | Faillite Éditeur, faillite Supabase/Vercel, sinistre data center, ransomware, suppression accidentelle, cessation d'activité |
| **Événements redoutés** | Indisponibilité prolongée, perte irréversible |
| **Mesures techniques** | Sauvegardes quotidiennes, restauration testée trimestriellement, export PDF/JSON disponible à tout moment, multi-région Supabase `[À VÉRIFIER]` |
| **Mesures organisationnelles** | Plan de continuité d'activité (CGV art. 8) — provision dédiée pour conservation 20 ans en cas de cessation, hébergement de secours `[À COMPLÉTER]` |
| **Gravité avant mesures** | 4 — maximale (obligation légale 20 ans) |
| **Vraisemblance avant mesures** | 2 — limitée |
| **Gravité résiduelle** | **3 — importante** (le plan de continuité 20 ans n'est pas encore juridiquement formalisé) |
| **Vraisemblance résiduelle** | **2 — limitée** |

**Mesures complémentaires recommandées** :
- **Formaliser un séquestre / accord d'éditeur tiers** garantissant la
  conservation 20 ans en cas de cessation Éditeur (CRITIQUE).
- Tester le plan de restauration au moins une fois par an avec scénario
  réel (perte totale d'un environnement).
- Documenter la procédure de migration de données vers un autre
  hébergeur HDS.

---

## E — Synthèse et avis

### E.1 Risques résiduels

| Risque | Gravité | Vraisemblance | Acceptable ? |
|---|---|---|---|
| Accès illégitime | 3 | 2 | Acceptable sous condition (MFA obligatoire à terme + HDS) |
| Modification non désirée | 3 | 2 | Acceptable sous condition (audit anonymisation, tests sync) |
| Disparition | 3 | 2 | Acceptable sous condition (séquestre 20 ans formalisé) |

### E.2 Décision

✅ **Le traitement peut être mis en œuvre** sous réserve des mesures
correctives ci-dessous, sans nécessité de consultation préalable de la
CNIL au titre de l'art. 36 RGPD (les risques résiduels sont gérés par
des mesures déjà existantes ou planifiées dans la roadmap).

### E.3 Plan d'action

| # | Mesure | Échéance | Responsable | Statut |
|---|---|---|---|---|
| 1 | Migration vers hébergeur HDS certifié | `[À COMPLÉTER : trimestre]` | Direction technique | Roadmap |
| 2 | MFA obligatoire pour tout Praticien | T+3 mois | Tech lead | À planifier |
| 3 | Audit anonymisation IA — tests automatisés | T+1 mois | DPO + Tech | En cours `[À VÉRIFIER]` |
| 4 | Pen-test annuel par tiers | T+6 mois | DPO | À budgéter |
| 5 | Séquestre / accord 20 ans formalisé | T+3 mois | Direction + Juridique | À contracter |
| 6 | Test annuel restauration complète | T+6 mois | DevOps | À planifier |
| 7 | Audit minimisation des champs collectés | T+2 mois | DPO + Produit | À planifier |
| 8 | Procédure purge auto post-20 ans | Avant T+19 ans | Tech | Backlog (non urgent) |

### E.4 Validation

| Acteur | Date | Avis |
|---|---|---|
| DPO | `[À COMPLÉTER]` | `[FAVORABLE / AVEC RÉSERVES / DÉFAVORABLE]` |
| Direction technique | `[À COMPLÉTER]` | `[…]` |
| Direction générale | `[À COMPLÉTER]` | `[…]` |

### E.5 Réexamen

Cette AIPD doit être **réexaminée** :
- avant tout changement substantiel du traitement (nouveau sous-traitant,
  nouvelle finalité, modification des données traitées) ;
- en cas d'incident significatif ;
- au minimum tous les **3 ans**.

---

## F — Annexes

### F.1 Cartographie des sous-traitants

cf. [registre-traitements.md § II.1.4](registre-traitements.md)

### F.2 Mesures de sécurité détaillées

cf. [politique-confidentialite.md § 8](politique-confidentialite.md) et
[dpa-praticien.md](dpa-praticien.md).

### F.3 Documentation pseudonymisation

> ⚠️ À MAINTENIR : lien vers le code et les tests automatisés du moteur
> d'anonymisation. Référence interne :
> `[À COMPLÉTER : src/utils/anonymize/...]`.

### F.4 Références légales

- RGPD art. 35, 36
- Délibération CNIL 2018-326 (liste type AIPD)
- Délibération CNIL 2018-327 (liste type non-AIPD)
- Guide CNIL « PIA — Méthode » (févr. 2018)
- Guide CNIL « PIA — Modèles » (févr. 2018)
- Guide CNIL « PIA — Connaissances de base » (févr. 2018)

---

> AIPD réalisée selon la méthodologie CNIL. Date de validation :
> `[À COMPLÉTER]`.
> Signature DPO : `[À COMPLÉTER]`.
> Conservée à disposition de l'autorité de contrôle.

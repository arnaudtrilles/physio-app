# Compliance & mise en conformité — PWA de kinésithérapie (FR + CH)

> Document de travail interne, non juridique au sens strict. Objectif : cadrer les chantiers obligatoires avant commercialisation aux praticiens libéraux français et suisses, et fournir une checklist actionnable.
>
> Date de rédaction : avril 2026. À relire à chaque évolution du référentiel HDS, de la nLPD ou des conditions des sous-traitants IA (Anthropic, OpenAI).
>
> Hypothèse de travail : l'éditeur (Arnaud) est sous-traitant au sens RGPD pour le compte du praticien (responsable de traitement). Cette qualification doit être confirmée par avocat (cf. §21).

---

## Table des matières

- [0. Synthèse exécutive](#0-synthèse-exécutive)
- [A. Hébergement & flux de données](#a-hébergement--flux-de-données)
  - [1. Statut HDS de Supabase](#1-statut-hds-de-supabase)
  - [2. Alternatives HDS si Supabase ne convient pas (FR)](#2-alternatives-hds-si-supabase-ne-convient-pas-fr)
  - [3. Conformité nLPD pour Supabase eu-west-1 (Suisse)](#3-conformité-nlpd-pour-supabase-eu-west-1-suisse)
  - [4. Flux Anthropic Claude API](#4-flux-anthropic-claude-api)
  - [5. Flux OpenAI Whisper](#5-flux-openai-whisper)
- [B. Documentation RGPD](#b-documentation-rgpd)
  - [6. Registre des activités de traitement (art. 30)](#6-registre-des-activités-de-traitement-art-30)
  - [7. Mentions légales](#7-mentions-légales)
  - [8. Politique de confidentialité](#8-politique-de-confidentialité)
  - [9. CGU praticien vs CGU patient](#9-cgu-praticien-vs-cgu-patient)
  - [10. Information patient (art. 13 RGPD)](#10-information-patient-art-13-rgpd)
  - [11. Procédure droits des patients](#11-procédure-droits-des-patients)
  - [12. AIPD / DPIA](#12-aipd--dpia)
- [C. Sécurité technique](#c-sécurité-technique)
  - [13. Chiffrement au repos et en transit](#13-chiffrement-au-repos-et-en-transit)
  - [14. Authentification forte du praticien](#14-authentification-forte-du-praticien)
  - [15. Logs d'accès aux données patient](#15-logs-daccès-aux-données-patient)
  - [16. Sauvegardes et PRA](#16-sauvegardes-et-pra)
  - [17. Gestion des fuites (art. 33 / 34 RGPD)](#17-gestion-des-fuites-art-33--34-rgpd)
  - [18. Anonymisation / pseudonymisation pour IA](#18-anonymisation--pseudonymisation-pour-ia)
- [D. Suisse — spécificités](#d-suisse--spécificités)
  - [19. nLPD vs RGPD pour un éditeur SaaS](#19-nlpd-vs-rgpd-pour-un-éditeur-saas)
  - [20. PFPDT — déclarations](#20-pfpdt--déclarations)
  - [21. Responsable de traitement vs sous-traitant en CH](#21-responsable-de-traitement-vs-sous-traitant-en-ch)
  - [22. Lois cantonales sur la santé (GE / VD / FR)](#22-lois-cantonales-sur-la-santé-ge--vd--fr)
- [E. Statut juridique de l'application](#e-statut-juridique-de-lapplication)
  - [23. Logiciel dispositif médical ?](#23-logiciel-dispositif-médical-)
  - [24. Marquage CE classe I / IIa](#24-marquage-ce-classe-i--iia)
  - [25. Codes de déontologie (CNOMK / CDS)](#25-codes-de-déontologie-cnomk--cds)
- [F. Récapitulatif & roadmap](#f-récapitulatif--roadmap)
- [Annexes — sources et templates](#annexes--sources-et-templates)

---

## 0. Synthèse exécutive

### Le constat brutal

L'application traite des **données de santé sensibles au sens de l'art. 9 RGPD** (identité, ATCD, bilans cliniques, photos cliniques, prescriptions). En France, ces données :

- Doivent être hébergées chez un **hébergeur certifié HDS** (art. L.1111-8 du Code de la santé publique).
- À partir du **16 mai 2026**, le référentiel HDS v2.0 entre en vigueur exclusivement, avec exigence de localisation dans l'EEE et alignement ISO 27001:2022.

En Suisse, la **nLPD** (entrée en vigueur 1er septembre 2023) impose des obligations équivalentes au RGPD avec spécificités cantonales pour les dossiers patients (Genève, Vaud, Fribourg).

### Les trois verrous BLOQUANTS pour launch

1. **Hébergement HDS**. Supabase n'est pas certifié HDS au moment de la rédaction (avril 2026). Ne pas commercialiser l'app à un kiné français tant que la base n'est pas migrée chez un hébergeur HDS-certifié.
2. **DPA / clauses contractuelles avec Anthropic et OpenAI**. Les flux IA traversent des frontières (US). Sans DPA signé + SCC + information explicite du patient + minimisation, c'est une violation directe de l'art. 28 et du chapitre V RGPD.
3. **Statut dispositif médical**. L'app calcule des scores cliniques (volume Kuhnke, IMC, scores fonctionnels). Selon la règle 11 du MDR, le logiciel peut tomber en classe I ou IIa. À trancher avec consultant DM avant tout lancement payant.

### Estimation budgétaire minimale

| Poste | Coût | Délai |
| --- | --- | --- |
| Migration vers hébergeur HDS-certifié (OVH HDS / Outscale / Clever Cloud) | 50 à 300 €/mois infra + 5 à 15 j-h migration | 1-2 mois |
| Audit juridique RGPD + nLPD (avocat spécialisé santé) | 2 500 à 6 000 € | 3-4 semaines |
| AIPD complète | 0 € si DIY avec outil PIA CNIL, 1 500-3 500 € si accompagnement | 2-3 semaines |
| Templates contractuels (CGU, mentions légales, contrat sous-traitance, DPA) | 800 à 2 500 € | 2-3 semaines |
| DPO mutualisé (recommandé même si non obligatoire) | 100 à 250 €/mois | continu |
| Pré-évaluation dispositif médical (consultant) | 1 500 à 4 000 € | 4-6 semaines |
| **Total minimal pour conformité launch FR** | **~6 000 à 18 000 €** + **150 à 500 €/mois** | **2-4 mois** |
| Conformité Suisse additionnelle (Swiss Rider SCC + audit cantonal) | 1 000 à 3 000 € | 2-4 semaines |

---

# A. Hébergement & flux de données

## 1. Statut HDS de Supabase

### Pourquoi c'est obligatoire

- **Article L.1111-8 du Code de la santé publique** : tout hébergeur de données de santé pour le compte d'un tiers doit être certifié HDS.
- **Référentiel HDS v2.0** (publié 16 mai 2024, transition jusqu'au 16 mai 2026) : ajoute l'obligation de localisation dans l'Espace économique européen (EEE), alignement ISO 27001:2022, contrôle renforcé des sous-traitants soumis aux lois extra-européennes (CLOUD Act US).
- **Sanctions** : article L.1115-1 CSP, jusqu'à 3 ans d'emprisonnement et 45 000 € d'amende. Plus sanctions CNIL (jusqu'à 4 % CA mondial / 20 M€).

### État de Supabase au moment de la rédaction (avril 2026)

- Supabase **n'est pas listé** dans la [liste des hébergeurs certifiés HDS](https://esante.gouv.fr/offres-services/hds/liste-des-hebergeurs-certifies) de l'ANS.
- Supabase s'appuie sur AWS. **AWS est certifié HDS** sur certaines régions et certains services, mais Supabase en tant que prestataire de niveau supérieur **doit lui aussi être certifié HDS** (la certification AWS ne se "transmet" pas automatiquement à un PaaS qui s'appuie dessus).
- La discussion [GitHub supabase#30734](https://github.com/orgs/supabase/discussions/30734) montre que Supabase a connaissance du sujet mais aucune annonce de certification.
- Localisation `eu-west-1` = Irlande, donc EEE — point conforme uniquement sur le critère localisation.

### Conclusion

**Supabase ne peut pas légalement héberger des données de santé françaises pour un tiers** au moment de la rédaction. Continuer à utiliser Supabase pour le launch français = risque pénal direct pour Arnaud (en tant que sous-traitant qui choisit l'hébergeur) ET pour le kiné client (responsable de traitement qui s'appuie sur cette solution).

### Ce qu'il faut produire

- [ ] Décision documentée : migration vers un hébergeur HDS-certifié OU exclusion stricte du marché français tant que Supabase ne l'est pas.
- [ ] Si on garde Supabase : restreindre à un usage hors-données-santé (analytics anonymes, etc.) et stocker les données patient ailleurs.
- [ ] Si migration : choisir un PaaS Postgres HDS-certifié (cf. §2), réaliser la migration de schéma, adapter les variables d'environnement, retester le workflow complet.
- [ ] Mentionner dans le contrat de sous-traitance le nom et le numéro de certification HDS de l'hébergeur effectif.

### Qui

- Arnaud + accompagnement éventuel d'un consultant cloud français pour la migration (devis 5-15 j-h).
- À valider par avocat IT/santé pour confirmer le montage contractuel.

### Coût / délai

- Migration technique : 5-15 j-h de dev (peut être fait par Arnaud).
- Coût infra HDS : 50 à 300 €/mois selon volumétrie patient (vs Supabase ~25 €/mois).
- Délai : 1-2 mois (audit, migration, retest).

### Priorité

**BLOQUANT launch FR.**

---

## 2. Alternatives HDS si Supabase ne convient pas (FR)

### Comparatif pragmatique

| Hébergeur | Certifié HDS | Postgres managé | API / DX proche Supabase | Prix indicatif | Recommandation |
| --- | --- | --- | --- | --- | --- |
| **OVHcloud** | Oui (HDS, ISO 27001) | Oui (Public Cloud Databases) | Non (DB only, pas d'auth/API auto) | ~50-150 €/mois | Stack maîtrisée, ratio qualité/prix |
| **Outscale (Dassault Systèmes)** | Oui (HDS + SecNumCloud ANSSI) | Oui via VM ou OOS | Non (IaaS) | ~150-400 €/mois | Plus exigeant techniquement, max sécurité |
| **Scaleway** | Oui (HDS sur certaines offres dédiées) | Oui (Managed Database for PostgreSQL) | Non (DB only) | ~50-200 €/mois | Bon pour startup, vérifier l'offre HDS spécifique |
| **Clever Cloud** | Oui (HDS PaaS) | Oui (PostgreSQL add-on) | Plus simple (PaaS) | ~50-200 €/mois | Le plus proche d'un Supabase HDS, recommandé pour solo-dev |
| **Docaposte** | Oui (HDS + santé-spécialisé) | Oui (offres santé) | Non (intégrateur) | Sur devis, > 500 €/mois | Sur-dimensionné pour un MVP |
| **Cegedim** | Oui (santé-spécialisé) | Oui | Non | Sur devis | Sur-dimensionné, lourd |

### Ce qu'il faut produire

- [ ] Tableau comparatif daté avec devis officiel demandé à 2-3 hébergeurs.
- [ ] PoC technique : migrer un sous-ensemble du schéma sur l'hébergeur retenu, mesurer la latence, le coût réel.
- [ ] Choix final tracé dans tasks/lessons.md avec critères de décision.
- [ ] Contrat HDS signé (l'hébergeur fournit un modèle conforme à l'art. L.1111-8 CSP).
- [ ] Adaptation du code app : remplacer le SDK Supabase par un client Postgres direct + couche d'auth maison (ou se reposer sur l'auth incluse de Clever Cloud / OVH / etc.).

### Recommandation pratique

Pour un MVP solo-dev qui veut rester proche de l'expérience Supabase : **Clever Cloud HDS** (PaaS, simple à opérer, certification HDS native, support FR) ou **OVH HDS** (ratio qualité/prix, écosystème FR mature). Réévaluer Supabase tous les 6 mois (tracker la discussion GitHub #30734).

### Qui

- Arnaud pour le PoC et la migration.
- Avocat IT pour relire le contrat HDS.

### Coût / délai

- PoC : 2-3 j-h.
- Migration complète : 5-15 j-h.
- Avocat (relecture contrat) : 500-1 000 €.

### Priorité

**BLOQUANT launch FR** (couplé au point 1).

---

## 3. Conformité nLPD pour Supabase eu-west-1 (Suisse)

### Pourquoi c'est obligatoire

- **Loi fédérale sur la protection des données (nLPD)**, en vigueur depuis le 1er septembre 2023, art. 16-18 sur les transferts à l'étranger.
- L'EEE n'est pas la Suisse. Un transfert UE → Suisse ou Suisse → UE est un transfert à l'étranger au sens de la nLPD.
- Le **Préposé fédéral à la protection des données et à la transparence (PFPDT)** publie une liste d'États reconnus comme offrant une protection adéquate. **L'UE figure sur cette liste** (annexe 1 de l'OPDo) — donc transfert CH → UE est libre sans formalité.
- Inverse : transfert UE → CH (ex : un cabinet suisse s'inscrit, ses données vont sur Supabase eu-west-1 = UE) est aussi facilité par le mécanisme d'adéquation.
- **Mais** : si Supabase sous-traite à AWS US (CLOUD Act), les données peuvent in fine sortir de l'UE. Là il faut des **clauses contractuelles types (CCT/SCC) avec un Swiss Rider** — annexe que le PFPDT a publiée pour adapter les SCC européennes au droit suisse.

### Ce qu'il faut produire

- [ ] Cartographie des flux : qui sont mes sous-traitants ? Où vont les données ?
  - Supabase (UE/Irlande) → AWS (UE/Irlande, mais maison-mère US, CLOUD Act applicable).
  - Anthropic (US).
  - OpenAI (US ou Irlande pour clients EU Business).
  - Vercel (US, mais PoP EU possibles).
- [ ] Pour chaque sous-traitant US : SCC européennes + Swiss Rider PFPDT signés.
- [ ] Document de transparence (registre suisse) listant ces transferts pour les clients suisses.
- [ ] Évaluation de l'impact des transferts (analogue au TIA européen post-Schrems II) — le PFPDT recommande cet exercice.

### Qui

- Arnaud (cartographie + collecte des SCC).
- Avocat IT/protection des données (suisse de préférence) pour valider le Swiss Rider et le TIA.

### Coût / délai

- Cartographie + collecte DPA : 2-3 j-h Arnaud.
- Avocat suisse : 1 000-2 500 € pour pack nLPD (Swiss Rider + TIA + relecture).
- Délai : 2-4 semaines.

### Priorité

**BLOQUANT launch CH.**

---

## 4. Flux Anthropic Claude API

### Pourquoi c'est obligatoire

- **Art. 28 RGPD** : tout sous-traitant doit être lié par contrat (DPA) qui décrit objet, durée, finalité, type de données, droits du responsable.
- **Chapitre V RGPD (art. 44-50)** : transfert hors UE possible uniquement si garanties appropriées (SCC, BCR, décision d'adéquation). Pour les US : pas de décision d'adéquation universelle, mais **EU-US Data Privacy Framework (DPF)** depuis juillet 2023, qui couvre les entreprises certifiées.
- **Données concernées** : le bilan clinique en texte libre envoyé à Claude pour analyse contient potentiellement nom, ATCD, diagnostic = données de santé sensibles art. 9 RGPD.

### État de Anthropic (avril 2026)

- Anthropic propose un **DPA standard intégré aux Commercial Terms of Service** ([Anthropic Privacy Center](https://privacy.claude.com/en/articles/7996862-how-do-i-view-and-sign-your-data-processing-addendum-dpa)).
- Anthropic propose un **BAA (Business Associate Agreement) HIPAA** uniquement sur les **plans Enterprise** ou via **AWS Bedrock / Google Cloud Vertex / Azure Foundry** sous BAA cloud provider.
- Le DPA standard contient les SCC européennes mais **n'équivaut pas à un BAA**. Le BAA est requis pour traiter de la PHI au sens HIPAA.
- En droit français/européen, ce qui compte n'est pas HIPAA mais le RGPD : **le DPA Anthropic + SCC suffit techniquement** pour un transfert légal — MAIS le RGPD impose en plus pour les données de santé une base légale art. 9 (consentement explicite ou exception médicale art. 9.2.h).

### Ce qu'il faut produire

- [ ] Signer le DPA Anthropic (procédure self-service via Privacy Center).
- [ ] Inscrire Anthropic comme sous-traitant ultérieur dans le contrat de sous-traitance avec le kiné client.
- [ ] Trois options stratégiques, à choisir :
  1. **Anonymiser/pseudonymiser** avant envoi à Claude (remplacer nom patient par ID, retirer date de naissance, etc.). C'est l'option recommandée pour minimiser le risque. Voir §18.
  2. **Consentement explicite du patient** (art. 9.2.a RGPD) avant que ses données ne transitent par Claude.
  3. **Migrer vers Claude via AWS Bedrock région eu-west-3 (Paris)** ou eu-west-1 (Irlande) avec BAA + DPA AWS — plus coûteux mais garde les données dans l'EEE.
- [ ] Mention explicite dans la politique de confidentialité (cf. §8) et dans la notice d'information patient (cf. §10) : "Vos données peuvent être analysées par un sous-traitant IA (Anthropic, US) sous DPA et clauses contractuelles types européennes."
- [ ] Mettre à jour le `feature flag` en prod : possibilité de désactiver l'analyse IA texte par défaut, opt-in praticien explicite, opt-in patient si données identifiantes.

### Qui

- Arnaud pour la signature du DPA, la cartographie technique, l'implémentation de la pseudonymisation.
- Avocat pour valider le consentement et la base légale art. 9.

### Coût / délai

- DPA self-service : 0 €.
- Pseudonymisation : 5-10 j-h dev.
- Migration Bedrock : 3-5 j-h dev + ~1.5x le coût API actuel.
- Avocat : 500-1 500 € pour valider le montage.

### Priorité

**BLOQUANT launch FR + CH** si on garde le flux IA texte avec données identifiantes. **IMPORTANT premier mois** si on désactive l'IA pour le launch.

---

## 5. Flux OpenAI Whisper

### Pourquoi c'est obligatoire

Mêmes bases légales que §4 : art. 28 RGPD + chapitre V.

### État de OpenAI (avril 2026)

- **OpenAI propose un DPA** ([openai.com/policies/data-processing-addendum](https://openai.com/policies/data-processing-addendum/)).
- **OpenAI Ireland Limited** est le contractant pour les clients EEA/Suisse, ce qui simplifie la base légale.
- **Data residency Europe** : OpenAI propose une option de résidence des données en Europe pour les clients **API Business / Enterprise**. À activer explicitement.
- **BAA HIPAA** disponible mais sur plans Enterprise.
- Whisper en mode API standard (`api.openai.com/v1/audio/transcriptions`) **n'est pas couvert par la résidence EU par défaut** sur le plan API standard. Il faut soit un plan Enterprise, soit basculer sur une alternative.

### Alternatives à évaluer

| Option | Hébergement | DPA | Coût indicatif | Recommandation |
| --- | --- | --- | --- | --- |
| **OpenAI Whisper API standard** | US/EU mix | Oui (DPA standard) | 0,006 $/min | Acceptable si DPA + SCC + info patient |
| **OpenAI Enterprise + EU data residency** | EU exclusif | DPA + BAA possible | Sur devis, > 200 $/mois mini | Cher mais robuste |
| **Whisper open-source local (whisper.cpp / faster-whisper)** | Local navigateur ou serveur Arnaud HDS | N/A | Gratuit (compute) | Idéal souveraineté, mais qualité/perf à valider |
| **Mistral Voxtral** (hébergement EU Mistral) | EU (Paris) | DPA Mistral | À voir | Souverain, à évaluer en 2026 |
| **Scaleway IA hosted Whisper** | EU (Paris) | DPA Scaleway | Sur devis | Souverain France |

### Ce qu'il faut produire

- [ ] Signer le DPA OpenAI.
- [ ] Activer la résidence EU si plan le permet.
- [ ] Évaluer l'option Whisper local (faster-whisper sur backend HDS) : idéal car la transcription audio peut contenir des éléments très identifiants (nom du patient prononcé, etc.).
- [ ] Information patient explicite : enregistrement vocal envoyé à un sous-traitant pour transcription.
- [ ] Option dans l'app : possibilité de désactiver complètement la transcription vocale automatique (saisie manuelle).
- [ ] Politique de rétention : ne **pas** garder l'audio brut côté serveur après transcription (purge immédiate).

### Qui

- Arnaud pour le choix technique et la signature DPA.
- Avocat pour valider la base légale et le consentement.

### Coût / délai

- DPA self-service : 0 €.
- PoC Whisper local : 2-5 j-h.
- Migration vers alternative EU souveraine : 3-7 j-h.

### Priorité

**BLOQUANT launch** si flux audio avec données patient identifiables. **IMPORTANT premier mois** sinon.

---

# B. Documentation RGPD

## 6. Registre des activités de traitement (art. 30)

### Pourquoi c'est obligatoire

- **Art. 30 RGPD** : tout responsable de traitement (le kiné) ET tout sous-traitant (Arnaud / éditeur) doit tenir un registre des activités de traitement.
- **Délibération CNIL n° 2020-081 du 18 juin 2020** ([JORF lien Légifrance](https://www.legifrance.gouv.fr/jorf/id/JORFTEXT000042158211)) : référentiel relatif aux traitements de données personnelles destinés à la gestion des cabinets médicaux et paramédicaux, **incluant les kinésithérapeutes**. Modèle implicite de registre.
- **Exemption petite structure < 250 salariés** : ne s'applique PAS aux traitements de données sensibles (art. 9), donc le kiné DOIT tenir un registre même seul.

### Ce qu'il faut produire

Deux registres distincts :

#### Registre côté éditeur (Arnaud, sous-traitant)

Pour chaque activité (auth, stockage patient, transcription IA, analyse texte IA, génération PDF, etc.) :
- Nom et coordonnées du sous-traitant (Arnaud / sa structure juridique).
- Catégories de traitements effectués pour le compte du responsable.
- Le cas échéant, transferts hors UE + garanties (SCC, BCR).
- Description des mesures de sécurité techniques et organisationnelles.

#### Registre côté praticien (à fournir comme template au kiné client)

Pour chaque finalité (gestion dossier patient, facturation, prise de rdv, etc.) :
- Finalité du traitement.
- Catégories de personnes concernées (patients, contacts urgence, etc.).
- Catégories de données (identité, santé, photos, etc.).
- Destinataires (ARS, CPAM, médecin prescripteur, etc.).
- Durées de conservation (art. R.1112-7 CSP : 20 ans après dernier passage du patient).
- Mesures de sécurité.

### Artefact

- Template Excel/Notion à fournir au kiné lors de l'onboarding.
- Outil CNIL gratuit : [registre-rgpd.cnil.fr](https://www.cnil.fr/fr/RGPD-le-registre-des-activites-de-traitement) (modèle simplifié pour PME).

### Qui

- Arnaud crée son propre registre + le template praticien.
- Validation par DPO ou avocat (1 h de relecture).

### Coût / délai

- Création DIY : 1 j-h Arnaud + 200-500 € relecture.
- Délai : 1 semaine.

### Priorité

**BLOQUANT launch FR.**

---

## 7. Mentions légales

### Pourquoi c'est obligatoire

- **Art. 6.III LCEN** (loi pour la confiance dans l'économie numérique, 21 juin 2004) : mentions légales obligatoires sur tout site/app.
- **Art. R. 4127-XX du CSP** pour activités de santé : informations spécifiques (numéro RPPS, ordre…).

### Ce qu'il faut produire

Page "Mentions légales" accessible depuis le footer de l'app :

- Identité de l'éditeur (nom, prénom ou raison sociale, adresse, SIRET, capital social si société).
- Directeur de publication.
- Hébergeur : nom, adresse, téléphone (= l'hébergeur HDS).
- Numéro RCS ou répertoire des métiers le cas échéant.
- Adresse e-mail de contact.
- Pour le praticien (page de profil) : RPPS, numéro d'inscription Ordre, adresse cabinet.

### Qui

- Arnaud (DIY, modèle facilement disponible).

### Coût / délai

- 0 € (templates en ligne) à 200 € (rédaction par un juriste).
- Délai : 1-2 j.

### Priorité

**BLOQUANT launch FR.**

---

## 8. Politique de confidentialité

### Pourquoi c'est obligatoire

- **Art. 13 et 14 RGPD** : information préalable lors de la collecte.
- **Art. 12 RGPD** : information transparente, intelligible, facilement accessible.
- **nLPD art. 19-21** : équivalent suisse.

### Contenu obligatoire

1. Identité et coordonnées du responsable de traitement (le kiné) ET du sous-traitant (l'éditeur).
2. Coordonnées du DPO (si désigné).
3. Finalités du traitement et base juridique :
   - Suivi médical du patient → exécution d'un contrat de soin / mission de service public de santé / art. 9.2.h RGPD.
   - Statistiques internes anonymisées → intérêt légitime (art. 6.1.f).
   - IA d'aide à la décision → consentement explicite (art. 9.2.a).
4. Catégories de données collectées (identité, santé, photos cliniques).
5. Destinataires : autres professionnels de santé, CPAM, ARS, sous-traitants techniques (hébergeur HDS, Anthropic, OpenAI).
6. Durées de conservation (20 ans dossier patient cf. R.1112-7 CSP).
7. Transferts hors UE : oui (USA pour Anthropic et OpenAI), garanties = SCC + DPA + opt-in patient.
8. Droits : accès, rectification, effacement, limitation, portabilité, opposition, retrait consentement, plainte CNIL.
9. Source des données : collectées directement auprès du patient.
10. Existence de profilage / décision automatisée : préciser pour les fonctions d'aide à la décision (scores, prédictions).
11. Procédure de mise à jour de la politique.

### Artefact

- Page "Politique de confidentialité" accessible avant inscription patient (si flux patient direct) et accessible en permanence depuis l'app praticien.
- Versionning : chaque changement = nouvelle version + date + notification utilisateur (art. 12).

### Qui

- Avocat spécialisé santé/numérique recommandé pour la rédaction.
- Arnaud peut partir d'un template (ex : modèle CNIL secteur santé) puis faire relire.

### Coût / délai

- Template + adaptation DIY : 0-300 €.
- Rédaction avocat : 1 000-2 500 €.
- Délai : 2-3 semaines.

### Priorité

**BLOQUANT launch FR + CH.**

---

## 9. CGU praticien vs CGU patient

### Pourquoi c'est obligatoire

- **Code de la consommation** + **Code civil** : tout service en ligne payant doit avoir des CGV/CGU.
- **Distinction critique** : le kiné est client B2B (souscrit l'app), le patient est utilisateur tiers (pas client direct mais peut-être utilisateur de fonctionnalités auto-suivi, partage de doc, etc.).

### Deux contrats distincts

#### CGU/CGV praticien

- Description du service.
- Tarifs, modalités de paiement, durée d'engagement.
- Obligations Arnaud (disponibilité, sécurité, support).
- Obligations praticien (usage conforme, ne pas partager le compte, vérification finale des contenus IA, etc.).
- Responsabilité : limitation et exclusions (la responsabilité médicale reste celle du kiné).
- Résiliation, restitution des données, fin de contrat.
- **Annexe : contrat de sous-traitance art. 28 RGPD** (très important — sans ça, le kiné est en infraction).
- Droit applicable, juridiction.
- Médiation de la consommation pour B2C (B2B exempté généralement, mais à valider).

#### CGU patient (si accès patient direct)

- Description des fonctionnalités accessibles au patient.
- Conditions d'accès (lien envoyé par le kiné, code, etc.).
- Engagement du patient (ne pas partager le lien, etc.).
- Avertissement : l'app n'est PAS un service médical d'urgence.
- Droits RGPD (renvoi vers la politique de confidentialité).

### Qui

- Avocat pour la rédaction (très recommandé).

### Coût / délai

- Rédaction avocat : 1 500-3 500 € pour le pack complet (CGU prat + CGU patient + DPA art. 28).
- Délai : 3-4 semaines.

### Priorité

**BLOQUANT launch** : sans CGU + DPA art. 28, vente illégale.

---

## 10. Information patient (art. 13 RGPD)

### Pourquoi c'est obligatoire

- **Art. 13 RGPD** : information au moment de la collecte.
- **Art. 12 RGPD** : information concise, transparente, intelligible.
- **Art. 9.2.a RGPD** : si on s'appuie sur le consentement, il doit être explicite, libre, éclairé, spécifique.

### Quand l'afficher dans l'app

Trois moments clés :

1. **Première saisie d'un nouveau patient** : pop-up ou panneau dépliant "Information sur le traitement de vos données personnelles" + checkbox "J'ai informé le patient" pour le praticien.
2. **Au moment de l'utilisation d'une fonction IA** (transcription audio, analyse texte) : information spécifique sur le sous-traitant US et opt-in.
3. **À tout moment** : page "Vos données" accessible depuis le profil patient avec récapitulatif et droits.

### Contenu

- Identité du responsable (le kiné), coordonnées.
- Coordonnées du DPO si désigné.
- Finalités précises et base légale par finalité.
- Caractère obligatoire ou facultatif des réponses.
- Conséquences d'un refus.
- Destinataires.
- Durée de conservation.
- Droits + procédure d'exercice.
- Droit de saisir la CNIL.

### Artefact concret

- Notice d'information PDF imprimable ET affichage écran lors du premier RDV.
- Document signé physique OU consentement numérique horodaté + checksum.

### Qui

- Avocat pour rédaction.
- Arnaud pour intégration UI/UX dans l'app.

### Coût / délai

- Rédaction : 500-1 200 € (peut être inclus dans le pack §9).
- Intégration : 2-4 j-h dev.
- Délai : 1-2 semaines.

### Priorité

**BLOQUANT launch FR + CH.**

---

## 11. Procédure droits des patients

### Pourquoi c'est obligatoire

- **Art. 15-22 RGPD** : droits d'accès, rectification, effacement, limitation, portabilité, opposition.
- **Délai de réponse** : 1 mois (extensible 2 mois si complexe), art. 12.3.
- **Gratuité** sauf demande manifestement abusive.

### Ce qu'il faut produire

- [ ] Procédure documentée (PDF interne) décrivant : qui reçoit, qui traite, en combien de temps, comment.
- [ ] Adresse e-mail dédiée : `dpo@cabinetkine.fr` ou similaire.
- [ ] Formulaire d'exercice des droits téléchargeable (modèle CNIL).
- [ ] Dans l'app : bouton "Exporter mes données" (portabilité art. 20) qui génère un PDF/JSON structuré.
- [ ] Dans l'app : bouton "Demande d'effacement" qui déclenche une procédure manuelle (avec validation médicale, car les données médicales ont une durée légale de conservation — l'effacement avant 20 ans peut être refusé).
- [ ] Logging : conserver la trace de chaque demande, sa date, sa réponse (preuve de conformité).

### Particularité données médicales

- Le **droit à l'effacement (art. 17) est limité** par l'art. 17.3.b : "respect d'une obligation légale" (les 20 ans de conservation du dossier patient prévalent sur l'effacement).
- Ce qu'on peut faire : pseudonymiser le dossier pour les usages secondaires, supprimer les sous-ensembles non médicaux (préférences, photos non cliniques, etc.).

### Qui

- Arnaud pour l'implémentation technique (export, suppression contrôlée).
- Avocat pour rédiger la procédure de réponse (modèle qui couvre les exceptions médicales).

### Coût / délai

- Implémentation export portabilité : 3-5 j-h dev.
- Procédure documentée : 300-800 € avocat ou DIY si modèle CNIL.
- Délai : 2-3 semaines.

### Priorité

**IMPORTANT premier mois.** Pas strictement BLOQUANT le jour du launch (le délai légal de 1 mois donne une marge), mais doit être prêt avant la première demande.

---

## 12. AIPD / DPIA

### Pourquoi c'est obligatoire

- **Art. 35 RGPD** : AIPD obligatoire si "risque élevé pour les droits et libertés des personnes physiques", notamment :
  - Évaluation systématique d'aspects personnels (profilage).
  - Traitement à grande échelle de données sensibles (art. 9).
  - Surveillance systématique à grande échelle.
- **Liste CNIL des traitements pour lesquels une AIPD est requise** ([CNIL liste](https://www.cnil.fr/sites/cnil/files/atoms/files/liste-traitements-aipd-requise.pdf)) : inclut "traitements de données de santé mis en œuvre par les établissements de santé ou médico-sociaux pour la prise en charge des personnes".

### Application au cas Arnaud

Le doute existe : un cabinet kiné individuel n'est pas un "établissement de santé" au sens strict. **MAIS** :
- L'app est multi-praticiens potentiels (B2B SaaS).
- Cumul de critères : données sensibles + nouveaux usages technologiques (IA d'analyse texte/audio) + utilisation à grande échelle dès que la base d'utilisateurs grossit.

→ **AIPD recommandée systématiquement** pour Arnaud (éditeur), avec une AIPD-modèle réutilisable par chaque kiné client.

### Ce qu'il faut produire

L'AIPD comprend (art. 35.7) :

1. **Description systématique** du traitement et de ses finalités.
2. **Évaluation de la nécessité et de la proportionnalité**.
3. **Évaluation des risques** pour les droits et libertés.
4. **Mesures envisagées** pour faire face aux risques (chiffrement, MFA, logs, anonymisation, etc.).

Outil pratique : **PIA software CNIL** (gratuit, [cnil.fr/fr/outil-pia-telechargez-et-installez-le-logiciel-de-la-cnil](https://www.cnil.fr/fr/outil-pia-telechargez-et-installez-le-logiciel-de-la-cnil)) : guide pas-à-pas en 4 phases.

### Qui

- Arnaud peut faire le premier draft avec PIA Tool CNIL.
- Relecture par DPO mutualisé ou avocat.
- Si risques résiduels élevés : soumission CNIL obligatoire (art. 36 RGPD, "consultation préalable").

### Coût / délai

- DIY avec PIA Tool : 0 € + 3-5 j-h Arnaud.
- Accompagnement DPO/avocat : 1 500-3 500 €.
- Délai : 2-3 semaines.

### Priorité

**BLOQUANT launch FR.** Si AIPD non faite et risque élevé identifié ensuite par la CNIL → sanction directe.

---

# C. Sécurité technique

## 13. Chiffrement au repos et en transit

### Pourquoi c'est obligatoire

- **Art. 32 RGPD** : sécurité du traitement, "pseudonymisation et chiffrement" cités comme mesures appropriées.
- **Référentiel HDS v2.0** : exigences contractuelles explicites de chiffrement.
- **PGSSI-S (politique générale de sécurité des SI de santé)** ANS : guide des bonnes pratiques.

### État actuel à vérifier

- [ ] Supabase : chiffrement AES-256 au repos par défaut (à confirmer dans la doc actuelle).
- [ ] HTTPS/TLS 1.3 forcé (HSTS header obligatoire).
- [ ] Certificats valides (Let's Encrypt ou équivalent), renouvellement automatique.
- [ ] Backups chiffrés.
- [ ] Données sensibles (photos cliniques) : chiffrement applicatif additionnel (clé gérée par le kiné, pas par l'éditeur) — recommandé pour limiter le risque en cas de compromission de l'hébergeur.

### Ce qu'il faut produire

- [ ] Schéma technique du chiffrement (au repos + en transit) à inclure dans la documentation de sécurité.
- [ ] Tests SSL Labs ([ssllabs.com/ssltest](https://www.ssllabs.com/ssltest/)) : viser note A+.
- [ ] HSTS header configuré.
- [ ] Politique de gestion des clés (KMS).
- [ ] Évaluer chiffrement client-side pour les photos cliniques (CryptoJS ou Web Crypto API).

### Qui

- Arnaud (DIY).

### Coût / délai

- 2-4 j-h.
- 0 € (outils gratuits).

### Priorité

**BLOQUANT launch.**

---

## 14. Authentification forte du praticien

### Pourquoi c'est obligatoire

- **PGSSI-S** ANS : authentification renforcée recommandée pour accès aux données de santé.
- **Référentiel HDS v2.0** : exige des mesures d'authentification adaptées au risque.
- **Sécu sociale française** : pour les services connectés Ameli, l'auth forte est obligatoire — mais pour un cabinet, recommandée fortement.
- **Carte CPS (Carte de Professionnel de Santé)** : authentification ProSantéConnect existe et est gratuite via l'ANS.

### Niveaux possibles

| Niveau | Implémentation | Recommandation |
| --- | --- | --- |
| **Mot de passe seul** | Déjà en place | Insuffisant pour données santé |
| **MFA TOTP** (Google Authenticator) | Supabase l'inclut, ~1-2 j-h dev | Minimum acceptable |
| **WebAuthn / Passkey** | Plus complexe | Excellent UX + sécurité |
| **ProSantéConnect (carte CPS / e-CPS)** | Intégration ANS | Gold standard pour kinés FR |

### Ce qu'il faut produire

- [ ] MFA TOTP obligatoire pour tout accès praticien à des données patient. Pas optionnel.
- [ ] Politique de mot de passe robuste (12+ caractères, pas de pwned passwords cf. haveibeenpwned API).
- [ ] Verrouillage automatique après inactivité (15 min).
- [ ] Logs de connexion (cf. §15).
- [ ] Roadmap : intégration ProSantéConnect dans les 6 mois post-launch.

### Qui

- Arnaud.

### Coût / délai

- MFA TOTP : 2-3 j-h.
- ProSantéConnect : 5-10 j-h + démarche ANS (gratuite mais lourde administrativement).

### Priorité

**MFA TOTP : BLOQUANT launch.** ProSantéConnect : NICE-TO-HAVE 6-12 mois.

---

## 15. Logs d'accès aux données patient

### Pourquoi c'est obligatoire

- **Art. 32 RGPD** : "moyens permettant de garantir la confidentialité […] de manière permanente".
- **Référentiel HDS v2.0** : exige journalisation et traçabilité.
- **PGSSI-S** : guide spécifique sur les "traces" des accès aux données médicales.

### Ce qu'il faut produire

Pour chaque accès à un dossier patient :
- Qui a accédé (utilisateur authentifié, IP).
- Quand (timestamp UTC).
- Quoi (lecture, modification, export, suppression).
- Quel patient (ID pseudonymisé dans le log si possible).

Stockage des logs :
- Conservation : 6 mois minimum, recommandé 1 an.
- Logs immutables (write-once-read-many).
- Accès restreint (pas tout le monde ne peut lire les logs).
- Logs eux-mêmes anonymisés sur l'utilisateur final si possible.

Mise à disposition :
- Le praticien doit pouvoir consulter les logs d'accès à ses propres dossiers (en cas de litige patient ou de soupçon d'intrusion).
- Procédure de fourniture des logs au patient sur demande RGPD (art. 15).

### Qui

- Arnaud.

### Coût / délai

- 5-10 j-h dev (table Postgres dédiée + middleware logging + UI consultation).

### Priorité

**BLOQUANT launch FR.**

---

## 16. Sauvegardes et PRA

### Pourquoi c'est obligatoire

- **Art. 32.1.c RGPD** : "moyens permettant de rétablir la disponibilité des données et l'accès […] dans des délais appropriés en cas d'incident physique ou technique".
- **Référentiel HDS v2.0** : Plan de Continuité / Plan de Reprise d'Activité requis.

### Ce qu'il faut produire

- [ ] Stratégie de sauvegarde : 3-2-1 (3 copies, 2 supports, 1 hors site).
- [ ] Fréquence : quotidienne minimum.
- [ ] Rétention : 30 jours en rolling, archives mensuelles plus longues à définir.
- [ ] Test de restauration documenté (au moins 1x/trimestre).
- [ ] PRA : document décrivant scenarios (panne hébergeur, ransomware, perte de clé, etc.) + temps de restauration cible (RTO) + perte de données acceptable (RPO).
- [ ] RTO recommandé : 4-24 h. RPO : < 24 h.
- [ ] Sauvegardes elles-mêmes chiffrées et stockées dans un autre data center que l'instance principale.

### Qui

- Arnaud (techniquement) + DPO/avocat pour le PRA documentaire.

### Coût / délai

- Configuration backups : 1-3 j-h.
- Documentation PRA : 1-2 j-h.
- Test de restauration : 0,5 j-h récurrent.

### Priorité

**BLOQUANT launch FR.**

---

## 17. Gestion des fuites (art. 33 / 34 RGPD)

### Pourquoi c'est obligatoire

- **Art. 33 RGPD** : notification CNIL dans les **72 heures** après prise de connaissance d'une violation de données.
- **Art. 34 RGPD** : information des personnes concernées si risque élevé.
- **Article 24 du règlement HDS** : obligations de notification spécifiques aux données de santé.

### Ce qu'il faut produire

- [ ] Procédure interne "que faire en cas de violation" (template) :
  1. Détection (qui détecte ? comment ?).
  2. Évaluation du risque (qualifier la fuite).
  3. Notification CNIL via téléservice ([notifications.cnil.fr](https://notifications.cnil.fr)) en 72 h.
  4. Information des praticiens clients.
  5. Information des personnes concernées si risque élevé.
  6. Documentation de l'incident dans un registre des violations.
- [ ] Adresse e-mail de signalement : `security@…` ou `security.txt` à la racine de l'app.
- [ ] Contrat de sous-traitance (art. 28) : obligation pour les sous-traitants de notifier sans délai.
- [ ] Numéro de téléphone d'astreinte (24/7) si possible, sinon adresse e-mail surveillée.

### Qui

- Arnaud (rédaction procédure) + avocat (template courrier de notification).

### Coût / délai

- Procédure : 1-2 j-h.
- Template avocat : 300-800 €.

### Priorité

**BLOQUANT launch.**

---

## 18. Anonymisation / pseudonymisation pour IA

### Pourquoi c'est obligatoire

- **Art. 5.1.c RGPD** (minimisation) : ne traiter que ce qui est nécessaire.
- **Art. 25 RGPD** (privacy by design / by default) : implémenter la pseudonymisation dès la conception.
- **Considérant 26 RGPD** : les données pseudonymisées restent personnelles (donc soumises au RGPD), mais réduisent significativement le risque.

### Ce qu'il faut produire

#### Pour le flux Claude API (analyse texte)

- [ ] Pré-traitement avant appel API : retirer ou tokeniser le nom, prénom, date de naissance, adresse, téléphone, numéro sécu, email du texte envoyé.
- [ ] Stratégie : remplacer par des placeholders `[PATIENT]`, `[DOB]`, etc.
- [ ] Logique de réinjection côté client après réception de la réponse.
- [ ] Bibliothèque : Microsoft Presidio (open-source, NER médical) ou regex maison.
- [ ] Tests unitaires : vérifier que les identifiants ne fuient pas.

#### Pour le flux Whisper (transcription audio)

- Plus difficile : l'audio contient des mots prononcés.
- Stratégies :
  - Demander au praticien de ne pas dire à voix haute le nom du patient (consigne UX).
  - Post-traitement : appliquer le même filtre Presidio sur la transcription textuelle obtenue.
  - **Alternative : Whisper local** = pas d'envoi externe → problème résolu.

### Qui

- Arnaud (implémentation technique).

### Coût / délai

- 5-10 j-h dev (Presidio integration + tests).
- 0 € (open-source).

### Priorité

**BLOQUANT launch** si flux IA actifs avec données identifiantes. **IMPORTANT premier mois** sinon (mais à faire avant tout retour à l'activation des features IA).

---

# D. Suisse — spécificités

## 19. nLPD vs RGPD pour un éditeur SaaS

### Différences clés

| Aspect | RGPD | nLPD | Impact pratique |
| --- | --- | --- | --- |
| Champ d'application | Personnes physiques | Personnes physiques (les morales sont sorties depuis nLPD 2023) | Aligné depuis 2023 |
| Sanctions | Administratives (CNIL) jusqu'à 4 % CA | **Pénales** : amende jusqu'à 250 000 CHF, mais visant la personne physique responsable, pas l'entreprise | Plus de risque perso pour Arnaud |
| Délégué à la protection des données (DPO) | Obligatoire pour traitement à grande échelle de données sensibles | Pas obligatoire mais recommandé (Conseiller à la protection des données) | Idem |
| Consentement explicite | Pour données sensibles | Pour profilage à risque élevé + données sensibles | Aligné |
| Notification de violation | 72h CNIL | "Aussi vite que possible" PFPDT | Plus flou côté CH |
| Registre des activités | Art. 30 | Art. 12 nLPD | Aligné |
| Analyse d'impact | Art. 35 (AIPD) | Art. 22 nLPD (AIPD) | Aligné |
| Adéquation | Liste UE | Liste CH (annexe 1 OPDo) | UE est adéquate vue de CH |

### Ce qu'il faut produire

- [ ] Une politique de confidentialité unique mais avec section "spécificités suisses" (mention du PFPDT, base légale nLPD).
- [ ] Si client suisse : conseiller à la protection des données (CPD) optionnel mais recommandé pour traitement de données médicales.
- [ ] Annonce des transferts hors CH (vers UE, US) avec mécanisme.

### Priorité

**BLOQUANT launch CH.**

---

## 20. PFPDT — déclarations

### Pourquoi c'est obligatoire

- **Art. 12 nLPD** : registre des activités de traitement, accessible au PFPDT sur demande.
- **Art. 24 nLPD** : annonce des violations au PFPDT.
- **PAS d'obligation générale de déclaration préalable** comme dans l'ancienne LPD : la nLPD est passée sur un modèle similaire RGPD (responsabilisation, non déclaration).

### Ce qu'il faut produire

- [ ] Registre nLPD à jour, prêt à fournir au PFPDT en cas de demande.
- [ ] Procédure de notification de violation au PFPDT (formulaire en ligne sur edoeb.admin.ch).
- [ ] Mention dans la politique de confidentialité du droit de saisir le PFPDT.

### Qui

- Arnaud.

### Coût / délai

- Réutilisation du registre RGPD avec adaptations : 1 j-h.

### Priorité

**IMPORTANT premier mois.**

---

## 21. Responsable de traitement vs sous-traitant en CH

### Pourquoi c'est critique

- **Art. 9 nLPD** : le responsable du traitement détermine les finalités et les moyens.
- **Art. 9 nLPD aliéna 2** : le sous-traitant traite uniquement sur instructions documentées.
- **Différence majeure avec le RGPD** : la nLPD parle parfois de "maître du fichier" — terme issu de l'ancienne LPD encore utilisé en pratique.

### Application

- Le **kiné suisse** est responsable du traitement (il choisit pourquoi et comment il utilise l'app).
- Arnaud / l'éditeur est sous-traitant.
- Mais : **l'éditeur peut basculer responsable conjoint** si son rôle est trop actif (ex : il décide unilatéralement d'ajouter une analyse IA non demandée par le kiné).

→ Nécessité d'un **contrat de sous-traitance art. 9 nLPD** (équivalent art. 28 RGPD).

### Ce qu'il faut produire

- [ ] Contrat de sous-traitance bilingue FR (RGPD) + CH (nLPD) ou un contrat unique avec clauses spécifiques chacune.
- [ ] À vérifier avec avocat suisse : qualification précise du rôle d'Arnaud dans le pipeline IA.

### Qui

- Avocat suisse spécialisé protection des données.

### Coût / délai

- Contrat bilingue : 1 500-3 000 €.
- Délai : 3-4 semaines.

### Priorité

**BLOQUANT launch CH.**

---

## 22. Lois cantonales sur la santé (GE / VD / FR)

### Particularité suisse

La Suisse a une **double couche** : nLPD fédérale + lois cantonales sur la santé. Pour les dossiers patients, certains cantons ont des règles spécifiques.

| Canton | Loi de référence | Spécificités notables |
| --- | --- | --- |
| **Genève (GE)** | Loi sur la santé (LS) GE + Loi sur l'information du public, l'accès aux documents et la protection des données personnelles (LIPAD) | Strict sur la conservation et l'accès, notamment via la Commission cantonale du contrôle des données |
| **Vaud (VD)** | Loi sur la santé publique (LSP) + Loi cantonale sur la protection des données personnelles (LPrD) | Préposé cantonal à la protection des données |
| **Fribourg (FR)** | Loi sur la santé (LSan) + Loi cantonale sur la protection des données | Autorité cantonale de la transparence et de la protection des données (ATPrD) |

À noter : les **kinésithérapeutes** sont des **professions médicales universitaires** au sens de la **loi fédérale sur les professions médicales (LPMéd)** dans la majorité des cantons, soumis aux mêmes obligations de tenue de dossier que les médecins.

### Ce qu'il faut produire

- [ ] Cartographie des cantons cibles (probable ordre : VD, GE, FR + reste de Suisse romande).
- [ ] Pour chaque canton ciblé : note brève sur les exigences cantonales spécifiques (durée de conservation, accès patient, etc.).
- [ ] À vérifier avec avocat suisse : ces lois cantonales s'appliquent-elles à l'éditeur SaaS ou uniquement au praticien ? (probable : uniquement au praticien, qui doit s'assurer que l'outil utilisé est conforme).

### Qui

- Avocat suisse spécialisé santé pour le pré-audit cantonal.

### Coût / délai

- Note de synthèse : 800-2 000 €.
- Délai : 2-3 semaines.

### Priorité

**IMPORTANT premier mois** pour les cantons cibles principaux. **NICE-TO-HAVE 6 mois** pour les autres cantons.

---

# E. Statut juridique de l'application

## 23. Logiciel dispositif médical ?

### Pourquoi c'est critique

- **Règlement (UE) 2017/745 (MDR)** entré en application 26 mai 2021.
- **Art. 2.1 MDR** : "logiciel destiné par le fabricant à être utilisé […] pour des êtres humains à des fins notamment de diagnostic, prévention, contrôle, prédiction, pronostic, traitement ou atténuation d'une maladie".
- **Règle 11 MDR (annexe VIII)** : logiciel fournissant des informations utilisées pour des décisions diagnostiques ou thérapeutiques :
  - Classe IIa par défaut.
  - Classe IIb si erreur peut entraîner détérioration grave.
  - Classe III si erreur peut entraîner mort ou détérioration irréversible.
- **MDCG 2019-11 rev.1 (juin 2025)** : guide officiel d'interprétation. Précise notamment que les logiciels de calcul (IMC, scores) basés sur des formules validées peuvent être qualifiés ou non selon la finalité d'usage.

### Application au cas Arnaud

L'app calcule :
- IMC (formule simple).
- Volume Kuhnke pour lymphœdème (calcul de volume basé sur circumférométrie — utilisé en pratique clinique pour suivre l'évolution).
- Scores fonctionnels (probablement DASH, KOOS, etc. — selon implémentations).
- Bilans cliniques structurés.

**Argumentation possible "non-DM"** :
- Si l'app est un simple "outil de saisie et de structuration de données" (équivalent papier), sans interprétation automatique ni recommandation thérapeutique → pas DM.
- Si les calculs (IMC, volume) ne sont qu'une **formule transparente** que le kiné aurait pu calculer lui-même au papier → arguably pas DM (cf. MDCG 2019-11 §5.1, "simple search functions").

**Argumentation "DM" probable** :
- Volume Kuhnke pour lymphœdème → suivi d'une pathologie spécifique → potentielle aide à la décision thérapeutique → règle 11 MDR → **classe IIa** probable.
- Scores fonctionnels avec interprétation ("votre patient progresse", "régresse", seuils colorés) → aide à la décision → **classe IIa** probable.
- Si l'IA génère des suggestions cliniques (ex : "objectif rééducation suggéré") → décision diagnostique ou thérapeutique → **IIa minimum**, voire IIb selon impact.

### Ce qu'il faut produire

- [ ] **Pré-évaluation DM** : checklist MDCG 2019-11 appliquée à chaque fonctionnalité de l'app.
- [ ] Décision tracée : pour chaque fonctionnalité = "non-DM" / "classe I" / "classe IIa" / "classe IIb".
- [ ] Si "non-DM" : disclaimer explicite dans l'app : "Cet outil est un simple support de saisie et n'effectue aucune aide à la décision médicale. Toute interprétation reste du ressort exclusif du praticien."
- [ ] Si "DM" : démarrer dossier marquage CE (cf. §24).

**Stratégie pragmatique recommandée** :
1. Phase MVP : positionnement explicite "non-DM" → désactiver/cacher les features qui basculent en DM (interprétations automatiques, suggestions IA cliniques, alertes).
2. Phase 2 : développer un dossier DM classe IIa avec organisme notifié et marquage CE.

### Qui

- Consultant DM (ex : Qualitiso, GMED, anciens collaborateurs ANSM) — incontournable.
- Avocat DM en complément.

### Coût / délai

- Pré-évaluation : 1 500-4 000 €.
- Délai : 4-6 semaines.

### Priorité

**BLOQUANT launch.** Sans tranchage clair, vente illégale potentiellement (R&D : si l'app est commercialisée comme "DM" sans marquage CE, c'est une infraction au MDR + Code de la santé publique L.5211-1 et suivants).

---

## 24. Marquage CE classe I / IIa

### Si l'app est qualifiée DM

#### Classe I (low-risk)

- Auto-déclaration possible (sans organisme notifié).
- Dossier technique conforme à l'annexe II MDR.
- Procédure simplifiée mais : système de management qualité (ISO 13485) recommandé voire requis selon évolutions.
- Coût : ~5 000-15 000 € pour un MVP solo.
- Délai : 6-12 mois.

#### Classe IIa (medium-risk)

- **Organisme notifié obligatoire** (en France : GMED, BSI, etc.).
- ISO 13485 (qualité) + ISO 14971 (gestion des risques) + IEC 62304 (cycle de vie logiciel) obligatoires.
- Évaluation clinique formelle.
- Coût total réaliste : **30 000-100 000 €** pour la première certification.
- Délai : 12-24 mois.
- Renouvellement / surveillance : ~10 000 €/an.

### Conséquence pour Arnaud

→ **Classe IIa = inenvisageable pour un MVP solo**. Recommandation : positionner explicitement l'app en "non-DM" (cf. §23) et reporter la démarche DM à plus tard si business viable.

→ **Classe I = envisageable** si on accepte 6-12 mois de mise en place.

### Ce qu'il faut produire (si on entre dans la démarche DM)

- [ ] SMQ ISO 13485 documenté.
- [ ] Dossier technique annexe II MDR.
- [ ] Évaluation clinique / suivi clinique post-commercialisation.
- [ ] Système de vigilance (signalement d'incidents à l'ANSM).
- [ ] EUDAMED registration.

### Qui

- Consultant DM + organisme notifié.
- Possibilité d'embaucher un Person Responsible for Regulatory Compliance (PRRC, art. 15 MDR), partagé entre plusieurs petites structures.

### Priorité

**Reporté post-launch** si stratégie "non-DM" retenue. **NICE-TO-HAVE 12-24 mois** pour préparer la démarche.

---

## 25. Codes de déontologie (CNOMK / CDS)

### France — CNOMK

- **Code de déontologie des Masseurs-Kinésithérapeutes** (R.4321-51 à R.4321-145 du Code de la santé publique).
- **Article R.4321-91 CSP** : tenue d'un dossier patient obligatoire (objectifs, traitements, séances, évolutions).
- Article R.4321-83 CSP : secret professionnel.
- Article R.4321-99 CSP : confraternité (pas d'usage de l'app pour dénigrer un confrère).

### Suisse — CDS / FSP

- **Convention nationale physiothérapie** (FSP — physioswiss) : règles déontologiques équivalentes.
- Tenue de dossier obligatoire selon LPMéd et lois cantonales (cf. §22).

### Ce qu'il faut produire

- [ ] Documentation utilisateur claire sur les rôles : l'app facilite, ne remplace pas le jugement clinique.
- [ ] Mention dans les CGU praticien : "Vous restez seul responsable de la qualité du dossier patient et du respect du code de déontologie."
- [ ] Pas de fonction qui pousserait le kiné à enfreindre la déontologie (ex : partage non sécurisé entre confrères, dossier consultable par des tiers non autorisés…).

### Qui

- Arnaud.

### Coût / délai

- Documentation : 1 j-h.

### Priorité

**IMPORTANT premier mois.**

---

# F. Récapitulatif & roadmap

## Tableau prioritaire avant first paying customer

### BLOQUANTS launch FR (à faire AVANT le 1er kiné payant)

| # | Chantier | Effort | Coût | Délai |
| --- | --- | --- | --- | --- |
| 1 | Migration vers hébergeur HDS-certifié | 5-15 j-h | 50-300 €/mois infra | 1-2 mois |
| 2 | Choix hébergeur + contrat HDS | 2-3 j-h + 500-1 000 € avocat | 500-1 000 € | 2-4 semaines |
| 4 | DPA + SCC Anthropic + minimisation | 5-10 j-h dev + DPA gratuit | 0-500 € | 2-3 semaines |
| 5 | DPA + SCC OpenAI ou Whisper local | 2-7 j-h dev + DPA gratuit | 0-500 € | 2-3 semaines |
| 6 | Registre des activités de traitement | 1 j-h + 200-500 € relecture | 200-500 € | 1 semaine |
| 7 | Mentions légales | 0,5 j-h | 0-200 € | 1-2 j |
| 8 | Politique de confidentialité | DIY ou avocat | 0-2 500 € | 2-3 semaines |
| 9 | CGU praticien + DPA art. 28 | Avocat | 1 500-3 500 € | 3-4 semaines |
| 10 | Information patient (notice + UI) | 2-4 j-h dev + 500-1 200 € | 500-1 200 € | 1-2 semaines |
| 12 | AIPD | 3-5 j-h DIY ou avocat | 0-3 500 € | 2-3 semaines |
| 13 | Chiffrement validé | 2-4 j-h | 0 € | 1 semaine |
| 14 | MFA TOTP obligatoire | 2-3 j-h | 0 € | 1 semaine |
| 15 | Logs d'accès | 5-10 j-h | 0 € | 2 semaines |
| 16 | Backups + PRA | 2-5 j-h | 0 € | 1 semaine |
| 17 | Procédure violations + template | 1-2 j-h + 300-800 € | 300-800 € | 1 semaine |
| 18 | Pseudonymisation flux IA | 5-10 j-h | 0 € | 2 semaines |
| 23 | Pré-évaluation DM | Consultant | 1 500-4 000 € | 4-6 semaines |

**Total minimum BLOQUANTS FR : ~6 000-18 000 € + ~150-500 €/mois récurrent + 2-3 mois calendaires.**

### BLOQUANTS launch CH (en plus)

| # | Chantier | Coût | Délai |
| --- | --- | --- | --- |
| 3 | Swiss Rider SCC + cartographie nLPD | 1 000-2 500 € | 2-4 semaines |
| 21 | Contrat de sous-traitance nLPD bilingue | 1 500-3 000 € | 3-4 semaines |

**Total CH additionnel : ~2 500-5 500 €.**

### IMPORTANT premier mois (post-launch)

- §11 — Procédure droits des patients fonctionnelle.
- §20 — Setup déclaration violations PFPDT.
- §22 — Note cantons CH cibles.
- §25 — Documentation déontologique.

### NICE-TO-HAVE 6-12 mois

- §14 — ProSantéConnect (carte CPS).
- §22 — Audit cantonal complet (autres cantons).
- §24 — Démarche DM classe I si business confirmé.

## Roadmap calendaire

### Mois 1 (M+1)

- Cartographie complète des flux et sous-traitants.
- Audit juridique express (avocat) : définir périmètre, statut DM, base légale.
- DPA signés (Anthropic, OpenAI).
- Choix hébergeur HDS + signature contrat.

### Mois 2 (M+2)

- Migration technique vers hébergeur HDS.
- MFA TOTP + logs d'accès + chiffrement validé.
- AIPD complète.
- Politique de confidentialité + mentions légales.
- Pseudonymisation flux IA implémentée.

### Mois 3 (M+3)

- CGU + DPA art. 28 finalisés (avocat).
- Information patient intégrée dans l'UI.
- PRA + procédure violations rédigés.
- Pré-évaluation DM finalisée.
- **Launch FR** sur 1-3 kinés pilotes.

### Mois 4-6 (M+4 à M+6)

- Swiss Rider + contrat nLPD bilingue.
- Note cantons CH (VD/GE/FR).
- **Launch CH** sur 1-2 kinés pilotes.
- Mise en place DPO mutualisé (recommandé à partir de 5-10 clients).

### Mois 6-12

- Évaluation Supabase HDS (re-checker chaque trimestre).
- ProSantéConnect.
- Préparation démarche DM classe I si volonté business.

## Coût total estimé minimal

### Setup initial

| Poste | Min | Max |
| --- | --- | --- |
| Avocat (audit + CGU + DPA + politique) | 3 000 € | 8 000 € |
| Consultant DM (pré-évaluation) | 1 500 € | 4 000 € |
| Avocat suisse (Swiss Rider + contrat bilingue) | 2 500 € | 5 500 € |
| Templates / outils CNIL | 0 € | 500 € |
| Contrat HDS (frais avocat) | 500 € | 1 000 € |
| **Total setup** | **7 500 €** | **19 000 €** |

### Récurrent annuel

| Poste | Min | Max |
| --- | --- | --- |
| Hébergeur HDS | 600 € (50 €/mois) | 3 600 € (300 €/mois) |
| DPO mutualisé (à partir de 5-10 clients) | 1 200 € | 3 000 € |
| Veille juridique / mise à jour docs | 500 € | 1 500 € |
| Renouvellements certifs (audit DM si applicable) | 0 € | 10 000 € (DM IIa) |
| **Total annuel** | **2 300 €** | **18 000 €+** |

## Top 3 risques juridiques majeurs

1. **Hébergement non-HDS d'une donnée de santé d'un patient français = infraction pénale art. L.1115-1 CSP** (jusqu'à 3 ans + 45 000 €). Sanction parallèle CNIL possible. Risque le plus immédiat tant que Supabase n'est pas certifié HDS et que la migration n'a pas eu lieu.
2. **Flux IA US (Anthropic/OpenAI) sans DPA + SCC + base légale art. 9 RGPD = transfert illicite** (chapitre V RGPD). Sanction CNIL jusqu'à 4 % CA mondial / 20 M€. Risque réel et déjà sanctionné dans d'autres dossiers (Doctolib/Microsoft, etc.).
3. **Qualification dispositif médical éludée = mise sur le marché illégale** (art. L.5211-1 CSP). Sanction pénale + retrait obligatoire de l'app. Risque latent, peut être déclenché par signalement concurrent ou ANSM (rare mais existe).

---

# Annexes — sources et templates

## Articles légaux clés à conserver à portée de main

- **RGPD** : art. 4 (définitions), 5 (principes), 6 (bases légales), 9 (données sensibles), 12-22 (droits), 28 (sous-traitance), 30 (registre), 32 (sécurité), 33-34 (violations), 35 (AIPD), 44-50 (transferts).
- **Code de la santé publique (FR)** : L.1110-4 (secret), L.1111-7 (accès dossier), L.1111-8 (HDS), R.1112-7 (conservation 20 ans), L.1115-1 (sanctions HDS), L.5211-1 (dispositifs médicaux), R.4321-91 (dossier kiné).
- **MDR** : règlement (UE) 2017/745, en particulier art. 2, 5, 10, 15, 52, annexe VIII (règle 11).
- **nLPD (CH)** : art. 5 (définitions), 6 (principes), 9 (sous-traitance), 12 (registre), 16-18 (transferts), 22 (AIPD), 24 (violations).
- **LCEN (FR)** : art. 6.III (mentions légales).

## Sources web consultées (avril 2026)

- [ANS — Liste des hébergeurs certifiés HDS](https://esante.gouv.fr/offres-services/hds/liste-des-hebergeurs-certifies)
- [ANS — Page certification HDS](https://esante.gouv.fr/labels-certifications/hds/certification-des-hebergeurs-de-donnees-de-sante)
- [Supabase GitHub Discussion #30734 — HDS certification](https://github.com/orgs/supabase/discussions/30734)
- [Anthropic Privacy Center — DPA](https://privacy.claude.com/en/articles/7996862-how-do-i-view-and-sign-your-data-processing-addendum-dpa)
- [Anthropic — BAA HIPAA](https://privacy.claude.com/en/articles/8114513-business-associate-agreements-baa-for-commercial-customers)
- [OpenAI — Data Processing Addendum](https://openai.com/policies/data-processing-addendum/)
- [OpenAI — EU data residency](https://openai.com/index/introducing-data-residency-in-europe/)
- [CNIL — Délibération 2020-081 référentiel cabinets médicaux](https://www.legifrance.gouv.fr/jorf/id/JORFTEXT000042158211)
- [CNIL — Liste traitements AIPD requise](https://www.cnil.fr/sites/cnil/files/atoms/files/liste-traitements-aipd-requise.pdf)
- [CNIL — RGPD et professionnels santé libéraux](https://www.cnil.fr/fr/rgpd-et-professionnels-de-sante-liberaux-ce-que-vous-devez-savoir)
- [CNIL — Outil PIA téléchargeable](https://www.cnil.fr/fr/outil-pia-telechargez-et-installez-le-logiciel-de-la-cnil)
- [Code de déontologie Masseurs-Kinésithérapeutes — CNOMK](https://deontologie.ordremk.fr/)
- [PFPDT (CH) — Préposé fédéral à la protection des données](https://www.edoeb.admin.ch/)
- [admin.ch — nLPD (KMU)](https://www.kmu.admin.ch/kmu/en/home/facts-and-trends/digitization/data-protection/new-federal-act-on-data-protection-nfadp.html)
- [MDCG 2019-11 rev.1 — guide qualification logiciels DM](https://www.qualitiso.com/revision-1-du-mdcg-2019-11-guide-pour-les-logiciels-en-tant-que-dispositifs-medicaux/)

## Templates à demander à l'avocat (pack complet)

1. CGU/CGV praticien.
2. DPA art. 28 RGPD (annexe au contrat praticien).
3. Politique de confidentialité.
4. Mentions légales.
5. Notice d'information patient (art. 13 RGPD).
6. Formulaire de consentement explicite (pour fonctions IA).
7. Procédure droits des patients (réponse type).
8. Procédure violations (notification CNIL + courrier patient).
9. Contrat de sous-traitance bilingue FR + CH (Swiss Rider intégré).
10. Charte d'usage interne (en cas d'embauche future).

## Acteurs externes à contacter / shortlister

- **Hébergeurs HDS PaaS proches Supabase** : Clever Cloud, OVHcloud, Scaleway.
- **Avocats FR santé/numérique** : Cabinet Squire Patton Boggs, Haas Avocats, Delsol, Field Fisher (cités dans les sources). Demander 3 devis.
- **Avocats CH protection données** : Schellenberg Wittmer, Walder Wyss, MLL. Demander 2 devis.
- **Consultants DM** : Qualitiso, GMED (organisme notifié + conseil).
- **DPO mutualisés FR** : SoluDPO, Dipeeo, fidens, etc.

---

## Notes de mise à jour

- **2026-04-29 — v1.0** : rédaction initiale par Arnaud avec Claude. À relire trimestriellement et à chaque changement matériel (statut HDS Supabase, évolution nLPD, sortie de référentiels CNIL).


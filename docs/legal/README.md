# Documents juridiques — physio-app

> Documents publiables / signables produits le **2026-04-30**, prêts à intégrer
> dans l'app et à publier sur le site marketing.
>
> **Tous contiennent des placeholders `[À COMPLÉTER : ...]`** qui sont la seule
> chose qu'Arnaud doit renseigner avant publication. La structure, les bases
> légales, les durées de conservation, les références d'articles RGPD/nLPD,
> la liste des sous-traitants et les recours sont déjà rédigés en dur.
>
> Pour le **cadre méthodologique** (chantiers, audits internes, AIPD complète,
> registre des traitements), voir `docs/compliance.md` (1284 lignes — guide
> interne, pas publiable tel quel).

---

## Index des documents

| # | Fichier | À publier où | À signer par qui |
|---|---|---|---|
| 1 | [`mentions-legales.md`](mentions-legales.md) | Footer site + Paramètres app | Aucun (publication unilatérale) |
| 2 | [`politique-confidentialite.md`](politique-confidentialite.md) | Footer site + Onboarding | Aucun (information) |
| 3 | [`cgu-praticien.md`](cgu-praticien.md) | Acceptation à l'inscription praticien | Praticien (case à cocher) |
| 4 | [`cgv.md`](cgv.md) | Page tarifs + Acceptation paiement | Praticien (case à cocher) |
| 5 | [`dpa-praticien.md`](dpa-praticien.md) | Téléchargeable / signature électronique | Arnaud + Praticien |
| 6 | [`information-patient.md`](information-patient.md) | À remettre par le praticien à son patient | Aucun (information) |
| 7 | [`cookies.md`](cookies.md) | Footer site + Bannière consentement | Aucun (information) |
| 8 | [`procedure-droits.md`](procedure-droits.md) | **Interne** — procédure Arnaud | Aucun |
| 9 | [`procedure-violation.md`](procedure-violation.md) | **Interne** — procédure Arnaud | Aucun |
| 10 | [`registre-traitements.md`](registre-traitements.md) | **Interne** — à conserver 5 ans | Aucun |
| 11 | [`aipd.md`](aipd.md) | **Interne** — à présenter à la CNIL si demandé | Aucun |

---

## Workflow d'utilisation

### Avant le lancement commercial

1. **Compléter les placeholders** dans chaque fichier — ouvrir chaque doc et chercher
   `[À COMPLÉTER` (Cmd+F).
2. **Faire relire par un avocat RGPD/santé** — les placeholders et la structure
   peuvent être validés en 1-2h. Vérifier en particulier la qualification
   « sous-traitant vs responsable de traitement » dans le DPA.
3. **Désigner un DPO** (mutualisé, ~150-400 €/mois) — son nom va dans la
   politique de confidentialité.
4. **Compléter l'AIPD** (`aipd.md`) avec l'outil CNIL « PIA » (gratuit) — c'est
   obligatoire car traitement de données de santé (art. 35 RGPD).
5. **Tenir le registre** (`registre-traitements.md`) — c'est un Excel/markdown
   vivant, à mettre à jour à chaque évolution.

### Pendant l'exploitation

- Quand un nouveau **sous-traitant** est ajouté (ex: changement d'hébergeur) :
  mettre à jour la politique de confidentialité **et** le DPA praticien
  **et** le registre.
- Quand un **patient** demande à exercer un droit : suivre `procedure-droits.md`.
- Quand une **violation** de données est suspectée : suivre `procedure-violation.md`
  (notification CNIL en 72 h max).

---

## Statut juridique global au 2026-04-30

- **Hébergement** : ⚠️ **NON HDS certifié** (Vercel front + Supabase eu-west).
  Cf. `docs/compliance.md` §1-3 pour la roadmap migration HDS.
- **Sous-traitants IA** : Anthropic (US, DPF) + OpenAI (US, DPF). Transferts
  hors UE encadrés par SCC + DPF — décrits dans la politique de confidentialité.
- **Pseudonymisation** : `anonymizePatientData` + `scrub()` retirent nom/prénom/
  DOB avant envoi IA. ⚠️ **Audit du 2026-04-30 a révélé que 3 fonctions du
  pipeline vocal ne passent pas par le scrub** (`voiceBilanClient.ts`). À fixer
  avant launch.
- **Pas de DPA Supabase signé** à ce jour. À demander gratuitement via support.
- **Pas de DPO désigné** à ce jour. Bloquant pour publier la politique de
  confidentialité (le nom doit y figurer).

## Bases légales en synthèse

| Traitement | Base légale | Référence |
|---|---|---|
| Création compte praticien | Contrat (CGU) | art. 6.1.b RGPD / art. 31 nLPD |
| Tenue dossier patient (par le praticien) | Mission d'intérêt public + obligation légale | art. 6.1.c+e RGPD / Code santé pub. art. R.4321-86 |
| Traitement données santé patient | Consentement explicite + nécessité diagnostic / soins | art. 9.2.a + 9.2.h RGPD / art. 6.7 nLPD |
| Envoi pseudonymisé à Claude / Whisper | Sous-traitance encadrée + intérêt légitime aide diagnostic | art. 28 RGPD |
| Marketing / newsletter | Consentement opt-in | art. 6.1.a RGPD + L.34-5 LCEN |

## Durées de conservation

| Donnée | Durée | Source |
|---|---|---|
| Dossier patient (bilan, courrier, document) | **20 ans** après la fin de la PEC | Code santé pub. art. R.1112-7 (FR) |
| Dossier patient (CH) | **10 ans** min. après dernier acte (cantonal — souvent 20 ans GE/VD) | Loi cant. + LAMal |
| Comptabilité (factures CGV) | 10 ans | Code commerce art. L.123-22 |
| Logs de connexion praticien | 1 an max | LCEN + recommandation CNIL |
| Logs d'audit accès patient | 3 ans (recommandation HDS) | Référentiel HDS §6.7 |
| Données prospect (newsletter) | 3 ans après dernier contact | Recommandation CNIL |

## Recours

- **France** : CNIL — `cnil.fr/fr/plaintes` — formulaire en ligne gratuit.
- **Suisse** : PFPDT — `edoeb.admin.ch` — formulaire de plainte.
- **UE** : EDPB (autorité chef de file = CNIL pour Arnaud résident France).

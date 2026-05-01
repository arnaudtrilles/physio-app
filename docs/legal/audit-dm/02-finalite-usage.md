# Audit DM — Volet 02 : Finalité d'usage (intended purpose)

> **Auditeur textuel** — Cadre : MDR 2017/745 (UE), ODim (CH), MDCG 2019-11 (qualification logiciel DM).
> Méthodologie : revue VERBATIM des surfaces textuelles publiques et internes (UI, prompts LLM, docs juridiques, métadonnées PWA, marketing HTML). Aucune interprétation juridique. Chaque citation est classée selon une grille de mots-clés à risque.
>
> **Date** : 2026-04-30
> **Périmètre** : `/Users/arnaudtrilles/Desktop/physio-app-version-finale` — branche `main`
> **Commit de référence** : `d4c85d5` (HEAD)

---

## Légende du codage

- 🔴 **Forte revendication clinique** — termes : *diagnostic, hypothèse diagnostique, plan de soins, plan de traitement, recommandation thérapeutique, expert (clinique), évaluation/analyse clinique produite, aide à la décision, optimise, oriente, interprète, suggère un acte, bénéfice patient*. Chacun de ces termes seul tend à faire basculer un logiciel sous l'art. 2.1 MDR + Règle 11 annexe VIII.
- 🟡 **Ambigu / dépend du contexte** — termes : *analyse, suggestion (rédactionnelle), aide à la rédaction, expert (qualité rédactionnelle), recommandation (sens commun), conseils, optimisé (au sens UX), orienter (un courrier)*. Pris isolément, peut rester hors DM si la finalité globale est clairement « documentation ».
- 🟢 **Neutre / formulation de réduction MDR** — termes : *documenter, saisir, structurer, mettre au propre, bibliothèque, gabarit, outil documentaire, outil bureautique, sans contrainte clinique, ne remplace pas le jugement, à titre indicatif, AUCUN diagnostic*.

> **Note méthodo MDCG 2019-11 §2.3** : les prompts système des LLM constituent de la **documentation du fabricant** au sens MDR. Une instruction qui force le modèle à produire un « diagnostic » ou un « plan de traitement » est aussi intentionnelle qu'un libellé d'UI. Elle est citée et classée.

---

## 1. Résumé exécutif

| Classe | Nombre de citations | Surface dominante |
|---|---|---|
| 🔴 | **18** | Prompts LLM (`clinicalPrompt.ts`, `voiceBilanClient.ts`, `App.tsx`) + UI clinique (`BilanAnalyseIA.tsx`, `BilanNoteIntermediaire.tsx`, `BilanEvolutionIA.tsx`) + 1 doc juridique publié (`politique-confidentialite.md`) + notice patient (`information-patient.md`) |
| 🟡 | **17** | CGU + DPA + AIPD + marketing branding « AI PHYSIOTHERAPY » + verbes UI « Générer la note diagnostique » + tutoriel « optimisé » |
| 🟢 | **11** | `mentions-legales.md §6` (disclaimer non-DM explicite), `cookies.md`, `cgv.md`, `app-store-conditions.html` (positionnement recommandé), counter-prompt `App.tsx:1339`, `manifest.json` |

**Verdict textuel** : le corpus produit deux discours contradictoires. Le **discours juridique de surface** (mentions légales §6, CGU §3.2, counter-prompt PDF) revendique explicitement « outil documentaire et bureautique, AUCUN diagnostic, AUCUNE hypothèse diagnostique, AUCUN plan de traitement ». Le **discours technique opérationnel** (prompts LLM, UI labels, politique de confidentialité, notice patient) revendique au contraire « analyse clinique », « hypothèses cliniques », « note diagnostique », « plan de traitement », « hypothèses diagnostiques », « expert en musculo-squelettique », « synthèse diagnostique » comme section forcée du PDF généré. Ces deux discours coexistent dans le même produit, **les revendications cliniques étant directement adressées au LLM qui produit l'output visible par le thérapeute et exporté au médecin prescripteur**.

---

## 2. Citations classées 🔴 (forte revendication clinique)

### 2.1 — Prompts LLM (= documentation fabricant MDCG 2019-11)

**🔴 [01]** `src/utils/clinicalPrompt.ts:178`
> `Tu es un ${role} expert en musculo-squelettique. Analyse ce bilan clinique et fournis une évaluation précise et personnalisée.`

Identité « expert en musculo-squelettique » + verbe « analyse » + livrable « évaluation précise et personnalisée » : le LLM est explicitement positionné comme producteur d'une évaluation clinique.

**🔴 [02]** `src/utils/clinicalPrompt.ts:811`
> `Tu es un ${roleTitle(therapistProfession)} expert en musculo-squelettique. Rédige une note diagnostique intermédiaire`

Livrable nommé « note diagnostique ». Le terme apparaît aussi en titre UI (cf. [13]).

**🔴 [03]** `src/utils/clinicalPrompt.ts:1067` (extrait du méta-prompt PDF, sections 7-9 imposées verbatim)
> `### 7. Synthèse diagnostique` (titre forcé verbatim, § 1529-1541 du même fichier)
> `**7. Synthèse diagnostique** — Paragraphe rédigé structuré : hypothèse physiothérapique principale en tête, raisonnement appuyé sur les éléments anamnestiques et cliniques qui la soutiennent, puis éventuels diagnostics différentiels évoqués et écartés avec leur argument principal.` (`src/App.tsx:1560`)
> `**8. Projet thérapeutique** — Paragraphe rédigé structuré par axes thérapeutiques (...)` (`src/App.tsx:1562`)

Le PDF exporté au médecin prescripteur contient des sections imposées « Synthèse diagnostique » et « Projet thérapeutique ». Le prompt force la production d'un raisonnement diagnostique avec différentiels évoqués/écartés. C'est la finalité d'usage la plus saillante du produit côté output.

**🔴 [04]** `src/App.tsx:1376`
> `// Prompt pour export depuis la page Analyse IA — bilan diagnostic physiothérapique rédigé pour un médecin prescripteur`

Commentaire de code interne nommant explicitement le livrable « bilan diagnostic physiothérapique ».

**🔴 [05]** `src/App.tsx:1448-1460` (méta-prompt PDF)
> `La section 7 (Synthèse diagnostique) (...) une hypothèse diagnostique se défend par la présence / absence de signes cliniques, la cohérence du tableau, la négativité des diagnostics différentiels`
> `« L'hypothèse principale retenue est celle d'une [diagnostic], étayée par [arguments cliniques]. »`

Le prompt enseigne explicitement au LLM comment formuler des hypothèses diagnostiques argumentées en langage médical.

**🔴 [06]** `src/App.tsx:1650, 1696`
> `**Raisonnement diagnostique, interprétation croisée** → **section 7 (Synthèse diagnostique)**.`
> `Raisonnement diagnostique / diagnostics différentiels / articulation clinique | §7 Synthèse diagnostique`

Architecture explicite « raisonnement diagnostique » comme finalité d'une section générée.

**🔴 [07]** `src/utils/voiceBilanClient.ts:358`
> `Tu es un physiothérapeute expert qui rédige des comptes rendus cliniques professionnels en français`

Identité « physiothérapeute expert » + livrable « comptes rendus cliniques » sur la branche vocale.

**🔴 [08]** `src/components/BilanAnalyseIA.tsx:107`
> `Agis comme un ${role} expert. Rédige ton analyse clinique, tes 3 hypothèses et ton plan de traitement impérativement en français médical professionnel.`

Triplet explicit : analyse clinique + 3 hypothèses + plan de traitement. Triple coche Règle 11 MDR.

**🔴 [09]** `src/components/BilanAnalyseIA.tsx:174`
> `Agis comme un ${role} expert. Tu as déjà produit une analyse clinique (...) Ajuste les probabilités des hypothèses, le diagnostic principal et le plan de traitement en conséquence.`

Le prompt de raffinement explicite « probabilités des hypothèses », « diagnostic principal », « plan de traitement ».

**🔴 [10]** `src/components/BilanEvolutionIA.tsx:74`
> `Tu es un ${role} expert en rédaction de rapports cliniques, chargé de produire un rapport d'évolution adressé à un médecin prescripteur.`

Livrable adressé au médecin prescripteur — destinataire externe — produit par un système qualifié « expert ».

**🔴 [11]** `src/components/BilanNoteIntermediaire.tsx:96`
> `Agis comme un ${roleTitle(profession)} expert. Tu as déjà produit une note diagnostique intermédiaire`

« Note diagnostique » est le livrable nommé.

### 2.2 — UI clinique exposée au thérapeute

**🔴 [12]** `src/components/BilanAnalyseIA.tsx:357-374`
> `<div className="ai-diagnostic-box">` (l. 357)
> `<h4 style={{ color: '#166534' }}>Hypothèses cliniques</h4>` (l. 374)

Libellé d'interface « Hypothèses cliniques » directement visible par l'utilisateur. Une boîte visuelle « ai-diagnostic-box » est rendue.

**🔴 [13]** `src/components/BilanNoteIntermediaire.tsx:144, 165, 175, 228, 238, 241, 328, 356`
> `<h2 className="title-section">Note diagnostique</h2>` (l. 144)
> `<h4>Note diagnostique intermédiaire</h4>` (l. 165)
> `<div className="ai-diagnostic-box" style={{ borderLeft: '4px solid #ea580c' }}>` (l. 241)
> `Générer la note diagnostique` (l. 356, label de bouton)

Libellé répété « Note diagnostique » sur écran + bouton d'action.

**🔴 [14]** `src/App.tsx:3382, 3417`
> `{/* ── Note diagnostique intermédiaire step ────── */}`
> `showToast('Note diagnostique générée', 'success')`

Notification utilisateur confirme « Note diagnostique générée ».

### 2.3 — Documents juridiques publiés (visibles patient/autorité)

**🔴 [15]** `docs/legal/politique-confidentialite.md:355-356`
> `suggestions générées par l'IA (analyses cliniques, hypothèses diagnostiques, courriers, transcriptions)`

Document **publié** (footer site + onboarding selon `docs/legal/README.md` ligne 22). Énumère explicitement « analyses cliniques » et « hypothèses diagnostiques » comme produits par l'IA. C'est la déclaration la plus dommageable du corpus côté finalité.

**🔴 [16]** `docs/legal/information-patient.md:75-83`
> `votre dossier peut être analysé par des outils d'IA (Claude d'Anthropic, Whisper d'OpenAI) après pseudonymisation préalable (...) — l'IA produit des suggestions d'analyse, de plan de soins ou de courrier que votre Praticien vérifie, corrige et signe systématiquement.`

Notice **adressée au patient** (art. 13 RGPD). Mentionne « plan de soins » produit par l'IA. Adressée au public, donc finalité revendiquée auprès du destinataire final.

### 2.4 — Output direct (rendu PDF, exemple in-prompt)

**🔴 [17]** `src/App.tsx:1754-1758` (exemple intégré au prompt PDF)
> `### 7. Synthèse diagnostique\nLe tableau clinique est celui d'une douleur lombaire intermittente (...) oriente vers une douleur d'origine non spécifique. La douleur palpatoire bilatérale du moyen fessier ainsi que la douleur inguinale gauche aux positions assises prolongées évoquent une participation myofasciale et une possible composante de la hanche, qui mériteront d'être précisées lors du suivi.`

Cet exemple **fait partie du prompt** (few-shot) et démontre le style de raisonnement diagnostique attendu : « oriente vers », « évoquent une participation myofasciale », « possible composante de la hanche ». C'est in fine le livrable type que le système est entraîné à produire.

**🔴 [18]** `src/utils/clinicalPrompt.ts:1564` (texte de la section 9 imposée)
> `**9. Conclusion** — **Conclusion courte adressée au médecin prescripteur, 2 à 3 phrases maximum**. Elle synthétise le tableau clinique (diagnostic de travail + éléments saillants) et mentionne l'orientation thérapeutique engagée, ainsi qu'une éventuelle demande ponctuelle (imagerie complémentaire, avis spécialisé, renouvellement d'ordonnance).`

Conclusion contient « diagnostic de travail » + « orientation thérapeutique engagée » + « demande d'imagerie / avis spécialisé / renouvellement d'ordonnance » → **influence directement la décision diagnostique et thérapeutique du médecin prescripteur** — déclencheur Règle 11.

---

## 3. Citations classées 🟡 (ambigu)

**🟡 [01]** `docs/legal/README.md:104`
> `Envoi pseudonymisé à Claude / Whisper | Sous-traitance encadrée + intérêt légitime aide diagnostic | art. 28 RGPD`

Tableau des bases légales — mention « aide diagnostic ». Document à diffusion interne mais checked-in repo ; visible audit autorité.

**🟡 [02]** `docs/legal/cgu-praticien.md:104-110`
> `Les suggestions générées par l'IA (analyses, courriers, plans de soins, transcriptions) sont des outils d'aide à la rédaction.`

CGU acceptées par praticien. Mentionne « plans de soins » comme livrable IA, mais qualifie en aide à la rédaction. Lecture combinée requise.

**🟡 [03]** `docs/legal/dpa-praticien.md:60-61`
> `Génération assistée de contenus (analyses, courriers, transcriptions)`

DPA — formulation neutre mais « analyses » reste flou.

**🟡 [04]** `docs/legal/aipd.md:42-45, 60`
> `bénéficier de suggestions d'analyse, de plan de soins et de courriers générées par intelligence artificielle`
> `analyse pseudonymisée Claude (synthèse, plan de soins, courrier)`

AIPD — document interne mais présentable à la CNIL. Mentionne explicitement « plan de soins » et « analyse ».

**🟡 [05]** `docs/knode-logos.html:174-261`
> `PHYSIOTHERAPY · AI` / `AI PHYSIOTHERAPY` (variations de logos)

Marketing branding qui associe explicitement « AI » et « PHYSIOTHERAPY ». L'association d'une IA à l'acte de physiothérapie est un signal de finalité, sans claim explicite mais à porté commerciale.

**🟡 [06]** `src/App.tsx:130`
> `description: 'Ici, votre bilan clinique optimisé pour la zone concernée — infos générales, douleur, examen et conseils.'`

Tutoriel — « bilan clinique optimisé » : mot « optimisé » applicable au workflow UX, mais collé à « bilan clinique » crée une ambiguïté.

**🟡 [07]** `src/App.tsx:639`
> `Tu es un kinésithérapeute expert. À partir de la dictée du thérapeute, génère la liste des exercices à domicile structurés en JSON.`

Identité « expert » + livrable « exercices à domicile ». Reformulation depuis dictée → 🟡 plutôt que 🔴 car l'input est dicté par le thérapeute.

**🟡 [08]** `src/App.tsx:3766`
> `Tu es un kinésithérapeute expert. Génère une synthèse clinique de fin de prise en charge.`

« Synthèse clinique » — livrable à valeur clinique mais formulé comme synthèse rédactionnelle.

**🟡 [09]** `src/App.tsx:3807`
> `Tu es un kinésithérapeute expert. Génère des recommandations de fin de prise en charge.`

« Recommandations de fin de prise en charge » — livrable IA à destination du patient via courrier de sortie.

**🟡 [10]** `src/components/BilanSortie.tsx:682, 762`
> Boutons UI : `Créer la synthèse clinique` / `Créer les recommandations`

Verbes d'action utilisateur générant les livrables IA ci-dessus.

**🟡 [11]** `src/components/BilanEvolutionIA.tsx:507`
> Bouton UI : `Générer le rapport d'évolution`

Adressé au médecin prescripteur (cf. [10] 🔴 supra pour le prompt).

**🟡 [12]** `src/utils/letterPrompts.ts:99`
> `Tu es un ${titre} francophone expérimenté` (rédaction de courriers à médecin prescripteur)

Identité « expérimentée » plus prudente que « expert ». Courriers de description / orientation / demande d'imagerie → contiennent un raisonnement clinique mais en relais du thérapeute.

**🟡 [13]** `src/utils/letterPrompts.ts:281`
> `Explique brièvement en quoi le résultat de l'imagerie permettra d'orienter la suite de la prise en charge (adaptation thérapeutique, indication chirurgicale, exclusion d'un diagnostic différentiel).`

Prompt courrier « demande imagerie » — discute « indication chirurgicale » et « diagnostic différentiel » dans la justification rédigée.

**🟡 [14]** `src/components/FicheExerciceIA.tsx:125`
> `Tu es un ${role} expert en biomécanique et en rééducation fonctionnelle. Ton rôle est de traduire un plan de traitement technique en une fiche d'exercices à domicile claire, professionnelle et sécurisée.`

Expert + plan de traitement, mais finalité = traduction en fiche pratique → mid-risk.

**🟡 [15]** `src/components/FicheExerciceIA.tsx:488`
> `Décrivez ce que vous avez travaillé ou ce que vous souhaitez prescrire. Laissez vide pour un programme automatique basé sur le diagnostic.`

UI — « programme automatique basé sur le diagnostic » : phrase implique le système peut produire un programme à partir d'un diagnostic.

**🟡 [16]** `src/components/database/DatabasePage.tsx:1421`
> `Tu es un kinésithérapeute expert. Analyse la séance actuelle dans le contexte de tout l'historique COMPLET du patient (bilans, bilans intermédiaires, séances précédentes, analyses IA, exercices prescrits).`

Expert + verbe « analyse » + contexte historique complet — formulation à risque mais output non précisé ici.

**🟡 [17]** `src/components/BilanAnalyseIA.tsx:248, 455`
> `À titre indicatif — le diagnostic clinique reste du ressort du thérapeute.` (l. 248)
> `Cette analyse est fournie à titre indicatif et ne remplace pas le jugement clinique du professionnel de santé.` (l. 455)

Disclaimers UI prudents — reconnaissent implicitement que l'analyse est de nature clinique, ce qui contredit le discours « pas DM ». Le disclaimer n'efface pas la qualification MDR si la finalité réelle est clinique.

---

## 4. Citations classées 🟢 (neutre / réducteur MDR)

**🟢 [01]** `docs/legal/mentions-legales.md:136-159` (Section 6 — Statut DM)
> `L'application est qualifiée par l'Éditeur d'OUTIL DOCUMENTAIRE ET BUREAUTIQUE à destination des professionnels de santé. Elle ne constitue pas un dispositif médical au sens du règlement (UE) 2017/745. Elle ne pose pas de diagnostic, n'émet pas de recommandation thérapeutique contraignante, et ne se substitue pas au jugement clinique du Praticien.`

Disclaimer non-DM le plus explicite du corpus. C'est la pièce centrale du discours juridique de surface.

**🟢 [02]** `src/App.tsx:1339` (counter-prompt PDF « Bilan PDF »)
> `Tu ne fais AUCUN diagnostic, AUCUNE hypothèse diagnostique, AUCUN plan de traitement, AUCUNE recommandation thérapeutique.`

Counter-prompt très explicite — appliqué uniquement au prompt « mise au propre » (PDF de bilan brut), **pas au prompt « Analyse IA »** (cf. 🔴 [05]) ni au prompt « PDF analyse » (cf. 🔴 [03]). À noter : ce counter-prompt **n'est pas global** — il n'annule pas les prompts « expert » des autres branches.

**🟢 [03]** `src/App.tsx:1345`
> `PAS de section "Diagnostic", PAS de "Plan de traitement", PAS de "Conclusion" ou "Synthèse diagnostique".`

Idem — applicable uniquement à la branche « Bilan PDF mise au propre ».

**🟢 [04]** `docs/app-store-conditions.html:380`
> `KNODE est un outil de documentation clinique à usage professionnel. Il n'effectue aucun diagnostic et ne remplace pas le jugement clinique du thérapeute.`

Positionnement officiel **recommandé** (document interne stratégique). Conforme au discours juridique.

**🟢 [05]** `docs/app-store-conditions.html:375`
> `En cadrant KNODE comme un outil de documentation professionnelle plutôt que comme un outil de décision clinique, la classification MDR peut être évitée dans un premier temps.`

Cite la stratégie : « éviter la classification MDR » par positionnement. Document interne, mais traceable.

**🟢 [06]** `docs/legal/cgu-praticien.md:41-44`
> `outil documentaire et bureautique`

Aligné avec mentions légales §6.

**🟢 [07]** `public/manifest.json` + `vite.config.ts:378-380`
> `"description": "Application de bilans en physiothérapie"`

Métadonnée PWA neutre — pas de claim clinique.

**🟢 [08]** `package.json`
> `"name": "physio-app"` — pas de champ description.

Neutre.

**🟢 [09]** `index.html:18`
> `<title>Physio App</title>`

Neutre.

**🟢 [10]** `docs/legal/cookies.md` (intégral)

Aucune revendication de finalité clinique.

**🟢 [11]** `src/utils/voiceBilanClient.ts:61, 281`
> `Tu es un assistant de rédaction pour un kinésithérapeute` (l. 61)
> `Tu es un assistant qui aide un kinésithérapeute à remplir un bilan clinique` (l. 281)

Formulations « assistant de rédaction » / « aide à remplir » — finalité documentaire, pas clinique. (Ces deux prompts coexistent avec le 🔴 [07] sur la même classe `voiceBilanClient.ts:358`.)

---

## 5. Tension structurelle observée

Le corpus présente une **incohérence systémique** entre :

- **Couche A — discours juridique de surface** (`mentions-legales.md §6`, `cgu-praticien.md §3.2`, `app-store-conditions.html`, counter-prompt `App.tsx:1339`) : revendique « outil documentaire et bureautique, AUCUN diagnostic ».
- **Couche B — discours technique opérationnel** (prompts LLM dans `clinicalPrompt.ts`, `BilanAnalyseIA.tsx`, `BilanEvolutionIA.tsx`, `BilanNoteIntermediaire.tsx`, méta-prompt PDF `App.tsx:1448-1834`, UI `BilanAnalyseIA.tsx:357-374`, UI `BilanNoteIntermediaire.tsx:144`) : « expert en musculo-squelettique », « analyse clinique », « hypothèses cliniques », « note diagnostique », « plan de traitement », « synthèse diagnostique », « projet thérapeutique ».
- **Couche C — discours patient/régulateur** (`information-patient.md:75-83`, `politique-confidentialite.md:355-356`) : reconnaît « hypothèses diagnostiques », « plan de soins », « analyses cliniques » produits par l'IA.

Au sens MDCG 2019-11 §2.3, la finalité d'usage déclarée par le fabricant inclut **l'ensemble** de la documentation publique et opérationnelle, sans hiérarchie. La couche A ne « masque » pas les couches B et C.

---

## 6. Annexes

### Annexe A — Inventaire des prompts LLM (= documentation fabricant)

| Fichier | Ligne | Identité système | Livrable nommé | Classe |
|---|---|---|---|---|
| `src/utils/clinicalPrompt.ts` | 178 | « ${role} expert en musculo-squelettique » | « évaluation précise et personnalisée » | 🔴 |
| `src/utils/clinicalPrompt.ts` | 811 | « ${roleTitle} expert en musculo-squelettique » | « note diagnostique intermédiaire » | 🔴 |
| `src/utils/clinicalPrompt.ts` | 1067-1834 (méta-prompt PDF) | (assistant rédacteur) | sections 7-9 imposées : « Synthèse diagnostique », « Projet thérapeutique », « Conclusion (diagnostic de travail) » | 🔴 |
| `src/components/BilanAnalyseIA.tsx` | 107 | « ${role} expert » | « analyse clinique, 3 hypothèses, plan de traitement » | 🔴 |
| `src/components/BilanAnalyseIA.tsx` | 174 | « ${role} expert » | « probabilités hypothèses, diagnostic principal, plan de traitement » | 🔴 |
| `src/components/BilanEvolutionIA.tsx` | 74 | « ${role} expert en rédaction de rapports cliniques » | « rapport d'évolution adressé à un médecin prescripteur » | 🔴 |
| `src/components/BilanNoteIntermediaire.tsx` | 51 | « ${roleTitle} expert » | « priseEnChargeAjustee » + alertes cliniques | 🔴 |
| `src/components/BilanNoteIntermediaire.tsx` | 96 | « ${roleTitle} expert » | « note diagnostique intermédiaire » | 🔴 |
| `src/utils/voiceBilanClient.ts` | 61 | « assistant de rédaction » | (rédaction pure) | 🟢 |
| `src/utils/voiceBilanClient.ts` | 281 | « assistant qui aide à remplir un bilan » | (remplissage) | 🟢 |
| `src/utils/voiceBilanClient.ts` | 358 | « physiothérapeute expert » | « comptes rendus cliniques professionnels » | 🔴 |
| `src/utils/letterPrompts.ts` | 99 | « ${titre} francophone expérimenté » | courriers (description/orientation/imagerie) | 🟡 |
| `src/utils/letterPrompts.ts` | 281 | (idem) | « indication chirurgicale, diagnostic différentiel » dans demande imagerie | 🟡 |
| `src/components/FicheExerciceIA.tsx` | 125 | « ${role} expert en biomécanique et rééducation fonctionnelle » | « fiche d'exercices à domicile » | 🟡 |
| `src/components/database/DatabasePage.tsx` | 1421 | « kinésithérapeute expert » | « analyse séance contexte historique complet » | 🟡 |
| `src/App.tsx` | 639 | « kinésithérapeute expert » | « liste exercices à domicile JSON » | 🟡 |
| `src/App.tsx` | 1332-1346 (counter-prompt) | (assistant rédacteur) | « PAS de Diagnostic, PAS de Plan de traitement, PAS de Synthèse diagnostique » | 🟢 |
| `src/App.tsx` | 1376-1834 (PDF analyse) | rédacteur expert | « bilan diagnostic physiothérapique pour médecin prescripteur » | 🔴 |
| `src/App.tsx` | 3766 | « kinésithérapeute expert » | « synthèse clinique fin de prise en charge » | 🟡 |
| `src/App.tsx` | 3807 | « kinésithérapeute expert » | « recommandations de fin de prise en charge » | 🟡 |

**Constat clé** : sur 17 prompts système LLM identifiés, **8 utilisent l'identité « expert »**, **6 produisent des livrables nommés cliniquement** (« note diagnostique », « analyse clinique », « hypothèses », « plan de traitement », « synthèse diagnostique », « rapport d'évolution »), **1 contre-prompt** annule certaines branches (`App.tsx:1339`) mais pas l'ensemble.

### Annexe B — Métadonnées de l'application (PWA + marketing)

| Surface | Ligne | Texte | Classe |
|---|---|---|---|
| `package.json` | — | `"name": "physio-app"` (pas de description) | 🟢 |
| `index.html` | 18 | `<title>Physio App</title>` | 🟢 |
| `public/manifest.json` | — | `"name": "Physio App"`, `"description": "Application de bilans en physiothérapie"` | 🟢 |
| `vite.config.ts` | 378-380 | (idem manifest) | 🟢 |
| `docs/knode-logos.html` | 174-261 | « PHYSIOTHERAPY · AI » / « AI PHYSIOTHERAPY » (logos brand) | 🟡 |
| `docs/app-store-conditions.html` | 375-380 | « outil de documentation clinique à usage professionnel. Il n'effectue aucun diagnostic » | 🟢 |
| `docs/app-store-conditions.html` | 360 | « Scores EVN, tests cliniques, objectifs SMART → documentation + aide à la décision » | 🟡 (le terme « aide à la décision » apparaît dans un doc interne) |

### Annexe C — Documents juridiques publiés : déclarations de finalité

| Fichier | §/ligne | Texte | Classe |
|---|---|---|---|
| `docs/legal/mentions-legales.md` | §6 (l. 136-159) | « OUTIL DOCUMENTAIRE ET BUREAUTIQUE (...) ne constitue pas un dispositif médical (...) ne pose pas de diagnostic » | 🟢 |
| `docs/legal/cgu-praticien.md` | l. 41-44 | « outil documentaire et bureautique » | 🟢 |
| `docs/legal/cgu-praticien.md` | l. 104-110 | « suggestions générées par l'IA (analyses, courriers, plans de soins, transcriptions) sont des outils d'aide à la rédaction » | 🟡 |
| `docs/legal/politique-confidentialite.md` | l. 355-356 | « suggestions générées par l'IA (analyses cliniques, hypothèses diagnostiques, courriers, transcriptions) » | 🔴 |
| `docs/legal/information-patient.md` | l. 75-83 | « l'IA produit des suggestions d'analyse, de plan de soins ou de courrier » (adressé au patient) | 🔴 |
| `docs/legal/dpa-praticien.md` | l. 60-61 | « Génération assistée de contenus (analyses, courriers, transcriptions) » | 🟡 |
| `docs/legal/aipd.md` | l. 42-45, 60 | « bénéficier de suggestions d'analyse, de plan de soins » / « analyse pseudonymisée Claude (synthèse, plan de soins, courrier) » | 🟡 (interne mais opposable autorité) |
| `docs/legal/cgv.md` | — | (aucune mention de finalité clinique) | 🟢 |
| `docs/legal/cookies.md` | — | (aucune mention de finalité clinique) | 🟢 |
| `docs/legal/README.md` | l. 104 | « intérêt légitime aide diagnostic » | 🟡 |

---

## 7. Pistes de remédiation textuelle (pour le volet « plan d'action »)

Hors périmètre d'audit textuel pur — listées ici pour mémoire, à valider par juriste :

1. **Aligner les prompts LLM sur le discours juridique** : retirer les identités « expert en musculo-squelettique » / « physiothérapeute expert », remplacer par « assistant de rédaction documentaire ». Renommer « note diagnostique » → « note de synthèse rédigée à partir des données saisies ». Retirer la production forcée d'« hypothèses » + « plan de traitement » + « synthèse diagnostique » des prompts d'output principal.
2. **Renommer les libellés UI** : `BilanAnalyseIA.tsx:374` « Hypothèses cliniques » → « Pistes de réflexion saisies » ; `BilanNoteIntermediaire.tsx:144` « Note diagnostique » → « Note de synthèse intermédiaire » ; `ai-diagnostic-box` → `ai-summary-box`.
3. **Corriger `politique-confidentialite.md:355-356`** : retirer « analyses cliniques, hypothèses diagnostiques » → « aide à la rédaction de courriers et de comptes rendus » (au prix d'une perte d'exhaustivité que l'art. 13 RGPD ne demande pas — cf. juriste).
4. **Corriger `information-patient.md:75-83`** : retirer « plan de soins » → « courriers et comptes rendus structurés à partir des notes du Praticien ».
5. **Étendre le counter-prompt** `App.tsx:1339` (« AUCUN diagnostic, AUCUNE hypothèse diagnostique, AUCUN plan de traitement ») à **toutes** les branches LLM, pas seulement « Bilan PDF mise au propre ».
6. **Modifier `clinicalPrompt.ts:1529-1564`** : retirer « Synthèse diagnostique » + « Projet thérapeutique » du PDF — ou les rebaptiser « Synthèse rédactionnelle » / « Cadre de la prise en charge » sans raisonnement diagnostique avec différentiels.

---

> Fin du volet 02. Volet suivant prévu : **03 — qualification juridique au regard de la Règle 11 MDR + Annexe VIII**, à réaliser après remédiation textuelle ou pour figer l'état initial avant lancement.

// ─── Lexique clinique partagé ────────────────────────────────────────────────
// Source unique de vocabulaire kiné/physio injecté dans les prompts AI
// (Whisper, reformulation Claude, extraction Claude, PDF clinique).
//
// Mise à jour : ajouter ici plutôt qu'inliner dans les prompts — chaque prompt
// importe les constantes pertinentes et les sérialise dans son texte système.

// ─── Tests cliniques par zone (catalogue de reconnaissance) ──────────────────
// Inclut les synonymes oraux les plus fréquents. Les noms propres conservent
// leur orthographe officielle (Lasègue avec accent grave, Maitland, etc.).

export const TESTS_PAR_ZONE = {
  lombaireSI:
    "Lasègue (SLR — Straight Leg Raise), Lasègue inversé (Léri / Prone Knee Bend / PKB), " +
    "Slump test, Cluster de Laslett, Cluster de Sultive, Extension-Rotation, " +
    "Prone Instability Test, FABER (Patrick), Gaenslen, thigh thrust, " +
    "compression sacro-iliaque, distraction sacro-iliaque, sacral thrust, push-pull, " +
    "Adam (Test TA), Schober, distance doigts-sol (DDS)",

  cervical:
    "Spurling (compression cervicale), Distraction cervicale, ULNT 1/2a/2b/3 " +
    "(Upper Limb Neural Tension Test ; ex-ULTT), Adson, Roos (EAST), " +
    "Sharp-Purser, test de l'alar, test de Wright, Valsalva, " +
    "distance menton-sternum, distance occiput-mur",

  hanche:
    "FADIR, FABER, Thomas (flessum de hanche), Ober (TFL), Trendelenburg, " +
    "log roll, scour test, Stinchfield, hop test",

  genou:
    "Lachman, tiroir antérieur, tiroir postérieur, pivot shift (ressaut rotatoire), " +
    "McMurray, Apley grinding, Thessaly, valgus stress (LCM) à 0° et 30°, " +
    "varus stress (LCL) à 0° et 30°, Slocum, Noble, Renne, Zohlen, " +
    "signe du rabot, glaçon rotulien (choc rotulien), test d'appréhension rotulienne, " +
    "Hoffa, Ottawa Knee Rules",

  chevillePied:
    "Tiroir antérieur de cheville, talar tilt varus, talar tilt valgus, Kleiger, " +
    "Squeeze test, Translation fibulaire, Impaction, Thompson (rupture du tendon " +
    "calcanéen / Achille), Ottawa Ankle Rules, Windlass, Jack test, Mulder, " +
    "LFH, Molloy, Foot Lift, BESS, Y-Balance, ALTD, RALTD, HEER, ABD-HEER",

  epaule:
    "Hawkins (Hawkins-Kennedy), Neer, Jobe (empty can), full can, Patte, " +
    "lift-off de Gerber, belly press, bear hug, drop arm, Yocum, Speed, Yergason, " +
    "O'Brien, cross-body (cross-arm), Apley scratch, sulcus sign, " +
    "load and shift, relocation test, apprehension test (test de l'armé), " +
    "Rowe, Gagey (hyperabduction), arc douloureux (painful arc), " +
    "external rotation lag sign, internal rotation lag sign, palpation AC, " +
    "abduction horizontale résistée, jerk test, test du conflit, " +
    "test de compression-rotation pour SLAP",

  coudePoignetMain:
    "Cozen, Maudsley, Mill, Tinel, Phalen, Phalen inversé, Finkelstein " +
    "(De Quervain), Watson scaphoid shift, Froment, Allen test",

  drainageVasculaire:
    "Stemmer, signe du godet",

  vestibulaire:
    "Dix-Hallpike, manœuvre de Semont, manœuvre d'Epley, Romberg, Romberg sensibilisé",
} as const

// ─── Pièges phonétiques fréquents (transcription orale → graphie correcte) ──
// Utilisé par la reformulation Claude pour corriger les erreurs phonétiques
// systématiques de Whisper.

export const PIEGES_PHONETIQUES = `
- « cyatique », « scia » → sciatique / nerf ischiatique
- « épidoyle », « épicondoyle » → épicondyle (jamais « épidoyle »)
- « épitroquelée » → épitrochlée
- « rotullienne », « rotuliène » → rotulienne
- « patellère » → patellaire
- « ménissal » → méniscal
- « strapine » → strapping
- « kinéphèse » → kinésithèse / kinesthésie
- « bobas » → Bobath
- « kabbat » → Kabat
- « mézière », « méziaire » → Mézières
- « mac kenzie », « mac quenzie » → McKenzie
- « malaitlande » → Maitland
- « moulighan », « mulligane » → Mulligan
- « soya » → Sohier
- « scaroïde » → scaphoïde
- « stroïde » → sterno-claviculaire (ou sterno-cléido-mastoïdien selon contexte)
- « lasègue » sans accent → Lasègue (toujours avec accent grave)
- « romber » → Romberg
- « hawkings » → Hawkins
- « lashmane », « lachemane » → Lachman
- « néer » → Neer
- « baban-ski » → Babinski
- « ténis elbo » → tennis elbow
- « koïffe », « colite des rotateurs » → coiffe des rotateurs
- « fasceau » → faisceau
- « anti-flexion » → antéflexion
- « rétro-flexion » → rétroflexion
- « kapsulite » → capsulite
- « bourssite » → bursite
- « tibialiste postérieur » → tibial postérieur
- « gastronomiens » → gastrocnémiens
- « hischio », « ichio » → ischio (radical)
- « illio-psoas » → ilio-psoas
- « infraspinatus / supraspinatus » → infra-épineux / supra-épineux
- « tens » (machine) → TENS (en majuscules)
- « femoroteviale » → fémoro-tibiale
- « tibioteursienne » → tibio-tarsienne
- « lombostate » → lombostat
- « cervicalérgie » → cervicalgie
`.trim()

// ─── Méthodes / écoles à transcrire avec orthographe officielle ──────────────

export const METHODES_NOMS_PROPRES =
  "Mézières, McKenzie (MDT), Maitland, Mulligan, Sohier, Niromathé, Busquet, " +
  "GDS (Godelieve Denys-Struyf), RPG / Souchard, Pilates clinique, Bobath (NDT), " +
  "Kabat (PNF), Perfetti, Brunnström, Vojta, Le Métayer, Padovan, Caufriez " +
  "(hypopressive), Bonnefoy, CGE, Halliwick, Watsu, Feldenkrais, Alexander, " +
  "Schroth, drainage autogène, ELTGOL, AFE, Vodder, Leduc, Cyriax (MTP)"

// ─── Abréviations standard (à reconnaître et restituer en majuscules) ────────
// Format texte exploité par les prompts : groupes thématiques séparés.

export const ABREVIATIONS_CLINIQUES =
  "MK (masseur-kinésithérapeute), MS/MSD/MSG (membre supérieur, droit, gauche), " +
  "MI/MID/MIG (membre inférieur, droit, gauche), D/G (droit/gauche), " +
  "DD/DV/DL (décubitus dorsal/ventral/latéral), AA/AP (amplitude active/passive), " +
  "CCO/CCF (chaîne cinétique ouverte/fermée), ROT (réflexes ostéo-tendineux), " +
  "AVQ/AIVQ (activités de la vie quotidienne / instrumentales), DM (dérouillage matinal), " +
  "ATCD (antécédent), AINS (anti-inflammatoire non stéroïdien), CI (contre-indication), " +
  "HDM (histoire de la maladie), DDS (distance doigts-sol), CR (compte-rendu), " +
  "EVA/EN/EVS (échelles douleur), PEC (prise en charge), PMA (périmètre de marche), " +
  "TM6 / 6MWT (test de marche 6 min), TUG (Timed Up and Go), ROM (range of motion)"

export const ABREVIATIONS_PATHOLOGIES =
  "LCA/LCP/LLI/LLE (ligaments croisés ant./post., latéraux interne/externe), " +
  "AVC/AIT (accident vasculaire cérébral / ischémique transitoire), " +
  "TC/TCE (traumatisme crânien / crânio-encéphalique), " +
  "SEP/SLA (sclérose en plaques / latérale amyotrophique), " +
  "BPCO (bronchopneumopathie chronique obstructive), " +
  "VPPB (vertige paroxystique positionnel bénin), " +
  "SDRC (syndrome douloureux régional complexe), " +
  "NCB (névralgie cervico-brachiale), TMS (troubles musculo-squelettiques), " +
  "PR (polyarthrite rhumatoïde), SPA (spondylarthrite ankylosante), " +
  "PTH/PTG/PTE (prothèse totale de hanche/genou/épaule), " +
  "PUC (prothèse uni-compartimentaire), DIM (dérangement intervertébral mineur), " +
  "TOS (thoracic outlet syndrome), CF (conflit fémoro-acétabulaire), " +
  "TFL (tenseur du fascia lata), SCM (sterno-cléido-mastoïdien), " +
  "IJ/HSI (ischio-jambiers / hamstring strain injury), " +
  "DDB (dilatation des bronches), VNI (ventilation non invasive), " +
  "IUE (incontinence urinaire d'effort)"

export const ABREVIATIONS_ADMINISTRATIVES =
  "BDK (bilan diagnostic kinésithérapique), NGAP (Nomenclature Générale des Actes " +
  "Professionnels), DAP (demande d'accord préalable), AMK/AMS/AMC/AMI (cotations), " +
  "IFD/IK (indemnités de déplacement / kilométriques), DMP (Dossier Médical Partagé), " +
  "CPS (Carte de Professionnel de Santé), ALD (Affection Longue Durée), " +
  "HAS (Haute Autorité de Santé), EBM/EBP (evidence-based medicine/practice), " +
  "CIF (Classification Internationale du Fonctionnement), ETP (éducation " +
  "thérapeutique du patient), MPR (Médecine Physique et de Réadaptation), " +
  "SSR (Soins de Suite et de Réadaptation), HAD (Hospitalisation à Domicile)"

// ─── Bloc compact pour Whisper (budget ≤ 224 tokens) ─────────────────────────
// Whisper biaise vers les noms propres présents dans le prompt — privilégier
// les éponymes les plus mal transcrits + acronymes courants.
//
// Mesuré ~210 tokens : reste sous le plafond.

export const WHISPER_VOCAB_PROMPT =
  "Vocabulaire kinésithérapie : Lasègue, Lachman, Spurling, Hawkins, Neer, Jobe, " +
  "McMurray, Thessaly, FABER, FADIR, Thomas, Ober, Trendelenburg, Slump, ULNT, " +
  "Schober, Romberg, Phalen, Tinel, Finkelstein, Cozen, Mill, Babinski, Mézières, " +
  "McKenzie, Maitland, Mulligan, Sohier, Bobath, Kabat, Cyriax. " +
  "Coiffe des rotateurs, supra-épineux, infra-épineux, sub-scapulaire, " +
  "sterno-cléido-mastoïdien, ischio-jambiers, ilio-psoas, gastrocnémiens, " +
  "scaphoïde, épicondyle, épitrochlée, fémoro-tibiale, tibio-tarsienne, " +
  "sacro-iliaque, capsulite, tendinopathie, sciatique. " +
  "EVA, EVN, PSFS, HAD, DN4, DASH, KOOS, WOMAC, NDI, MRC, ROM, PEC, BDK, " +
  "LCA, LCP, AVC, BPCO, VPPB, SDRC, NCB, TMS, PTH, PTG, TFL, IUE, TENS, IRM."

// ─── Bloc complet pour prompts Claude (pas de contrainte de tokens) ──────────

export const CLINICAL_LEXICON_FULL = `
TESTS CLINIQUES — noms propres à reconnaître et reproduire verbatim :
• Lombaire / sacro-iliaque : ${TESTS_PAR_ZONE.lombaireSI}.
• Cervical : ${TESTS_PAR_ZONE.cervical}.
• Hanche : ${TESTS_PAR_ZONE.hanche}.
• Genou : ${TESTS_PAR_ZONE.genou}.
• Cheville / pied : ${TESTS_PAR_ZONE.chevillePied}.
• Épaule : ${TESTS_PAR_ZONE.epaule}.
• Coude / poignet / main : ${TESTS_PAR_ZONE.coudePoignetMain}.
• Drainage / vasculaire : ${TESTS_PAR_ZONE.drainageVasculaire}.
• Vestibulaire : ${TESTS_PAR_ZONE.vestibulaire}.

MÉTHODES / ÉCOLES (orthographe officielle imposée) : ${METHODES_NOMS_PROPRES}.

ABRÉVIATIONS CLINIQUES : ${ABREVIATIONS_CLINIQUES}.
ABRÉVIATIONS PATHOLOGIES : ${ABREVIATIONS_PATHOLOGIES}.
ABRÉVIATIONS ADMINISTRATIVES : ${ABREVIATIONS_ADMINISTRATIVES}.

PIÈGES PHONÉTIQUES — corrections systématiques attendues :
${PIEGES_PHONETIQUES}
`.trim()

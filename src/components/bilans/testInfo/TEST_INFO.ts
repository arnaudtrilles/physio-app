export interface TestInfo {
  title: string
  description: string
  realisation: string
  interpretation: string
}

export const TEST_INFO: Record<string, TestInfo> = {
  // ─── RACHIS CERVICAL ─────────────────────────────────────────────────────
  spurling: {
    title: 'Spurling test',
    description: "Test de provocation pour radiculopathie cervicale. Il vise à reproduire une douleur radiculaire par compression du foramen intervertébral.",
    realisation: "Patient assis. Le thérapeute place le rachis cervical en extension, inclinaison et rotation homolatérale, puis applique une compression axiale sur le sommet du crâne.",
    interpretation: "Positif si reproduction de la douleur radiculaire irradiant dans le membre supérieur du côté testé. Négatif si aucune douleur radiculaire reproduite.",
  },
  distraction: {
    title: 'Distraction test',
    description: "Test de soulagement pour radiculopathie cervicale. Il vise à diminuer les symptômes radiculaires par décompression des foramens.",
    realisation: "Patient assis ou en décubitus dorsal. Le thérapeute applique une traction axiale sur la tête du patient en saisissant la mastoïde et l'occiput.",
    interpretation: "Positif si diminution ou disparition des symptômes radiculaires lors de la traction. Négatif si aucun changement des symptômes.",
  },
  adson: {
    title: 'Adson test',
    description: "Test pour le syndrome du défilé thoraco-brachial (compression de l'artère sous-clavière par les scalènes).",
    realisation: "Patient assis, bras le long du corps. Le thérapeute palpe le pouls radial. On demande au patient de tourner la tête du côté testé, de faire une extension cervicale et une inspiration profonde.",
    interpretation: "Positif si diminution ou disparition du pouls radial et/ou reproduction des symptômes. Négatif si le pouls reste présent et aucun symptôme reproduit.",
  },
  roos: {
    title: 'Roos test (EAST)',
    description: "Test de provocation pour le syndrome du défilé thoraco-brachial.",
    realisation: "Patient assis, épaules à 90° d'abduction, coudes à 90° de flexion, paumes vers l'avant. Le patient ouvre et ferme les mains pendant 3 minutes.",
    interpretation: "Positif si reproduction des symptômes (lourdeur, paresthésies, pâleur, fatigue du membre supérieur) ou incapacité à maintenir la position 3 minutes. Négatif si test complété sans symptôme.",
  },
  hoffman: {
    title: 'Hoffman',
    description: "Test des signes de la voie pyramidale (atteinte du motoneurone supérieur) au membre supérieur.",
    realisation: "Le thérapeute maintient le majeur du patient en extension, puis effectue une pichenette brusque sur l'ongle du majeur (flexion rapide de la phalange distale puis relâchement).",
    interpretation: "Positif si flexion réflexe du pouce et de l'index. Négatif si absence de réponse réflexe.",
  },
  tromner: {
    title: 'Tromner',
    description: "Variante du test de Hoffman pour les signes pyramidaux au membre supérieur.",
    realisation: "Le thérapeute maintient le majeur du patient. Il percute la pulpe de la phalange distale du majeur par en dessous avec son doigt.",
    interpretation: "Positif si flexion réflexe du pouce et de l'index. Négatif si absence de réponse réflexe.",
  },
  nerfMedian: {
    title: 'Nerf médian — mécanosensibilité',
    description: "Test de mise en tension du nerf médian (anciennement ULTT1) pour évaluer la mécanosensibilité neurale du membre supérieur.",
    realisation: "Patient en décubitus dorsal. Séquence : abaissement de la ceinture scapulaire, abduction d'épaule, supination de l'avant-bras, extension du poignet et des doigts, rotation externe d'épaule, extension du coude. Ajouter inclinaison cervicale controlatérale comme différenciation structurelle.",
    interpretation: "Positif si reproduction des symptômes du patient et si la différenciation structurelle (inclinaison cervicale) modifie les symptômes. Négatif si aucun symptôme reproduit ou si la différenciation structurelle ne modifie rien.",
  },
  nerfUlnaire: {
    title: 'Nerf ulnaire — mécanosensibilité',
    description: "Test de mise en tension du nerf ulnaire (anciennement ULTT4).",
    realisation: "Patient en décubitus dorsal. Séquence : abaissement de la ceinture scapulaire, extension du poignet et des doigts, pronation, flexion du coude, rotation externe d'épaule, abduction d'épaule. Différenciation par inclinaison cervicale controlatérale.",
    interpretation: "Positif si reproduction des symptômes modifiée par la différenciation structurelle. Négatif si aucune reproduction de symptômes.",
  },
  nerfRadial: {
    title: 'Nerf radial — mécanosensibilité',
    description: "Test de mise en tension du nerf radial (anciennement ULTT3).",
    realisation: "Patient en décubitus dorsal. Séquence : abaissement de la ceinture scapulaire, extension du coude, rotation interne d'épaule, pronation, flexion du poignet et des doigts, adduction d'épaule. Différenciation par inclinaison cervicale controlatérale.",
    interpretation: "Positif si reproduction des symptômes modifiée par la différenciation structurelle. Négatif si aucune reproduction de symptômes.",
  },

  // ─── RACHIS LOMBAIRE ─────────────────────────────────────────────────────
  lasegue: {
    title: 'Lasègue (Straight Leg Raise — SLR)',
    description: "Test de mise en tension du nerf sciatique pour détecter une radiculopathie L4-S1 ou une irritation des racines nerveuses lombaires basses.",
    realisation: "Patient en décubitus dorsal, jambe tendue. Le thérapeute élève passivement le membre inférieur en maintenant le genou en extension. Noter l'angle d'apparition des symptômes.",
    interpretation: "Positif si reproduction de la douleur radiculaire (irradiation dans la jambe sous le genou) entre 30° et 70° d'élévation. La dorsiflexion de cheville (sensibilisation) doit augmenter les symptômes. Négatif si douleur uniquement postérieure de cuisse (ischio-jambiers) sans irradiation radiculaire.",
  },
  pkb: {
    title: 'PKB (Prone Knee Bend)',
    description: "Test de mise en tension du nerf fémoral pour détecter une radiculopathie L2-L4.",
    realisation: "Patient en décubitus ventral. Le thérapeute fléchit passivement le genou en amenant le talon vers la fesse. On peut ajouter une extension de hanche.",
    interpretation: "Positif si reproduction d'une douleur irradiant dans la face antérieure de la cuisse (trajet du nerf fémoral). Négatif si douleur uniquement locale au genou ou au quadriceps sans irradiation radiculaire.",
  },
  slump: {
    title: 'Slump test',
    description: "Test de mécanosensibilité neurale global évaluant la mobilité du système nerveux (méninges et nerf sciatique) sur toute sa longueur.",
    realisation: "Patient assis au bord de la table. Séquence : flexion thoracique et lombaire (slump), flexion cervicale, extension du genou, dorsiflexion de cheville. Différenciation structurelle par relâchement de la flexion cervicale.",
    interpretation: "Positif si reproduction des symptômes du patient et si le relâchement de la flexion cervicale modifie les symptômes. Négatif si symptômes non reproduits ou non modifiés par la différenciation structurelle.",
  },
  nerfCutaneLateralCuisse: {
    title: 'Nerf cutané latéral de la cuisse',
    description: "Test de mise en tension du nerf cutané latéral de la cuisse (méralgie paresthésique).",
    realisation: "Patient en décubitus latéral. Le thérapeute amène la hanche en extension et adduction, genou fléchi. Différenciation par inclinaison du rachis lombaire.",
    interpretation: "Positif si reproduction de paresthésies ou brûlures sur la face antéro-latérale de la cuisse, modifiées par la différenciation structurelle. Négatif si aucun symptôme reproduit.",
  },
  babinski: {
    title: 'Babinski',
    description: "Test des signes de la voie pyramidale (atteinte du motoneurone supérieur) au membre inférieur.",
    realisation: "Le thérapeute stimule la plante du pied du patient en passant un objet mousse le long du bord latéral, du talon vers les orteils, puis en traversant vers la base du gros orteil.",
    interpretation: "Positif (pathologique chez l'adulte) si extension du gros orteil avec écartement des autres orteils en éventail. Négatif (normal) si flexion de tous les orteils.",
  },
  clusterLaslett: {
    title: 'Cluster de Laslett',
    description: "Batterie de tests de provocation sacro-iliaque. 3 tests positifs sur 5 orientent fortement vers une origine sacro-iliaque de la douleur.",
    realisation: "5 tests de provocation : compression, distraction, thrust de la cuisse (postero-anterior), test de Gaenslen, compression sacrée. Chaque test applique une contrainte spécifique sur l'articulation sacro-iliaque.",
    interpretation: "Positif si 3 tests ou plus sur 5 reproduisent la douleur habituelle du patient dans la région sacro-iliaque. Négatif si moins de 3 tests positifs.",
  },
  extensionRotation: {
    title: "Test d'Extension-Rotation",
    description: "Test de provocation pour évaluer une atteinte de l'articulation zygapophysaire (facettaire) lombaire.",
    realisation: "Patient debout. Lui demander de faire une extension lombaire combinée à une rotation. Peut être réalisé en unipodal du côté testé.",
    interpretation: "Positif si reproduction de la douleur lombaire habituelle du patient, surtout si unilatérale et localisée. Négatif si aucune douleur reproduite.",
  },
  proneInstability: {
    title: 'Prone Instability Test',
    description: "Test pour évaluer l'instabilité segmentaire lombaire. Il compare la réponse douloureuse à la pression avec et sans activation musculaire stabilisatrice.",
    realisation: "Patient en décubitus ventral, pieds au sol. Le thérapeute applique une pression postéro-antérieure sur chaque segment lombaire (phase 1 : pieds au sol, muscles relâchés). Puis le patient soulève les pieds du sol pour activer les muscles du tronc (phase 2).",
    interpretation: "Positif si la douleur provoquée en phase 1 (pieds au sol) disparaît ou diminue significativement en phase 2 (pieds levés, muscles activés). Cela suggère une instabilité segmentaire qui bénéficierait d'un programme de stabilisation. Négatif si la douleur persiste dans les deux phases.",
  },

  // ─── GENOU ───────────────────────────────────────────────────────────────
  lachman: {
    title: 'Lachman',
    description: "Test de référence pour évaluer l'intégrité du ligament croisé antérieur (LCA). C'est le test le plus sensible pour le LCA.",
    realisation: "Patient en décubitus dorsal, genou fléchi à 20-30°. Le thérapeute stabilise le fémur distal d'une main et applique une translation tibiale antérieure avec l'autre main.",
    interpretation: "Positif si translation tibiale antérieure excessive par rapport au côté sain et/ou absence d'arrêt ferme (end-feel mou). Négatif si translation symétrique avec arrêt ferme.",
  },
  tiroirAnt: {
    title: 'Tiroir antérieur',
    description: "Test pour évaluer l'intégrité du ligament croisé antérieur (LCA).",
    realisation: "Patient en décubitus dorsal, genou fléchi à 90°, pied à plat sur la table. Le thérapeute s'assoit sur le pied du patient, saisit le tibia proximal et applique une force antérieure.",
    interpretation: "Positif si translation tibiale antérieure excessive. Négatif si translation normale et symétrique.",
  },
  tiroirPost: {
    title: 'Tiroir postérieur',
    description: "Test pour évaluer l'intégrité du ligament croisé postérieur (LCP).",
    realisation: "Patient en décubitus dorsal, genou fléchi à 90°, pied à plat sur la table. Le thérapeute applique une force postérieure sur le tibia proximal. Vérifier d'abord si le tibia est déjà subluxé en postérieur (sag sign).",
    interpretation: "Positif si translation tibiale postérieure excessive. Négatif si translation normale et symétrique.",
  },
  lcm: {
    title: 'Ligament collatéral médial (valgus stress test)',
    description: "Test pour évaluer l'intégrité du ligament collatéral médial (LCM).",
    realisation: "Patient en décubitus dorsal. Le thérapeute applique un stress en valgus sur le genou, testé en extension complète puis à 30° de flexion. En extension, on teste aussi les structures postérieures.",
    interpretation: "Positif si ouverture excessive de l'interligne médial par rapport au côté sain. Une laxité à 30° seule indique une atteinte isolée du LCM. Une laxité en extension complète suggère une atteinte combinée (LCM + pivot central). Négatif si pas de laxité excessive.",
  },
  lcl: {
    title: 'Ligament collatéral latéral (varus stress test)',
    description: "Test pour évaluer l'intégrité du ligament collatéral latéral (LCL).",
    realisation: "Patient en décubitus dorsal. Le thérapeute applique un stress en varus sur le genou, testé en extension complète puis à 30° de flexion.",
    interpretation: "Positif si ouverture excessive de l'interligne latéral. Négatif si pas de laxité excessive.",
  },
  thessaly: {
    title: 'Test de Thessaly',
    description: "Test pour détecter une lésion méniscale. Il simule une charge en rotation sur les ménisques.",
    realisation: "Patient debout en appui unipodal, genou fléchi à 20°, mains tenues par le thérapeute pour l'équilibre. Le patient effectue 3 rotations internes puis 3 rotations externes du genou en gardant la flexion.",
    interpretation: "Positif si douleur sur l'interligne articulaire (médiale ou latérale) avec ou sans sensation de blocage ou ressaut. Négatif si aucune douleur ni sensation de blocage.",
  },
  renne: {
    title: 'Test de Renne',
    description: "Test pour le syndrome de la bandelette ilio-tibiale (syndrome de l'essuie-glace).",
    realisation: "Patient debout en appui unipodal sur la jambe testée. Il effectue des flexions/extensions répétées du genou autour de 30° de flexion.",
    interpretation: "Positif si reproduction de la douleur sur le condyle fémoral latéral autour de 30° de flexion. Négatif si aucune douleur reproduite.",
  },
  noble: {
    title: 'Test de Noble',
    description: "Test de compression pour le syndrome de la bandelette ilio-tibiale.",
    realisation: "Patient en décubitus dorsal. Le thérapeute applique une pression sur le condyle fémoral latéral tout en effectuant passivement une extension du genou depuis la position fléchie.",
    interpretation: "Positif si douleur vive reproduite sous le doigt du thérapeute sur le condyle fémoral latéral aux alentours de 30° de flexion. Négatif si aucune douleur reproduite.",
  },
  vague: {
    title: 'Test de la vague (ballottement patellaire)',
    description: "Test pour détecter un épanchement intra-articulaire du genou (faible à modéré).",
    realisation: "Le thérapeute chasse le liquide du récessus interne vers le récessus externe en passant la main sur la face médiale du genou, puis appuie sur la face latérale. Pour un épanchement plus important, utiliser le choc rotulien.",
    interpretation: "Positif si apparition d'un renflement liquidien sur la face médiale après la poussée latérale (signe de la vague). Négatif si aucun renflement observé.",
  },
  hoffa: {
    title: 'Test de Hoffa',
    description: "Test pour évaluer une irritation ou hypertrophie du corps adipeux infra-patellaire (fat pad de Hoffa).",
    realisation: "Patient en décubitus dorsal, genou fléchi à 30°. Le thérapeute applique une pression bilatérale avec ses pouces de part et d'autre du tendon patellaire, sous la patella, puis amène le genou en extension.",
    interpretation: "Positif si douleur vive sous le tendon patellaire lors de l'extension, indiquant une compression du corps adipeux. Négatif si aucune douleur reproduite.",
  },

  // ─── HANCHE ──────────────────────────────────────────────────────────────
  faddir: {
    title: 'Test FADDIR',
    description: "Test de conflit fémoro-acétabulaire antérieur (impingement). C'est un test de provocation pour les pathologies intra-articulaires de la hanche.",
    realisation: "Patient en décubitus dorsal. Le thérapeute amène la hanche en Flexion (90°), ADDuction et Rotation Interne passivement en fin d'amplitude.",
    interpretation: "Positif si reproduction de la douleur inguinale profonde habituelle du patient. Très sensible mais peu spécifique (positif dans de nombreuses pathologies de hanche). Négatif si aucune douleur inguinale reproduite.",
  },
  faber: {
    title: 'Test de FABER (Patrick test)',
    description: "Test d'évaluation de la hanche et de l'articulation sacro-iliaque. FABER = Flexion, ABduction, External Rotation.",
    realisation: "Patient en décubitus dorsal. Le thérapeute place la cheville du patient sur le genou opposé (position en 4), puis applique une pression vers le bas sur le genou fléchi. L'autre main stabilise le bassin controlatéral.",
    interpretation: "Positif pour la hanche si douleur inguinale. Positif pour la sacro-iliaque si douleur postérieure dans la région sacro-iliaque. Négatif si aucune douleur reproduite.",
  },
  thomas: {
    title: 'Test de Thomas',
    description: "Test pour évaluer une rétraction du psoas-iliaque (flessum de hanche).",
    realisation: "Patient en décubitus dorsal, fesses au bord de la table. Le patient ramène un genou contre sa poitrine et le maintient. On observe la position du membre inférieur controlatéral qui pend.",
    interpretation: "Positif si la cuisse du côté testé se soulève de la table (ne reste pas horizontale), indiquant une rétraction du psoas. On note aussi la position du genou (si le genou s'étend, rétraction du droit fémoral associée). Négatif si la cuisse reste à plat sur la table.",
  },
  ober: {
    title: "Test d'Ober",
    description: "Test pour évaluer une rétraction du tenseur du fascia lata et de la bandelette ilio-tibiale.",
    realisation: "Patient en décubitus latéral, côté testé vers le haut. Le thérapeute stabilise le bassin, fléchit le genou à 90° et amène la hanche en extension et abduction. Puis il relâche progressivement la hanche vers l'adduction.",
    interpretation: "Positif si la cuisse reste en abduction et ne retombe pas en adduction sous la ligne horizontale, indiquant une rétraction de la bandelette ilio-tibiale. Négatif si la cuisse retombe naturellement en adduction.",
  },
  clusterSultive: {
    title: 'Cluster de Sultive',
    description: "Cluster diagnostique pour l'arthrose de hanche. Combine 5 critères cliniques.",
    realisation: "Évaluer : (1) douleur inguinale rapportée par le patient, (2) flexion de hanche ≤ 115°, (3) rotation interne ≤ 15°, (4) douleur à l'accroupissement, (5) test de FABER positif (distance genou-table). Si 4 critères sur 5 sont positifs, la probabilité d'arthrose est très élevée.",
    interpretation: "Positif si 4 critères ou plus sur 5 sont présents (LR+ élevé pour arthrose de hanche). Négatif si moins de 4 critères positifs.",
  },
  heer: {
    title: 'Test de HEER',
    description: "Test pour évaluer les tendinopathies des rotateurs externes de hanche (notamment le piriforme).",
    realisation: "Patient en décubitus dorsal, hanche fléchie à 90°, genou fléchi à 90°. Le thérapeute applique une résistance isométrique en rotation externe de hanche.",
    interpretation: "Positif si reproduction de la douleur profonde fessière. Négatif si aucune douleur reproduite.",
  },
  abdHeer: {
    title: 'Test ABD-HEER',
    description: "Test pour évaluer les tendinopathies glutéales (moyen et petit fessier), particulièrement la tendinopathie du moyen fessier.",
    realisation: "Patient en décubitus latéral. Le thérapeute demande une abduction de hanche contre résistance, avec le genou en extension, en ajoutant une composante de rotation externe.",
    interpretation: "Positif si reproduction de la douleur sur le grand trochanter ou la face latérale de la hanche. Négatif si aucune douleur reproduite.",
  },

  // ─── ÉPAULE ──────────────────────────────────────────────────────────────
  bearHug: {
    title: 'Bear Hug test',
    description: "Test pour évaluer une rupture du subscapulaire (portion supérieure).",
    realisation: "Patient assis ou debout. Il place la paume de la main atteinte sur l'épaule opposée (le coude est devant le corps). Le thérapeute tente de décoller la main de l'épaule en appliquant une rotation externe. Le patient résiste.",
    interpretation: "Positif si le patient ne peut pas maintenir sa main contre l'épaule (faiblesse en rotation interne dans cette position), indiquant une rupture du subscapulaire. Négatif si le patient maintient la résistance.",
  },
  bellyPress: {
    title: 'Belly Press test',
    description: "Test pour évaluer une rupture du subscapulaire.",
    realisation: "Patient debout, coude fléchi. Il presse sa main contre son abdomen en essayant d'amener le coude vers l'avant (en maintenant le poignet droit). Le thérapeute observe la capacité à maintenir une pression abdominale avec le poignet droit.",
    interpretation: "Positif si le patient ne peut pas maintenir le poignet droit et compense en fléchissant le poignet et/ou en rétractant le coude. Négatif si pression maintenue avec poignet droit et coude en avant.",
  },
  externalRotLagSign: {
    title: 'External Rotation Lag Sign',
    description: "Test pour évaluer une rupture de l'infra-épineux (et/ou du petit rond).",
    realisation: "Patient assis, coude fléchi à 90°, bras légèrement décollé du corps. Le thérapeute amène passivement le bras en rotation externe maximale, puis relâche en demandant au patient de maintenir la position.",
    interpretation: "Positif si le bras retombe en rotation interne (lag = retard/chute), indiquant une rupture de l'infra-épineux. On mesure l'angle de lag en degrés. Négatif si le patient maintient la position.",
  },
  obrien: {
    title: "O'Brien test",
    description: "Test pour les lésions du labrum supérieur (SLAP) et les pathologies acromio-claviculaires.",
    realisation: "Patient debout, bras à 90° de flexion, 10° d'adduction (bras croisé devant), coude en extension. Phase 1 : pouce vers le bas (rotation interne), le thérapeute applique une résistance vers le bas. Phase 2 : pouce vers le haut (rotation externe), même résistance.",
    interpretation: "Positif pour SLAP si douleur profonde en phase 1 (pouce en bas) diminuée en phase 2 (pouce en haut). Positif pour acromio-claviculaire si douleur au sommet de l'épaule (AC) dans les deux phases. Négatif si aucune douleur reproduite.",
  },
  crossArm: {
    title: 'Cross Arm test (adduction horizontale)',
    description: "Test pour les pathologies de l'articulation acromio-claviculaire.",
    realisation: "Patient assis ou debout. Le thérapeute amène passivement le bras en adduction horizontale complète (le bras croise devant le thorax au niveau de l'épaule opposée).",
    interpretation: "Positif si douleur localisée au niveau de l'articulation acromio-claviculaire. Négatif si aucune douleur à l'AC.",
  },
  palpationAC: {
    title: 'Palpation acromio-claviculaire',
    description: "Palpation directe de l'articulation acromio-claviculaire pour évaluer une sensibilité locale.",
    realisation: "Le thérapeute palpe directement l'interligne acromio-claviculaire.",
    interpretation: "Positif si douleur locale reproduite sur l'interligne AC. Négatif si aucune douleur à la palpation.",
  },
  abdHorizResist: {
    title: 'Abduction horizontale contre résistance',
    description: "Test complémentaire pour les pathologies acromio-claviculaires.",
    realisation: "Patient avec le bras à 90° de flexion ou d'abduction. Le thérapeute applique une résistance isométrique contre une abduction horizontale.",
    interpretation: "Positif si douleur localisée à l'articulation acromio-claviculaire. Négatif si aucune douleur à l'AC.",
  },
  apprehensionRelocation: {
    title: 'Apprehension + Relocation test',
    description: "Tests combinés pour l'instabilité gléno-humérale antérieure.",
    realisation: "Patient en décubitus dorsal. Apprehension : épaule à 90° d'abduction, coude fléchi à 90°, le thérapeute amène en rotation externe maximale. Relocation : même position, le thérapeute applique une pression postérieure sur la tête humérale antérieure.",
    interpretation: "Apprehension positif si sensation d'appréhension (peur de la luxation), pas seulement la douleur. Relocation positif si la pression postérieure soulage l'appréhension et/ou permet plus de rotation externe. Négatif si aucune appréhension.",
  },
  signeSulcus: {
    title: 'Test du signe du Sulcus',
    description: "Test pour l'instabilité gléno-humérale inférieure (laxité inférieure).",
    realisation: "Patient assis, bras le long du corps, muscles relâchés. Le thérapeute applique une traction vers le bas sur le bras ou le coude.",
    interpretation: "Positif si apparition d'un sulcus (sillon) visible sous l'acromion, indiquant une translation inférieure excessive de la tête humérale. On mesure en cm. Négatif si pas de sulcus ou sulcus symétrique.",
  },
  jerkTest: {
    title: 'Jerk test',
    description: "Test pour l'instabilité gléno-humérale postérieure.",
    realisation: "Patient assis. Le thérapeute fléchit l'épaule à 90° avec rotation interne, puis applique une force axiale sur l'humérus vers l'arrière tout en amenant le bras en adduction horizontale.",
    interpretation: "Positif si un ressaut (jerk) est ressenti lors de la subluxation postérieure ou de la réduction de la tête humérale. Négatif si aucun ressaut perçu.",
  },
  ckcuest: {
    title: 'CKCUEST (Closed Kinetic Chain Upper Extremity Stability Test)',
    description: "Test fonctionnel de stabilité du membre supérieur en chaîne cinétique fermée.",
    realisation: "Patient en position de pompe (push-up), mains écartées de 90 cm. En 15 secondes, le patient doit toucher alternativement la main opposée le plus de fois possible (main droite touche main gauche et inversement).",
    interpretation: "On compte le nombre de touches en 15 secondes. Valeurs normatives variables. Comparer bilatéralement et avec les normatives de la population du patient. Asymétrie significative si différence > 20%.",
  },
  ulrt: {
    title: 'ULRT (Upper Limb Rotation Test)',
    description: "Test fonctionnel de rotation du membre supérieur évaluant la force et l'endurance.",
    realisation: "Position et protocole spécifique de rotation du membre supérieur contre résistance. Évaluer la capacité de rotation répétée.",
    interpretation: "Comparer au côté sain. Asymétrie ou fatigue précoce = positif.",
  },
  uqYbt: {
    title: 'UQ-YBT (Upper Quarter Y-Balance Test)',
    description: "Test d'équilibre et de stabilité dynamique du membre supérieur.",
    realisation: "Patient en position de planche unipode (appui sur une main). Il doit atteindre 3 directions (médiale, inféro-latérale, supéro-latérale) avec la main libre le plus loin possible.",
    interpretation: "Mesurer les distances de reach dans les 3 directions, normaliser par la longueur du membre supérieur. Comparer bilatéralement. Asymétrie > 4 cm = facteur de risque de blessure.",
  },
  setPset: {
    title: 'SET / PSET (Shoulder / Posterior Shoulder Endurance Test)',
    description: "Tests d'endurance de l'épaule évaluant la capacité des muscles rotateurs à maintenir un effort prolongé.",
    realisation: "SET : patient en décubitus latéral, épaule à 90° d'abduction, coude fléchi à 90°. Maintenir une charge en rotation externe jusqu'à épuisement. PSET : variante ciblant les rotateurs externes/postérieurs.",
    interpretation: "Mesurer le temps de maintien. Comparer au côté sain. Asymétrie significative ou temps très réduit = déficit d'endurance.",
  },
  smbtSasspt: {
    title: 'SMBT / SASSPT (Seated Medicine Ball Throw / Seated Arm Side-to-Side Power Test)',
    description: "Tests de puissance du membre supérieur.",
    realisation: "SMBT : patient assis, lance un medicine ball des deux mains (type passe de poitrine). Mesurer la distance. SASSPT : patient assis, lance le medicine ball d'une main latéralement.",
    interpretation: "Mesurer la distance de lancer. Comparer bilatéralement et aux valeurs normatives. Asymétrie > 10% = déficit de puissance.",
  },

  // ─── ENTORSE DE CHEVILLE ─────────────────────────────────────────────────
  altd: {
    title: 'Antero Lateral Drawer test (ALTD)',
    description: "Test pour évaluer l'intégrité du ligament talo-fibulaire antérieur (LTFA), le ligament le plus fréquemment lésé lors d'une entorse latérale de cheville.",
    realisation: "Patient en décubitus dorsal ou assis, cheville hors de la table, en légère flexion plantaire (10-20°). Le thérapeute stabilise le tibia distal d'une main et applique une translation antérieure du talus avec l'autre main, en saisissant le calcanéum.",
    interpretation: "Positif si translation antérieure excessive du talus par rapport au côté sain et/ou absence d'arrêt ferme. Négatif si translation symétrique avec arrêt ferme.",
  },
  raltd: {
    title: 'Reverse Antero Lateral Drawer test (RALTD)',
    description: "Variante du tiroir antéro-latéral. Le thérapeute pousse le tibia vers l'arrière au lieu de tirer le talus vers l'avant, pour évaluer le LTFA.",
    realisation: "Patient en décubitus dorsal, cheville en légère flexion plantaire. Le thérapeute stabilise le pied/talus et pousse le tibia vers l'arrière.",
    interpretation: "Positif si déplacement excessif, indiquant une lésion du LTFA. Négatif si déplacement normal et symétrique.",
  },
  talarTiltVarus: {
    title: 'Talar Tilt test VARUS',
    description: "Test pour évaluer l'intégrité du ligament calcanéo-fibulaire (LCF).",
    realisation: "Patient en décubitus dorsal ou latéral, cheville en position neutre (0° de flexion dorsale). Le thérapeute stabilise le tibia et applique un mouvement de varus (inversion) forcé du calcanéum/talus.",
    interpretation: "Positif si ouverture excessive de l'interligne latéral (bâillement en varus) par rapport au côté sain. Négatif si angulation symétrique.",
  },
  talarTiltValgus: {
    title: 'Talar Tilt test VALGUS',
    description: "Test pour évaluer l'intégrité du ligament deltoïde (ligament collatéral médial de la cheville).",
    realisation: "Patient en décubitus dorsal, cheville en position neutre. Le thérapeute stabilise le tibia et applique un mouvement de valgus (éversion) forcé du calcanéum/talus.",
    interpretation: "Positif si ouverture excessive de l'interligne médial (bâillement en valgus). Négatif si angulation symétrique.",
  },
  kleiger: {
    title: 'Test de Kleiger (External Rotation Stress Test)',
    description: "Test pour évaluer l'intégrité de la syndesmose tibio-fibulaire inférieure et du ligament deltoïde.",
    realisation: "Patient assis, genou fléchi à 90°, pied hors de la table. Le thérapeute stabilise la jambe d'une main et applique une rotation externe forcée du pied.",
    interpretation: "Positif si douleur au niveau de la syndesmose (face antéro-latérale entre tibia et fibula) et/ou si écartement palpable entre tibia et fibula. Douleur médiale peut indiquer une atteinte du ligament deltoïde. Négatif si aucune douleur reproduite.",
  },
  fibularTranslation: {
    title: 'Fibular Translation test',
    description: "Test pour évaluer l'intégrité de la syndesmose tibio-fibulaire inférieure.",
    realisation: "Patient en décubitus dorsal. Le thérapeute saisit la fibula et applique une translation antéro-postérieure par rapport au tibia au niveau de la syndesmose.",
    interpretation: "Positif si douleur au niveau de la syndesmose et/ou translation excessive par rapport au côté sain. Négatif si indolore et translation symétrique.",
  },
  tiroirTalienTransversal: {
    title: 'Tiroir talien transversal',
    description: "Test pour évaluer l'intégrité de la syndesmose tibio-fibulaire inférieure par translation latérale du talus.",
    realisation: "Patient en décubitus dorsal. Le thérapeute stabilise le tibia/fibula et applique une translation médio-latérale du talus.",
    interpretation: "Positif si translation latérale excessive du talus et/ou douleur au niveau de la syndesmose. Négatif si translation symétrique et indolore.",
  },
  squeeze: {
    title: 'Squeeze test',
    description: "Test de compression pour évaluer une lésion de la syndesmose tibio-fibulaire inférieure ou une fracture de la fibula.",
    realisation: "Le thérapeute comprime le tibia et la fibula l'un contre l'autre au niveau du milieu de la jambe (à distance de la syndesmose).",
    interpretation: "Positif si la compression au milieu de la jambe reproduit une douleur au niveau de la syndesmose tibio-fibulaire inférieure (distale). Négatif si aucune douleur distale reproduite.",
  },
  grinding: {
    title: 'Grinding test (carrefour postérieur)',
    description: "Test pour un conflit postérieur osseux de la cheville (os trigone, queue du talus).",
    realisation: "Patient en décubitus ventral, pied hors de la table. Le thérapeute applique une flexion plantaire passive forcée combinée à des mouvements de circumduction du talus.",
    interpretation: "Positif si douleur postérieure profonde de la cheville reproduite en flexion plantaire forcée. Négatif si aucune douleur postérieure.",
  },
  impaction: {
    title: "Test d'impaction (carrefour postérieur)",
    description: "Test pour un conflit postérieur osseux de la cheville.",
    realisation: "Patient en décubitus ventral ou dorsal. Le thérapeute amène la cheville en flexion plantaire maximale et applique une compression axiale.",
    interpretation: "Positif si douleur postérieure profonde de la cheville. Négatif si aucune douleur.",
  },
  longFlechisseurHallux: {
    title: "Long Fléchisseur de l'Hallux (tissus mous)",
    description: "Test pour évaluer une pathologie du long fléchisseur de l'hallux (tendinopathie, ténosynovite) dans le carrefour postérieur.",
    realisation: "Patient en décubitus ventral. Le thérapeute amène la cheville en flexion plantaire puis demande une flexion/extension active résistée du gros orteil.",
    interpretation: "Positif si douleur postéro-médiale profonde de la cheville lors de la contraction résistée ou de l'étirement du tendon. Négatif si aucune douleur.",
  },
  molloy: {
    title: 'Molloy test',
    description: "Test pour un conflit antéro-latéral de la cheville (tissu cicatriciel, synovite).",
    realisation: "Patient en décubitus dorsal. Le thérapeute amène la cheville en dorsiflexion et inversion forcées tout en palpant la gouttière antéro-latérale.",
    interpretation: "Positif si douleur dans la gouttière antéro-latérale, indiquant un conflit des tissus mous. Négatif si aucune douleur antéro-latérale.",
  },
  varusFd: {
    title: 'Varus en position de FD (sub-talaire)',
    description: "Test de stress en varus de l'articulation sub-talaire en position de dorsiflexion.",
    realisation: "Patient en décubitus dorsal, cheville maintenue en dorsiflexion. Le thérapeute applique un stress en varus sur le calcanéum.",
    interpretation: "Positif si douleur ou laxité excessive au niveau sub-talaire. Négatif si indolore et stable.",
  },
  valgusFd: {
    title: 'Valgus en position de FD (sub-talaire)',
    description: "Test de stress en valgus de l'articulation sub-talaire en position de dorsiflexion.",
    realisation: "Patient en décubitus dorsal, cheville maintenue en dorsiflexion. Le thérapeute applique un stress en valgus sur le calcanéum.",
    interpretation: "Positif si douleur ou laxité excessive au niveau sub-talaire. Négatif si indolore et stable.",
  },
  cisaillementFd: {
    title: 'Cisaillement en position de FD (sub-talaire)',
    description: "Test de cisaillement de l'articulation sub-talaire.",
    realisation: "Patient en décubitus dorsal, cheville maintenue en dorsiflexion. Le thérapeute applique des forces de cisaillement médio-latéral sur le calcanéum.",
    interpretation: "Positif si douleur sub-talaire et/ou laxité excessive. Négatif si indolore et stable.",
  },
  neutralHeel: {
    title: 'Neutral Heel Lateral Push test (médio-tarse)',
    description: "Test pour évaluer la stabilité médio-tarsienne (articulation de Chopart) et le spring ligament.",
    realisation: "Patient debout. Le thérapeute stabilise le calcanéum en position neutre, puis applique une poussée latérale sur l'avant-pied.",
    interpretation: "Positif si douleur médio-tarsienne ou instabilité de l'arche médiale. Négatif si indolore et stable.",
  },
  adductionSupination: {
    title: 'Adduction + Supination (médio-tarse)',
    description: "Test de stress en adduction et supination de l'articulation médio-tarsienne.",
    realisation: "Le thérapeute stabilise le calcanéum et applique une adduction et supination forcées de l'avant-pied.",
    interpretation: "Positif si douleur au niveau médio-tarsien. Négatif si indolore.",
  },
  abductionPronation: {
    title: 'Abduction + Pronation (médio-tarse)',
    description: "Test de stress en abduction et pronation de l'articulation médio-tarsienne, ciblant notamment le spring ligament.",
    realisation: "Le thérapeute stabilise le calcanéum et applique une abduction et pronation forcées de l'avant-pied.",
    interpretation: "Positif si douleur au niveau médio-tarsien (surtout médiale si atteinte du spring ligament). Négatif si indolore.",
  },
  footLift: {
    title: 'Foot Lift test',
    description: "Test d'équilibre postural statique évaluant la stabilité posturale en appui unipodal par le nombre de compensations.",
    realisation: "Patient en appui unipodal, les yeux ouverts puis fermés. Compter le nombre de fois où le pied d'appui se soulève ou bouge pendant 30 secondes.",
    interpretation: "Plus le nombre de mouvements compensatoires est élevé, plus la stabilité est déficitaire. Comparer bilatéralement.",
  },
  bess: {
    title: 'Balance Error Scoring System (BESS)',
    description: "Test d'équilibre postural statique standardisé, évaluant la stabilité dans différentes conditions de surface et de position.",
    realisation: "6 conditions : appui bipodal, unipodal et tandem, chacune sur surface ferme et sur mousse, yeux fermés, 20 secondes par condition. Compter les erreurs (ouverture des yeux, mouvement de mains, pas, chutes, etc.).",
    interpretation: "Score total sur 60 (10 erreurs max par condition). Plus le score est élevé, plus l'équilibre est déficitaire. Comparer bilatéralement et avec les normatives.",
  },
  yBalance: {
    title: 'Y Balance test',
    description: "Test d'équilibre postural dynamique évaluant la stabilité unipode dans 3 directions (antérieure, postéro-médiale, postéro-latérale).",
    realisation: "Patient en appui unipodal au centre du Y. Il doit atteindre le plus loin possible avec le pied libre dans les 3 directions, sans perdre l'équilibre. 3 essais par direction, prendre la meilleure performance. Normaliser par la longueur du membre inférieur.",
    interpretation: "Comparer bilatéralement. Asymétrie > 4 cm dans la direction antérieure = facteur de risque de blessure. Scores composites faibles = risque accru. Négatif si scores symétriques et dans les normatives.",
  },
}

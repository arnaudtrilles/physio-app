-- ============================================================
-- PhysioApp — Purge des contenus DM historiques (maintenance, one-shot)
-- À exécuter dans : Supabase Dashboard → SQL Editor.
-- ⚠️ OPÈRE SUR DES DONNÉES PATIENT RÉELLES. Lire entièrement avant d'exécuter.
-- ============================================================
--
-- Contexte
-- --------
-- Le moteur d'analyse diagnostique (« inférence clinique ») a été retiré du code
-- en tranche 3 pour le re-cadrage hors-dispositif-médical. Le code n'écrit plus
-- jamais ce contenu : `convertBilans` force `analyse_ia: null` à chaque upload
-- (src/lib/syncEngine.ts:1066). MAIS des bilans créés AVANT ce retrait peuvent
-- encore contenir, en base, l'ancienne structure `AnalyseIA` dans la colonne
-- `bilans.analyse_ia` (diagnostic, hypothèses avec probabilités, plan de prise en
-- charge, alertes). Ce script purge ce contenu résiduel.
--
-- Portée
-- ------
--   - CIBLE   : `bilans.analyse_ia` (seule colonne ayant jamais stocké AnalyseIA).
--   - ÉPARGNE : `bilans_intermediaires.analyse_ia` et `notes_seance.analyse_ia`
--               (structures AnalyseIAIntermediaire / AnalyseSeanceMini : notes de
--               suivi sans probabilités ni diagnostic → contenu légitime, CONSERVÉ).
--
-- Méthode : on met `analyse_ia` à NULL (on ne supprime PAS la ligne bilan).
-- Non destructif pour le bilan, réversible seulement via restauration de
-- sauvegarde → d'où l'étape 0 obligatoire.
--
-- ORDRE D'EXÉCUTION IMPÉRATIF :
--   Étape 0  Sauvegarde (backup Supabase)         ← OBLIGATOIRE
--   Étape 1  Dry-run : compter (lecture seule)
--   Étape 2  Inspecter un échantillon (lecture seule)
--   Étape 3  (option) Créer le journal de purge
--   Étape 4  PURGE (écriture) — uniquement après revue des étapes 1-2
--   Étape 5  Vérification post-purge (doit renvoyer 0)
--   Étape 6  PDF d'analyse historiques — revue manuelle (lecture seule)
-- ============================================================


-- ------------------------------------------------------------
-- ÉTAPE 0 — SAUVEGARDE (à faire dans Dashboard → Database → Backups)
-- Déclencher un backup manuel / point de restauration AVANT toute écriture.
-- Ne pas continuer tant que le backup n'est pas confirmé terminé.
-- ------------------------------------------------------------


-- ------------------------------------------------------------
-- ÉTAPE 1 — DRY-RUN : compter ce qui sera purgé (LECTURE SEULE, aucun effet)
-- Marqueurs de l'ancienne structure AnalyseIA = présence des clés top-level
-- 'hypotheses' ou 'diagnostic' dans le JSON.
-- ------------------------------------------------------------
select
  count(*)                                                          as bilans_total,
  count(*) filter (where analyse_ia is not null)                    as analyse_ia_non_null,
  count(*) filter (
    where analyse_ia is not null
      and (analyse_ia ? 'hypotheses' or analyse_ia ? 'diagnostic')
  )                                                                 as a_purger_contenu_dm,
  -- Filet de sécurité : non-null SANS marqueur DM connu (à inspecter avant de
  -- décider — ce compteur devrait normalement être 0).
  count(*) filter (
    where analyse_ia is not null
      and not (analyse_ia ? 'hypotheses' or analyse_ia ? 'diagnostic')
  )                                                                 as non_null_sans_marqueur
from bilans;

-- Répartition par praticien (utile en multi-comptes) :
--   select practitioner_id,
--          count(*) filter (
--            where analyse_ia is not null
--              and (analyse_ia ? 'hypotheses' or analyse_ia ? 'diagnostic')
--          ) as a_purger
--   from bilans group by practitioner_id having count(*) filter (
--     where analyse_ia is not null
--       and (analyse_ia ? 'hypotheses' or analyse_ia ? 'diagnostic')) > 0;


-- ------------------------------------------------------------
-- ÉTAPE 2 — INSPECTER UN ÉCHANTILLON (LECTURE SEULE)
-- Confirmer de visu qu'il s'agit bien d'ancien contenu diagnostique.
-- ------------------------------------------------------------
select id, date_bilan, zone, bilan_type,
       jsonb_object_keys(analyse_ia) as cles_presentes
from bilans
where analyse_ia is not null
  and (analyse_ia ? 'hypotheses' or analyse_ia ? 'diagnostic')
limit 5;

-- Vue complète d'une ligne (décommenter en remplaçant <ID>) :
--   select analyse_ia from bilans where id = <ID>;


-- ------------------------------------------------------------
-- ÉTAPE 3 (OPTION) — Journal de purge (traçabilité conformité)
-- ------------------------------------------------------------
create table if not exists dm_purge_log (
  id bigserial primary key,
  rows_nullified bigint not null,
  reason text,
  purged_at timestamptz not null default now()
);


-- ------------------------------------------------------------
-- ÉTAPE 4 — PURGE (ÉCRITURE) — n'exécuter qu'APRÈS revue des étapes 1-2.
-- Transaction explicite : on compte, on purge, on journalise, puis COMMIT.
-- En cas de doute → ROLLBACK au lieu de COMMIT.
-- ------------------------------------------------------------
begin;

  with purged as (
    update bilans
    set analyse_ia = null,
        updated_at = now()
    where analyse_ia is not null
      and (analyse_ia ? 'hypotheses' or analyse_ia ? 'diagnostic')
    returning 1
  )
  insert into dm_purge_log (rows_nullified, reason)
  select count(*), 'Re-cadrage hors-DM : purge contenu inférence clinique historique'
  from purged;

  -- Vérifier la ligne de journal avant de valider :
  select * from dm_purge_log order by id desc limit 1;

commit;
-- (Remplacer `commit;` par `rollback;` pour annuler si le compte ne correspond pas.)


-- ------------------------------------------------------------
-- ÉTAPE 5 — VÉRIFICATION POST-PURGE (doit renvoyer 0)
-- ------------------------------------------------------------
select count(*) as reste_contenu_dm
from bilans
where analyse_ia is not null
  and (analyse_ia ? 'hypotheses' or analyse_ia ? 'diagnostic');


-- ------------------------------------------------------------
-- ÉTAPE 6 — PDF D'ANALYSE HISTORIQUES (REVUE MANUELLE, LECTURE SEULE)
-- La table patient_documents n'a PAS de colonne `source` : on ne peut pas
-- filtrer automatiquement les PDF issus de l'ancienne analyse IA. On les repère
-- au mieux par le nom de fichier. NE PAS supprimer en masse : revue au cas par
-- cas (un PDF peut avoir été renommé / réutilisé par le praticien).
-- ------------------------------------------------------------
select id, patient_id, name, mime_type, added_at
from patient_documents
where name ilike '%analyse%ia%'
   or name ilike '%diagnostic%'
order by added_at;
-- Suppression éventuelle, après revue, document par document :
--   delete from patient_documents where id = '<UUID>';
--   (puis supprimer l'objet Storage correspondant via l'API / le Dashboard.)
-- ============================================================

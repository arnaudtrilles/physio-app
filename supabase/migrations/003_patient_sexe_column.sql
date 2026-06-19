-- ============================================================
-- PhysioApp — Migration 003 : colonne `sexe` dédiée sur patients (sync-3)
-- À exécuter dans : Supabase Dashboard → SQL Editor (après 002).
-- ============================================================
--
-- Contexte
-- --------
-- Aujourd'hui le sexe du patient n'a PAS de colonne dédiée : il est embarqué
-- dans `bilans.bilan_data->>'_patientSexe'` (cf. src/lib/syncEngine.ts:1059) pour
-- survivre aux round-trips cloud. Conséquences :
--   - une donnée d'identité dispersée dans un blob JSON par bilan (incohérent si
--     plusieurs bilans, fragile, non requêtable proprement) ;
--   - chaque ouverture d'un patient sans sexe déclenche un popup de complétion.
--
-- Cette migration crée une colonne propre `patients.sexe` et rapatrie les valeurs
-- existantes. Elle est :
--   - ADDITIVE et NON destructive (la clé `_patientSexe` dans bilan_data n'est
--     PAS supprimée — aucune perte, le code de sync continue de fonctionner) ;
--   - SANS RÉGRESSION à l'application : tant que le code de sync n'est pas câblé
--     pour LIRE cette colonne, rien ne change côté app. Le câblage (lire/écrire
--     patients.sexe au lieu de bilan_data._patientSexe) est une étape de CODE
--     séparée, à déployer et tester après coup (cf. docs/legal/ACTIONS_REQUISES.md
--     §H) ;
--   - IDEMPOTENTE : réexécutable sans erreur (add column if not exists, backfill
--     limité aux lignes encore NULL).
--
-- ============================================================

-- 1. Colonne dédiée (nullable : « sexe inconnu » reste un état légitime).
alter table patients
  add column if not exists sexe text
  check (sexe is null or sexe in ('masculin', 'feminin'));

-- 2. Backfill depuis le sexe historiquement embarqué dans bilan_data._patientSexe.
--    On retient la valeur la plus récente (par updated_at) et non-nulle par patient.
--    Idempotent : ne renseigne que les patients dont `sexe` est encore NULL, donc
--    n'écrase jamais une valeur déjà fixée par l'app.
--    (Exécuté en SQL Editor → rôle postgres → RLS contournée : couvre tous les
--    praticiens en une passe.)
with derived as (
  select distinct on (b.patient_id)
         b.patient_id,
         b.bilan_data->>'_patientSexe' as sexe
  from bilans b
  where b.bilan_data->>'_patientSexe' in ('masculin', 'feminin')
  order by b.patient_id, b.updated_at desc
)
update patients p
set sexe = d.sexe
from derived d
where p.id = d.patient_id
  and p.sexe is null;

-- 3. Vérification (à lancer après) :
--   select
--     count(*)                                   as patients_total,
--     count(*) filter (where sexe is not null)   as sexe_renseigne,
--     count(*) filter (where sexe is null)       as sexe_inconnu
--   from patients;

-- ============================================================
-- Rollback (si besoin de revenir en arrière) :
--   alter table patients drop column if exists sexe;
-- (Aucune donnée perdue : la source bilan_data._patientSexe est intacte.)
-- ============================================================

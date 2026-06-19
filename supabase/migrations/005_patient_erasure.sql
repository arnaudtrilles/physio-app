-- ============================================================
-- PhysioApp — Migration 005 : effacement RGPD art.17 (erasure-1)
-- À exécuter dans : Supabase Dashboard → SQL Editor (après 004).
-- ============================================================
--
-- Contexte
-- --------
-- L'intégrité référentielle est DÉJÀ correcte : toutes les tables filles de
-- `patients` portent `on delete cascade` (cf. migration 001 — bilans,
-- bilans_intermediaires, notes_seance, objectifs, prescriptions,
-- closed_treatments, letters, patient_documents). Un `delete from patients`
-- efface donc automatiquement toutes les données liées, sans orphelin.
--
-- Ce qui MANQUAIT pour un véritable droit à l'effacement (art. 17 RGPD) :
--   1. une primitive ATOMIQUE et AUDITABLE déclenchable par le praticien ;
--   2. la récupération des chemins Storage à purger (le SQL n'efface pas les
--      objets du bucket `patient-docs` — c'est au client de les supprimer via
--      l'API Storage, la policy le permet déjà — cf. migration 001:275) ;
--   3. une trace prouvant que l'effacement a eu lieu (sans conserver de PII).
--
-- Cette migration ajoute :
--   - `erasure_log` : journal d'effacement (pas de PII — uniquement des UUID,
--     compteurs et horodatage), isolé par praticien via RLS ;
--   - `erase_patient(uuid, text)` : fonction SECURITY DEFINER qui vérifie la
--     propriété, journalise, supprime (cascade) et RENVOIE les chemins Storage
--     à purger côté client.
--
-- ADDITIVE et DORMANTE : la fonction n'est appelée nulle part tant que l'UI
-- (bouton « Supprimer définitivement ») n'est pas câblée (cf.
-- docs/legal/ACTIONS_REQUISES.md §H) → application immédiate SANS RÉGRESSION.
-- IDEMPOTENTE : create table if not exists / create or replace function.
-- ============================================================

-- 1. Journal d'effacement (preuve de conformité, sans donnée nominative).
create table if not exists erasure_log (
  id bigserial primary key,
  practitioner_id uuid not null,
  patient_id uuid not null,          -- UUID technique : le patient n'existe plus
  bilans_deleted integer,
  documents_deleted integer,
  reason text,
  erased_at timestamptz not null default now()
);

alter table erasure_log enable row level security;
drop policy if exists "own_data" on erasure_log;
create policy "own_data" on erasure_log
  for all using (practitioner_id = auth.uid()) with check (practitioner_id = auth.uid());

-- 2. Primitive d'effacement atomique et auditée.
create or replace function erase_patient(p_patient_id uuid, p_reason text default null)
returns text[]
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_practitioner uuid;
  v_paths text[];
  v_bilans integer;
  v_docs integer;
begin
  -- Vérifie la propriété : le praticien courant doit posséder ce patient.
  -- (SECURITY DEFINER contourne la RLS ; on réimpose donc le contrôle ici.)
  select practitioner_id into v_practitioner from patients where id = p_patient_id;
  if v_practitioner is null then
    raise exception 'Patient introuvable';
  end if;
  if v_practitioner is distinct from auth.uid() then
    raise exception 'Accès refusé : ce patient ne vous appartient pas';
  end if;

  -- Chemins Storage à purger côté client (le SQL ne supprime pas les objets).
  select coalesce(array_agg(storage_path) filter (where storage_path is not null), '{}')
    into v_paths
    from patient_documents where patient_id = p_patient_id;

  select count(*) into v_bilans from bilans          where patient_id = p_patient_id;
  select count(*) into v_docs   from patient_documents where patient_id = p_patient_id;

  -- Suppression : la cascade FK (migration 001) efface toutes les tables filles.
  delete from patients where id = p_patient_id;

  insert into erasure_log
    (practitioner_id, patient_id, bilans_deleted, documents_deleted, reason)
  values
    (v_practitioner, p_patient_id, v_bilans, v_docs, p_reason);

  return v_paths;
end;
$$;

-- Seuls les utilisateurs authentifiés peuvent l'appeler (jamais en anonyme).
revoke all on function erase_patient(uuid, text) from public;
grant execute on function erase_patient(uuid, text) to authenticated;

-- 3. Vérification (à lancer après) :
--   select proname, prosecdef from pg_proc where proname = 'erase_patient';
--   -- prosecdef = true (SECURITY DEFINER)

-- ============================================================
-- Rollback :
--   drop function if exists erase_patient(uuid, text);
--   drop table if exists erasure_log;
-- ============================================================

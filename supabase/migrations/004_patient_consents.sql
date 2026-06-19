-- ============================================================
-- PhysioApp — Migration 004 : table patient_consents (consent-1)
-- À exécuter dans : Supabase Dashboard → SQL Editor (après 003).
-- ============================================================
--
-- Contexte
-- --------
-- Le consentement du patient (recueil verbal lors de la prise en charge, modèle
-- « Heidi ») n'est aujourd'hui tracé nulle part de façon structurée : ni la
-- source (verbal / écrit), ni l'horodatage, ni la version exacte de l'énoncé
-- présenté, ni une éventuelle révocation. Or l'art. 7 RGPD impose de pouvoir
-- DÉMONTRER le consentement, et l'art. 9 encadre les données de santé.
--
-- Cette migration crée une table d'enregistrement du consentement, isolée par
-- praticien (RLS identique au reste du schéma). Elle est :
--   - ADDITIVE et DORMANTE : aucune lecture/écriture par l'app tant que l'UI
--     de recueil n'est pas câblée (cf. docs/legal/ACTIONS_REQUISES.md §H) →
--     application immédiate SANS RÉGRESSION ;
--   - IDEMPOTENTE : create table if not exists, drop policy if exists.
--
-- Modèle de traçabilité
-- ---------------------
--   - Recueil          : une ligne par consentement accordé (granted_at).
--   - Révocation        : on renseigne `revoked_at` sur la ligne concernée
--                         (un consentement révoqué reste visible = preuve de la
--                         chronologie ; on ne supprime jamais la ligne).
--   - Version d'énoncé  : `script_version` lie le consentement au texte exact
--                         présenté au patient (auditabilité).
-- ============================================================

create table if not exists patient_consents (
  id uuid primary key default gen_random_uuid(),
  practitioner_id uuid not null references practitioners(id) on delete cascade,
  patient_id uuid not null references patients(id) on delete cascade,
  consent_type text not null
    check (consent_type in ('verbal', 'ecrit', 'email', 'formulaire')),
  source text,                       -- ex : 'telephone', 'en_cabinet', 'email', 'papier'
  granted_at timestamptz not null,   -- horodatage du recueil (UTC)
  revoked_at timestamptz,            -- non null ⇒ consentement retiré
  script_version text,               -- version exacte de l'énoncé présenté au patient
  notes text,
  created_at timestamptz not null default now()
);

create index if not exists idx_consents_patient on patient_consents(patient_id);
create index if not exists idx_consents_practitioner on patient_consents(practitioner_id);

-- RLS : un praticien n'accède qu'aux consentements de ses propres patients.
alter table patient_consents enable row level security;
drop policy if exists "own_data" on patient_consents;
create policy "own_data" on patient_consents
  for all using (practitioner_id = auth.uid()) with check (practitioner_id = auth.uid());

-- ============================================================
-- Rollback :
--   drop table if exists patient_consents;
-- ============================================================

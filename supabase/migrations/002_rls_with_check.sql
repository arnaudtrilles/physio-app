-- ============================================================
-- PhysioApp — Migration 002 : WITH CHECK explicite sur les politiques RLS
-- À exécuter dans : Supabase Dashboard → SQL Editor (après 001).
-- ============================================================
--
-- Contexte
-- --------
-- Les politiques de 001 sont déclarées « FOR ALL USING (practitioner_id =
-- auth.uid()) » sans clause WITH CHECK. PostgreSQL réutilise alors
-- automatiquement l'expression USING comme WITH CHECK pour les INSERT/UPDATE :
-- l'isolation en écriture est donc DÉJÀ effective (un praticien ne peut pas
-- insérer/réassigner une ligne au nom d'un autre).
--
-- Cette migration rend cette protection EXPLICITE. Bénéfices :
--   1. Auditabilité : un juriste / auditeur lit noir sur blanc que l'écriture
--      est verrouillée par propriétaire, sans avoir à connaître la sémantique
--      implicite de PostgreSQL.
--   2. Robustesse : si une politique est un jour réécrite avec un USING plus
--      permissif (ex. partage cabinet), le WITH CHECK reste une barrière
--      indépendante contre l'écriture cross-compte.
--
-- Idempotent : DROP POLICY IF EXISTS puis CREATE. Réexécutable sans erreur.
-- ============================================================

-- practitioners : la ligne appartient à l'utilisateur si son id = auth.uid()
drop policy if exists "own_data" on practitioners;
create policy "own_data" on practitioners
  for all
  using (id = auth.uid())
  with check (id = auth.uid());

-- Toutes les autres tables : propriété via practitioner_id
drop policy if exists "own_data" on patients;
create policy "own_data" on patients
  for all using (practitioner_id = auth.uid()) with check (practitioner_id = auth.uid());

drop policy if exists "own_data" on bilans;
create policy "own_data" on bilans
  for all using (practitioner_id = auth.uid()) with check (practitioner_id = auth.uid());

drop policy if exists "own_data" on bilans_intermediaires;
create policy "own_data" on bilans_intermediaires
  for all using (practitioner_id = auth.uid()) with check (practitioner_id = auth.uid());

drop policy if exists "own_data" on notes_seance;
create policy "own_data" on notes_seance
  for all using (practitioner_id = auth.uid()) with check (practitioner_id = auth.uid());

drop policy if exists "own_data" on objectifs;
create policy "own_data" on objectifs
  for all using (practitioner_id = auth.uid()) with check (practitioner_id = auth.uid());

drop policy if exists "own_data" on prescriptions;
create policy "own_data" on prescriptions
  for all using (practitioner_id = auth.uid()) with check (practitioner_id = auth.uid());

drop policy if exists "own_data" on closed_treatments;
create policy "own_data" on closed_treatments
  for all using (practitioner_id = auth.uid()) with check (practitioner_id = auth.uid());

drop policy if exists "own_data" on letters;
create policy "own_data" on letters
  for all using (practitioner_id = auth.uid()) with check (practitioner_id = auth.uid());

drop policy if exists "own_data" on patient_documents;
create policy "own_data" on patient_documents
  for all using (practitioner_id = auth.uid()) with check (practitioner_id = auth.uid());

drop policy if exists "own_data" on exercice_bank;
create policy "own_data" on exercice_bank
  for all using (practitioner_id = auth.uid()) with check (practitioner_id = auth.uid());

drop policy if exists "own_data" on letter_audit;
create policy "own_data" on letter_audit
  for all using (practitioner_id = auth.uid()) with check (practitioner_id = auth.uid());

drop policy if exists "own_data" on ai_call_audit;
create policy "own_data" on ai_call_audit
  for all using (practitioner_id = auth.uid()) with check (practitioner_id = auth.uid());

-- Vérification en prod :
--   select tablename, policyname, qual, with_check
--   from pg_policies where policyname = 'own_data' order by tablename;
--   -- la colonne with_check ne doit plus être NULL.

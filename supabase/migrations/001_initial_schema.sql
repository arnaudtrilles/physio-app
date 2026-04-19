-- ============================================================
-- PhysioApp — Supabase Schema
-- Run this in the Supabase SQL Editor (Dashboard → SQL Editor)
-- ============================================================

-- 1. Practitioners (linked to auth.users)
create table practitioners (
  id uuid primary key references auth.users(id) on delete cascade,
  nom text not null default '',
  prenom text not null default '',
  profession text not null default 'Kinésithérapeute',
  photo text,
  specialites text[] default '{}',
  techniques text[] default '{}',
  equipements text[] default '{}',
  autres_competences text,
  rcc text,
  adresse text,
  adresse_complement text,
  code_postal text,
  ville text,
  telephone text,
  email text,
  signature_image text,
  specialisations_libelle text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 2. Patients
create table patients (
  id uuid primary key default gen_random_uuid(),
  practitioner_id uuid not null references practitioners(id) on delete cascade,
  nom text not null,
  prenom text not null,
  date_naissance text,
  avatar_bg text,
  patient_key text generated always as (nom || ' ' || prenom) stored,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index idx_patients_practitioner on patients(practitioner_id);
create index idx_patients_key on patients(practitioner_id, patient_key);

-- 3. Bilans (initial assessments)
create table bilans (
  id bigserial primary key,
  practitioner_id uuid not null references practitioners(id) on delete cascade,
  patient_id uuid not null references patients(id) on delete cascade,
  date_bilan text,
  zone_count integer default 0,
  evn numeric,
  zone text,
  pathologie text,
  status text default 'complet',
  custom_label text,
  bilan_type text,
  bilan_data jsonb default '{}',
  notes text,
  silhouette_data jsonb,
  documents jsonb default '[]',
  analyse_ia jsonb,
  fiche_exercice jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index idx_bilans_patient on bilans(patient_id);
create index idx_bilans_practitioner on bilans(practitioner_id);

-- 4. Bilans intermédiaires
create table bilans_intermediaires (
  id bigserial primary key,
  practitioner_id uuid not null references practitioners(id) on delete cascade,
  patient_id uuid not null references patients(id) on delete cascade,
  date_bilan text,
  zone text,
  bilan_type text,
  data jsonb default '{}',
  status text default 'complet',
  notes text,
  analyse_ia jsonb,
  fiche_exercice jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index idx_bilans_interm_patient on bilans_intermediaires(patient_id);

-- 5. Notes de séance
create table notes_seance (
  id bigserial primary key,
  practitioner_id uuid not null references practitioners(id) on delete cascade,
  patient_id uuid not null references patients(id) on delete cascade,
  date_seance text,
  num_seance text,
  zone text,
  bilan_type text,
  data jsonb not null default '{}',
  analyse_ia jsonb,
  fiche_exercice jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index idx_notes_patient on notes_seance(patient_id);

-- 6. Objectifs SMART
create table objectifs (
  id bigserial primary key,
  practitioner_id uuid not null references practitioners(id) on delete cascade,
  patient_id uuid not null references patients(id) on delete cascade,
  zone text not null default 'Général',
  titre text not null,
  cible text not null,
  date_cible text,
  status text not null default 'en_cours',
  created_at timestamptz not null default now()
);
create index idx_objectifs_patient on objectifs(patient_id);

-- 7. Prescriptions
create table prescriptions (
  id bigserial primary key,
  practitioner_id uuid not null references practitioners(id) on delete cascade,
  patient_id uuid not null references patients(id) on delete cascade,
  nb_seances integer not null,
  date_prescription text,
  prescripteur text,
  bilan_type text,
  custom_label text,
  document jsonb,
  seances_anterieures integer default 0,
  created_at timestamptz not null default now()
);
create index idx_prescriptions_patient on prescriptions(patient_id);

-- 8. Traitements clôturés
create table closed_treatments (
  id bigserial primary key,
  practitioner_id uuid not null references practitioners(id) on delete cascade,
  patient_id uuid not null references patients(id) on delete cascade,
  bilan_type text not null,
  zone text,
  closed_at timestamptz not null default now(),
  note text
);
create index idx_closed_patient on closed_treatments(patient_id);

-- 9. Courriers
create table letters (
  id bigserial primary key,
  practitioner_id uuid not null references practitioners(id) on delete cascade,
  patient_id uuid not null references patients(id) on delete cascade,
  type text not null,
  form_data jsonb not null default '{}',
  contenu text not null default '',
  titre_affichage text,
  status text not null default 'brouillon',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index idx_letters_patient on letters(patient_id);

-- 10. Documents patient
create table patient_documents (
  id uuid primary key default gen_random_uuid(),
  practitioner_id uuid not null references practitioners(id) on delete cascade,
  patient_id uuid not null references patients(id) on delete cascade,
  name text not null,
  mime_type text not null,
  storage_path text, -- pointer to Supabase Storage
  masked boolean default false,
  added_at timestamptz not null default now()
);
create index idx_docs_patient on patient_documents(patient_id);

-- 11. Banque d'exercices (globale par praticien)
create table exercice_bank (
  id text not null,
  practitioner_id uuid not null references practitioners(id) on delete cascade,
  nom text not null,
  zone text,
  bilan_type text,
  objectif text,
  position_depart text,
  mouvement text,
  dosage text,
  limite_securite text,
  first_seen_at timestamptz default now(),
  last_seen_at timestamptz default now(),
  occurrences integer default 1,
  primary key (id, practitioner_id)
);

-- 12. Audit — lettres
create table letter_audit (
  id bigserial primary key,
  practitioner_id uuid not null references practitioners(id) on delete cascade,
  letter_id bigint references letters(id) on delete set null,
  patient_key text,
  type text,
  pseudonymized boolean default true,
  pii_warnings_count integer default 0,
  model_used text,
  result_length integer,
  created_at timestamptz not null default now()
);

-- 13. Audit — appels IA
create table ai_call_audit (
  id bigserial primary key,
  practitioner_id uuid not null references practitioners(id) on delete cascade,
  category text not null,
  patient_key text,
  pseudonymized boolean default true,
  scrub_replacements integer default 0,
  has_documents boolean default false,
  documents_count integer default 0,
  documents_unmasked integer default 0,
  model_used text,
  prompt_length integer,
  result_length integer,
  success boolean default true,
  created_at timestamptz not null default now()
);

-- ============================================================
-- Row Level Security (RLS)
-- Each practitioner can only access their own data
-- ============================================================

alter table practitioners enable row level security;
alter table patients enable row level security;
alter table bilans enable row level security;
alter table bilans_intermediaires enable row level security;
alter table notes_seance enable row level security;
alter table objectifs enable row level security;
alter table prescriptions enable row level security;
alter table closed_treatments enable row level security;
alter table letters enable row level security;
alter table patient_documents enable row level security;
alter table exercice_bank enable row level security;
alter table letter_audit enable row level security;
alter table ai_call_audit enable row level security;

-- Policies: authenticated users access only their own rows
create policy "own_data" on practitioners for all using (id = auth.uid());
create policy "own_data" on patients for all using (practitioner_id = auth.uid());
create policy "own_data" on bilans for all using (practitioner_id = auth.uid());
create policy "own_data" on bilans_intermediaires for all using (practitioner_id = auth.uid());
create policy "own_data" on notes_seance for all using (practitioner_id = auth.uid());
create policy "own_data" on objectifs for all using (practitioner_id = auth.uid());
create policy "own_data" on prescriptions for all using (practitioner_id = auth.uid());
create policy "own_data" on closed_treatments for all using (practitioner_id = auth.uid());
create policy "own_data" on letters for all using (practitioner_id = auth.uid());
create policy "own_data" on patient_documents for all using (practitioner_id = auth.uid());
create policy "own_data" on exercice_bank for all using (practitioner_id = auth.uid());
create policy "own_data" on letter_audit for all using (practitioner_id = auth.uid());
create policy "own_data" on ai_call_audit for all using (practitioner_id = auth.uid());

-- ============================================================
-- Storage bucket for patient documents
-- ============================================================

insert into storage.buckets (id, name, public)
values ('patient-docs', 'patient-docs', false)
on conflict do nothing;

create policy "Practitioners upload own docs"
  on storage.objects for insert
  with check (bucket_id = 'patient-docs' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "Practitioners read own docs"
  on storage.objects for select
  using (bucket_id = 'patient-docs' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "Practitioners delete own docs"
  on storage.objects for delete
  using (bucket_id = 'patient-docs' and (storage.foldername(name))[1] = auth.uid()::text);

-- ============================================================
-- Auto-create practitioner row on signup
-- ============================================================

create or replace function handle_new_user()
returns trigger as $$
begin
  insert into practitioners (id, email)
  values (new.id, new.email);
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();

-- ============================================================
-- Updated_at trigger
-- ============================================================

create or replace function update_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger set_updated_at before update on practitioners for each row execute function update_updated_at();
create trigger set_updated_at before update on patients for each row execute function update_updated_at();
create trigger set_updated_at before update on bilans for each row execute function update_updated_at();
create trigger set_updated_at before update on bilans_intermediaires for each row execute function update_updated_at();
create trigger set_updated_at before update on notes_seance for each row execute function update_updated_at();
create trigger set_updated_at before update on letters for each row execute function update_updated_at();

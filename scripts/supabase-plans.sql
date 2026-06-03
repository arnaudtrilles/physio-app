-- ============================================================
-- PhysioScan — Migration Supabase pour les forfaits
-- À coller dans : Supabase Dashboard → SQL Editor → New query
-- ============================================================

-- 1. Ajouter les colonnes plan + Stripe sur la table profiles
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS plan TEXT NOT NULL DEFAULT 'basique'
    CHECK (plan IN ('basique', 'pro', 'cabinet')),
  ADD COLUMN IF NOT EXISTS stripe_customer_id TEXT,
  ADD COLUMN IF NOT EXISTS stripe_subscription_id TEXT,
  ADD COLUMN IF NOT EXISTS plan_expires_at TIMESTAMPTZ;

-- 2. Table organisations (forfait Cabinet)
CREATE TABLE IF NOT EXISTS organizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  plan TEXT NOT NULL DEFAULT 'cabinet' CHECK (plan IN ('cabinet')),
  stripe_customer_id TEXT,
  stripe_subscription_id TEXT,
  seat_count INT NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 3. Table membres d'organisation
CREATE TABLE IF NOT EXISTS organization_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('admin', 'member')),
  joined_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(organization_id, user_id)
);

-- 4. RLS — organization_members visible seulement par les membres du même cabinet
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE organization_members ENABLE ROW LEVEL SECURITY;

CREATE POLICY "members_see_own_org" ON organizations
  FOR SELECT USING (
    id IN (
      SELECT organization_id FROM organization_members WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "members_see_own_memberships" ON organization_members
  FOR SELECT USING (
    organization_id IN (
      SELECT organization_id FROM organization_members WHERE user_id = auth.uid()
    )
  );

-- Seul l'admin du cabinet peut inviter/retirer des membres
CREATE POLICY "admin_manage_members" ON organization_members
  FOR ALL USING (
    organization_id IN (
      SELECT organization_id FROM organization_members
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

-- 5. Table idempotence Stripe (évite de traiter deux fois le même événement)
CREATE TABLE IF NOT EXISTS stripe_events (
  id TEXT PRIMARY KEY,
  processed_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Purge automatique des événements > 30 jours (optionnel, via pg_cron si activé)
-- SELECT cron.schedule('purge-stripe-events', '0 3 * * *', $$
--   DELETE FROM stripe_events WHERE processed_at < now() - interval '30 days';
-- $$);

-- 6. Index utiles
CREATE INDEX IF NOT EXISTS idx_org_members_user ON organization_members(user_id);
CREATE INDEX IF NOT EXISTS idx_org_members_org ON organization_members(organization_id);
CREATE INDEX IF NOT EXISTS idx_profiles_stripe_customer ON profiles(stripe_customer_id);

-- 7. RLS sur profiles (plan + identifiants Stripe = données sensibles)
-- Sans RLS, tout utilisateur authentifié (clé anon) pouvait lire/écrire TOUTES les
-- lignes profiles. On verrouille en LECTURE SEULE de sa propre ligne : un client ne
-- peut donc PAS s'auto-attribuer un plan payant (UPDATE refusé côté anon). Toutes les
-- écritures légitimes du plan passent par le webhook Stripe et admin-stats, qui
-- utilisent la clé service_role et contournent la RLS.
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "own_profile_select" ON profiles;
CREATE POLICY "own_profile_select" ON profiles
  FOR SELECT USING (id = auth.uid());

-- Vérification en prod : SELECT relrowsecurity FROM pg_class WHERE relname = 'profiles'; -- doit valoir true

-- Migration: 00001_create_tenants_and_auth
-- Description: Core tenant structure, user associations, and permissions
-- Author: Dara (Data Engineer)
-- Date: 2026-04-01

-- =============================================================================
-- EXTENSIONS
-- =============================================================================
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";   -- For text search (mining, influencer search)

-- =============================================================================
-- HELPER FUNCTIONS (used by RLS and triggers across all tables)
-- =============================================================================

-- Get the current authenticated user's tenant_id
CREATE OR REPLACE FUNCTION public.get_user_tenant_id()
RETURNS UUID
LANGUAGE SQL
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT tenant_id
  FROM public.tenant_users
  WHERE user_id = auth.uid()
  LIMIT 1;
$$;

COMMENT ON FUNCTION public.get_user_tenant_id() IS
  'Returns the tenant_id for the currently authenticated user. Used by RLS policies.';

-- Check if current user has a specific permission (admin always has all)
CREATE OR REPLACE FUNCTION public.has_permission(perm TEXT)
RETURNS BOOLEAN
LANGUAGE SQL
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT EXISTS(
    SELECT 1 FROM public.tenant_users
    WHERE user_id = auth.uid()
      AND tenant_id = public.get_user_tenant_id()
      AND role = 'admin'
  )
  OR EXISTS(
    SELECT 1 FROM public.user_permissions
    WHERE user_id = auth.uid()
      AND tenant_id = public.get_user_tenant_id()
      AND permission_key = perm
      AND granted = true
  );
$$;

COMMENT ON FUNCTION public.has_permission(TEXT) IS
  'Checks if current user has a specific permission. Admin role bypasses all checks.';

-- Auto-update updated_at on row modification
CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION public.update_updated_at() IS
  'Trigger function to auto-set updated_at timestamp on UPDATE.';

-- =============================================================================
-- TENANTS
-- =============================================================================

CREATE TABLE public.tenants (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name        TEXT NOT NULL CHECK (char_length(name) BETWEEN 2 AND 100),
  slug        TEXT NOT NULL UNIQUE CHECK (slug ~ '^[a-z0-9][a-z0-9-]{1,48}[a-z0-9]$'),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.tenants IS 'Each tenant represents a D2C brand account. Complete data isolation via RLS.';
COMMENT ON COLUMN public.tenants.slug IS 'URL-safe identifier. Lowercase alphanumeric + hyphens, 3-50 chars.';

CREATE TRIGGER trg_tenants_updated_at
  BEFORE UPDATE ON public.tenants
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- =============================================================================
-- TENANT USERS (join table: auth.users <-> tenants)
-- =============================================================================

CREATE TABLE public.tenant_users (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id   UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role        TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('admin', 'member')),
  invited_by  UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(tenant_id, user_id)
);

COMMENT ON TABLE public.tenant_users IS 'Associates Supabase Auth users with tenants. One user = one tenant.';

CREATE INDEX idx_tenant_users_user ON public.tenant_users(user_id);
CREATE INDEX idx_tenant_users_tenant ON public.tenant_users(tenant_id);

-- =============================================================================
-- USER PERMISSIONS (granular, checkbox-based)
-- =============================================================================

CREATE TABLE public.user_permissions (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  user_id         UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  permission_key  TEXT NOT NULL CHECK (permission_key IN (
    'campaigns.view', 'campaigns.edit',
    'influencers.view', 'influencers.edit',
    'financials.view',
    'mining.view',
    'branding.edit',
    'team.manage'
  )),
  granted         BOOLEAN NOT NULL DEFAULT false,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(tenant_id, user_id, permission_key)
);

COMMENT ON TABLE public.user_permissions IS 'Granular permissions per user per tenant. Admin role bypasses these.';

CREATE INDEX idx_user_permissions_lookup ON public.user_permissions(user_id, tenant_id, permission_key)
  WHERE granted = true;

-- =============================================================================
-- RLS POLICIES — TENANTS & AUTH
-- =============================================================================

ALTER TABLE public.tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tenant_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_permissions ENABLE ROW LEVEL SECURITY;

-- Tenants: users only see their own tenant
CREATE POLICY "tenant_select_own" ON public.tenants
  FOR SELECT USING (id = public.get_user_tenant_id());

CREATE POLICY "tenant_update_own" ON public.tenants
  FOR UPDATE USING (id = public.get_user_tenant_id());

-- Tenant users: see members of own tenant
CREATE POLICY "tenant_users_select" ON public.tenant_users
  FOR SELECT USING (tenant_id = public.get_user_tenant_id());

CREATE POLICY "tenant_users_insert" ON public.tenant_users
  FOR INSERT WITH CHECK (tenant_id = public.get_user_tenant_id());

CREATE POLICY "tenant_users_delete" ON public.tenant_users
  FOR DELETE USING (
    tenant_id = public.get_user_tenant_id()
    AND public.has_permission('team.manage')
  );

-- Permissions: manage own tenant's permissions
CREATE POLICY "permissions_select" ON public.user_permissions
  FOR SELECT USING (tenant_id = public.get_user_tenant_id());

CREATE POLICY "permissions_insert" ON public.user_permissions
  FOR INSERT WITH CHECK (
    tenant_id = public.get_user_tenant_id()
    AND public.has_permission('team.manage')
  );

CREATE POLICY "permissions_update" ON public.user_permissions
  FOR UPDATE USING (
    tenant_id = public.get_user_tenant_id()
    AND public.has_permission('team.manage')
  );

CREATE POLICY "permissions_delete" ON public.user_permissions
  FOR DELETE USING (
    tenant_id = public.get_user_tenant_id()
    AND public.has_permission('team.manage')
  );

-- =============================================================================
-- AUTO-CREATE TENANT ON USER SIGNUP (Supabase Auth trigger)
-- =============================================================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_tenant_id UUID;
  v_slug TEXT;
BEGIN
  -- Generate slug from email prefix
  v_slug := lower(regexp_replace(split_part(NEW.email, '@', 1), '[^a-z0-9]', '-', 'g'));
  -- Ensure minimum length
  IF char_length(v_slug) < 3 THEN
    v_slug := v_slug || '-brand';
  END IF;
  -- Ensure uniqueness
  WHILE EXISTS(SELECT 1 FROM public.tenants WHERE slug = v_slug) LOOP
    v_slug := v_slug || '-' || substr(gen_random_uuid()::text, 1, 4);
  END LOOP;

  -- Create tenant
  INSERT INTO public.tenants (name, slug)
  VALUES (split_part(NEW.email, '@', 1), v_slug)
  RETURNING id INTO v_tenant_id;

  -- Link user as admin
  INSERT INTO public.tenant_users (tenant_id, user_id, role)
  VALUES (v_tenant_id, NEW.id, 'admin');

  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

COMMENT ON FUNCTION public.handle_new_user() IS
  'Auto-creates a tenant and admin association when a new user signs up via Supabase Auth.';

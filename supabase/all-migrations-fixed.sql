-- ================================================================
-- INFLUTRACK - ALL MIGRATIONS (ORDER FIXED)
-- Run this in Supabase SQL Editor in one go
-- ================================================================

-- =============================================================================
-- EXTENSIONS
-- =============================================================================
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- =============================================================================
-- HELPER: update_updated_at (no table dependency)
-- =============================================================================
CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- =============================================================================
-- 1. TENANTS
-- =============================================================================
CREATE TABLE public.tenants (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name        TEXT NOT NULL CHECK (char_length(name) BETWEEN 2 AND 100),
  slug        TEXT NOT NULL UNIQUE CHECK (slug ~ '^[a-z0-9][a-z0-9-]{1,48}[a-z0-9]$'),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TRIGGER trg_tenants_updated_at
  BEFORE UPDATE ON public.tenants
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- =============================================================================
-- 2. TENANT USERS
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

CREATE INDEX idx_tenant_users_user ON public.tenant_users(user_id);
CREATE INDEX idx_tenant_users_tenant ON public.tenant_users(tenant_id);

-- =============================================================================
-- 3. USER PERMISSIONS
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

CREATE INDEX idx_user_permissions_lookup ON public.user_permissions(user_id, tenant_id, permission_key)
  WHERE granted = true;

-- =============================================================================
-- NOW: HELPER FUNCTIONS (tables exist)
-- =============================================================================

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

-- =============================================================================
-- RLS: TENANTS & AUTH
-- =============================================================================
ALTER TABLE public.tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tenant_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_permissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "tenant_select_own" ON public.tenants
  FOR SELECT USING (id = public.get_user_tenant_id());
CREATE POLICY "tenant_update_own" ON public.tenants
  FOR UPDATE USING (id = public.get_user_tenant_id());

CREATE POLICY "tenant_users_select" ON public.tenant_users
  FOR SELECT USING (tenant_id = public.get_user_tenant_id());
CREATE POLICY "tenant_users_insert" ON public.tenant_users
  FOR INSERT WITH CHECK (tenant_id = public.get_user_tenant_id());
CREATE POLICY "tenant_users_delete" ON public.tenant_users
  FOR DELETE USING (
    tenant_id = public.get_user_tenant_id()
    AND public.has_permission('team.manage')
  );

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
-- AUTO-CREATE TENANT ON SIGNUP
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
  v_slug := lower(regexp_replace(split_part(NEW.email, '@', 1), '[^a-z0-9]', '-', 'g'));
  IF char_length(v_slug) < 3 THEN
    v_slug := v_slug || '-brand';
  END IF;
  WHILE EXISTS(SELECT 1 FROM public.tenants WHERE slug = v_slug) LOOP
    v_slug := v_slug || '-' || substr(gen_random_uuid()::text, 1, 4);
  END LOOP;

  INSERT INTO public.tenants (name, slug)
  VALUES (split_part(NEW.email, '@', 1), v_slug)
  RETURNING id INTO v_tenant_id;

  INSERT INTO public.tenant_users (tenant_id, user_id, role)
  VALUES (v_tenant_id, NEW.id, 'admin');

  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- =============================================================================
-- 4. BRAND ASSETS
-- =============================================================================
CREATE TABLE public.brand_assets (
  id                          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id                   UUID NOT NULL UNIQUE REFERENCES public.tenants(id) ON DELETE CASCADE,
  brand_name                  TEXT,
  mission                     TEXT,
  vision                      TEXT,
  "values"                    TEXT[] DEFAULT '{}',
  tone_of_voice               TEXT,
  target_audience             TEXT,
  customer_pain_points        TEXT[] DEFAULT '{}',
  product_benefits            TEXT[] DEFAULT '{}',
  competitive_differentiators TEXT[] DEFAULT '{}',
  brand_keywords              TEXT[] DEFAULT '{}',
  created_at                  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at                  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TRIGGER trg_brand_assets_updated_at
  BEFORE UPDATE ON public.brand_assets
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE TABLE public.brand_visual_identity (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       UUID NOT NULL UNIQUE REFERENCES public.tenants(id) ON DELETE CASCADE,
  logo_url        TEXT,
  color_palette   JSONB NOT NULL DEFAULT '[]'::jsonb,
  primary_font    TEXT,
  secondary_font  TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TRIGGER trg_brand_visual_updated_at
  BEFORE UPDATE ON public.brand_visual_identity
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

ALTER TABLE public.brand_assets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.brand_visual_identity ENABLE ROW LEVEL SECURITY;

CREATE POLICY "brand_assets_select" ON public.brand_assets
  FOR SELECT USING (tenant_id = public.get_user_tenant_id());
CREATE POLICY "brand_assets_insert" ON public.brand_assets
  FOR INSERT WITH CHECK (tenant_id = public.get_user_tenant_id() AND public.has_permission('branding.edit'));
CREATE POLICY "brand_assets_update" ON public.brand_assets
  FOR UPDATE USING (tenant_id = public.get_user_tenant_id() AND public.has_permission('branding.edit'));

CREATE POLICY "brand_visual_select" ON public.brand_visual_identity
  FOR SELECT USING (tenant_id = public.get_user_tenant_id());
CREATE POLICY "brand_visual_insert" ON public.brand_visual_identity
  FOR INSERT WITH CHECK (tenant_id = public.get_user_tenant_id() AND public.has_permission('branding.edit'));
CREATE POLICY "brand_visual_update" ON public.brand_visual_identity
  FOR UPDATE USING (tenant_id = public.get_user_tenant_id() AND public.has_permission('branding.edit'));

-- =============================================================================
-- 5. INFLUENCERS
-- =============================================================================
CREATE TABLE public.influencers (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id         UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  name              TEXT NOT NULL CHECK (char_length(name) BETWEEN 1 AND 200),
  email             TEXT,
  phone             TEXT,
  instagram_handle  TEXT,
  tiktok_handle     TEXT,
  youtube_handle    TEXT,
  city              TEXT,
  state             TEXT,
  niche             TEXT,
  coupon_code       TEXT NOT NULL CHECK (char_length(coupon_code) BETWEEN 1 AND 50),
  avatar_url        TEXT,
  is_archived       BOOLEAN NOT NULL DEFAULT false,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(tenant_id, coupon_code)
);

CREATE INDEX idx_influencers_tenant ON public.influencers(tenant_id) WHERE NOT is_archived;
CREATE INDEX idx_influencers_coupon_lookup ON public.influencers(tenant_id, upper(coupon_code)) WHERE NOT is_archived;
CREATE INDEX idx_influencers_name_search ON public.influencers USING gin(name gin_trgm_ops);

CREATE TRIGGER trg_influencers_updated_at
  BEFORE UPDATE ON public.influencers
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE OR REPLACE FUNCTION public.normalize_coupon_code()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.coupon_code := upper(trim(NEW.coupon_code));
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_influencers_normalize_coupon
  BEFORE INSERT OR UPDATE OF coupon_code ON public.influencers
  FOR EACH ROW EXECUTE FUNCTION public.normalize_coupon_code();

CREATE TABLE public.influencer_growth_history (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  influencer_id   UUID NOT NULL REFERENCES public.influencers(id) ON DELETE CASCADE,
  tenant_id       UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  record_date     DATE NOT NULL,
  platform        TEXT NOT NULL CHECK (platform IN ('instagram', 'tiktok', 'youtube')),
  followers       INTEGER CHECK (followers >= 0),
  engagement_rate DECIMAL(5,2) CHECK (engagement_rate >= 0 AND engagement_rate <= 100),
  posts_count     INTEGER CHECK (posts_count >= 0),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(influencer_id, record_date, platform)
);

CREATE INDEX idx_growth_influencer_date ON public.influencer_growth_history(influencer_id, record_date DESC);
CREATE INDEX idx_growth_tenant ON public.influencer_growth_history(tenant_id);

ALTER TABLE public.influencers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.influencer_growth_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "influencers_select" ON public.influencers
  FOR SELECT USING (tenant_id = public.get_user_tenant_id() AND public.has_permission('influencers.view'));
CREATE POLICY "influencers_insert" ON public.influencers
  FOR INSERT WITH CHECK (tenant_id = public.get_user_tenant_id() AND public.has_permission('influencers.edit'));
CREATE POLICY "influencers_update" ON public.influencers
  FOR UPDATE USING (tenant_id = public.get_user_tenant_id() AND public.has_permission('influencers.edit'));

CREATE POLICY "growth_select" ON public.influencer_growth_history
  FOR SELECT USING (tenant_id = public.get_user_tenant_id() AND public.has_permission('influencers.view'));
CREATE POLICY "growth_insert" ON public.influencer_growth_history
  FOR INSERT WITH CHECK (tenant_id = public.get_user_tenant_id() AND public.has_permission('influencers.edit'));

-- =============================================================================
-- 6. CAMPAIGNS
-- =============================================================================
CREATE TABLE public.campaigns (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id   UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  name        TEXT NOT NULL CHECK (char_length(name) BETWEEN 1 AND 200),
  description TEXT,
  budget      DECIMAL(12,2) CHECK (budget >= 0),
  start_date  DATE,
  end_date    DATE,
  status      TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'ended', 'archived')),
  is_archived BOOLEAN NOT NULL DEFAULT false,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT chk_campaign_dates CHECK (
    (start_date IS NULL AND end_date IS NULL) OR
    (start_date IS NOT NULL AND end_date IS NOT NULL AND end_date >= start_date)
  )
);

CREATE INDEX idx_campaigns_tenant ON public.campaigns(tenant_id) WHERE NOT is_archived;
CREATE INDEX idx_campaigns_status ON public.campaigns(tenant_id, status) WHERE NOT is_archived;

CREATE TRIGGER trg_campaigns_updated_at
  BEFORE UPDATE ON public.campaigns
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE OR REPLACE FUNCTION public.update_campaign_status()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.is_archived THEN
    NEW.status := 'archived';
    RETURN NEW;
  END IF;
  IF NEW.start_date IS NOT NULL AND NEW.end_date IS NOT NULL THEN
    IF CURRENT_DATE < NEW.start_date THEN NEW.status := 'draft';
    ELSIF CURRENT_DATE BETWEEN NEW.start_date AND NEW.end_date THEN NEW.status := 'active';
    ELSE NEW.status := 'ended';
    END IF;
  ELSE NEW.status := 'draft';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_campaign_status
  BEFORE INSERT OR UPDATE OF start_date, end_date, is_archived ON public.campaigns
  FOR EACH ROW EXECUTE FUNCTION public.update_campaign_status();

CREATE TABLE public.campaign_influencers (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id   UUID NOT NULL REFERENCES public.campaigns(id) ON DELETE CASCADE,
  influencer_id UUID NOT NULL REFERENCES public.influencers(id) ON DELETE CASCADE,
  tenant_id     UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  added_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(campaign_id, influencer_id)
);

CREATE INDEX idx_ci_campaign ON public.campaign_influencers(campaign_id);
CREATE INDEX idx_ci_influencer ON public.campaign_influencers(influencer_id);

ALTER TABLE public.campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.campaign_influencers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "campaigns_select" ON public.campaigns
  FOR SELECT USING (tenant_id = public.get_user_tenant_id() AND public.has_permission('campaigns.view'));
CREATE POLICY "campaigns_insert" ON public.campaigns
  FOR INSERT WITH CHECK (tenant_id = public.get_user_tenant_id() AND public.has_permission('campaigns.edit'));
CREATE POLICY "campaigns_update" ON public.campaigns
  FOR UPDATE USING (tenant_id = public.get_user_tenant_id() AND public.has_permission('campaigns.edit'));

CREATE POLICY "ci_select" ON public.campaign_influencers
  FOR SELECT USING (tenant_id = public.get_user_tenant_id() AND public.has_permission('campaigns.view'));
CREATE POLICY "ci_insert" ON public.campaign_influencers
  FOR INSERT WITH CHECK (tenant_id = public.get_user_tenant_id() AND public.has_permission('campaigns.edit'));
CREATE POLICY "ci_delete" ON public.campaign_influencers
  FOR DELETE USING (tenant_id = public.get_user_tenant_id() AND public.has_permission('campaigns.edit'));

-- =============================================================================
-- 7. PRODUCTS & INTEGRATIONS
-- =============================================================================
CREATE TABLE public.products (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id     UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  external_id   TEXT,
  name          TEXT NOT NULL CHECK (char_length(name) BETWEEN 1 AND 500),
  sku           TEXT,
  price         DECIMAL(12,2) NOT NULL CHECK (price >= 0),
  cost          DECIMAL(12,2) CHECK (cost >= 0),
  image_url     TEXT,
  source        TEXT NOT NULL DEFAULT 'manual' CHECK (source IN ('shopify', 'yampi', 'manual')),
  is_active     BOOLEAN NOT NULL DEFAULT true,
  synced_at     TIMESTAMPTZ,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(tenant_id, external_id, source)
);

CREATE INDEX idx_products_tenant ON public.products(tenant_id) WHERE is_active;

CREATE TRIGGER trg_products_updated_at
  BEFORE UPDATE ON public.products
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE TABLE public.integrations (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  provider        TEXT NOT NULL CHECK (provider IN ('shopify', 'yampi', 'apify')),
  credentials     JSONB NOT NULL DEFAULT '{}'::jsonb,
  status          TEXT NOT NULL DEFAULT 'disconnected' CHECK (status IN ('connected', 'disconnected', 'error')),
  last_sync_at    TIMESTAMPTZ,
  sync_interval   TEXT NOT NULL DEFAULT 'daily' CHECK (sync_interval IN ('6h', 'daily', 'manual')),
  config          JSONB NOT NULL DEFAULT '{}'::jsonb,
  error_message   TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(tenant_id, provider)
);

CREATE TRIGGER trg_integrations_updated_at
  BEFORE UPDATE ON public.integrations
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE TABLE public.sync_logs (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id     UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  provider      TEXT NOT NULL CHECK (provider IN ('shopify', 'yampi')),
  sync_type     TEXT NOT NULL CHECK (sync_type IN ('products', 'orders')),
  status        TEXT NOT NULL CHECK (status IN ('started', 'completed', 'failed')),
  items_synced  INTEGER DEFAULT 0,
  items_created INTEGER DEFAULT 0,
  items_updated INTEGER DEFAULT 0,
  items_failed  INTEGER DEFAULT 0,
  error_details JSONB,
  started_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at  TIMESTAMPTZ
);

ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.integrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sync_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "products_select" ON public.products
  FOR SELECT USING (tenant_id = public.get_user_tenant_id());
CREATE POLICY "products_update" ON public.products
  FOR UPDATE USING (tenant_id = public.get_user_tenant_id() AND public.has_permission('campaigns.edit'));
CREATE POLICY "products_insert" ON public.products
  FOR INSERT WITH CHECK (tenant_id = public.get_user_tenant_id());

CREATE POLICY "integrations_select" ON public.integrations
  FOR SELECT USING (tenant_id = public.get_user_tenant_id());
CREATE POLICY "integrations_insert" ON public.integrations
  FOR INSERT WITH CHECK (tenant_id = public.get_user_tenant_id() AND public.has_permission('team.manage'));
CREATE POLICY "integrations_update" ON public.integrations
  FOR UPDATE USING (tenant_id = public.get_user_tenant_id() AND public.has_permission('team.manage'));
CREATE POLICY "integrations_delete" ON public.integrations
  FOR DELETE USING (tenant_id = public.get_user_tenant_id() AND public.has_permission('team.manage'));

CREATE POLICY "sync_logs_select" ON public.sync_logs
  FOR SELECT USING (tenant_id = public.get_user_tenant_id());

-- =============================================================================
-- 8. ORDERS & ATTRIBUTION
-- =============================================================================
CREATE TABLE public.orders (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id     UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  external_id   TEXT NOT NULL,
  order_date    TIMESTAMPTZ NOT NULL,
  total_amount  DECIMAL(12,2) NOT NULL CHECK (total_amount >= 0),
  discount_code TEXT,
  source        TEXT NOT NULL CHECK (source IN ('shopify', 'yampi')),
  raw_data      JSONB,
  processed     BOOLEAN NOT NULL DEFAULT false,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(tenant_id, external_id, source)
);

CREATE INDEX idx_orders_tenant ON public.orders(tenant_id);
CREATE INDEX idx_orders_coupon ON public.orders(tenant_id, upper(discount_code)) WHERE discount_code IS NOT NULL;

CREATE TABLE public.order_items (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id            UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  tenant_id           UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  product_id          UUID REFERENCES public.products(id) ON DELETE SET NULL,
  external_product_id TEXT,
  product_name        TEXT NOT NULL,
  quantity            INTEGER NOT NULL DEFAULT 1 CHECK (quantity > 0),
  unit_price          DECIMAL(12,2) NOT NULL CHECK (unit_price >= 0),
  unit_cost           DECIMAL(12,2) CHECK (unit_cost >= 0),
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_order_items_order ON public.order_items(order_id);

CREATE TABLE public.order_attributions (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id      UUID NOT NULL UNIQUE REFERENCES public.orders(id) ON DELETE CASCADE,
  influencer_id UUID NOT NULL REFERENCES public.influencers(id) ON DELETE CASCADE,
  campaign_id   UUID REFERENCES public.campaigns(id) ON DELETE SET NULL,
  tenant_id     UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  attributed_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_attributions_influencer ON public.order_attributions(influencer_id);
CREATE INDEX idx_attributions_campaign ON public.order_attributions(campaign_id) WHERE campaign_id IS NOT NULL;

-- Attribution trigger
CREATE OR REPLACE FUNCTION public.process_order_attribution()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_influencer_id UUID;
  v_campaign_id UUID;
  v_normalized_code TEXT;
BEGIN
  IF NEW.discount_code IS NULL OR trim(NEW.discount_code) = '' THEN
    NEW.processed := true;
    RETURN NEW;
  END IF;
  v_normalized_code := upper(trim(NEW.discount_code));
  SELECT id INTO v_influencer_id FROM public.influencers
  WHERE tenant_id = NEW.tenant_id AND upper(coupon_code) = v_normalized_code AND NOT is_archived;
  IF v_influencer_id IS NULL THEN
    NEW.processed := true;
    RETURN NEW;
  END IF;
  SELECT c.id INTO v_campaign_id FROM public.campaigns c
  JOIN public.campaign_influencers ci ON ci.campaign_id = c.id
  WHERE c.tenant_id = NEW.tenant_id AND ci.influencer_id = v_influencer_id
    AND NOT c.is_archived AND c.start_date IS NOT NULL AND c.end_date IS NOT NULL
    AND NEW.order_date::date BETWEEN c.start_date AND c.end_date
  ORDER BY c.start_date DESC LIMIT 1;
  INSERT INTO public.order_attributions (order_id, influencer_id, campaign_id, tenant_id)
  VALUES (NEW.id, v_influencer_id, v_campaign_id, NEW.tenant_id)
  ON CONFLICT (order_id) DO NOTHING;
  NEW.processed := true;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_order_attribution
  AFTER INSERT ON public.orders
  FOR EACH ROW EXECUTE FUNCTION public.process_order_attribution();

-- Reprocess on campaign date change
CREATE OR REPLACE FUNCTION public.reprocess_campaign_attributions()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF OLD.start_date IS DISTINCT FROM NEW.start_date OR OLD.end_date IS DISTINCT FROM NEW.end_date THEN
    UPDATE public.order_attributions oa SET campaign_id = NULL
    WHERE oa.campaign_id = NEW.id AND oa.tenant_id = NEW.tenant_id
      AND NOT EXISTS (SELECT 1 FROM public.orders o WHERE o.id = oa.order_id AND o.order_date::date BETWEEN NEW.start_date AND NEW.end_date);
    UPDATE public.order_attributions oa SET campaign_id = NEW.id
    WHERE oa.campaign_id IS NULL AND oa.tenant_id = NEW.tenant_id
      AND EXISTS (SELECT 1 FROM public.campaign_influencers ci WHERE ci.campaign_id = NEW.id AND ci.influencer_id = oa.influencer_id)
      AND EXISTS (SELECT 1 FROM public.orders o WHERE o.id = oa.order_id AND o.order_date::date BETWEEN NEW.start_date AND NEW.end_date);
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_campaign_dates_changed
  AFTER UPDATE OF start_date, end_date ON public.campaigns
  FOR EACH ROW EXECUTE FUNCTION public.reprocess_campaign_attributions();

ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_attributions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "orders_select" ON public.orders
  FOR SELECT USING (tenant_id = public.get_user_tenant_id() AND public.has_permission('financials.view'));
CREATE POLICY "order_items_select" ON public.order_items
  FOR SELECT USING (tenant_id = public.get_user_tenant_id() AND public.has_permission('financials.view'));
CREATE POLICY "attributions_select" ON public.order_attributions
  FOR SELECT USING (tenant_id = public.get_user_tenant_id() AND public.has_permission('financials.view'));

-- =============================================================================
-- 9. MINING & ANALYSIS
-- =============================================================================
CREATE TABLE public.mining_searches (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id     UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  keywords      TEXT[] NOT NULL CHECK (array_length(keywords, 1) > 0),
  platforms     TEXT[] NOT NULL CHECK (platforms <@ ARRAY['instagram', 'tiktok']::TEXT[] AND array_length(platforms, 1) > 0),
  filters       JSONB NOT NULL DEFAULT '{}'::jsonb,
  results_count INTEGER NOT NULL DEFAULT 0 CHECK (results_count >= 0),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.mining_results (
  id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  search_id               UUID NOT NULL REFERENCES public.mining_searches(id) ON DELETE CASCADE,
  tenant_id               UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  platform                TEXT NOT NULL CHECK (platform IN ('instagram', 'tiktok')),
  handle                  TEXT NOT NULL,
  display_name            TEXT,
  followers               INTEGER CHECK (followers >= 0),
  engagement_rate         DECIMAL(5,2) CHECK (engagement_rate >= 0),
  niche_estimate          TEXT,
  profile_url             TEXT,
  avatar_url              TEXT,
  raw_data                JSONB,
  saved_as_influencer_id  UUID REFERENCES public.influencers(id) ON DELETE SET NULL,
  created_at              TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.analysis_history (
  id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id               UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  handle                  TEXT NOT NULL,
  platform                TEXT NOT NULL CHECK (platform IN ('instagram', 'tiktok', 'youtube')),
  analysis_data           JSONB NOT NULL,
  fit_score               INTEGER CHECK (fit_score BETWEEN 0 AND 100),
  fit_classification      TEXT CHECK (fit_classification IN ('recommended', 'neutral', 'not_recommended')),
  strengths               TEXT[] DEFAULT '{}',
  concerns                TEXT[] DEFAULT '{}',
  saved_as_influencer_id  UUID REFERENCES public.influencers(id) ON DELETE SET NULL,
  created_at              TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.mining_searches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mining_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.analysis_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "mining_searches_select" ON public.mining_searches
  FOR SELECT USING (tenant_id = public.get_user_tenant_id() AND public.has_permission('mining.view'));
CREATE POLICY "mining_searches_insert" ON public.mining_searches
  FOR INSERT WITH CHECK (tenant_id = public.get_user_tenant_id() AND public.has_permission('mining.view'));
CREATE POLICY "mining_results_select" ON public.mining_results
  FOR SELECT USING (tenant_id = public.get_user_tenant_id() AND public.has_permission('mining.view'));
CREATE POLICY "mining_results_insert" ON public.mining_results
  FOR INSERT WITH CHECK (tenant_id = public.get_user_tenant_id() AND public.has_permission('mining.view'));
CREATE POLICY "mining_results_update" ON public.mining_results
  FOR UPDATE USING (tenant_id = public.get_user_tenant_id() AND public.has_permission('mining.view'));
CREATE POLICY "analysis_select" ON public.analysis_history
  FOR SELECT USING (tenant_id = public.get_user_tenant_id() AND public.has_permission('mining.view'));
CREATE POLICY "analysis_insert" ON public.analysis_history
  FOR INSERT WITH CHECK (tenant_id = public.get_user_tenant_id() AND public.has_permission('mining.view'));

-- =============================================================================
-- 10. AUDIT LOG & VIEWS
-- =============================================================================
CREATE TABLE public.audit_logs (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id   UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  action      TEXT NOT NULL CHECK (char_length(action) <= 100),
  entity_type TEXT NOT NULL CHECK (char_length(entity_type) <= 50),
  entity_id   UUID,
  metadata    JSONB NOT NULL DEFAULT '{}'::jsonb,
  ip_address  INET,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_audit_tenant_date ON public.audit_logs(tenant_id, created_at DESC);
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "audit_select" ON public.audit_logs
  FOR SELECT USING (tenant_id = public.get_user_tenant_id());

CREATE OR REPLACE FUNCTION public.audit_log(
  p_action TEXT, p_entity_type TEXT, p_entity_id UUID DEFAULT NULL, p_metadata JSONB DEFAULT '{}'::jsonb
) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.audit_logs (tenant_id, user_id, action, entity_type, entity_id, metadata)
  VALUES (public.get_user_tenant_id(), auth.uid(), p_action, p_entity_type, p_entity_id, p_metadata);
END;
$$;

-- Metrics Views
CREATE OR REPLACE VIEW public.v_influencer_metrics AS
SELECT
  oa.influencer_id, oa.tenant_id,
  COUNT(DISTINCT oa.order_id) AS total_orders,
  COALESCE(SUM(o.total_amount), 0)::DECIMAL(12,2) AS total_revenue,
  COALESCE(SUM(sub.item_cost), 0)::DECIMAL(12,2) AS total_cost,
  (COALESCE(SUM(o.total_amount), 0) - COALESCE(SUM(sub.item_cost), 0))::DECIMAL(12,2) AS total_profit,
  COUNT(DISTINCT oa.campaign_id) FILTER (WHERE oa.campaign_id IS NOT NULL) AS campaigns_count
FROM public.order_attributions oa
JOIN public.orders o ON o.id = oa.order_id
LEFT JOIN LATERAL (
  SELECT COALESCE(SUM(oi.unit_cost * oi.quantity), 0) AS item_cost
  FROM public.order_items oi WHERE oi.order_id = o.id
) sub ON true
GROUP BY oa.influencer_id, oa.tenant_id;

CREATE OR REPLACE VIEW public.v_campaign_metrics AS
SELECT
  oa.campaign_id, oa.tenant_id,
  COUNT(DISTINCT oa.order_id) AS total_orders,
  COALESCE(SUM(o.total_amount), 0)::DECIMAL(12,2) AS total_revenue,
  COALESCE(SUM(sub.item_cost), 0)::DECIMAL(12,2) AS total_cost,
  (COALESCE(SUM(o.total_amount), 0) - COALESCE(SUM(sub.item_cost), 0))::DECIMAL(12,2) AS total_profit,
  COUNT(DISTINCT oa.influencer_id) AS influencers_count
FROM public.order_attributions oa
JOIN public.orders o ON o.id = oa.order_id
LEFT JOIN LATERAL (
  SELECT COALESCE(SUM(oi.unit_cost * oi.quantity), 0) AS item_cost
  FROM public.order_items oi WHERE oi.order_id = o.id
) sub ON true
WHERE oa.campaign_id IS NOT NULL
GROUP BY oa.campaign_id, oa.tenant_id;

CREATE OR REPLACE VIEW public.v_campaign_influencer_metrics AS
SELECT
  oa.campaign_id, oa.influencer_id, oa.tenant_id,
  COUNT(DISTINCT oa.order_id) AS total_orders,
  COALESCE(SUM(o.total_amount), 0)::DECIMAL(12,2) AS total_revenue,
  COALESCE(SUM(sub.item_cost), 0)::DECIMAL(12,2) AS total_cost,
  (COALESCE(SUM(o.total_amount), 0) - COALESCE(SUM(sub.item_cost), 0))::DECIMAL(12,2) AS total_profit
FROM public.order_attributions oa
JOIN public.orders o ON o.id = oa.order_id
LEFT JOIN LATERAL (
  SELECT COALESCE(SUM(oi.unit_cost * oi.quantity), 0) AS item_cost
  FROM public.order_items oi WHERE oi.order_id = o.id
) sub ON true
WHERE oa.campaign_id IS NOT NULL
GROUP BY oa.campaign_id, oa.influencer_id, oa.tenant_id;

-- =============================================================================
-- DONE! All 19 tables, 5 views, triggers, and RLS policies created.
-- =============================================================================

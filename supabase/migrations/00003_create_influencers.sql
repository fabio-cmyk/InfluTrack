-- Migration: 00003_create_influencers
-- Description: Influencer profiles and growth history tracking
-- Author: Dara (Data Engineer)
-- Date: 2026-04-01

-- =============================================================================
-- INFLUENCERS
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

COMMENT ON TABLE public.influencers IS 'Influencer profiles. Each has a unique coupon_code per tenant for sales attribution.';
COMMENT ON COLUMN public.influencers.coupon_code IS 'Unique coupon within tenant. Stored UPPERCASE. Matched against order discount codes.';

-- Indexes for common access patterns
CREATE INDEX idx_influencers_tenant ON public.influencers(tenant_id) WHERE NOT is_archived;
CREATE INDEX idx_influencers_coupon_lookup ON public.influencers(tenant_id, upper(coupon_code)) WHERE NOT is_archived;
CREATE INDEX idx_influencers_name_search ON public.influencers USING gin(name gin_trgm_ops);

CREATE TRIGGER trg_influencers_updated_at
  BEFORE UPDATE ON public.influencers
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- Normalize coupon_code to uppercase on insert/update
CREATE OR REPLACE FUNCTION public.normalize_coupon_code()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.coupon_code := upper(trim(NEW.coupon_code));
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_influencers_normalize_coupon
  BEFORE INSERT OR UPDATE OF coupon_code ON public.influencers
  FOR EACH ROW EXECUTE FUNCTION public.normalize_coupon_code();

-- =============================================================================
-- INFLUENCER GROWTH HISTORY
-- =============================================================================

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

COMMENT ON TABLE public.influencer_growth_history IS 'Time-series tracking of influencer social metrics. One entry per influencer + platform + date.';

CREATE INDEX idx_growth_influencer_date ON public.influencer_growth_history(influencer_id, record_date DESC);
CREATE INDEX idx_growth_tenant ON public.influencer_growth_history(tenant_id);

-- =============================================================================
-- RLS POLICIES
-- =============================================================================

ALTER TABLE public.influencers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.influencer_growth_history ENABLE ROW LEVEL SECURITY;

-- Influencers: view with permission, edit with permission
CREATE POLICY "influencers_select" ON public.influencers
  FOR SELECT USING (
    tenant_id = public.get_user_tenant_id()
    AND public.has_permission('influencers.view')
  );

CREATE POLICY "influencers_insert" ON public.influencers
  FOR INSERT WITH CHECK (
    tenant_id = public.get_user_tenant_id()
    AND public.has_permission('influencers.edit')
  );

CREATE POLICY "influencers_update" ON public.influencers
  FOR UPDATE USING (
    tenant_id = public.get_user_tenant_id()
    AND public.has_permission('influencers.edit')
  );

-- Growth history: same permission as influencers
CREATE POLICY "growth_select" ON public.influencer_growth_history
  FOR SELECT USING (
    tenant_id = public.get_user_tenant_id()
    AND public.has_permission('influencers.view')
  );

CREATE POLICY "growth_insert" ON public.influencer_growth_history
  FOR INSERT WITH CHECK (
    tenant_id = public.get_user_tenant_id()
    AND public.has_permission('influencers.edit')
  );

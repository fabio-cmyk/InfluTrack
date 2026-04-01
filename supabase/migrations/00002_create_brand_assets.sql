-- Migration: 00002_create_brand_assets
-- Description: Brand identity and visual assets for tenant brands
-- Author: Dara (Data Engineer)
-- Date: 2026-04-01

-- =============================================================================
-- BRAND ASSETS (textual identity)
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

COMMENT ON TABLE public.brand_assets IS 'Brand identity: mission, vision, values, tone of voice. One per tenant. Used for influencer fit scoring.';

CREATE TRIGGER trg_brand_assets_updated_at
  BEFORE UPDATE ON public.brand_assets
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- =============================================================================
-- BRAND VISUAL IDENTITY (logo, colors, typography)
-- =============================================================================

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

COMMENT ON TABLE public.brand_visual_identity IS 'Visual brand assets: logo, color palette (array of {name, hex}), typography.';
COMMENT ON COLUMN public.brand_visual_identity.color_palette IS 'JSON array: [{"name": "Primary", "hex": "#6C63FF"}, ...]. Max 6 colors.';

CREATE TRIGGER trg_brand_visual_updated_at
  BEFORE UPDATE ON public.brand_visual_identity
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- =============================================================================
-- RLS POLICIES
-- =============================================================================

ALTER TABLE public.brand_assets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.brand_visual_identity ENABLE ROW LEVEL SECURITY;

-- Brand assets: read by all tenant members, write by those with branding.edit
CREATE POLICY "brand_assets_select" ON public.brand_assets
  FOR SELECT USING (tenant_id = public.get_user_tenant_id());

CREATE POLICY "brand_assets_insert" ON public.brand_assets
  FOR INSERT WITH CHECK (
    tenant_id = public.get_user_tenant_id()
    AND public.has_permission('branding.edit')
  );

CREATE POLICY "brand_assets_update" ON public.brand_assets
  FOR UPDATE USING (
    tenant_id = public.get_user_tenant_id()
    AND public.has_permission('branding.edit')
  );

-- Visual identity: same pattern
CREATE POLICY "brand_visual_select" ON public.brand_visual_identity
  FOR SELECT USING (tenant_id = public.get_user_tenant_id());

CREATE POLICY "brand_visual_insert" ON public.brand_visual_identity
  FOR INSERT WITH CHECK (
    tenant_id = public.get_user_tenant_id()
    AND public.has_permission('branding.edit')
  );

CREATE POLICY "brand_visual_update" ON public.brand_visual_identity
  FOR UPDATE USING (
    tenant_id = public.get_user_tenant_id()
    AND public.has_permission('branding.edit')
  );

-- Migration: 00004_create_campaigns
-- Description: Campaigns and campaign-influencer associations
-- Author: Dara (Data Engineer)
-- Date: 2026-04-01

-- =============================================================================
-- CAMPAIGNS
-- =============================================================================

CREATE TABLE public.campaigns (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id   UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  name        TEXT NOT NULL CHECK (char_length(name) BETWEEN 1 AND 200),
  description TEXT,
  budget      DECIMAL(12,2) CHECK (budget >= 0),
  start_date  DATE,
  end_date    DATE,
  status      TEXT NOT NULL DEFAULT 'draft'
              CHECK (status IN ('draft', 'active', 'ended', 'archived')),
  is_archived BOOLEAN NOT NULL DEFAULT false,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT chk_campaign_dates CHECK (
    (start_date IS NULL AND end_date IS NULL) OR
    (start_date IS NOT NULL AND end_date IS NOT NULL AND end_date >= start_date)
  )
);

COMMENT ON TABLE public.campaigns IS 'Marketing campaigns with budget and time period. Status is auto-managed by trigger based on dates.';

CREATE INDEX idx_campaigns_tenant ON public.campaigns(tenant_id) WHERE NOT is_archived;
CREATE INDEX idx_campaigns_dates ON public.campaigns(tenant_id, start_date, end_date) WHERE NOT is_archived;
CREATE INDEX idx_campaigns_status ON public.campaigns(tenant_id, status) WHERE NOT is_archived;

CREATE TRIGGER trg_campaigns_updated_at
  BEFORE UPDATE ON public.campaigns
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- Auto-update campaign status based on dates
CREATE OR REPLACE FUNCTION public.update_campaign_status()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  -- Only auto-manage status for non-archived campaigns
  IF NEW.is_archived THEN
    NEW.status := 'archived';
    RETURN NEW;
  END IF;

  IF NEW.start_date IS NOT NULL AND NEW.end_date IS NOT NULL THEN
    IF CURRENT_DATE < NEW.start_date THEN
      NEW.status := 'draft';
    ELSIF CURRENT_DATE BETWEEN NEW.start_date AND NEW.end_date THEN
      NEW.status := 'active';
    ELSE
      NEW.status := 'ended';
    END IF;
  ELSE
    NEW.status := 'draft';
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_campaign_status
  BEFORE INSERT OR UPDATE OF start_date, end_date, is_archived ON public.campaigns
  FOR EACH ROW EXECUTE FUNCTION public.update_campaign_status();

COMMENT ON FUNCTION public.update_campaign_status() IS
  'Auto-sets campaign status based on date range vs CURRENT_DATE. Archived overrides.';

-- =============================================================================
-- CAMPAIGN <-> INFLUENCER ASSOCIATION
-- =============================================================================

CREATE TABLE public.campaign_influencers (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id   UUID NOT NULL REFERENCES public.campaigns(id) ON DELETE CASCADE,
  influencer_id UUID NOT NULL REFERENCES public.influencers(id) ON DELETE CASCADE,
  tenant_id     UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  added_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(campaign_id, influencer_id)
);

COMMENT ON TABLE public.campaign_influencers IS 'Links influencers to campaigns. Used for attribution: sales with coupon within campaign period.';

CREATE INDEX idx_ci_campaign ON public.campaign_influencers(campaign_id);
CREATE INDEX idx_ci_influencer ON public.campaign_influencers(influencer_id);
CREATE INDEX idx_ci_tenant ON public.campaign_influencers(tenant_id);

-- =============================================================================
-- RLS POLICIES
-- =============================================================================

ALTER TABLE public.campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.campaign_influencers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "campaigns_select" ON public.campaigns
  FOR SELECT USING (
    tenant_id = public.get_user_tenant_id()
    AND public.has_permission('campaigns.view')
  );

CREATE POLICY "campaigns_insert" ON public.campaigns
  FOR INSERT WITH CHECK (
    tenant_id = public.get_user_tenant_id()
    AND public.has_permission('campaigns.edit')
  );

CREATE POLICY "campaigns_update" ON public.campaigns
  FOR UPDATE USING (
    tenant_id = public.get_user_tenant_id()
    AND public.has_permission('campaigns.edit')
  );

-- Campaign influencers inherit campaign permissions
CREATE POLICY "ci_select" ON public.campaign_influencers
  FOR SELECT USING (
    tenant_id = public.get_user_tenant_id()
    AND public.has_permission('campaigns.view')
  );

CREATE POLICY "ci_insert" ON public.campaign_influencers
  FOR INSERT WITH CHECK (
    tenant_id = public.get_user_tenant_id()
    AND public.has_permission('campaigns.edit')
  );

CREATE POLICY "ci_delete" ON public.campaign_influencers
  FOR DELETE USING (
    tenant_id = public.get_user_tenant_id()
    AND public.has_permission('campaigns.edit')
  );

-- Migration: 00014_create_influencer_prospects
-- Description: Influencer prospecting pipeline with negotiation tracking
-- Author: Dara (Data Engineer)
-- Date: 2026-04-06

-- =============================================================================
-- INFLUENCER PROSPECTS
-- =============================================================================

CREATE TABLE public.influencer_prospects (
  id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id               UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,

  -- Identity
  name                    TEXT NOT NULL CHECK (char_length(name) BETWEEN 1 AND 200),
  instagram_url           TEXT,
  prospect_type           TEXT NOT NULL DEFAULT 'nova'
                          CHECK (prospect_type IN ('nova', 'reativada')),

  -- Metrics: Stories
  followers_count         INTEGER CHECK (followers_count >= 0),
  avg_story_views         INTEGER CHECK (avg_story_views >= 0),
  budget_stories_seq      DECIMAL(12,2) CHECK (budget_stories_seq >= 0),
  budget_reels_stories    DECIMAL(12,2) CHECK (budget_reels_stories >= 0),
  cost_per_story_view     DECIMAL(10,4) CHECK (cost_per_story_view >= 0),
  story_engagement_rate   DECIMAL(5,2) CHECK (story_engagement_rate >= 0 AND story_engagement_rate <= 100),

  -- Metrics: Reels
  avg_reel_views          INTEGER CHECK (avg_reel_views >= 0),
  budget_reels            DECIMAL(12,2) CHECK (budget_reels >= 0),
  cost_per_reel_view      DECIMAL(10,4) CHECK (cost_per_reel_view >= 0),
  reel_engagement_rate    DECIMAL(5,2) CHECK (reel_engagement_rate >= 0 AND reel_engagement_rate <= 100),

  -- Negotiation
  agreed_value            DECIMAL(12,2) CHECK (agreed_value >= 0),
  proposed_scope          TEXT,
  influencer_asking_price TEXT,

  -- Pipeline
  status                  TEXT NOT NULL DEFAULT 'analisar'
                          CHECK (status IN ('analisar', 'aprovada', 'reprovada', 'sem_retorno', 'contato_futuro')),
  partnership_status      TEXT NOT NULL DEFAULT 'em_negociacao'
                          CHECK (partnership_status IN ('em_negociacao', 'fechada', 'sem_retorno', 'contato_futuro')),

  -- Period tracking
  prospect_month          DATE,

  -- Link to converted influencer
  converted_influencer_id UUID REFERENCES public.influencers(id) ON DELETE SET NULL,

  -- Standard fields
  is_archived             BOOLEAN NOT NULL DEFAULT false,
  created_at              TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at              TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.influencer_prospects IS 'Influencer prospecting pipeline. Tracks candidates from discovery through negotiation to partnership.';

-- =============================================================================
-- PROSPECT NOTES (negotiation history)
-- =============================================================================

CREATE TABLE public.prospect_notes (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  prospect_id     UUID NOT NULL REFERENCES public.influencer_prospects(id) ON DELETE CASCADE,
  tenant_id       UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  author_id       UUID NOT NULL REFERENCES auth.users(id),
  content         TEXT NOT NULL CHECK (char_length(content) BETWEEN 1 AND 2000),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.prospect_notes IS 'Negotiation notes and history per prospect. Chronological log.';

-- =============================================================================
-- INDEXES
-- =============================================================================

CREATE INDEX idx_prospects_tenant ON public.influencer_prospects(tenant_id) WHERE NOT is_archived;
CREATE INDEX idx_prospects_status ON public.influencer_prospects(tenant_id, status) WHERE NOT is_archived;
CREATE INDEX idx_prospects_partnership ON public.influencer_prospects(tenant_id, partnership_status) WHERE NOT is_archived;
CREATE INDEX idx_prospects_name_search ON public.influencer_prospects USING gin(name gin_trgm_ops);
CREATE INDEX idx_prospect_notes_prospect ON public.prospect_notes(prospect_id);

-- =============================================================================
-- TRIGGERS
-- =============================================================================

CREATE TRIGGER trg_prospects_updated_at
  BEFORE UPDATE ON public.influencer_prospects
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- =============================================================================
-- PERMISSIONS
-- =============================================================================

ALTER TABLE public.user_permissions
  DROP CONSTRAINT user_permissions_permission_key_check;

ALTER TABLE public.user_permissions
  ADD CONSTRAINT user_permissions_permission_key_check
  CHECK (permission_key IN (
    'campaigns.view', 'campaigns.edit',
    'influencers.view', 'influencers.edit',
    'financials.view',
    'mining.view',
    'branding.edit',
    'team.manage',
    'calendar.view', 'calendar.edit',
    'prospects.view', 'prospects.edit'
  ));

-- =============================================================================
-- RLS POLICIES
-- =============================================================================

ALTER TABLE public.influencer_prospects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.prospect_notes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "prospects_select" ON public.influencer_prospects
  FOR SELECT USING (
    tenant_id = public.get_user_tenant_id()
    AND public.has_permission('prospects.view')
  );

CREATE POLICY "prospects_insert" ON public.influencer_prospects
  FOR INSERT WITH CHECK (
    tenant_id = public.get_user_tenant_id()
    AND public.has_permission('prospects.edit')
  );

CREATE POLICY "prospects_update" ON public.influencer_prospects
  FOR UPDATE USING (
    tenant_id = public.get_user_tenant_id()
    AND public.has_permission('prospects.edit')
  );

CREATE POLICY "prospects_delete" ON public.influencer_prospects
  FOR DELETE USING (
    tenant_id = public.get_user_tenant_id()
    AND public.has_permission('prospects.edit')
  );

CREATE POLICY "prospect_notes_select" ON public.prospect_notes
  FOR SELECT USING (
    tenant_id = public.get_user_tenant_id()
    AND public.has_permission('prospects.view')
  );

CREATE POLICY "prospect_notes_insert" ON public.prospect_notes
  FOR INSERT WITH CHECK (
    tenant_id = public.get_user_tenant_id()
    AND public.has_permission('prospects.edit')
  );

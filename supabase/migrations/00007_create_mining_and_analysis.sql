-- Migration: 00007_create_mining_and_analysis
-- Description: Influencer mining searches, results, and profile analysis history
-- Author: Dara (Data Engineer)
-- Date: 2026-04-01

-- =============================================================================
-- MINING SEARCHES (saved search queries)
-- =============================================================================

CREATE TABLE public.mining_searches (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id     UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  keywords      TEXT[] NOT NULL CHECK (array_length(keywords, 1) > 0),
  platforms     TEXT[] NOT NULL CHECK (
    platforms <@ ARRAY['instagram', 'tiktok']::TEXT[]
    AND array_length(platforms, 1) > 0
  ),
  filters       JSONB NOT NULL DEFAULT '{}'::jsonb,
  results_count INTEGER NOT NULL DEFAULT 0 CHECK (results_count >= 0),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.mining_searches IS 'Saved mining queries. Can be re-executed. filters: {min_followers, country, etc.}';

CREATE INDEX idx_mining_searches_tenant ON public.mining_searches(tenant_id, created_at DESC);

-- =============================================================================
-- MINING RESULTS (scraped influencer profiles)
-- =============================================================================

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

COMMENT ON TABLE public.mining_results IS 'Influencer profiles discovered via Apify scraping. Can be saved as full influencer records.';

CREATE INDEX idx_mining_results_search ON public.mining_results(search_id);
CREATE INDEX idx_mining_results_tenant ON public.mining_results(tenant_id);

-- =============================================================================
-- ANALYSIS HISTORY (full profile analysis with fit score)
-- =============================================================================

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

COMMENT ON TABLE public.analysis_history IS 'Complete influencer profile analyses with brand fit scoring. Linked to brand_assets for fit calculation.';
COMMENT ON COLUMN public.analysis_history.analysis_data IS 'Full analysis: {engagement, growth_30d, post_frequency, content_types, audience_estimate, ...}';
COMMENT ON COLUMN public.analysis_history.fit_score IS '0-100 score. 70-100=recommended, 40-69=neutral, 0-39=not_recommended.';

CREATE INDEX idx_analysis_tenant ON public.analysis_history(tenant_id, created_at DESC);
CREATE INDEX idx_analysis_handle ON public.analysis_history(tenant_id, handle, platform);

-- =============================================================================
-- RLS POLICIES
-- =============================================================================

ALTER TABLE public.mining_searches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mining_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.analysis_history ENABLE ROW LEVEL SECURITY;

-- Mining: viewable by mining.view holders
CREATE POLICY "mining_searches_select" ON public.mining_searches
  FOR SELECT USING (
    tenant_id = public.get_user_tenant_id()
    AND public.has_permission('mining.view')
  );

CREATE POLICY "mining_searches_insert" ON public.mining_searches
  FOR INSERT WITH CHECK (
    tenant_id = public.get_user_tenant_id()
    AND public.has_permission('mining.view')
  );

CREATE POLICY "mining_results_select" ON public.mining_results
  FOR SELECT USING (
    tenant_id = public.get_user_tenant_id()
    AND public.has_permission('mining.view')
  );

CREATE POLICY "mining_results_insert" ON public.mining_results
  FOR INSERT WITH CHECK (
    tenant_id = public.get_user_tenant_id()
    AND public.has_permission('mining.view')
  );

CREATE POLICY "mining_results_update" ON public.mining_results
  FOR UPDATE USING (
    tenant_id = public.get_user_tenant_id()
    AND public.has_permission('mining.view')
  );

-- Analysis: same as mining
CREATE POLICY "analysis_select" ON public.analysis_history
  FOR SELECT USING (
    tenant_id = public.get_user_tenant_id()
    AND public.has_permission('mining.view')
  );

CREATE POLICY "analysis_insert" ON public.analysis_history
  FOR INSERT WITH CHECK (
    tenant_id = public.get_user_tenant_id()
    AND public.has_permission('mining.view')
  );

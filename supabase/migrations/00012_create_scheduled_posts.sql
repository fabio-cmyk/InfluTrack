-- Migration: 00012_create_scheduled_posts
-- Description: Posting calendar — scheduled posts linked to campaigns and influencers
-- Author: Dara (Data Engineer)
-- Date: 2026-04-06

-- =============================================================================
-- SCHEDULED POSTS
-- =============================================================================

CREATE TABLE public.scheduled_posts (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  campaign_id     UUID REFERENCES public.campaigns(id) ON DELETE SET NULL,
  influencer_id   UUID REFERENCES public.influencers(id) ON DELETE SET NULL,
  title           TEXT NOT NULL CHECK (char_length(title) BETWEEN 1 AND 200),
  description     TEXT,
  scheduled_date  DATE NOT NULL,
  scheduled_time  TIME,
  post_format     TEXT NOT NULL CHECK (post_format IN (
    'reels', 'stories', 'feed', 'tiktok', 'youtube', 'shorts', 'carousel', 'live', 'other'
  )),
  status          TEXT NOT NULL DEFAULT 'scheduled' CHECK (status IN (
    'scheduled', 'published', 'missed', 'cancelled'
  )),
  notes           TEXT,
  is_archived     BOOLEAN NOT NULL DEFAULT false,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.scheduled_posts IS 'Posting calendar entries. Each row is a planned social media post with date, format, and optional campaign/influencer link.';

-- =============================================================================
-- INDEXES
-- =============================================================================

CREATE INDEX idx_scheduled_posts_tenant ON public.scheduled_posts(tenant_id) WHERE NOT is_archived;
CREATE INDEX idx_scheduled_posts_date ON public.scheduled_posts(tenant_id, scheduled_date) WHERE NOT is_archived;
CREATE INDEX idx_scheduled_posts_campaign ON public.scheduled_posts(campaign_id) WHERE NOT is_archived;
CREATE INDEX idx_scheduled_posts_influencer ON public.scheduled_posts(influencer_id) WHERE NOT is_archived;
CREATE INDEX idx_scheduled_posts_status ON public.scheduled_posts(tenant_id, status, scheduled_date) WHERE NOT is_archived;

-- =============================================================================
-- TRIGGERS
-- =============================================================================

CREATE TRIGGER trg_scheduled_posts_updated_at
  BEFORE UPDATE ON public.scheduled_posts
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- =============================================================================
-- PERMISSIONS — Add calendar.view / calendar.edit to allowed keys
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
    'calendar.view', 'calendar.edit'
  ));

-- =============================================================================
-- RLS POLICIES
-- =============================================================================

ALTER TABLE public.scheduled_posts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "scheduled_posts_select" ON public.scheduled_posts
  FOR SELECT USING (
    tenant_id = public.get_user_tenant_id()
    AND public.has_permission('calendar.view')
  );

CREATE POLICY "scheduled_posts_insert" ON public.scheduled_posts
  FOR INSERT WITH CHECK (
    tenant_id = public.get_user_tenant_id()
    AND public.has_permission('calendar.edit')
  );

CREATE POLICY "scheduled_posts_update" ON public.scheduled_posts
  FOR UPDATE USING (
    tenant_id = public.get_user_tenant_id()
    AND public.has_permission('calendar.edit')
  );

CREATE POLICY "scheduled_posts_delete" ON public.scheduled_posts
  FOR DELETE USING (
    tenant_id = public.get_user_tenant_id()
    AND public.has_permission('calendar.edit')
  );

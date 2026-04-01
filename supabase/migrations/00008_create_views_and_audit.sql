-- Migration: 00008_create_views_and_audit
-- Description: Materialized views for dashboard metrics + audit log
-- Author: Dara (Data Engineer)
-- Date: 2026-04-01

-- =============================================================================
-- AUDIT LOG
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

COMMENT ON TABLE public.audit_logs IS 'Audit trail for all user mutations. NFR8 compliance.';

CREATE INDEX idx_audit_tenant_date ON public.audit_logs(tenant_id, created_at DESC);
CREATE INDEX idx_audit_entity ON public.audit_logs(tenant_id, entity_type, entity_id);
CREATE INDEX idx_audit_user ON public.audit_logs(tenant_id, user_id);

ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "audit_select" ON public.audit_logs
  FOR SELECT USING (tenant_id = public.get_user_tenant_id());

-- Insert via service role or SECURITY DEFINER function only
-- (audit_log function inserts with current user context)

-- =============================================================================
-- HELPER: audit_log function for easy usage from API
-- =============================================================================

CREATE OR REPLACE FUNCTION public.audit_log(
  p_action TEXT,
  p_entity_type TEXT,
  p_entity_id UUID DEFAULT NULL,
  p_metadata JSONB DEFAULT '{}'::jsonb
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.audit_logs (tenant_id, user_id, action, entity_type, entity_id, metadata)
  VALUES (
    public.get_user_tenant_id(),
    auth.uid(),
    p_action,
    p_entity_type,
    p_entity_id,
    p_metadata
  );
END;
$$;

COMMENT ON FUNCTION public.audit_log IS 'Insert audit log entry for current user/tenant. Call from API routes.';

-- =============================================================================
-- VIEW: Influencer Metrics (aggregated from attributions)
-- =============================================================================

CREATE OR REPLACE VIEW public.v_influencer_metrics AS
SELECT
  oa.influencer_id,
  oa.tenant_id,
  COUNT(DISTINCT oa.order_id)                           AS total_orders,
  COALESCE(SUM(o.total_amount), 0)::DECIMAL(12,2)      AS total_revenue,
  COALESCE(SUM(sub.item_cost), 0)::DECIMAL(12,2)       AS total_cost,
  (COALESCE(SUM(o.total_amount), 0) -
   COALESCE(SUM(sub.item_cost), 0))::DECIMAL(12,2)     AS total_profit,
  COUNT(DISTINCT oa.campaign_id)
    FILTER (WHERE oa.campaign_id IS NOT NULL)            AS campaigns_count
FROM public.order_attributions oa
JOIN public.orders o ON o.id = oa.order_id
LEFT JOIN LATERAL (
  SELECT COALESCE(SUM(oi.unit_cost * oi.quantity), 0) AS item_cost
  FROM public.order_items oi
  WHERE oi.order_id = o.id
) sub ON true
GROUP BY oa.influencer_id, oa.tenant_id;

COMMENT ON VIEW public.v_influencer_metrics IS 'Aggregated metrics per influencer: orders, revenue, cost, profit, campaigns count.';

-- =============================================================================
-- VIEW: Campaign Metrics (aggregated)
-- =============================================================================

CREATE OR REPLACE VIEW public.v_campaign_metrics AS
SELECT
  oa.campaign_id,
  oa.tenant_id,
  COUNT(DISTINCT oa.order_id)                           AS total_orders,
  COUNT(DISTINCT oa.influencer_id)                      AS influencer_count,
  COALESCE(SUM(o.total_amount), 0)::DECIMAL(12,2)      AS total_revenue,
  COALESCE(SUM(sub.item_cost), 0)::DECIMAL(12,2)       AS total_cost,
  (COALESCE(SUM(o.total_amount), 0) -
   COALESCE(SUM(sub.item_cost), 0))::DECIMAL(12,2)     AS total_profit
FROM public.order_attributions oa
JOIN public.orders o ON o.id = oa.order_id
LEFT JOIN LATERAL (
  SELECT COALESCE(SUM(oi.unit_cost * oi.quantity), 0) AS item_cost
  FROM public.order_items oi
  WHERE oi.order_id = o.id
) sub ON true
WHERE oa.campaign_id IS NOT NULL
GROUP BY oa.campaign_id, oa.tenant_id;

COMMENT ON VIEW public.v_campaign_metrics IS 'Aggregated metrics per campaign: orders, influencer count, revenue, cost, profit.';

-- =============================================================================
-- VIEW: Campaign-Influencer Metrics (breakdown per influencer within campaign)
-- =============================================================================

CREATE OR REPLACE VIEW public.v_campaign_influencer_metrics AS
SELECT
  oa.campaign_id,
  oa.influencer_id,
  oa.tenant_id,
  COUNT(DISTINCT oa.order_id)                           AS total_orders,
  COALESCE(SUM(o.total_amount), 0)::DECIMAL(12,2)      AS revenue,
  COALESCE(SUM(sub.item_cost), 0)::DECIMAL(12,2)       AS cost,
  (COALESCE(SUM(o.total_amount), 0) -
   COALESCE(SUM(sub.item_cost), 0))::DECIMAL(12,2)     AS profit
FROM public.order_attributions oa
JOIN public.orders o ON o.id = oa.order_id
LEFT JOIN LATERAL (
  SELECT COALESCE(SUM(oi.unit_cost * oi.quantity), 0) AS item_cost
  FROM public.order_items oi
  WHERE oi.order_id = o.id
) sub ON true
WHERE oa.campaign_id IS NOT NULL
GROUP BY oa.campaign_id, oa.influencer_id, oa.tenant_id;

COMMENT ON VIEW public.v_campaign_influencer_metrics IS 'Per-influencer breakdown within a campaign. Used for comparatives.';

-- =============================================================================
-- VIEW: Dashboard KPIs (monthly aggregation, filterable)
-- =============================================================================

CREATE OR REPLACE VIEW public.v_dashboard_kpis AS
SELECT
  o.tenant_id,
  DATE_TRUNC('month', o.order_date)::DATE               AS month,
  COUNT(DISTINCT o.id)                                   AS total_orders,
  COALESCE(SUM(o.total_amount), 0)::DECIMAL(12,2)       AS total_revenue,
  COALESCE(SUM(sub.item_cost), 0)::DECIMAL(12,2)        AS total_cost,
  (COALESCE(SUM(o.total_amount), 0) -
   COALESCE(SUM(sub.item_cost), 0))::DECIMAL(12,2)      AS total_profit
FROM public.orders o
JOIN public.order_attributions oa ON oa.order_id = o.id
LEFT JOIN LATERAL (
  SELECT COALESCE(SUM(oi.unit_cost * oi.quantity), 0) AS item_cost
  FROM public.order_items oi
  WHERE oi.order_id = o.id
) sub ON true
GROUP BY o.tenant_id, DATE_TRUNC('month', o.order_date);

COMMENT ON VIEW public.v_dashboard_kpis IS 'Monthly KPIs per tenant: orders, revenue, cost, profit. Used by dashboard charts.';

-- =============================================================================
-- VIEW: Top Influencers by ROI (for dashboard ranking)
-- =============================================================================

CREATE OR REPLACE VIEW public.v_top_influencers AS
SELECT
  im.influencer_id,
  im.tenant_id,
  i.name AS influencer_name,
  i.instagram_handle,
  i.avatar_url,
  im.total_orders,
  im.total_revenue,
  im.total_profit,
  CASE
    WHEN im.total_cost > 0 THEN
      ROUND((im.total_profit / im.total_cost * 100), 2)
    ELSE 0
  END AS roi_percentage
FROM public.v_influencer_metrics im
JOIN public.influencers i ON i.id = im.influencer_id
WHERE NOT i.is_archived;

COMMENT ON VIEW public.v_top_influencers IS 'Influencer ranking with ROI calculation. For dashboard "Top Influencers" widget.';

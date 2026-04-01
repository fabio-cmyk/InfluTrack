-- Migration: 00006_create_orders_and_attribution
-- Description: Orders, order items, and influencer/campaign attribution engine
-- Author: Dara (Data Engineer)
-- Date: 2026-04-01
-- CRITICAL: This is the core revenue attribution system

-- =============================================================================
-- ORDERS (from Shopify/Yampi webhooks and polling)
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

COMMENT ON TABLE public.orders IS 'Orders imported from e-commerce platforms. discount_code links to influencer coupons.';
COMMENT ON COLUMN public.orders.discount_code IS 'Coupon code used in the order. Matched against influencers.coupon_code (case-insensitive).';
COMMENT ON COLUMN public.orders.processed IS 'True after attribution trigger has processed this order.';

CREATE INDEX idx_orders_tenant ON public.orders(tenant_id);
CREATE INDEX idx_orders_coupon ON public.orders(tenant_id, upper(discount_code)) WHERE discount_code IS NOT NULL;
CREATE INDEX idx_orders_date ON public.orders(tenant_id, order_date);
CREATE INDEX idx_orders_unprocessed ON public.orders(tenant_id) WHERE NOT processed;

-- =============================================================================
-- ORDER ITEMS (line items with cost for profit calculation)
-- =============================================================================

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

COMMENT ON TABLE public.order_items IS 'Line items per order. unit_cost pulled from products table for profit calculation.';
COMMENT ON COLUMN public.order_items.unit_cost IS 'Cost at time of order. Copied from products.cost on import. NULL if cost unknown.';

CREATE INDEX idx_order_items_order ON public.order_items(order_id);
CREATE INDEX idx_order_items_product ON public.order_items(product_id) WHERE product_id IS NOT NULL;

-- =============================================================================
-- ORDER ATTRIBUTIONS (the core: order -> influencer -> campaign)
-- =============================================================================

CREATE TABLE public.order_attributions (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id      UUID NOT NULL UNIQUE REFERENCES public.orders(id) ON DELETE CASCADE,
  influencer_id UUID NOT NULL REFERENCES public.influencers(id) ON DELETE CASCADE,
  campaign_id   UUID REFERENCES public.campaigns(id) ON DELETE SET NULL,
  tenant_id     UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  attributed_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.order_attributions IS 'Links an order to its attributed influencer and optionally to a campaign. One attribution per order.';
COMMENT ON COLUMN public.order_attributions.campaign_id IS 'NULL = organic sale (coupon used outside any campaign period). NOT NULL = attributed to specific campaign.';

CREATE INDEX idx_attributions_influencer ON public.order_attributions(influencer_id);
CREATE INDEX idx_attributions_campaign ON public.order_attributions(campaign_id) WHERE campaign_id IS NOT NULL;
CREATE INDEX idx_attributions_tenant ON public.order_attributions(tenant_id);

-- =============================================================================
-- ATTRIBUTION TRIGGER (auto-process orders on insert)
-- =============================================================================

CREATE OR REPLACE FUNCTION public.process_order_attribution()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_influencer_id UUID;
  v_campaign_id UUID;
  v_normalized_code TEXT;
BEGIN
  -- Skip if no discount code
  IF NEW.discount_code IS NULL OR trim(NEW.discount_code) = '' THEN
    NEW.processed := true;
    RETURN NEW;
  END IF;

  v_normalized_code := upper(trim(NEW.discount_code));

  -- Find influencer by coupon (same tenant, not archived)
  SELECT id INTO v_influencer_id
  FROM public.influencers
  WHERE tenant_id = NEW.tenant_id
    AND upper(coupon_code) = v_normalized_code
    AND NOT is_archived;

  IF v_influencer_id IS NULL THEN
    -- Coupon doesn't match any influencer — mark processed, no attribution
    NEW.processed := true;
    RETURN NEW;
  END IF;

  -- Find the best matching campaign:
  -- Influencer is linked to campaign AND order_date falls within campaign period
  -- If multiple matches, prefer the most recently started campaign
  SELECT c.id INTO v_campaign_id
  FROM public.campaigns c
  JOIN public.campaign_influencers ci ON ci.campaign_id = c.id
  WHERE c.tenant_id = NEW.tenant_id
    AND ci.influencer_id = v_influencer_id
    AND NOT c.is_archived
    AND c.start_date IS NOT NULL
    AND c.end_date IS NOT NULL
    AND NEW.order_date::date BETWEEN c.start_date AND c.end_date
  ORDER BY c.start_date DESC
  LIMIT 1;

  -- Create attribution (influencer always, campaign only if matched)
  INSERT INTO public.order_attributions (order_id, influencer_id, campaign_id, tenant_id)
  VALUES (NEW.id, v_influencer_id, v_campaign_id, NEW.tenant_id)
  ON CONFLICT (order_id) DO NOTHING;

  NEW.processed := true;
  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION public.process_order_attribution() IS
  'Core attribution engine. Matches order discount_code to influencer coupon, then finds active campaign by date range.';

CREATE TRIGGER trg_order_attribution
  AFTER INSERT ON public.orders
  FOR EACH ROW EXECUTE FUNCTION public.process_order_attribution();

-- =============================================================================
-- REPROCESS ATTRIBUTIONS (when campaign dates change)
-- =============================================================================

CREATE OR REPLACE FUNCTION public.reprocess_campaign_attributions()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- When campaign dates change, re-evaluate attributions for orders
  -- that fall within the old or new date range
  IF OLD.start_date IS DISTINCT FROM NEW.start_date
     OR OLD.end_date IS DISTINCT FROM NEW.end_date THEN

    -- Remove campaign attribution for orders no longer in range
    UPDATE public.order_attributions oa
    SET campaign_id = NULL
    WHERE oa.campaign_id = NEW.id
      AND oa.tenant_id = NEW.tenant_id
      AND NOT EXISTS (
        SELECT 1 FROM public.orders o
        WHERE o.id = oa.order_id
          AND o.order_date::date BETWEEN NEW.start_date AND NEW.end_date
      );

    -- Add campaign attribution for orders now in range (if influencer is linked)
    UPDATE public.order_attributions oa
    SET campaign_id = NEW.id
    WHERE oa.campaign_id IS NULL
      AND oa.tenant_id = NEW.tenant_id
      AND EXISTS (
        SELECT 1 FROM public.campaign_influencers ci
        WHERE ci.campaign_id = NEW.id
          AND ci.influencer_id = oa.influencer_id
      )
      AND EXISTS (
        SELECT 1 FROM public.orders o
        WHERE o.id = oa.order_id
          AND o.order_date::date BETWEEN NEW.start_date AND NEW.end_date
      );
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_campaign_dates_changed
  AFTER UPDATE OF start_date, end_date ON public.campaigns
  FOR EACH ROW EXECUTE FUNCTION public.reprocess_campaign_attributions();

COMMENT ON FUNCTION public.reprocess_campaign_attributions() IS
  'Re-evaluates order attributions when a campaign''s date range changes.';

-- =============================================================================
-- RLS POLICIES
-- =============================================================================

ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_attributions ENABLE ROW LEVEL SECURITY;

-- Orders: viewable by financials.view holders
CREATE POLICY "orders_select" ON public.orders
  FOR SELECT USING (
    tenant_id = public.get_user_tenant_id()
    AND public.has_permission('financials.view')
  );

-- Order items: same as orders
CREATE POLICY "order_items_select" ON public.order_items
  FOR SELECT USING (
    tenant_id = public.get_user_tenant_id()
    AND public.has_permission('financials.view')
  );

-- Attributions: viewable by financials.view holders
CREATE POLICY "attributions_select" ON public.order_attributions
  FOR SELECT USING (
    tenant_id = public.get_user_tenant_id()
    AND public.has_permission('financials.view')
  );

-- NOTE: INSERT on orders/order_items/attributions is done via service_role key
-- from webhooks and Edge Functions. No RLS INSERT policies needed for regular users.

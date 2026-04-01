-- Migration: 00005_create_products
-- Description: Product catalog with e-commerce integration support
-- Author: Dara (Data Engineer)
-- Date: 2026-04-01

-- =============================================================================
-- PRODUCTS
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
  source        TEXT NOT NULL DEFAULT 'manual'
                CHECK (source IN ('shopify', 'yampi', 'manual')),
  is_active     BOOLEAN NOT NULL DEFAULT true,
  synced_at     TIMESTAMPTZ,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(tenant_id, external_id, source)
);

COMMENT ON TABLE public.products IS 'Product catalog imported from Shopify/Yampi or created manually. Cost is used for profit calculation.';
COMMENT ON COLUMN public.products.cost IS 'Product cost (COGS). Can be null if not provided by integration. Editable manually.';
COMMENT ON COLUMN public.products.external_id IS 'Product ID from the source platform (Shopify product ID, Yampi product ID).';

CREATE INDEX idx_products_tenant ON public.products(tenant_id) WHERE is_active;
CREATE INDEX idx_products_sku ON public.products(tenant_id, sku) WHERE sku IS NOT NULL;
CREATE INDEX idx_products_external ON public.products(tenant_id, external_id, source) WHERE external_id IS NOT NULL;

CREATE TRIGGER trg_products_updated_at
  BEFORE UPDATE ON public.products
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- =============================================================================
-- INTEGRATIONS (Shopify, Yampi, Apify credentials)
-- =============================================================================

CREATE TABLE public.integrations (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  provider        TEXT NOT NULL CHECK (provider IN ('shopify', 'yampi', 'apify')),
  credentials     JSONB NOT NULL DEFAULT '{}'::jsonb,
  status          TEXT NOT NULL DEFAULT 'disconnected'
                  CHECK (status IN ('connected', 'disconnected', 'error')),
  last_sync_at    TIMESTAMPTZ,
  sync_interval   TEXT NOT NULL DEFAULT 'daily'
                  CHECK (sync_interval IN ('6h', 'daily', 'manual')),
  config          JSONB NOT NULL DEFAULT '{}'::jsonb,
  error_message   TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(tenant_id, provider)
);

COMMENT ON TABLE public.integrations IS 'E-commerce and API integration credentials. Credentials MUST be encrypted at application level before storage.';
COMMENT ON COLUMN public.integrations.credentials IS 'Encrypted JSON. Shopify: {api_key, store_url}. Yampi: {token, alias}. Apify: {token}.';
COMMENT ON COLUMN public.integrations.config IS 'Provider-specific config. E.g. Shopify webhook IDs, sync preferences.';

CREATE TRIGGER trg_integrations_updated_at
  BEFORE UPDATE ON public.integrations
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- =============================================================================
-- SYNC LOG (track integration sync operations)
-- =============================================================================

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

COMMENT ON TABLE public.sync_logs IS 'Audit trail for product and order synchronization operations.';

CREATE INDEX idx_sync_logs_tenant ON public.sync_logs(tenant_id, started_at DESC);

-- =============================================================================
-- RLS POLICIES
-- =============================================================================

ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.integrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sync_logs ENABLE ROW LEVEL SECURITY;

-- Products: viewable by all, editable by campaigns.edit holders
CREATE POLICY "products_select" ON public.products
  FOR SELECT USING (tenant_id = public.get_user_tenant_id());

CREATE POLICY "products_update" ON public.products
  FOR UPDATE USING (
    tenant_id = public.get_user_tenant_id()
    AND public.has_permission('campaigns.edit')
  );

-- Integrations: admin-only (team.manage permission)
CREATE POLICY "integrations_select" ON public.integrations
  FOR SELECT USING (tenant_id = public.get_user_tenant_id());

CREATE POLICY "integrations_insert" ON public.integrations
  FOR INSERT WITH CHECK (
    tenant_id = public.get_user_tenant_id()
    AND public.has_permission('team.manage')
  );

CREATE POLICY "integrations_update" ON public.integrations
  FOR UPDATE USING (
    tenant_id = public.get_user_tenant_id()
    AND public.has_permission('team.manage')
  );

CREATE POLICY "integrations_delete" ON public.integrations
  FOR DELETE USING (
    tenant_id = public.get_user_tenant_id()
    AND public.has_permission('team.manage')
  );

-- Sync logs: viewable by tenant members
CREATE POLICY "sync_logs_select" ON public.sync_logs
  FOR SELECT USING (tenant_id = public.get_user_tenant_id());

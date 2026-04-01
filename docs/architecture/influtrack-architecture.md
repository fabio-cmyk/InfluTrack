# InfluTrack — System Architecture Document

| Campo | Valor |
|-------|-------|
| **Produto** | InfluTrack |
| **Versão** | 1.0 |
| **Autor** | Aria (Architect) |
| **Data** | 2026-04-01 |
| **Status** | Draft |
| **PRD Ref** | `docs/prd/influtrack-prd.md` |

---

## 1. System Overview

### 1.1 Architecture Diagram (High-Level)

```
┌─────────────────────────────────────────────────────────────────────┐
│                          VERCEL (Edge Network)                      │
│  ┌──────────────────────────────────────────────────────────────┐   │
│  │                    Next.js 14+ (App Router)                  │   │
│  │  ┌─────────────┐  ┌──────────────┐  ┌───────────────────┐   │   │
│  │  │  React RSC   │  │  API Routes  │  │  Middleware       │   │   │
│  │  │  (Frontend)  │  │  /api/*      │  │  (Auth + Tenant)  │   │   │
│  │  └──────┬──────┘  └──────┬───────┘  └───────────────────┘   │   │
│  └─────────┼───────────────┼────────────────────────────────────┘   │
│            │               │                                        │
│  ┌─────────┼───────────────┼────────────────────────────────────┐   │
│  │         │    Webhook Endpoints                               │   │
│  │         │    /api/webhooks/shopify                            │   │
│  │         │    /api/webhooks/yampi                              │   │
│  └─────────┼───────────────┼────────────────────────────────────┘   │
└────────────┼───────────────┼────────────────────────────────────────┘
             │               │
             ▼               ▼
┌─────────────────────────────────────────────────────────────────────┐
│                         SUPABASE                                    │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────────┐  │
│  │  PostgreSQL   │  │  Auth        │  │  Edge Functions          │  │
│  │  + RLS        │  │  (JWT)       │  │  - sync-products         │  │
│  │  + Views      │  │              │  │  - sync-orders           │  │
│  │  + pg_cron    │  │              │  │  - process-attribution   │  │
│  ├──────────────┤  ├──────────────┤  └──────────────────────────┘  │
│  │  Storage      │  │  Realtime    │                                │
│  │  (brand imgs) │  │  (live data) │                                │
│  └──────────────┘  └──────────────┘                                │
└─────────────────────────────────────────────────────────────────────┘
             │
             ▼
┌──────────────────────────────────────┐
│        EXTERNAL INTEGRATIONS         │
│  ┌──────────┐  ┌──────────┐         │
│  │ Shopify   │  │ Yampi    │         │
│  │ Admin API │  │ API      │         │
│  │ Webhooks  │  │ Webhooks │         │
│  └──────────┘  └──────────┘         │
│  ┌──────────┐                       │
│  │ Apify    │                       │
│  │ Actors   │                       │
│  └──────────┘                       │
└──────────────────────────────────────┘
```

### 1.2 Architecture Style

**Modular Monolith** — Next.js full-stack com Supabase como BaaS. Todos os módulos vivem no mesmo deploy, mas são organizados em domínios isolados internamente.

**Justificativa:** Para o escopo do InfluTrack (500 tenants, ~50K registros), um monolito modular é mais simples de desenvolver, deploy e manter. Microservices seriam over-engineering neste estágio.

### 1.3 Key Architectural Decisions

| # | Decision | Rationale |
|---|----------|-----------|
| AD1 | Next.js App Router (RSC) | Server Components reduzem JS no client, melhor performance |
| AD2 | Supabase como BaaS | Auth, DB, Storage, Realtime, Edge Functions — tudo integrado |
| AD3 | Multi-tenancy via RLS | Isolamento a nível de banco, sem lógica na aplicação |
| AD4 | Webhooks + Polling fallback | Near-real-time com garantia de consistência |
| AD5 | TanStack Query para server state | Cache, invalidation, optimistic updates built-in |
| AD6 | Supabase Edge Functions para jobs | Sync de produtos/vendas sem servidor dedicado |
| AD7 | Vercel para deploy | Zero-config com Next.js, edge network global |

---

## 2. Project Structure

```
influtrack/
├── packages/
│   ├── web/                          # Next.js Application
│   │   ├── src/
│   │   │   ├── app/                  # App Router pages
│   │   │   │   ├── (auth)/           # Auth group (login, register)
│   │   │   │   │   ├── login/
│   │   │   │   │   └── register/
│   │   │   │   ├── (dashboard)/      # Protected routes group
│   │   │   │   │   ├── layout.tsx    # Sidebar + TopNav layout
│   │   │   │   │   ├── page.tsx      # Dashboard home
│   │   │   │   │   ├── campaigns/
│   │   │   │   │   │   ├── page.tsx          # List
│   │   │   │   │   │   ├── new/page.tsx      # Create
│   │   │   │   │   │   └── [id]/
│   │   │   │   │   │       ├── page.tsx      # Detail
│   │   │   │   │   │       └── edit/page.tsx # Edit
│   │   │   │   │   ├── influencers/
│   │   │   │   │   │   ├── page.tsx
│   │   │   │   │   │   ├── new/page.tsx
│   │   │   │   │   │   └── [id]/
│   │   │   │   │   │       ├── page.tsx      # Profile
│   │   │   │   │   │       └── performance/page.tsx
│   │   │   │   │   ├── products/
│   │   │   │   │   │   └── page.tsx
│   │   │   │   │   ├── mining/
│   │   │   │   │   │   └── page.tsx
│   │   │   │   │   ├── analysis/
│   │   │   │   │   │   └── page.tsx
│   │   │   │   │   ├── branding/
│   │   │   │   │   │   └── page.tsx
│   │   │   │   │   └── settings/
│   │   │   │   │       ├── page.tsx          # General
│   │   │   │   │       ├── team/page.tsx     # Team management
│   │   │   │   │       └── integrations/page.tsx
│   │   │   │   └── api/
│   │   │   │       ├── webhooks/
│   │   │   │       │   ├── shopify/route.ts
│   │   │   │       │   └── yampi/route.ts
│   │   │   │       ├── campaigns/route.ts
│   │   │   │       ├── influencers/route.ts
│   │   │   │       ├── products/route.ts
│   │   │   │       ├── mining/route.ts
│   │   │   │       ├── analysis/route.ts
│   │   │   │       └── integrations/route.ts
│   │   │   ├── components/
│   │   │   │   ├── ui/               # shadcn/ui components
│   │   │   │   ├── layout/           # Sidebar, TopNav, Breadcrumb
│   │   │   │   ├── campaigns/        # Campaign-specific components
│   │   │   │   ├── influencers/      # Influencer-specific components
│   │   │   │   ├── dashboard/        # Charts, KPI cards
│   │   │   │   ├── mining/           # Mining results, search form
│   │   │   │   └── shared/           # DataTable, Filters, EmptyState
│   │   │   ├── lib/
│   │   │   │   ├── supabase/
│   │   │   │   │   ├── client.ts     # Browser client
│   │   │   │   │   ├── server.ts     # Server client (RSC)
│   │   │   │   │   ├── middleware.ts # Auth middleware helper
│   │   │   │   │   └── admin.ts      # Service role client (webhooks)
│   │   │   │   ├── integrations/
│   │   │   │   │   ├── shopify.ts    # Shopify API client
│   │   │   │   │   ├── yampi.ts      # Yampi API client
│   │   │   │   │   └── apify.ts      # Apify API client
│   │   │   │   ├── utils/
│   │   │   │   │   ├── currency.ts   # BRL formatting, precision
│   │   │   │   │   ├── dates.ts      # Date helpers
│   │   │   │   │   └── metrics.ts    # ROI, profit calculations
│   │   │   │   └── constants.ts
│   │   │   ├── hooks/
│   │   │   │   ├── use-campaigns.ts
│   │   │   │   ├── use-influencers.ts
│   │   │   │   ├── use-products.ts
│   │   │   │   ├── use-dashboard.ts
│   │   │   │   ├── use-permissions.ts
│   │   │   │   └── use-tenant.ts
│   │   │   ├── types/
│   │   │   │   ├── database.ts       # Supabase generated types
│   │   │   │   ├── campaign.ts
│   │   │   │   ├── influencer.ts
│   │   │   │   ├── product.ts
│   │   │   │   └── integration.ts
│   │   │   └── middleware.ts         # Next.js middleware (auth guard)
│   │   ├── tailwind.config.ts
│   │   ├── next.config.ts
│   │   └── package.json
│   └── shared/                       # Shared types and utils
│       ├── src/
│       │   ├── types/
│       │   └── utils/
│       └── package.json
├── supabase/
│   ├── migrations/                   # Numbered SQL migrations
│   │   ├── 00001_create_tenants.sql
│   │   ├── 00002_create_brand_assets.sql
│   │   ├── 00003_create_influencers.sql
│   │   ├── 00004_create_campaigns.sql
│   │   ├── 00005_create_products.sql
│   │   ├── 00006_create_orders.sql
│   │   ├── 00007_create_views.sql
│   │   └── 00008_create_rls_policies.sql
│   ├── functions/
│   │   ├── sync-products/index.ts    # Cron: sync products from Shopify/Yampi
│   │   ├── sync-orders/index.ts      # Cron: fallback order polling
│   │   └── process-attribution/index.ts  # Process order → influencer attribution
│   ├── seed/
│   │   └── seed.sql
│   └── config.toml
├── docs/
│   ├── prd/
│   ├── architecture/
│   └── stories/
├── tests/
│   ├── unit/
│   ├── integration/
│   └── e2e/
├── .env.local.example
├── package.json                      # Root workspace config
└── turbo.json                        # Turborepo config (monorepo)
```

---

## 3. Database Schema

### 3.1 Entity Relationship Diagram

```
┌─────────────┐     ┌──────────────────┐     ┌───────────────────┐
│   tenants    │────<│  tenant_users    │>────│  auth.users       │
│             │     │                  │     │  (Supabase Auth)  │
└──────┬──────┘     └──────────────────┘     └───────────────────┘
       │                    │
       │            ┌───────┴──────────┐
       │            │ user_permissions  │
       │            └──────────────────┘
       │
       ├─────────────────────────────────────────────────┐
       │                    │                            │
┌──────┴──────┐    ┌───────┴────────┐    ┌──────────────┴───────┐
│ brand_assets │    │  influencers   │    │     campaigns        │
│             │    │               │    │                      │
│ brand_visual │    ├───────────────┤    └──────────┬───────────┘
│ _identity   │    │ influencer_   │               │
│             │    │ growth_history│    ┌───────────┴──────────┐
└─────────────┘    └───────┬───────┘    │ campaign_influencers │
                           │            └───────────┬──────────┘
                           │                        │
                   ┌───────┴────────────────────────┤
                   │                                │
              ┌────┴─────┐                          │
              │  orders  │                          │
              │          ├──────────────────────────┘
              ├──────────┤
              │ order_   │     ┌──────────────┐
              │ items    │────>│   products   │
              ├──────────┤     └──────────────┘
              │ order_   │
              │attributions│
              └──────────┘

       ┌──────────────┐     ┌───────────────────┐
       │ integrations │     │ mining_searches   │
       └──────────────┘     │ mining_results    │
                            │ analysis_history  │
                            └───────────────────┘
```

### 3.2 Table Definitions

#### Core Tables

```sql
-- ==============================================
-- TENANTS & AUTH
-- ==============================================

CREATE TABLE tenants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE tenant_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('admin', 'member')),
  invited_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(tenant_id, user_id)
);

CREATE TABLE user_permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  permission_key TEXT NOT NULL,
  granted BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(tenant_id, user_id, permission_key)
);

-- Permission keys:
-- 'campaigns.view', 'campaigns.edit'
-- 'influencers.view', 'influencers.edit'
-- 'financials.view'
-- 'mining.view'
-- 'branding.edit'
-- 'team.manage'

-- ==============================================
-- BRAND ASSETS
-- ==============================================

CREATE TABLE brand_assets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL UNIQUE REFERENCES tenants(id) ON DELETE CASCADE,
  brand_name TEXT,
  mission TEXT,
  vision TEXT,
  values TEXT[],
  tone_of_voice TEXT,
  target_audience TEXT,
  customer_pain_points TEXT[],
  product_benefits TEXT[],
  competitive_differentiators TEXT[],
  brand_keywords TEXT[],
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE brand_visual_identity (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL UNIQUE REFERENCES tenants(id) ON DELETE CASCADE,
  logo_url TEXT,
  color_palette JSONB DEFAULT '[]'::jsonb,
  -- Format: [{"name": "Primary", "hex": "#6C63FF"}, ...]
  primary_font TEXT,
  secondary_font TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- ==============================================
-- INFLUENCERS
-- ==============================================

CREATE TABLE influencers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  instagram_handle TEXT,
  tiktok_handle TEXT,
  youtube_handle TEXT,
  city TEXT,
  state TEXT,
  niche TEXT,
  coupon_code TEXT NOT NULL,
  avatar_url TEXT,
  is_archived BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(tenant_id, coupon_code)
);

CREATE INDEX idx_influencers_tenant ON influencers(tenant_id);
CREATE INDEX idx_influencers_coupon ON influencers(tenant_id, coupon_code);

CREATE TABLE influencer_growth_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  influencer_id UUID NOT NULL REFERENCES influencers(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  record_date DATE NOT NULL,
  platform TEXT NOT NULL CHECK (platform IN ('instagram', 'tiktok', 'youtube')),
  followers INTEGER,
  engagement_rate DECIMAL(5,2),
  posts_count INTEGER,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(influencer_id, record_date, platform)
);

CREATE INDEX idx_growth_influencer ON influencer_growth_history(influencer_id, record_date);

-- ==============================================
-- CAMPAIGNS
-- ==============================================

CREATE TABLE campaigns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  budget DECIMAL(12,2),
  start_date DATE,
  end_date DATE,
  status TEXT NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft', 'active', 'ended', 'archived')),
  is_archived BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_campaigns_tenant ON campaigns(tenant_id);
CREATE INDEX idx_campaigns_dates ON campaigns(tenant_id, start_date, end_date);

CREATE TABLE campaign_influencers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
  influencer_id UUID NOT NULL REFERENCES influencers(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  added_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(campaign_id, influencer_id)
);

CREATE INDEX idx_campaign_inf_campaign ON campaign_influencers(campaign_id);
CREATE INDEX idx_campaign_inf_influencer ON campaign_influencers(influencer_id);

-- ==============================================
-- PRODUCTS
-- ==============================================

CREATE TABLE products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  external_id TEXT,
  name TEXT NOT NULL,
  sku TEXT,
  price DECIMAL(12,2) NOT NULL,
  cost DECIMAL(12,2),
  image_url TEXT,
  source TEXT CHECK (source IN ('shopify', 'yampi', 'manual')),
  is_active BOOLEAN DEFAULT true,
  synced_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(tenant_id, external_id, source)
);

CREATE INDEX idx_products_tenant ON products(tenant_id);
CREATE INDEX idx_products_sku ON products(tenant_id, sku);

-- ==============================================
-- ORDERS & ATTRIBUTION
-- ==============================================

CREATE TABLE orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  external_id TEXT NOT NULL,
  order_date TIMESTAMPTZ NOT NULL,
  total_amount DECIMAL(12,2) NOT NULL,
  discount_code TEXT,
  source TEXT NOT NULL CHECK (source IN ('shopify', 'yampi')),
  raw_data JSONB,
  processed BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(tenant_id, external_id, source)
);

CREATE INDEX idx_orders_tenant ON orders(tenant_id);
CREATE INDEX idx_orders_coupon ON orders(tenant_id, discount_code);
CREATE INDEX idx_orders_date ON orders(tenant_id, order_date);

CREATE TABLE order_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  product_id UUID REFERENCES products(id),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  external_product_id TEXT,
  product_name TEXT NOT NULL,
  quantity INTEGER NOT NULL DEFAULT 1,
  unit_price DECIMAL(12,2) NOT NULL,
  unit_cost DECIMAL(12,2),
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_order_items_order ON order_items(order_id);

CREATE TABLE order_attributions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  influencer_id UUID NOT NULL REFERENCES influencers(id),
  campaign_id UUID REFERENCES campaigns(id),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  attributed_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(order_id)
);

CREATE INDEX idx_attributions_influencer ON order_attributions(influencer_id);
CREATE INDEX idx_attributions_campaign ON order_attributions(campaign_id);

-- ==============================================
-- INTEGRATIONS
-- ==============================================

CREATE TABLE integrations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  provider TEXT NOT NULL CHECK (provider IN ('shopify', 'yampi', 'apify')),
  credentials JSONB NOT NULL DEFAULT '{}'::jsonb,
  -- Encrypted at application level before storage
  status TEXT NOT NULL DEFAULT 'disconnected'
    CHECK (status IN ('connected', 'disconnected', 'error')),
  last_sync_at TIMESTAMPTZ,
  sync_interval TEXT DEFAULT 'daily'
    CHECK (sync_interval IN ('6h', 'daily', 'manual')),
  config JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(tenant_id, provider)
);

-- ==============================================
-- MINING & ANALYSIS
-- ==============================================

CREATE TABLE mining_searches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  keywords TEXT[] NOT NULL,
  platforms TEXT[] NOT NULL,
  filters JSONB DEFAULT '{}'::jsonb,
  results_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE mining_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  search_id UUID NOT NULL REFERENCES mining_searches(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  platform TEXT NOT NULL,
  handle TEXT NOT NULL,
  display_name TEXT,
  followers INTEGER,
  engagement_rate DECIMAL(5,2),
  niche_estimate TEXT,
  profile_url TEXT,
  avatar_url TEXT,
  raw_data JSONB,
  saved_as_influencer_id UUID REFERENCES influencers(id),
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE analysis_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  handle TEXT NOT NULL,
  platform TEXT NOT NULL,
  analysis_data JSONB NOT NULL,
  -- Contains: engagement, growth, content_type, audience_estimate
  fit_score INTEGER CHECK (fit_score BETWEEN 0 AND 100),
  fit_classification TEXT CHECK (fit_classification IN ('recommended', 'neutral', 'not_recommended')),
  strengths TEXT[],
  concerns TEXT[],
  saved_as_influencer_id UUID REFERENCES influencers(id),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ==============================================
-- AUDIT LOG
-- ==============================================

CREATE TABLE audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id),
  action TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id UUID,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_audit_tenant ON audit_logs(tenant_id, created_at DESC);
```

### 3.3 Materialized Views (Dashboard Performance)

```sql
-- ==============================================
-- VIEWS PARA MÉTRICAS
-- ==============================================

-- Métricas por Influencer (agregado)
CREATE OR REPLACE VIEW v_influencer_metrics AS
SELECT
  oa.influencer_id,
  oa.tenant_id,
  COUNT(DISTINCT oa.order_id) AS total_orders,
  COALESCE(SUM(o.total_amount), 0) AS total_revenue,
  COALESCE(SUM(
    (SELECT SUM(oi.unit_cost * oi.quantity)
     FROM order_items oi WHERE oi.order_id = o.id)
  ), 0) AS total_cost,
  COALESCE(SUM(o.total_amount) - SUM(
    (SELECT COALESCE(SUM(oi.unit_cost * oi.quantity), 0)
     FROM order_items oi WHERE oi.order_id = o.id)
  ), 0) AS total_profit,
  COUNT(DISTINCT oa.campaign_id) AS campaigns_count
FROM order_attributions oa
JOIN orders o ON o.id = oa.order_id
GROUP BY oa.influencer_id, oa.tenant_id;

-- Métricas por Campanha (agregado)
CREATE OR REPLACE VIEW v_campaign_metrics AS
SELECT
  oa.campaign_id,
  oa.tenant_id,
  COUNT(DISTINCT oa.order_id) AS total_orders,
  COUNT(DISTINCT oa.influencer_id) AS influencer_count,
  COALESCE(SUM(o.total_amount), 0) AS total_revenue,
  COALESCE(SUM(
    (SELECT COALESCE(SUM(oi.unit_cost * oi.quantity), 0)
     FROM order_items oi WHERE oi.order_id = o.id)
  ), 0) AS total_cost,
  COALESCE(SUM(o.total_amount) - SUM(
    (SELECT COALESCE(SUM(oi.unit_cost * oi.quantity), 0)
     FROM order_items oi WHERE oi.order_id = o.id)
  ), 0) AS total_profit
FROM order_attributions oa
JOIN orders o ON o.id = oa.order_id
WHERE oa.campaign_id IS NOT NULL
GROUP BY oa.campaign_id, oa.tenant_id;

-- Métricas por Influencer DENTRO de uma Campanha
CREATE OR REPLACE VIEW v_campaign_influencer_metrics AS
SELECT
  oa.campaign_id,
  oa.influencer_id,
  oa.tenant_id,
  COUNT(DISTINCT oa.order_id) AS total_orders,
  COALESCE(SUM(o.total_amount), 0) AS revenue,
  COALESCE(SUM(o.total_amount) - SUM(
    (SELECT COALESCE(SUM(oi.unit_cost * oi.quantity), 0)
     FROM order_items oi WHERE oi.order_id = o.id)
  ), 0) AS profit
FROM order_attributions oa
JOIN orders o ON o.id = oa.order_id
WHERE oa.campaign_id IS NOT NULL
GROUP BY oa.campaign_id, oa.influencer_id, oa.tenant_id;

-- Dashboard KPIs (tenant-level, filterable by date)
CREATE OR REPLACE VIEW v_dashboard_kpis AS
SELECT
  o.tenant_id,
  DATE_TRUNC('month', o.order_date) AS month,
  COUNT(DISTINCT o.id) AS total_orders,
  COALESCE(SUM(o.total_amount), 0) AS total_revenue,
  COALESCE(SUM(
    (SELECT COALESCE(SUM(oi.unit_cost * oi.quantity), 0)
     FROM order_items oi WHERE oi.order_id = o.id)
  ), 0) AS total_cost,
  COALESCE(SUM(o.total_amount) - SUM(
    (SELECT COALESCE(SUM(oi.unit_cost * oi.quantity), 0)
     FROM order_items oi WHERE oi.order_id = o.id)
  ), 0) AS total_profit
FROM orders o
JOIN order_attributions oa ON oa.order_id = o.id
GROUP BY o.tenant_id, DATE_TRUNC('month', o.order_date);
```

### 3.4 Row Level Security (RLS)

```sql
-- ==============================================
-- RLS POLICIES — MULTI-TENANCY ISOLATION
-- ==============================================

-- Helper function: get current user's tenant_id
CREATE OR REPLACE FUNCTION get_user_tenant_id()
RETURNS UUID AS $$
  SELECT tenant_id FROM tenant_users
  WHERE user_id = auth.uid()
  LIMIT 1;
$$ LANGUAGE SQL SECURITY DEFINER STABLE;

-- Helper function: check user permission
CREATE OR REPLACE FUNCTION has_permission(perm TEXT)
RETURNS BOOLEAN AS $$
  SELECT EXISTS(
    SELECT 1 FROM user_permissions
    WHERE user_id = auth.uid()
      AND tenant_id = get_user_tenant_id()
      AND permission_key = perm
      AND granted = true
  ) OR EXISTS(
    SELECT 1 FROM tenant_users
    WHERE user_id = auth.uid()
      AND tenant_id = get_user_tenant_id()
      AND role = 'admin'
  );
$$ LANGUAGE SQL SECURITY DEFINER STABLE;

-- Apply RLS to ALL tenant-scoped tables
-- Pattern: SELECT/INSERT/UPDATE/DELETE where tenant_id = get_user_tenant_id()

-- Example for influencers (same pattern for all tables):
ALTER TABLE influencers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "tenant_isolation_select" ON influencers
  FOR SELECT USING (tenant_id = get_user_tenant_id());

CREATE POLICY "tenant_isolation_insert" ON influencers
  FOR INSERT WITH CHECK (tenant_id = get_user_tenant_id());

CREATE POLICY "tenant_isolation_update" ON influencers
  FOR UPDATE USING (tenant_id = get_user_tenant_id());

CREATE POLICY "tenant_isolation_delete" ON influencers
  FOR DELETE USING (tenant_id = get_user_tenant_id());

-- Tables requiring RLS (same pattern):
-- tenants, tenant_users, user_permissions
-- brand_assets, brand_visual_identity
-- influencers, influencer_growth_history
-- campaigns, campaign_influencers
-- products, orders, order_items, order_attributions
-- integrations
-- mining_searches, mining_results, analysis_history
-- audit_logs
```

---

## 4. API Design

### 4.1 API Routes Overview

Todas as rotas são **Next.js API Routes** (App Router `route.ts`) protegidas por middleware de autenticação.

```
/api
├── /auth
│   └── /callback/route.ts          # Supabase auth callback
├── /campaigns
│   ├── route.ts                    # GET (list), POST (create)
│   └── /[id]/route.ts             # GET, PATCH, DELETE (archive)
│       └── /influencers/route.ts  # GET, POST (link), DELETE (unlink)
├── /influencers
│   ├── route.ts                    # GET (list), POST (create)
│   └── /[id]/route.ts             # GET, PATCH, DELETE (archive)
│       ├── /growth/route.ts       # GET, POST (add entry)
│       └── /metrics/route.ts      # GET (aggregated metrics)
├── /products
│   ├── route.ts                    # GET (list)
│   ├── /[id]/route.ts             # PATCH (update cost)
│   └── /sync/route.ts            # POST (trigger manual sync)
├── /orders
│   └── /route.ts                  # GET (list with filters)
├── /dashboard
│   ├── /kpis/route.ts             # GET (dashboard KPIs)
│   ├── /top-influencers/route.ts  # GET
│   └── /top-campaigns/route.ts   # GET
├── /mining
│   ├── /search/route.ts           # POST (start search)
│   ├── /searches/route.ts        # GET (saved searches)
│   └── /save/route.ts            # POST (save as influencer)
├── /analysis
│   ├── /analyze/route.ts          # POST (analyze handle)
│   └── /history/route.ts         # GET (past analyses)
├── /branding
│   ├── route.ts                    # GET, PUT (brand asset)
│   └── /visual/route.ts          # GET, PUT (visual identity)
├── /integrations
│   ├── route.ts                    # GET (list)
│   └── /[provider]/route.ts      # PUT (connect), DELETE (disconnect)
├── /team
│   ├── route.ts                    # GET (members)
│   ├── /invite/route.ts          # POST (send invite)
│   └── /[userId]/route.ts        # PATCH (permissions), DELETE (remove)
└── /webhooks
    ├── /shopify/route.ts          # POST (order webhook)
    └── /yampi/route.ts            # POST (order webhook)
```

### 4.2 API Response Pattern

```typescript
// Standard success response
interface ApiResponse<T> {
  data: T;
  meta?: {
    page: number;
    pageSize: number;
    total: number;
  };
}

// Standard error response
interface ApiError {
  error: {
    code: string;
    message: string;
    details?: Record<string, string[]>;
  };
}

// HTTP Status Codes:
// 200 - OK (GET, PATCH)
// 201 - Created (POST)
// 204 - No Content (DELETE)
// 400 - Bad Request (validation)
// 401 - Unauthorized
// 403 - Forbidden (permission)
// 404 - Not Found
// 409 - Conflict (duplicate)
// 500 - Internal Server Error
```

### 4.3 Pagination Pattern

```typescript
// Query params: ?page=1&pageSize=20&sort=created_at&order=desc
// Default: page=1, pageSize=20, sort=created_at, order=desc
// Max pageSize: 100

// Response includes meta:
{
  "data": [...],
  "meta": {
    "page": 1,
    "pageSize": 20,
    "total": 156
  }
}
```

---

## 5. Integration Architecture

### 5.1 Shopify Integration

```
┌──────────────────┐         ┌─────────────────┐
│   Shopify Store   │────────>│ Webhook Endpoint │
│                  │ webhook │ /api/webhooks/   │
│  orders/create   │         │ shopify          │
└──────────────────┘         └────────┬────────┘
                                      │
        ┌─────────────────────────────┤
        │ 1. Validate HMAC signature  │
        │ 2. Extract order data       │
        │ 3. Map discount_code        │
        │ 4. Save to orders table     │
        │ 5. Trigger attribution      │
        └─────────────────────────────┘

┌──────────────────┐         ┌─────────────────┐
│   Shopify Store   │<───────│ Edge Function    │
│                  │  API    │ sync-products    │
│  Products API    │         │ (cron: daily)    │
└──────────────────┘         └─────────────────┘
```

**Shopify Webhook Signature Validation:**
```typescript
// Validate X-Shopify-Hmac-Sha256 header
import crypto from 'crypto';

function verifyShopifyWebhook(body: string, hmac: string, secret: string): boolean {
  const hash = crypto.createHmac('sha256', secret).update(body).digest('base64');
  return crypto.timingSafeEqual(Buffer.from(hash), Buffer.from(hmac));
}
```

**Shopify API Scopes Required:**
- `read_products` — Import product catalog
- `read_orders` — Read order data
- `read_price_rules` — Validate discount codes

### 5.2 Yampi Integration

```
┌──────────────────┐         ┌─────────────────┐
│   Yampi Store     │────────>│ Webhook Endpoint │
│                  │ webhook │ /api/webhooks/   │
│  order.paid      │         │ yampi            │
└──────────────────┘         └────────┬────────┘
                                      │
        ┌─────────────────────────────┤
        │ 1. Validate token           │
        │ 2. Extract order data       │
        │ 3. Map coupon_code          │
        │ 4. Save to orders table     │
        │ 5. Trigger attribution      │
        └─────────────────────────────┘
```

**Yampi API Endpoints Used:**
- `GET /products` — Import products
- `GET /orders` — Polling fallback
- Webhook event: `order.paid`

### 5.3 Apify Integration (Mining & Analysis)

```
┌──────────────────┐         ┌─────────────────┐
│   InfluTrack UI   │────────>│ API Route       │
│   Mining Page     │  POST  │ /api/mining/     │
│                  │         │ search           │
└──────────────────┘         └────────┬────────┘
                                      │
                              ┌───────┴────────┐
                              │ Apify Client    │
                              │ - call Actor    │
                              │ - poll results  │
                              │ - parse data    │
                              └───────┬────────┘
                                      │
                              ┌───────┴────────┐
                              │ Apify Actors    │
                              │ Instagram:      │
                              │  apify/instagram│
                              │  -profile-      │
                              │  scraper        │
                              │ TikTok:         │
                              │  apify/tiktok-  │
                              │  scraper        │
                              └────────────────┘
```

**Apify Actors Recomendados:**
- Instagram: `apify/instagram-profile-scraper` ou `apify/instagram-scraper`
- TikTok: `clockworks/tiktok-scraper`
- Análise: `apify/instagram-post-scraper` (últimos posts para engajamento)

### 5.4 Order Attribution Flow

```
New Order (webhook/polling)
        │
        ▼
┌───────────────────┐
│ 1. Save to orders │
│    table          │
└───────┬───────────┘
        │
        ▼
┌───────────────────┐     ┌─────────────────┐
│ 2. Has discount   │─NO─>│ Skip attribution │
│    code?          │     └─────────────────┘
└───────┬───────────┘
        │ YES
        ▼
┌───────────────────┐     ┌─────────────────┐
│ 3. Find influencer│─NO─>│ Log: unknown    │
│    by coupon_code │     │ coupon          │
└───────┬───────────┘     └─────────────────┘
        │ FOUND
        ▼
┌───────────────────┐
│ 4. Find active    │
│    campaigns where│
│    influencer is  │
│    linked AND     │
│    order_date is  │
│    within period  │
└───────┬───────────┘
        │
        ├── FOUND ──> Attribute to influencer + campaign
        │
        └── NOT FOUND ──> Attribute to influencer only (organic)
```

---

## 6. Authentication & Security Architecture

### 6.1 Auth Flow

```
┌──────────┐     ┌──────────────┐     ┌──────────────┐
│  Browser  │────>│ Next.js      │────>│ Supabase     │
│          │     │ Middleware    │     │ Auth         │
│          │     │ (JWT verify) │     │ (JWT issuer) │
└──────────┘     └──────────────┘     └──────────────┘

1. User registers → Supabase Auth creates user
2. Trigger creates tenant + tenant_user (admin) + default permissions
3. On login → JWT with user_id, aud, role
4. Middleware validates JWT on every request
5. RLS uses auth.uid() to enforce tenant isolation
```

### 6.2 Middleware Chain

```typescript
// middleware.ts (Next.js)
// 1. Check if route requires auth
// 2. Validate Supabase session
// 3. Redirect unauthenticated users to /login
// 4. For API routes: set tenant context in headers

export async function middleware(request: NextRequest) {
  const supabase = createMiddlewareClient({ req: request });
  const { data: { session } } = await supabase.auth.getSession();

  if (!session && isProtectedRoute(request.nextUrl.pathname)) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  return NextResponse.next();
}
```

### 6.3 Permission Check Pattern

```typescript
// Server Component or API Route
async function checkPermission(permission: string): Promise<boolean> {
  const supabase = createServerClient();
  const { data } = await supabase.rpc('has_permission', { perm: permission });
  return data ?? false;
}

// Usage in API route
export async function GET(req: NextRequest) {
  if (!await checkPermission('campaigns.view')) {
    return NextResponse.json({ error: { code: 'FORBIDDEN', message: 'Insufficient permissions' } }, { status: 403 });
  }
  // ... proceed
}
```

### 6.4 Security Measures

| Measure | Implementation |
|---------|---------------|
| **Tenant Isolation** | RLS on ALL tables via `get_user_tenant_id()` |
| **Auth** | Supabase Auth (bcrypt, JWT) |
| **HTTPS** | Enforced by Vercel |
| **Webhook Validation** | HMAC-SHA256 (Shopify), Token (Yampi) |
| **Credential Storage** | Encrypted at app level before DB storage |
| **Rate Limiting** | Vercel Edge middleware (per-tenant) |
| **Input Validation** | Zod schemas on all API inputs |
| **CSRF** | SameSite cookies + Origin validation |
| **Audit Trail** | `audit_logs` table for all mutations |

---

## 7. Frontend Architecture

### 7.1 State Management Strategy

```
┌─────────────────────────────────────────────┐
│                STATE LAYERS                  │
│                                             │
│  ┌──────────────────────┐                   │
│  │  Server State         │  TanStack Query  │
│  │  (DB data, API data)  │  - cache         │
│  │  campaigns, influencers│  - invalidation  │
│  │  products, orders     │  - optimistic    │
│  └──────────────────────┘                   │
│                                             │
│  ┌──────────────────────┐                   │
│  │  Client State         │  Zustand         │
│  │  (UI state)           │  - sidebar open  │
│  │  filters, modals,     │  - active filters│
│  │  form drafts          │  - theme         │
│  └──────────────────────┘                   │
│                                             │
│  ┌──────────────────────┐                   │
│  │  URL State            │  Next.js Router  │
│  │  (shareable state)    │  - searchParams  │
│  │  page, sort, filters  │  - pathname      │
│  └──────────────────────┘                   │
└─────────────────────────────────────────────┘
```

### 7.2 Component Architecture

```
components/
├── ui/                    # shadcn/ui primitives (Button, Input, Dialog, etc.)
├── layout/
│   ├── Sidebar.tsx        # Fixed sidebar with navigation
│   ├── TopNav.tsx         # Top bar with search, user menu
│   ├── Breadcrumb.tsx     # Dynamic breadcrumb
│   └── PageHeader.tsx     # Page title + action buttons
├── shared/
│   ├── DataTable.tsx      # Generic sortable/filterable table
│   ├── KPICard.tsx        # Metric card (value, label, trend)
│   ├── DateRangePicker.tsx
│   ├── EmptyState.tsx
│   ├── LoadingState.tsx
│   └── ConfirmDialog.tsx
├── dashboard/
│   ├── RevenueChart.tsx   # Line chart (Recharts)
│   ├── TopPerformers.tsx  # Ranked table
│   └── KPIGrid.tsx        # Grid of KPI cards
├── campaigns/
│   ├── CampaignForm.tsx
│   ├── CampaignCard.tsx
│   ├── InfluencerSelector.tsx
│   └── CampaignTimeline.tsx
├── influencers/
│   ├── InfluencerForm.tsx
│   ├── GrowthChart.tsx
│   ├── PerformanceTab.tsx
│   └── CouponBadge.tsx
└── mining/
    ├── SearchForm.tsx
    ├── ResultCard.tsx
    └── FitScoreBadge.tsx
```

### 7.3 Data Fetching Pattern (TanStack Query)

```typescript
// hooks/use-campaigns.ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

export function useCampaigns(filters?: CampaignFilters) {
  return useQuery({
    queryKey: ['campaigns', filters],
    queryFn: () => fetchCampaigns(filters),
    staleTime: 30_000, // 30s
  });
}

export function useCreateCampaign() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createCampaign,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['campaigns'] });
    },
  });
}
```

---

## 8. Background Jobs & Sync Architecture

### 8.1 Supabase Edge Functions (Cron Jobs)

| Function | Schedule | Purpose |
|----------|----------|---------|
| `sync-products` | Based on tenant config (6h/daily) | Pull products from Shopify/Yampi |
| `sync-orders` | Every 15 minutes | Fallback: poll orders not caught by webhooks |
| `process-attribution` | On order insert (trigger) | Attribute order to influencer/campaign |
| `update-campaign-status` | Every hour | Auto-update: active/ended based on dates |

### 8.2 Database Triggers

```sql
-- Auto-update campaign status based on dates
CREATE OR REPLACE FUNCTION update_campaign_status()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.start_date IS NOT NULL AND NEW.end_date IS NOT NULL THEN
    IF CURRENT_DATE < NEW.start_date THEN
      NEW.status := 'draft';
    ELSIF CURRENT_DATE BETWEEN NEW.start_date AND NEW.end_date THEN
      NEW.status := 'active';
    ELSE
      NEW.status := 'ended';
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_campaign_status
  BEFORE INSERT OR UPDATE OF start_date, end_date ON campaigns
  FOR EACH ROW EXECUTE FUNCTION update_campaign_status();

-- Auto-attribute orders on insert
CREATE OR REPLACE FUNCTION process_order_attribution()
RETURNS TRIGGER AS $$
DECLARE
  v_influencer_id UUID;
  v_campaign_id UUID;
BEGIN
  -- Skip if no discount code
  IF NEW.discount_code IS NULL OR NEW.discount_code = '' THEN
    RETURN NEW;
  END IF;

  -- Find influencer by coupon
  SELECT id INTO v_influencer_id
  FROM influencers
  WHERE tenant_id = NEW.tenant_id
    AND coupon_code = UPPER(NEW.discount_code)
    AND is_archived = false;

  IF v_influencer_id IS NULL THEN
    RETURN NEW;
  END IF;

  -- Find matching campaign (influencer linked + date within period)
  SELECT c.id INTO v_campaign_id
  FROM campaigns c
  JOIN campaign_influencers ci ON ci.campaign_id = c.id
  WHERE c.tenant_id = NEW.tenant_id
    AND ci.influencer_id = v_influencer_id
    AND NEW.order_date::date BETWEEN c.start_date AND c.end_date
    AND c.is_archived = false
  ORDER BY c.start_date DESC
  LIMIT 1;

  -- Create attribution
  INSERT INTO order_attributions (order_id, influencer_id, campaign_id, tenant_id)
  VALUES (NEW.id, v_influencer_id, v_campaign_id, NEW.tenant_id)
  ON CONFLICT (order_id) DO NOTHING;

  -- Mark order as processed
  NEW.processed := true;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trg_order_attribution
  AFTER INSERT ON orders
  FOR EACH ROW EXECUTE FUNCTION process_order_attribution();

-- Auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply to all tables with updated_at
CREATE TRIGGER trg_updated_at_tenants
  BEFORE UPDATE ON tenants FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_updated_at_brand_assets
  BEFORE UPDATE ON brand_assets FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_updated_at_influencers
  BEFORE UPDATE ON influencers FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_updated_at_campaigns
  BEFORE UPDATE ON campaigns FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_updated_at_products
  BEFORE UPDATE ON products FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_updated_at_integrations
  BEFORE UPDATE ON integrations FOR EACH ROW EXECUTE FUNCTION update_updated_at();
```

---

## 9. Deployment Architecture

### 9.1 Infrastructure

```
┌──────────────────────────────────────┐
│            VERCEL                     │
│  ┌──────────────────────────────┐    │
│  │  Next.js App                 │    │
│  │  - SSR/RSC (Edge Runtime)    │    │
│  │  - API Routes (Node Runtime) │    │
│  │  - Static Assets (CDN)       │    │
│  └──────────────────────────────┘    │
│  ┌──────────────────────────────┐    │
│  │  Environment Variables        │    │
│  │  - NEXT_PUBLIC_SUPABASE_URL  │    │
│  │  - SUPABASE_SERVICE_ROLE_KEY │    │
│  │  - SHOPIFY_WEBHOOK_SECRET    │    │
│  │  - ENCRYPTION_KEY            │    │
│  └──────────────────────────────┘    │
└──────────────────────────────────────┘
              │
              ▼
┌──────────────────────────────────────┐
│          SUPABASE (Cloud)            │
│  - PostgreSQL database               │
│  - Auth service                      │
│  - Storage buckets                   │
│  - Edge Functions (Deno)             │
│  - Realtime (WebSocket)              │
│  - pg_cron extension                 │
└──────────────────────────────────────┘
```

### 9.2 Environment Configuration

```bash
# .env.local.example

# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...

# Encryption (for integration credentials)
ENCRYPTION_KEY=32-byte-hex-key

# Shopify Webhook
SHOPIFY_WEBHOOK_SECRET=shpss_xxx

# Yampi
YAMPI_WEBHOOK_TOKEN=xxx

# Apify (stored per-tenant, but fallback default)
APIFY_DEFAULT_TOKEN=apify_api_xxx

# App
NEXT_PUBLIC_APP_URL=https://influtrack.app
```

### 9.3 CI/CD Pipeline (GitHub Actions)

```yaml
# .github/workflows/deploy.yml
name: Deploy
on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: 20 }
      - run: npm ci
      - run: npm run lint
      - run: npm run typecheck
      - run: npm run test

  deploy:
    needs: test
    if: github.ref == 'refs/heads/main'
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: amondnet/vercel-action@v25
        with:
          vercel-token: ${{ secrets.VERCEL_TOKEN }}
          vercel-org-id: ${{ secrets.VERCEL_ORG_ID }}
          vercel-project-id: ${{ secrets.VERCEL_PROJECT_ID }}
          vercel-args: '--prod'
```

---

## 10. Performance Strategy

| Area | Strategy | Target |
|------|----------|--------|
| **Initial Load** | RSC + streaming, code splitting by route | < 2s FCP |
| **Data Fetching** | TanStack Query with 30s staleTime | < 500ms cached |
| **Dashboard** | SQL views (pre-aggregated), pagination | < 1s load |
| **Large Lists** | Server-side pagination (20 items default) | < 500ms |
| **Images** | Next.js Image component, Supabase CDN | Lazy loaded |
| **Charts** | Dynamic import (next/dynamic), lazy render | No SSR |
| **Webhooks** | Async processing, immediate 200 response | < 200ms response |
| **Search** | Debounced input (300ms), server-side filtering | < 500ms |

---

## 11. Error Handling & Observability

### 11.1 Error Handling Pattern

```typescript
// lib/errors.ts
export class AppError extends Error {
  constructor(
    public code: string,
    message: string,
    public statusCode: number = 500,
    public details?: Record<string, string[]>
  ) {
    super(message);
  }
}

// API route error handler
export function handleApiError(error: unknown): NextResponse {
  if (error instanceof AppError) {
    return NextResponse.json(
      { error: { code: error.code, message: error.message, details: error.details } },
      { status: error.statusCode }
    );
  }
  console.error('Unhandled error:', error);
  return NextResponse.json(
    { error: { code: 'INTERNAL_ERROR', message: 'An unexpected error occurred' } },
    { status: 500 }
  );
}
```

### 11.2 Integration Error Handling

```typescript
// Circuit breaker for external APIs
interface CircuitBreakerConfig {
  failureThreshold: number;  // 5
  resetTimeout: number;      // 60000ms
  retryAttempts: number;     // 3
  retryDelay: number;        // 1000ms (exponential backoff)
}

// Retry with exponential backoff
async function withRetry<T>(fn: () => Promise<T>, config: CircuitBreakerConfig): Promise<T> {
  for (let attempt = 0; attempt < config.retryAttempts; attempt++) {
    try {
      return await fn();
    } catch (error) {
      if (attempt === config.retryAttempts - 1) throw error;
      await sleep(config.retryDelay * Math.pow(2, attempt));
    }
  }
  throw new Error('Unreachable');
}
```

### 11.3 Audit Logging

```typescript
// lib/audit.ts
export async function auditLog(
  supabase: SupabaseClient,
  action: string,
  entityType: string,
  entityId?: string,
  metadata?: Record<string, unknown>
) {
  await supabase.from('audit_logs').insert({
    action,
    entity_type: entityType,
    entity_id: entityId,
    metadata,
  });
}

// Usage:
await auditLog(supabase, 'create', 'campaign', campaign.id, { name: campaign.name });
await auditLog(supabase, 'invite', 'team_member', null, { email, permissions });
```

---

## 12. Technology Decisions Summary

| Category | Choice | Alternatives Considered | Why This |
|----------|--------|------------------------|----------|
| **Framework** | Next.js 14+ | Remix, Nuxt | RSC, App Router, Vercel ecosystem |
| **UI** | shadcn/ui + Tailwind | MUI, Chakra, Ant | Customizable, accessible, no vendor lock |
| **Database** | Supabase (PostgreSQL) | PlanetScale, Neon | Auth+DB+Storage integrated, user familiar |
| **Auth** | Supabase Auth | Clerk, Auth0 | Native integration, magic link, JWT+RLS |
| **State** | TanStack Query + Zustand | SWR, Redux | Best cache management, minimal boilerplate |
| **Charts** | Recharts | Tremor, Chart.js, Nivo | React-native, composable, good docs |
| **Validation** | Zod | Yup, Joi | TypeScript-first, inference, small bundle |
| **Deploy** | Vercel | Netlify, Railway | Best Next.js integration, edge network |
| **Monorepo** | Turborepo | Nx, pnpm workspaces | Simple config, Vercel native support |
| **Tests** | Vitest + Playwright | Jest + Cypress | Faster, ESM native, better DX |

---

## 13. Handoff Notes

### Para @data-engineer (Dara)
O schema SQL na seção 3 é a base. Preciso que você:
1. Revise e otimize as queries das views (seção 3.3)
2. Defina índices adicionais baseado nos padrões de acesso
3. Implemente as RLS policies para TODAS as tabelas (seção 3.4 tem o padrão)
4. Crie as migrations numeradas no formato Supabase
5. Valide os triggers de atribuição (seção 8.2)

### Para @ux-design-expert (Uma)
A estrutura de telas está na seção 2 (Project Structure) e no PRD seção 3.3. Preciso que você:
1. Crie wireframes para as 13 core screens
2. Defina o design system (shadcn/ui como base)
3. Mapeie os fluxos de navegação entre módulos
4. Defina o layout do dashboard (KPI cards + charts)

### Para @dev (Dex)
Ao implementar, siga:
1. Estrutura de projeto da seção 2
2. Padrões de API da seção 4
3. Padrões de data fetching da seção 7.3
4. Error handling da seção 11

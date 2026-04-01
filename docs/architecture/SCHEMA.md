# InfluTrack — Database Schema Reference

**Engine:** PostgreSQL (Supabase)
**Multi-tenancy:** RLS via `get_user_tenant_id()`
**Migrations:** `supabase/migrations/`

---

## Table Summary

| # | Table | Domain | Rows (est.) | Key Relationships |
|---|-------|--------|-------------|-------------------|
| 1 | `tenants` | Auth | 500 | Root entity |
| 2 | `tenant_users` | Auth | 1.5K | tenants ← auth.users |
| 3 | `user_permissions` | Auth | 10K | tenant_users (granular perms) |
| 4 | `brand_assets` | Branding | 500 | 1:1 tenants |
| 5 | `brand_visual_identity` | Branding | 500 | 1:1 tenants |
| 6 | `influencers` | Influencers | 50K | tenants (unique coupon) |
| 7 | `influencer_growth_history` | Influencers | 500K | influencers (time series) |
| 8 | `campaigns` | Campaigns | 25K | tenants |
| 9 | `campaign_influencers` | Campaigns | 100K | campaigns ↔ influencers |
| 10 | `products` | Products | 250K | tenants (from Shopify/Yampi) |
| 11 | `integrations` | Integrations | 1.5K | tenants (credentials) |
| 12 | `sync_logs` | Integrations | 50K | tenants (sync audit) |
| 13 | `orders` | Sales | 1M+ | tenants (from webhooks) |
| 14 | `order_items` | Sales | 3M+ | orders → products |
| 15 | `order_attributions` | Attribution | 500K | orders → influencers → campaigns |
| 16 | `mining_searches` | Mining | 10K | tenants |
| 17 | `mining_results` | Mining | 100K | mining_searches |
| 18 | `analysis_history` | Analysis | 20K | tenants |
| 19 | `audit_logs` | Audit | 2M+ | tenants (all mutations) |

## Views

| View | Purpose | Used By |
|------|---------|---------|
| `v_influencer_metrics` | Aggregated influencer KPIs | Profile page, rankings |
| `v_campaign_metrics` | Aggregated campaign KPIs | Campaign detail |
| `v_campaign_influencer_metrics` | Per-influencer within campaign | Comparatives |
| `v_dashboard_kpis` | Monthly tenant KPIs | Dashboard charts |
| `v_top_influencers` | Ranked by ROI | Dashboard widget |

## Functions & Triggers

| Function | Type | Purpose |
|----------|------|---------|
| `get_user_tenant_id()` | Helper | RLS: returns current user's tenant |
| `has_permission(perm)` | Helper | RLS: checks granular permission |
| `update_updated_at()` | Trigger | Auto-set updated_at on UPDATE |
| `handle_new_user()` | Trigger | Auto-create tenant on signup |
| `normalize_coupon_code()` | Trigger | Uppercase coupon codes |
| `update_campaign_status()` | Trigger | Auto-set campaign status by dates |
| `process_order_attribution()` | Trigger | Core: attribute order → influencer → campaign |
| `reprocess_campaign_attributions()` | Trigger | Re-evaluate when campaign dates change |
| `audit_log()` | Callable | Insert audit entry from API |

## Migration Order

```
00001_create_tenants_and_auth.sql     → Extensions, helpers, tenants, users, permissions, RLS
00002_create_brand_assets.sql         → Brand assets, visual identity, RLS
00003_create_influencers.sql          → Influencers, growth history, coupon normalization, RLS
00004_create_campaigns.sql            → Campaigns, campaign_influencers, status trigger, RLS
00005_create_products.sql             → Products, integrations, sync_logs, RLS
00006_create_orders_and_attribution.sql → Orders, items, attributions, attribution engine, RLS
00007_create_mining_and_analysis.sql  → Mining searches/results, analysis history, RLS
00008_create_views_and_audit.sql      → All views, audit log, audit function
```

## RLS Policy Pattern

Todas as tabelas usam o mesmo padrão base:

```sql
-- SELECT: tenant_id = get_user_tenant_id() [+ has_permission('x.view')]
-- INSERT: tenant_id = get_user_tenant_id() [+ has_permission('x.edit')]
-- UPDATE: tenant_id = get_user_tenant_id() [+ has_permission('x.edit')]
-- DELETE: tenant_id = get_user_tenant_id() [+ has_permission('x.manage')]
```

Exceções:
- `orders`, `order_items`, `order_attributions`: INSERT via service_role (webhooks)
- `audit_logs`: INSERT via `audit_log()` SECURITY DEFINER function

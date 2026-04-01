# InfluTrack — Frontend Specification & Design System

| Campo | Valor |
|-------|-------|
| **Produto** | InfluTrack |
| **Versão** | 1.0 |
| **Autor** | Uma (UX/UI Designer) |
| **Data** | 2026-04-01 |
| **Stack** | Next.js 14+ · shadcn/ui · Tailwind CSS · Recharts |

---

## 1. Design Tokens

### 1.1 Color Palette

```css
/* InfluTrack Brand Colors */
:root {
  /* Primary — Indigo/Purple (confiança + inovação) */
  --color-primary-50:  #EEF2FF;
  --color-primary-100: #E0E7FF;
  --color-primary-200: #C7D2FE;
  --color-primary-300: #A5B4FC;
  --color-primary-400: #818CF8;
  --color-primary-500: #6366F1;  /* Main */
  --color-primary-600: #4F46E5;
  --color-primary-700: #4338CA;
  --color-primary-800: #3730A3;
  --color-primary-900: #312E81;

  /* Accent — Violet (destaque) */
  --color-accent-500:  #8B5CF6;
  --color-accent-600:  #7C3AED;

  /* Success — Green (performance positiva) */
  --color-success-50:  #F0FDF4;
  --color-success-500: #22C55E;
  --color-success-700: #15803D;

  /* Warning — Amber (atenção) */
  --color-warning-50:  #FFFBEB;
  --color-warning-500: #F59E0B;
  --color-warning-700: #B45309;

  /* Danger — Red (performance negativa) */
  --color-danger-50:   #FEF2F2;
  --color-danger-500:  #EF4444;
  --color-danger-700:  #B91C1C;

  /* Neutral — Slate (backgrounds, borders, text) */
  --color-neutral-50:  #F8FAFC;
  --color-neutral-100: #F1F5F9;
  --color-neutral-200: #E2E8F0;
  --color-neutral-300: #CBD5E1;
  --color-neutral-400: #94A3B8;
  --color-neutral-500: #64748B;
  --color-neutral-600: #475569;
  --color-neutral-700: #334155;
  --color-neutral-800: #1E293B;
  --color-neutral-900: #0F172A;
}
```

### 1.2 Typography

```css
:root {
  /* Font Family */
  --font-sans: 'Inter', system-ui, -apple-system, sans-serif;
  --font-mono: 'JetBrains Mono', 'Fira Code', monospace;

  /* Font Sizes (rem) */
  --text-xs:   0.75rem;   /* 12px */
  --text-sm:   0.875rem;  /* 14px */
  --text-base: 1rem;      /* 16px */
  --text-lg:   1.125rem;  /* 18px */
  --text-xl:   1.25rem;   /* 20px */
  --text-2xl:  1.5rem;    /* 24px */
  --text-3xl:  1.875rem;  /* 30px */
  --text-4xl:  2.25rem;   /* 36px */

  /* Font Weights */
  --font-normal:   400;
  --font-medium:   500;
  --font-semibold: 600;
  --font-bold:     700;

  /* Line Heights */
  --leading-tight:  1.25;
  --leading-normal: 1.5;
  --leading-relaxed: 1.625;
}
```

### 1.3 Spacing & Layout

```css
:root {
  /* Spacing Scale (4px base) */
  --space-1:  0.25rem;  /* 4px */
  --space-2:  0.5rem;   /* 8px */
  --space-3:  0.75rem;  /* 12px */
  --space-4:  1rem;     /* 16px */
  --space-5:  1.25rem;  /* 20px */
  --space-6:  1.5rem;   /* 24px */
  --space-8:  2rem;     /* 32px */
  --space-10: 2.5rem;   /* 40px */
  --space-12: 3rem;     /* 48px */
  --space-16: 4rem;     /* 64px */

  /* Border Radius */
  --radius-sm:  0.25rem;  /* 4px */
  --radius-md:  0.375rem; /* 6px */
  --radius-lg:  0.5rem;   /* 8px */
  --radius-xl:  0.75rem;  /* 12px */
  --radius-2xl: 1rem;     /* 16px */
  --radius-full: 9999px;

  /* Shadows */
  --shadow-sm:  0 1px 2px 0 rgb(0 0 0 / 0.05);
  --shadow-md:  0 4px 6px -1px rgb(0 0 0 / 0.1);
  --shadow-lg:  0 10px 15px -3px rgb(0 0 0 / 0.1);
  --shadow-xl:  0 20px 25px -5px rgb(0 0 0 / 0.1);

  /* Layout */
  --sidebar-width: 260px;
  --sidebar-collapsed: 72px;
  --topnav-height: 64px;
  --content-max-width: 1280px;
}
```

### 1.4 Performance Indicators (Semantic Colors)

```css
:root {
  /* ROI / Performance indicators */
  --perf-excellent: var(--color-success-500);    /* ROI > 200% */
  --perf-good:      #22D3EE;                     /* ROI 100-200% */
  --perf-average:   var(--color-warning-500);     /* ROI 50-100% */
  --perf-poor:      var(--color-danger-500);      /* ROI < 50% */

  /* Campaign Status */
  --status-draft:    var(--color-neutral-400);
  --status-active:   var(--color-success-500);
  --status-ended:    var(--color-neutral-500);
  --status-archived: var(--color-neutral-300);
}
```

---

## 2. Component Inventory (Atomic Design)

### 2.1 Atoms (shadcn/ui base)

| Component | Source | Customization |
|-----------|--------|---------------|
| `Button` | shadcn/ui | Variants: primary, secondary, outline, ghost, danger |
| `Input` | shadcn/ui | Default with focus ring in primary-500 |
| `Label` | shadcn/ui | Default |
| `Badge` | shadcn/ui | Custom: status colors, performance colors |
| `Avatar` | shadcn/ui | For influencer photos |
| `Tooltip` | shadcn/ui | Default |
| `Skeleton` | shadcn/ui | Loading states |
| `Separator` | shadcn/ui | Default |
| `Switch` | shadcn/ui | For toggles (active/inactive) |
| `Checkbox` | shadcn/ui | For permissions |
| `Select` | shadcn/ui | Filters, dropdowns |
| `Textarea` | shadcn/ui | Brand asset long text |
| `Calendar` | shadcn/ui | Date pickers |

### 2.2 Molecules (custom compositions)

| Component | Composition | Usage |
|-----------|-------------|-------|
| `KPICard` | Card + Value + Label + TrendArrow | Dashboard metrics |
| `DateRangePicker` | Popover + Calendar + Button | Campaign dates, filters |
| `SearchInput` | Input + SearchIcon + ClearButton | Global search, filters |
| `StatusBadge` | Badge + StatusDot | Campaign status (draft/active/ended) |
| `PerformanceBadge` | Badge + color by ROI tier | Influencer performance |
| `CouponTag` | Badge + CopyButton | Influencer coupon display |
| `FormField` | Label + Input/Select + ErrorMessage | All forms |
| `EmptyState` | Icon + Title + Description + CTA | Empty lists |
| `ConfirmDialog` | Dialog + Description + Actions | Destructive actions |
| `ColorSwatch` | ColorCircle + HexLabel + Input | Brand palette editor |

### 2.3 Organisms (complex sections)

| Component | Description | Used In |
|-----------|-------------|---------|
| `Sidebar` | Fixed nav with icons + labels, collapsible | Layout |
| `TopNav` | Global search + user menu + breadcrumb | Layout |
| `DataTable` | Sortable, filterable, paginated table | All list pages |
| `KPIGrid` | Grid of 4-6 KPICards | Dashboards |
| `RevenueChart` | Line chart (revenue + profit over time) | Dashboard |
| `InfluencerCompareChart` | Bar chart comparing influencers | Campaign detail |
| `GrowthChart` | Line chart for follower evolution | Influencer profile |
| `CampaignTimeline` | Visual timeline bar showing progress | Campaign detail |
| `InfluencerSelector` | Modal with search + multi-select | Campaign form |
| `IntegrationCard` | Provider logo + status + connect button | Settings |
| `PermissionMatrix` | Grid of checkboxes per permission | Team invite |
| `FitScoreGauge` | Circular gauge (0-100) with classification | Analysis |
| `MiningResultCard` | Avatar + handle + metrics + save button | Mining results |
| `BrandAssetForm` | Multi-section form with auto-save | Branding page |

### 2.4 Templates (page layouts)

| Template | Structure | Pages Using |
|----------|-----------|-------------|
| `AuthLayout` | Centered card, no sidebar | Login, Register |
| `DashboardLayout` | Sidebar + TopNav + Content area | All protected pages |
| `ListPageLayout` | PageHeader + Filters + DataTable | Campaigns, Influencers, Products |
| `DetailPageLayout` | PageHeader + KPIGrid + Tabs/Sections | Campaign detail, Influencer profile |
| `FormPageLayout` | PageHeader + Form + Actions | Create/Edit forms |
| `FullWidthLayout` | No sidebar constraints | Mining, Analysis |

---

## 3. Navigation & Information Architecture

### 3.1 Sidebar Structure

```
┌─────────────────────────────┐
│  🎯 InfluTrack              │  ← Logo + Brand
│─────────────────────────────│
│  📊  Dashboard              │  ← Home / KPIs
│  📢  Campanhas              │  ← Campaign list
│  👤  Influencers            │  ← Influencer list
│  📦  Produtos               │  ← Product catalog
│─────────────────────────────│
│  🔍  Mineração              │  ← Find new influencers
│  📈  Análise                │  ← Analyze profiles
│─────────────────────────────│
│  🎨  Branding               │  ← Brand assets
│  ⚙️  Configurações          │  ← Settings, integrations, team
│─────────────────────────────│
│                             │
│  [Collapse sidebar button]  │
└─────────────────────────────┘
```

### 3.2 Navigation Flows

```
                    ┌──────────┐
                    │  Login   │
                    └────┬─────┘
                         │
                    ┌────▼─────┐
                    │Dashboard │◄──── Home after login
                    └────┬─────┘
                         │
         ┌───────────────┼───────────────┐
         │               │               │
    ┌────▼─────┐   ┌─────▼────┐   ┌─────▼─────┐
    │Campanhas │   │Influencers│   │ Produtos  │
    │  Lista   │   │  Lista   │   │  Lista    │
    └────┬─────┘   └────┬─────┘   └───────────┘
         │              │
    ┌────▼─────┐   ┌────▼─────┐
    │Campanha  │   │Influencer│
    │ Detalhe  │◄──│  Perfil  │──── Cross-link
    │ + Compare│   │ + Perf.  │
    └────┬─────┘   └──────────┘
         │
    ┌────▼─────┐
    │Campanha  │
    │Criar/Edit│
    └──────────┘

    ┌──────────┐        ┌──────────┐
    │Mineração │───────>│ Salvar   │──> Influencer cadastrado
    └──────────┘        │ como Inf.│
                        └──────────┘
    ┌──────────┐        ┌──────────┐
    │ Análise  │───────>│ Salvar   │──> Influencer cadastrado
    │ + Fit    │        │ como Inf.│
    └──────────┘        └──────────┘
```

---

## 4. Screen Specifications

### 4.1 Dashboard Geral

```
┌─────────────────────────────────────────────────────────────┐
│ 📊 Dashboard                              [Filtro período ▼]│
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐         │
│  │ Vendas  │ │ Receita │ │  Lucro  │ │Campanhas│         │
│  │  342    │ │R$48.2K  │ │R$21.7K  │ │  5 ativas│         │
│  │ ↑12%   │ │ ↑8%    │ │ ↑15%   │ │         │         │
│  └─────────┘ └─────────┘ └─────────┘ └─────────┘         │
│                                                             │
│  ┌─────────────────────────────┐ ┌─────────────────────┐   │
│  │ Receita & Lucro (30/60/90d)│ │ Top 5 Influencers   │   │
│  │  📈 Line chart             │ │  1. Maria  ROI 340% │   │
│  │  ──── Receita              │ │  2. Ana    ROI 220% │   │
│  │  ---- Lucro                │ │  3. Julia  ROI 180% │   │
│  │                            │ │  4. ...            │   │
│  └─────────────────────────────┘ └─────────────────────┘   │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ Top 5 Campanhas por Lucro                           │   │
│  │  Nome          │ Período    │ Receita │ Lucro │ ROI │   │
│  │  Dia das Mães  │ 01-15 Mai │ R$12K  │ R$5K │ 210%│   │
│  │  ...                                                │   │
│  └─────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

### 4.2 Campanhas — Lista

```
┌─────────────────────────────────────────────────────────────┐
│ 📢 Campanhas                          [+ Nova Campanha]     │
├─────────────────────────────────────────────────────────────┤
│ Filtros: [Status ▼] [Período ▼]          🔍 Buscar...      │
├─────────────────────────────────────────────────────────────┤
│ Nome              │ Status  │ Período      │ Orçamento │ROI │
│────────────────────────────────────────────────────────────│
│ Sérum Vitamina C  │ 🟢 Ativa│ 01-30 Abr   │ R$5.000  │180%│
│ Dia das Mães      │ ⬜ Draft │ 01-15 Mai   │ R$8.000  │ —  │
│ Black Friday 2025 │ ⚫ Ended│ 20-30 Nov   │ R$15.000 │320%│
├─────────────────────────────────────────────────────────────┤
│                    Página 1 de 3  [< 1 2 3 >]             │
└─────────────────────────────────────────────────────────────┘
```

### 4.3 Campanha — Detalhe

```
┌─────────────────────────────────────────────────────────────┐
│ ← Campanhas  /  Sérum Vitamina C                [Editar]   │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐         │
│  │ Vendas  │ │ Receita │ │  Lucro  │ │   ROI   │         │
│  │   89    │ │R$12.4K  │ │ R$5.8K  │ │  180%   │         │
│  └─────────┘ └─────────┘ └─────────┘ └─────────┘         │
│                                                             │
│  ┌─ Timeline ──────────────────────────────────────────┐   │
│  │ 01 Abr ████████████░░░░░░░░░░ 30 Abr  (Dia 12/30) │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  [Influencers]  [Comparativo]                              │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ Influencer  │ Cupom    │ Vendas │ Receita │  ROI   │   │
│  │─────────────────────────────────────────────────────│   │
│  │ 👤 Maria    │ MARIA15  │   42   │ R$5.8K │ 250%  │   │
│  │ 👤 Ana      │ ANA10    │   31   │ R$4.2K │ 160%  │   │
│  │ 👤 Julia    │ JULIA20  │   16   │ R$2.4K │ 120%  │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  [+ Adicionar Influencer]                                  │
└─────────────────────────────────────────────────────────────┘
```

### 4.4 Influencer — Perfil

```
┌─────────────────────────────────────────────────────────────┐
│ ← Influencers  /  Maria Silva                   [Editar]   │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌──────────────────────────────────────────────┐          │
│  │ 📷 Avatar   Maria Silva                      │          │
│  │             @mariasilva.skin · Skincare       │          │
│  │             São Paulo, SP                     │          │
│  │             Cupom: [MARIA15] 📋               │          │
│  │             📸 IG  🎵 TikTok  ▶️ YouTube     │          │
│  └──────────────────────────────────────────────┘          │
│                                                             │
│  ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐         │
│  │ Vendas  │ │ Receita │ │  Lucro  │ │ROI Médio│         │
│  │  156    │ │R$22.1K  │ │R$10.3K  │ │  210%   │         │
│  └─────────┘ └─────────┘ └─────────┘ └─────────┘         │
│                                                             │
│  [Performance]  [Crescimento]  [Campanhas]                 │
│                                                             │
│  Tab: Performance                                          │
│  ┌─ Vendas ao longo do tempo ──────────────────────────┐   │
│  │  📈 Line chart (monthly)                            │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  Tab: Crescimento                                          │
│  ┌─ Seguidores por plataforma ─────────────────────────┐   │
│  │  📈 Multi-line chart (IG, TikTok, YT)              │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  Tab: Campanhas                                            │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ Campanha        │ Período    │ Vendas │ ROI        │   │
│  │ Sérum Vitamina C │ Abr 2026  │   42  │ 250%       │   │
│  │ Black Friday     │ Nov 2025  │   89  │ 320%       │   │
│  └─────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

### 4.5 Mineração

```
┌─────────────────────────────────────────────────────────────┐
│ 🔍 Mineração de Influencers                                │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌─ Buscar ────────────────────────────────────────────┐   │
│  │ Palavras-chave: [skincare, beleza natural    ] +tag │   │
│  │ Plataforma:     [☑ Instagram] [☑ TikTok]           │   │
│  │ Mín. seguidores:[10.000      ]                      │   │
│  │                                          [Buscar 🔍]│   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  23 resultados encontrados              [Salvar busca 💾]  │
│                                                             │
│  ┌───────────────────────────────────────────┐             │
│  │ 📷 @naturalbeauty.br                     │             │
│  │    Natural Beauty · 45.2K seguidores      │             │
│  │    Engajamento: 4.8% · Nicho: Skincare   │             │
│  │    [Ver perfil ↗]  [Salvar como Influencer]│             │
│  └───────────────────────────────────────────┘             │
│  ┌───────────────────────────────────────────┐             │
│  │ 📷 @pele.perfeita                        │             │
│  │    Pele Perfeita · 32.1K seguidores       │             │
│  │    Engajamento: 5.2% · Nicho: Beleza     │             │
│  │    [Ver perfil ↗]  [Salvar como Influencer]│             │
│  └───────────────────────────────────────────┘             │
│  ...                                                       │
│                                                             │
│  ── Buscas Salvas ─────────────────────────────────────    │
│  │ "skincare natural" · 23 resultados · 01/04/2026 [▶]│   │
│  │ "moda sustentável" · 18 resultados · 28/03/2026 [▶]│   │
└─────────────────────────────────────────────────────────────┘
```

### 4.6 Análise de Influencer

```
┌─────────────────────────────────────────────────────────────┐
│ 📈 Análise de Influencer                                   │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌─ Analisar perfil ───────────────────────────────────┐   │
│  │ Handle: [@mariasilva.skin  ] Plataforma: [IG ▼]    │   │
│  │                                       [Analisar 📊]│   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  ┌─ Resultado ─────────────────────────────────────────┐   │
│  │                                                     │   │
│  │  ┌──────┐  Maria Silva         Fit Score            │   │
│  │  │Avatar│  @mariasilva.skin    ┌─────────┐          │   │
│  │  │      │  85.2K seguidores    │  ◕  82  │          │   │
│  │  └──────┘  4.8% engajamento   │RECOMEND.│          │   │
│  │                                └─────────┘          │   │
│  │                                                     │   │
│  │  ┌─────────┐ ┌─────────┐ ┌─────────┐              │   │
│  │  │Crescim. │ │ Freq.   │ │Audiência│              │   │
│  │  │ +12%/mês│ │ 4x/sem  │ │ 78% BR │              │   │
│  │  └─────────┘ └─────────┘ └─────────┘              │   │
│  │                                                     │   │
│  │  ✅ Pontos Fortes:                                  │   │
│  │    • Alto engajamento (top 10% do nicho)           │   │
│  │    • Audiência alinhada com público-alvo da marca  │   │
│  │    • Conteúdo consistente e educativo              │   │
│  │                                                     │   │
│  │  ⚠️ Pontos de Atenção:                             │   │
│  │    • Crescimento recente abaixo da média           │   │
│  │                                                     │   │
│  │  [Salvar como Influencer]  [Nova análise]          │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  ── Histórico de Análises ─────────────────────────────    │
│  │ @anacosta.beauty  │ Score: 68 │ Neutro  │01/04/2026│   │
│  │ @pele.perfeita    │ Score: 74 │ Recom.  │28/03/2026│   │
└─────────────────────────────────────────────────────────────┘
```

### 4.7 Branding

```
┌─────────────────────────────────────────────────────────────┐
│ 🎨 Branding                                  [Salvar 💾]   │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  [Identidade]  [Visual]                                    │
│                                                             │
│  Tab: Identidade                                           │
│  ┌─ Marca ─────────────────────────────────────────────┐   │
│  │ Nome da marca:  [Glow Naturals                    ] │   │
│  │ Missão:         [Democratizar cosméticos naturais ] │   │
│  │ Visão:          [Ser a marca de beleza natural ... ] │   │
│  │ Valores:        [Transparência] [Sustentab.] [+]   │   │
│  └─────────────────────────────────────────────────────┘   │
│  ┌─ Comunicação ───────────────────────────────────────┐   │
│  │ Tom de voz:     [Acolhedor, confiante, educativo  ] │   │
│  │ Público-alvo:   [Mulheres 25-40 anos, classes B/C ] │   │
│  └─────────────────────────────────────────────────────┘   │
│  ┌─ Estratégia ────────────────────────────────────────┐   │
│  │ Dores do cliente:   [Produtos caros] [Tóxicos] [+] │   │
│  │ Benefícios:         [100% natural] [Resultado] [+]  │   │
│  │ Diferenciais:       [Preço acessível] [Transpar][+] │   │
│  │ Palavras-chave:     [skincare] [natural] [vegano][+]│   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  Tab: Visual                                               │
│  ┌─ Logo ──────────────────────────────────────────────┐   │
│  │ [📁 Upload logo]  Preview: [Logo image]            │   │
│  └─────────────────────────────────────────────────────┘   │
│  ┌─ Paleta de Cores ───────────────────────────────────┐   │
│  │ ⬤ Primary  #6C63FF  ⬤ Secondary #22C55E  [+ Cor]  │   │
│  └─────────────────────────────────────────────────────┘   │
│  ┌─ Tipografia ────────────────────────────────────────┐   │
│  │ Fonte primária:    [Inter                         ] │   │
│  │ Fonte secundária:  [Playfair Display              ] │   │
│  └─────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

### 4.8 Configurações — Integrações

```
┌─────────────────────────────────────────────────────────────┐
│ ⚙️ Configurações                                           │
├─────────────────────────────────────────────────────────────┤
│  [Geral]  [Integrações]  [Equipe]                          │
│                                                             │
│  Tab: Integrações                                          │
│  ┌─ Shopify ───────────────────────────────────────────┐   │
│  │ 🛍️ Shopify                        Status: 🟢 Conectada│   │
│  │ Store URL: minhaloja.myshopify.com                  │   │
│  │ Última sync: 01/04/2026 08:30                       │   │
│  │ Sync: [Diária ▼]  [Sincronizar agora] [Desconectar]│   │
│  └─────────────────────────────────────────────────────┘   │
│  ┌─ Yampi ─────────────────────────────────────────────┐   │
│  │ 📦 Yampi                          Status: ⚫ Desconectada│
│  │                                                     │   │
│  │ Token: [________________________]                   │   │
│  │ Alias: [________________________]                   │   │
│  │                                       [Conectar]    │   │
│  └─────────────────────────────────────────────────────┘   │
│  ┌─ Apify ─────────────────────────────────────────────┐   │
│  │ 🤖 Apify                          Status: 🟢 Conectada│   │
│  │ ⚠️ Mineração consome créditos da sua conta Apify    │   │
│  │                              [Desconectar]          │   │
│  └─────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

### 4.9 Configurações — Equipe

```
┌─────────────────────────────────────────────────────────────┐
│ ⚙️ Configurações                                           │
├─────────────────────────────────────────────────────────────┤
│  [Geral]  [Integrações]  [Equipe]                          │
│                                                             │
│  Tab: Equipe                              [+ Convidar]     │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ Membro           │ Role  │ Permissões  │ Ações     │   │
│  │──────────────────────────────────────────────────────│   │
│  │ admin@marca.com  │ Admin │ Todas       │ —         │   │
│  │ maria@marca.com  │ Membro│ Camp, Influ │ [✏️] [🗑️] │   │
│  │ joao@marca.com   │ Membro│ Camp (view) │ [✏️] [🗑️] │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  ── Modal: Convidar ────────────────────────────────────   │
│  │ Email: [novo@membro.com                            ]│   │
│  │                                                     │   │
│  │ Permissões:                                         │   │
│  │  ☑ Ver campanhas      ☐ Editar campanhas           │   │
│  │  ☑ Ver influencers    ☐ Editar influencers          │   │
│  │  ☑ Ver financeiro     ☐ Ver mineração              │   │
│  │  ☐ Editar branding    ☐ Gerenciar equipe           │   │
│  │                                                     │   │
│  │                    [Cancelar] [Enviar convite]      │   │
│  └─────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

---

## 5. Interaction Patterns

### 5.1 Loading States

| Context | Pattern |
|---------|---------|
| Page load | Skeleton components matching layout shape |
| Data table | Skeleton rows (5 rows) with column shapes |
| KPI cards | Skeleton with pulse animation |
| Charts | Skeleton rectangle with "Carregando..." text |
| Form submit | Button with spinner, disabled state |
| Mining search | Full-page loading with progress message |

### 5.2 Empty States

| Context | Message | CTA |
|---------|---------|-----|
| No campaigns | "Nenhuma campanha criada ainda" | "Criar primeira campanha" |
| No influencers | "Nenhum influencer cadastrado" | "Adicionar influencer" / "Minerar influencers" |
| No products | "Conecte sua loja para importar produtos" | "Ir para integrações" |
| No sales data | "Aguardando primeiras vendas..." | — |
| No mining results | "Nenhum resultado encontrado. Tente outras palavras-chave." | "Nova busca" |

### 5.3 Feedback & Notifications

| Action | Feedback |
|--------|----------|
| Create/Update success | Toast (verde): "Campanha criada com sucesso" |
| Delete/Archive | Confirm dialog → Toast: "Influencer arquivado" |
| Integration connected | Toast (verde) + status update inline |
| Integration error | Toast (vermelho) + error message inline |
| Invite sent | Toast (verde): "Convite enviado para email@..." |
| Sync complete | Toast: "42 produtos sincronizados" |

### 5.4 Responsive Breakpoints

| Breakpoint | Width | Sidebar | Layout |
|------------|-------|---------|--------|
| Desktop XL | ≥1440px | Expanded (260px) | Full layout |
| Desktop | ≥1024px | Expanded (260px) | Full layout |
| Tablet | ≥768px | Collapsed (72px, icons only) | Adapted |
| Mobile | <768px | Hidden (hamburger menu) | Stacked |

---

## 6. Accessibility (WCAG AA)

| Requirement | Implementation |
|-------------|---------------|
| **Color Contrast** | All text meets 4.5:1 ratio (AA). Tested with primary-500 on white. |
| **Focus Indicators** | Ring style: `ring-2 ring-primary-500 ring-offset-2` on all interactive elements |
| **Keyboard Navigation** | All interactions via Tab, Enter, Escape, Arrow keys. Skip-to-content link. |
| **Screen Readers** | ARIA labels on icons, charts, dynamic content. Live regions for toasts. |
| **Form Labels** | Every input has associated label. Error messages linked via `aria-describedby`. |
| **Alt Text** | All images (avatars, logos) have descriptive alt text. |
| **Motion** | Respect `prefers-reduced-motion`. No auto-playing animations. |
| **Touch Targets** | Minimum 44x44px on mobile. |

---

## 7. Handoff Notes

### Para @dev (Dex)

Ao implementar o frontend:

1. **shadcn/ui** como base — instalar via `npx shadcn-ui@latest init` com tema customizado
2. **Tailwind config** — extend com os design tokens da seção 1
3. **Recharts** para gráficos — usar `ResponsiveContainer` em todos
4. **TanStack Query** — hooks prontos em `hooks/use-*.ts` conforme arquitetura
5. **Layout** — `(auth)` group sem sidebar, `(dashboard)` group com `DashboardLayout`
6. **DataTable** — usar `@tanstack/react-table` com shadcn/ui DataTable
7. **Forms** — `react-hook-form` + `zod` para validação
8. **Toasts** — `sonner` (já integrado com shadcn/ui)
9. **Icons** — `lucide-react` (default do shadcn/ui)

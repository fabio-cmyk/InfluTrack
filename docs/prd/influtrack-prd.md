# InfluTrack — Product Requirements Document (PRD)

| Campo | Valor |
|-------|-------|
| **Produto** | InfluTrack |
| **Versão** | 1.0 |
| **Autor** | Orion (AIOS Master) |
| **Data** | 2026-04-01 |
| **Status** | Draft |

---

## 1. Goals and Background Context

### 1.1 Goals

- Permitir que marcas D2C rastreiem o ROI real de cada influencer por campanha, com base em cupons e períodos
- Centralizar gestão de influencers, campanhas, produtos e métricas de performance numa única plataforma
- Automatizar a mineração e análise de novos influencers via scraping de Instagram e TikTok
- Calcular lucro real por campanha cruzando vendas (cupom) com custos de produto (integração Shopify/Yampi)
- Fornecer dashboards de visão geral e performance individual de influencers
- Permitir que marcas avaliem o fit de influencers com base no brand asset cadastrado

### 1.2 Background Context

Marcas D2C investem cada vez mais em marketing de influência, mas carecem de ferramentas que conectem de forma clara o investimento em influencers ao retorno financeiro real. Hoje, a maioria rastreia resultados em planilhas, cruzando manualmente dados de cupons, vendas e custos de produto — um processo lento, propenso a erros e que não escala.

O InfluTrack resolve esse problema ao criar um sistema unificado onde a marca cadastra campanhas com períodos definidos, vincula influencers com cupons exclusivos, e automaticamente computa as vendas atribuídas a cada influencer dentro do período da campanha. Com a integração de custos de produto via Shopify/Yampi, a plataforma entrega o lucro real — não apenas faturamento — por influencer e por campanha.

### 1.3 Change Log

| Data | Versão | Descrição | Autor |
|------|--------|-----------|-------|
| 2026-04-01 | 1.0 | Versão inicial do PRD | Orion |

---

## 2. Requirements

### 2.1 Functional Requirements

#### Autenticação e Multi-Tenancy

- **FR1:** O sistema deve permitir criação de conta por marca (tenant isolado) com email e senha
- **FR2:** O admin da conta deve poder convidar novos usuários via email, selecionando permissões específicas via checkboxes (ex: ver campanhas, editar influencers, ver financeiro)
- **FR3:** Cada tenant deve ter dados completamente isolados — nenhum dado é compartilhado entre marcas
- **FR4:** O sistema deve suportar login com email/senha e magic link

#### Campanhas

- **FR5:** O usuário deve poder criar campanhas com: nome, descrição, orçamento total, data de início e data de término
- **FR6:** O usuário deve poder vincular um ou mais influencers a uma campanha
- **FR7:** O sistema deve computar automaticamente as vendas de cada influencer vinculado à campanha, filtrando por cupom do influencer + período da campanha
- **FR8:** O sistema deve exibir métricas da campanha: total de vendas, receita bruta, custo dos produtos, lucro líquido, ROI, número de pedidos
- **FR9:** O usuário deve poder visualizar o breakdown de performance por influencer dentro de cada campanha
- **FR10:** O sistema deve permitir editar e arquivar campanhas (não deletar, para preservar histórico)

#### Influencers

- **FR11:** O usuário deve poder cadastrar influencers com dados pessoais: nome, email, telefone, Instagram, TikTok, YouTube, cidade, estado, nicho/categoria
- **FR12:** Cada influencer deve ter um cupom exclusivo atrelado ao tenant
- **FR13:** O sistema deve registrar e exibir o histórico de crescimento do influencer: seguidores, engajamento, posts — com timestamps para acompanhar evolução
- **FR14:** O perfil do influencer deve exibir todas as campanhas em que participou, com métricas individuais de performance em cada uma
- **FR15:** O sistema deve calcular métricas agregadas do influencer: total de vendas geradas, receita total, ROI médio, número de campanhas

#### Produtos

- **FR16:** O sistema deve integrar com Shopify e/ou Yampi para importar catálogo de produtos automaticamente
- **FR17:** Cada produto importado deve conter: nome, SKU, preço de venda, custo do produto
- **FR18:** O usuário deve poder editar manualmente o custo do produto caso a integração não forneça
- **FR19:** O sistema deve sincronizar produtos periodicamente (configurável: diário, a cada 6h, manual)
- **FR20:** Os custos dos produtos são utilizados para calcular o lucro real em campanhas e vendas de influencers

#### Vendas e Métricas

- **FR21:** O sistema deve puxar vendas da integração Shopify/Yampi, filtrando por cupom de desconto utilizado
- **FR22:** Cada venda deve ser atribuída ao influencer dono do cupom utilizado
- **FR23:** A atribuição de venda a uma campanha se dá pelo cruzamento: cupom do influencer + venda dentro do período da campanha
- **FR24:** O sistema deve calcular por venda: receita bruta, custo dos produtos (somando custo de cada item), lucro líquido
- **FR25:** O sistema deve suportar sincronização de vendas em near-real-time via webhooks (Shopify/Yampi) e fallback via polling periódico

#### Dashboard

- **FR26:** O dashboard geral deve exibir: total de vendas, receita total, lucro total, número de campanhas ativas, top influencers por ROI, top campanhas por lucro
- **FR27:** O dashboard deve ter filtros por período, campanha e influencer
- **FR28:** Deve existir uma visão de performance individual do influencer com: vendas ao longo do tempo (gráfico), campanhas participadas, ROI por campanha, evolução de seguidores
- **FR29:** O dashboard deve exibir comparativo entre influencers dentro de uma mesma campanha

#### Mineração de Influencers

- **FR30:** O sistema deve permitir busca de influencers por palavras-chave no Instagram e TikTok
- **FR31:** A mineração deve utilizar API de scraping (Apify e/ou ScrapCreators) para coletar dados públicos de perfis
- **FR32:** Os resultados da mineração devem exibir: nome, handle, seguidores, taxa de engajamento, nicho estimado, link do perfil
- **FR33:** O usuário deve poder salvar um perfil minerado diretamente como influencer cadastrado no sistema
- **FR34:** O sistema deve permitir salvar buscas de mineração para re-execução futura

#### Análise de Influencer

- **FR35:** O usuário deve poder inserir o handle de um influencer e obter uma análise completa do perfil: métricas de engajamento, crescimento recente, frequência de posts, tipo de conteúdo, audiência estimada
- **FR36:** O sistema deve gerar um score de compatibilidade (fit) entre o influencer analisado e a marca, com base no brand asset cadastrado
- **FR37:** A análise deve incluir: pontos fortes, pontos de atenção e recomendação (recomendado, neutro, não recomendado)

#### Brand Asset

- **FR38:** O sistema deve ter uma seção de branding onde a marca cadastra sua identidade: nome, missão, visão, valores, tom de voz, público-alvo
- **FR39:** O brand asset deve incluir identidade visual: logotipo (upload), paleta de cores (hex codes), tipografia principal e secundária
- **FR40:** O brand asset deve incluir: dores do cliente, benefícios do produto, diferenciais competitivos, palavras-chave da marca
- **FR41:** O brand asset é utilizado como input para o algoritmo de fit na análise de influencers (FR36)

### 2.2 Non-Functional Requirements

- **NFR1:** O sistema deve responder a qualquer ação do usuário em menos de 2 segundos (P95)
- **NFR2:** O sistema deve suportar pelo menos 500 tenants simultâneos com até 100 influencers e 50 campanhas cada
- **NFR3:** Dados de cada tenant devem ser isolados via Row Level Security (RLS) no Supabase
- **NFR4:** O sistema deve estar disponível 99.5% do tempo (uptime)
- **NFR5:** Todas as integrações externas (Shopify, Yampi, Apify) devem ter tratamento de erro com retry e fallback gracioso
- **NFR6:** O sistema deve ser responsivo (mobile-first) — funcional em desktop, tablet e mobile
- **NFR7:** Dados financeiros (vendas, custos, lucros) devem ter precisão de 2 casas decimais
- **NFR8:** O sistema deve logar todas as ações de usuário para auditoria (quem fez o quê, quando)
- **NFR9:** Senhas devem ser armazenadas com hash bcrypt; comunicação exclusivamente via HTTPS
- **NFR10:** O sistema deve suportar internacionalização futura (i18n-ready), mas lançar inicialmente em pt-BR
- **NFR11:** As integrações com APIs de scraping devem respeitar rate limits e incluir circuit breaker

---

## 3. User Interface Design Goals

### 3.1 Overall UX Vision

Interface limpa, data-driven, com foco em métricas acionáveis. O design deve facilitar a tomada de decisão rápida — o usuário precisa bater o olho e saber se uma campanha está performando ou não. Visual moderno, com cards, gráficos e indicadores visuais de performance (verde/amarelo/vermelho).

### 3.2 Key Interaction Paradigms

- **Navigation:** Sidebar fixa com módulos principais (Dashboard, Campanhas, Influencers, Produtos, Mineração, Análise, Branding, Configurações)
- **CRUD Pattern:** Listagem em tabela com filtros → Detalhe em página dedicada → Edição inline ou modal
- **Data Visualization:** Gráficos de linha (evolução), barras (comparativos), cards com KPIs destacados
- **Actions:** Botões de ação primária sempre visíveis; ações destrutivas com confirmação
- **Search:** Busca global no topo + filtros contextuais por módulo

### 3.3 Core Screens and Views

| # | Tela | Descrição |
|---|------|-----------|
| 1 | **Login/Register** | Autenticação, criação de conta da marca |
| 2 | **Dashboard Geral** | KPIs globais, top influencers, top campanhas, gráficos de tendência |
| 3 | **Dashboard Influencer** | Performance individual: vendas, ROI, campanhas, evolução de seguidores |
| 4 | **Campanhas — Lista** | Tabela de campanhas com status, período, orçamento, ROI |
| 5 | **Campanha — Detalhe** | Métricas da campanha, breakdown por influencer, timeline |
| 6 | **Campanha — Criar/Editar** | Formulário com dados da campanha + seleção de influencers |
| 7 | **Influencers — Lista** | Tabela de influencers com métricas resumidas |
| 8 | **Influencer — Perfil** | Dados pessoais, cupom, histórico de crescimento, campanhas vinculadas |
| 9 | **Produtos — Lista** | Catálogo importado com custos, status de sync |
| 10 | **Mineração** | Busca por palavras-chave, resultados com métricas, ação de salvar |
| 11 | **Análise** | Input de handle, resultado completo com score de fit |
| 12 | **Branding** | Formulário de brand asset completo |
| 13 | **Configurações** | Integrações (Shopify/Yampi/Apify), gestão de equipe (convites), conta |

### 3.4 Accessibility

WCAG AA — Contraste adequado, navegação por teclado, labels em formulários, alt text em imagens.

### 3.5 Branding

A plataforma InfluTrack deve ter identidade visual própria: moderna, profissional, com tons de azul/roxo (transmitindo confiança e inovação). A marca de cada tenant aparece apenas na seção de Branding — a UI da plataforma mantém identidade própria.

### 3.6 Target Platforms

Web Responsive — Desktop como experiência primária, mobile como experiência funcional completa.

---

## 4. Technical Assumptions

### 4.1 Repository Structure

**Monorepo** — Frontend e backend no mesmo repositório para facilitar desenvolvimento e deploy.

```
influtrack/
├── packages/
│   ├── web/          # Frontend (Next.js)
│   ├── api/          # Backend API (Next.js API Routes ou Edge Functions)
│   └── shared/       # Tipos compartilhados, utils, constantes
├── supabase/
│   ├── migrations/   # SQL migrations
│   ├── functions/    # Supabase Edge Functions
│   └── seed/         # Dados de seed para desenvolvimento
├── docs/
│   ├── prd/
│   ├── architecture/
│   └── stories/
└── tests/
```

### 4.2 Service Architecture

| Camada | Tecnologia | Justificativa |
|--------|-----------|---------------|
| **Frontend** | Next.js 14+ (App Router) | SSR, RSC, performance, ecossistema React |
| **UI Library** | shadcn/ui + Tailwind CSS | Componentes acessíveis, customizáveis, sem vendor lock-in |
| **Backend** | Next.js API Routes + Supabase Edge Functions | Full-stack unificado, serverless |
| **Database** | Supabase (PostgreSQL) | Familiaridade do usuário, RLS nativo, realtime, auth built-in |
| **Auth** | Supabase Auth | Multi-tenant via RLS, magic link, email/senha |
| **Storage** | Supabase Storage | Upload de logos, imagens de brand asset |
| **Charts** | Recharts ou Tremor | Gráficos responsivos, boa integração com React |
| **State** | Zustand ou TanStack Query | Leve, sem boilerplate, cache de server state |
| **Integração E-commerce** | Shopify Admin API + Yampi API | Importação de produtos e vendas |
| **Scraping** | Apify API | Mineração de influencers no Instagram/TikTok |
| **Deploy** | Vercel | Deploy automático, edge network, integração nativa com Next.js |

### 4.3 Testing Requirements

| Tipo | Ferramenta | Cobertura |
|------|-----------|-----------|
| **Unit** | Vitest | Funções de cálculo de ROI, parsing de dados, utils |
| **Integration** | Vitest + Supabase local | APIs, RLS policies, webhooks |
| **E2E** | Playwright | Fluxos críticos: criar campanha, vincular influencer, ver dashboard |
| **Manual** | — | Integrações com Shopify/Yampi, mineração |

### 4.4 Additional Technical Assumptions

- Supabase free tier para MVP; upgrade para Pro quando necessário
- Webhooks da Shopify/Yampi para sincronização de vendas em near-real-time
- Apify como provider primário de scraping; ScrapCreators como fallback futuro
- Multi-tenancy via coluna `tenant_id` em todas as tabelas + RLS policies
- Moeda padrão: BRL (R$) — i18n de moeda como enhancement futuro
- Rate limiting na API para proteger contra abuso
- Jobs de sincronização (produtos/vendas) via Supabase pg_cron ou Edge Functions com cron trigger
- Cache de dados de dashboard com invalidação por evento (nova venda, nova campanha)

---

## 5. Epic List

### Epic 1: Fundação, Auth e Multi-Tenancy
Estabelecer a infraestrutura do projeto (Next.js, Supabase, CI/CD), implementar autenticação com Supabase Auth e multi-tenancy com RLS. Entregar tela de login, registro e convite de usuários com permissões por checkbox.

### Epic 2: Brand Asset e Gestão de Marca
Implementar a seção de branding onde a marca cadastra sua identidade completa (visual, tom de voz, valores, dores, benefícios). Essa base é necessária antes de influencers e análise de fit.

### Epic 3: Gestão de Influencers
CRUD completo de influencers com dados pessoais, cupom exclusivo, histórico de crescimento e métricas agregadas. Base para vincular a campanhas.

### Epic 4: Gestão de Campanhas e Vinculação de Influencers
CRUD de campanhas com orçamento, período, vinculação de influencers. Estrutura base para rastreamento de performance.

### Epic 5: Integração de Produtos (Shopify/Yampi)
Conectar com Shopify e/ou Yampi para importar catálogo de produtos com custos. Sincronização periódica e edição manual de custos.

### Epic 6: Vendas, Atribuição e Cálculo de ROI
Puxar vendas via integração (webhooks + polling), atribuir ao influencer pelo cupom, vincular à campanha pelo período, calcular lucro real usando custos de produto.

### Epic 7: Dashboards e Visualizações
Dashboard geral com KPIs, top performers, gráficos de tendência. Dashboard individual de influencer com performance isolada. Comparativos e filtros.

### Epic 8: Mineração e Análise de Influencers
Busca por palavras-chave via Apify (Instagram/TikTok), análise completa de perfil, score de fit com a marca baseado no brand asset.

---

## 6. Epic Details

---

### Epic 1: Fundação, Auth e Multi-Tenancy

**Goal:** Estabelecer toda a infraestrutura técnica do projeto e entregar o sistema de autenticação multi-tenant funcional. Ao final deste epic, um usuário pode criar uma conta de marca, fazer login, convidar membros da equipe com permissões granulares, e o sistema garante isolamento total de dados entre tenants.

---

#### Story 1.1: Setup do Projeto e Infraestrutura Base

**Como** desenvolvedor,
**Quero** ter o projeto Next.js configurado com Supabase, linting, testes e estrutura de monorepo,
**Para que** a equipe tenha uma base sólida para desenvolver todos os módulos.

**Acceptance Criteria:**

1. Projeto Next.js 14+ (App Router) inicializado com TypeScript strict mode
2. Tailwind CSS e shadcn/ui configurados e funcionais
3. Supabase client configurado com variáveis de ambiente (.env.local)
4. Estrutura de monorepo criada: `packages/web`, `packages/shared`, `supabase/`
5. Vitest configurado com pelo menos 1 teste passando
6. ESLint + Prettier configurados com regras do projeto
7. Layout base com sidebar de navegação (links placeholder para todos os módulos)
8. Página inicial renderizando com layout correto
9. README com instruções de setup local

---

#### Story 1.2: Autenticação com Supabase Auth

**Como** usuário de marca D2C,
**Quero** criar uma conta e fazer login de forma segura,
**Para que** eu possa acessar a plataforma com meus dados protegidos.

**Acceptance Criteria:**

1. Tela de registro com: nome da marca, email, senha — cria conta no Supabase Auth
2. Tela de login com email/senha
3. Opção de login via magic link (email)
4. Middleware de proteção de rotas: usuário não autenticado é redirecionado para login
5. Botão de logout funcional
6. Tabela `tenants` criada no Supabase com campos: id, name, created_at
7. Ao registrar, um tenant é criado automaticamente e vinculado ao usuário
8. Tabela `tenant_users` com: user_id, tenant_id, role (admin), created_at
9. RLS policy básica: usuário só acessa dados do próprio tenant

---

#### Story 1.3: Convite de Usuários e Permissões

**Como** admin de uma marca,
**Quero** convidar membros da minha equipe por email e definir suas permissões,
**Para que** cada pessoa tenha acesso apenas ao que precisa.

**Acceptance Criteria:**

1. Tela de configurações com seção "Equipe" listando usuários do tenant
2. Botão "Convidar" abre modal com campo de email e checkboxes de permissões
3. Permissões disponíveis: ver campanhas, editar campanhas, ver influencers, editar influencers, ver financeiro, ver mineração, editar branding, gerenciar equipe
4. Convite envia email via Supabase Auth (invite user)
5. Usuário convidado ao aceitar é vinculado ao tenant com as permissões selecionadas
6. Tabela `user_permissions` com: user_id, tenant_id, permission_key, granted (boolean)
7. Sistema verifica permissões antes de renderizar seções e executar ações
8. Admin pode editar permissões de usuários existentes
9. Admin pode remover usuários do tenant

---

### Epic 2: Brand Asset e Gestão de Marca

**Goal:** Permitir que a marca cadastre sua identidade completa na plataforma — desde identidade visual até tom de voz e valores. Essa informação é fundamental para o score de fit na análise de influencers e para centralizar a estratégia de marca.

---

#### Story 2.1: Cadastro de Identidade de Marca

**Como** gestor de marca,
**Quero** cadastrar as informações da minha marca (missão, visão, valores, tom de voz, público-alvo),
**Para que** a plataforma conheça minha marca e possa avaliar compatibilidade com influencers.

**Acceptance Criteria:**

1. Página "Branding" acessível via sidebar
2. Formulário com campos: nome da marca, missão, visão, valores (lista), tom de voz (textarea), público-alvo (textarea)
3. Campos adicionais: dores do cliente (lista), benefícios do produto (lista), diferenciais competitivos (lista), palavras-chave da marca (tags)
4. Dados salvos na tabela `brand_assets` vinculada ao tenant
5. Formulário com auto-save ou botão salvar com feedback visual
6. RLS: apenas usuários do tenant podem ler/escrever

---

#### Story 2.2: Identidade Visual e Upload de Assets

**Como** gestor de marca,
**Quero** cadastrar a identidade visual (logo, cores, tipografia),
**Para que** o brand asset esteja completo e acessível para referência.

**Acceptance Criteria:**

1. Seção de identidade visual na página de Branding
2. Upload de logotipo (PNG, SVG, JPG) via Supabase Storage com preview
3. Paleta de cores: até 6 cores com input de hex code e preview visual
4. Tipografia: campos para fonte primária e fonte secundária (nome da fonte)
5. Dados salvos na tabela `brand_visual_identity` vinculada ao tenant
6. Assets de imagem armazenados no Supabase Storage com bucket por tenant
7. RLS no Storage: apenas membros do tenant acessam os arquivos

---

### Epic 3: Gestão de Influencers

**Goal:** Implementar o CRUD completo de influencers com dados pessoais, cupom exclusivo, histórico de crescimento e métricas agregadas. Ao final, o gestor pode cadastrar, editar e acompanhar a evolução de cada influencer.

---

#### Story 3.1: CRUD de Influencers

**Como** gestor de marca,
**Quero** cadastrar e gerenciar influencers na plataforma,
**Para que** eu tenha uma base centralizada de todos os influencers que trabalho.

**Acceptance Criteria:**

1. Página "Influencers" com tabela listando todos os influencers do tenant
2. Colunas: nome, handle principal, nicho, seguidores, cupom, nº campanhas
3. Busca por nome/handle e filtro por nicho
4. Botão "Adicionar Influencer" abre formulário com: nome, email, telefone, Instagram handle, TikTok handle, YouTube handle, cidade, estado, nicho/categoria
5. Campo de cupom exclusivo: input manual, validação de unicidade dentro do tenant
6. Edição de influencer em página dedicada
7. Soft delete (arquivar) — não remove dados históricos
8. Tabela `influencers` com todos os campos + tenant_id + timestamps
9. RLS: isolamento por tenant

---

#### Story 3.2: Histórico de Crescimento e Métricas

**Como** gestor de marca,
**Quero** registrar e visualizar o histórico de crescimento de cada influencer,
**Para que** eu acompanhe a evolução de seguidores e engajamento ao longo do tempo.

**Acceptance Criteria:**

1. No perfil do influencer, seção "Histórico de Crescimento" com gráfico de linha
2. Tabela `influencer_growth_history` com: influencer_id, date, platform (instagram/tiktok/youtube), followers, engagement_rate, posts_count
3. Formulário para adicionar entrada manual de crescimento (data, plataforma, seguidores, engajamento)
4. Gráfico de linha mostrando evolução de seguidores por plataforma ao longo do tempo
5. Card com métricas atuais: seguidores totais por plataforma, taxa de engajamento mais recente
6. Ordenação cronológica com data mais recente primeiro na tabela

---

#### Story 3.3: Perfil Completo e Métricas Agregadas do Influencer

**Como** gestor de marca,
**Quero** ver um perfil completo do influencer com todas as métricas e campanhas,
**Para que** eu tenha uma visão 360° de cada influencer.

**Acceptance Criteria:**

1. Página de perfil do influencer com: dados pessoais, cupom, links de redes sociais
2. Seção de métricas agregadas: total de vendas geradas (todas as campanhas), receita total, ROI médio, nº de campanhas
3. Lista de campanhas participadas com: nome da campanha, período, vendas, receita, ROI individual
4. Métricas calculadas a partir das tabelas de vendas (implementadas no Epic 6 — esta story prepara a UI com dados mock/placeholder)
5. Layout responsivo com cards de KPI no topo + tabelas detalhadas abaixo

---

### Epic 4: Gestão de Campanhas e Vinculação de Influencers

**Goal:** Permitir que o gestor crie campanhas com orçamento e período definidos, vincule influencers, e tenha a estrutura base para rastrear performance. A atribuição real de vendas vem no Epic 6.

---

#### Story 4.1: CRUD de Campanhas

**Como** gestor de marca,
**Quero** criar e gerenciar campanhas de marketing de influência,
**Para que** eu organize minhas ações por período, orçamento e objetivo.

**Acceptance Criteria:**

1. Página "Campanhas" com tabela listando campanhas do tenant
2. Colunas: nome, status (rascunho/ativa/encerrada/arquivada), período, orçamento, nº influencers
3. Status calculado automaticamente: rascunho (sem datas), ativa (dentro do período), encerrada (após término)
4. Botão "Nova Campanha" abre formulário: nome, descrição, orçamento (R$), data início, data término
5. Edição em página dedicada
6. Arquivamento (soft delete)
7. Tabela `campaigns` com: id, tenant_id, name, description, budget, start_date, end_date, status, timestamps
8. RLS: isolamento por tenant

---

#### Story 4.2: Vinculação de Influencers a Campanhas

**Como** gestor de marca,
**Quero** vincular influencers às minhas campanhas,
**Para que** eu saiba quais influencers participam de cada campanha e possa rastrear resultados.

**Acceptance Criteria:**

1. Na página de detalhe da campanha, seção "Influencers" com lista dos vinculados
2. Botão "Adicionar Influencer" abre modal com busca/seleção de influencers do tenant
3. Exibe influencers disponíveis com: nome, handle, cupom, nicho
4. Permitir vincular múltiplos influencers de uma vez
5. Tabela `campaign_influencers` com: campaign_id, influencer_id, added_at
6. Remover influencer da campanha (desvincular, não deletar)
7. No perfil do influencer, a campanha aparece na lista de campanhas participadas (cross-reference)
8. Validação: não permitir duplicar vínculo do mesmo influencer na mesma campanha

---

#### Story 4.3: Detalhe da Campanha e Métricas Base

**Como** gestor de marca,
**Quero** ver a página de detalhe de uma campanha com suas informações e influencers vinculados,
**Para que** eu tenha visão completa de cada ação.

**Acceptance Criteria:**

1. Página de detalhe com: nome, descrição, orçamento, período, status, dias restantes
2. Cards de KPI no topo: total de vendas, receita, custo produtos, lucro, ROI (placeholder até Epic 6)
3. Tabela de influencers vinculados com colunas: nome, cupom, vendas, receita, ROI (placeholder até Epic 6)
4. Timeline visual mostrando posição atual dentro do período da campanha
5. Botão de edição e arquivamento

---

### Epic 5: Integração de Produtos (Shopify/Yampi)

**Goal:** Conectar a plataforma com Shopify e/ou Yampi para importar o catálogo de produtos com custos. Isso é pré-requisito para o cálculo de lucro real no Epic 6.

---

#### Story 5.1: Configuração de Integração E-commerce

**Como** admin da marca,
**Quero** conectar minha loja Shopify ou Yampi ao InfluTrack,
**Para que** os produtos e vendas sejam importados automaticamente.

**Acceptance Criteria:**

1. Página de Configurações com seção "Integrações"
2. Card de Shopify com botão "Conectar" — solicita API Key e Store URL
3. Card de Yampi com botão "Conectar" — solicita Token e Alias da loja
4. Credenciais armazenadas de forma segura (criptografadas) na tabela `integrations`
5. Teste de conexão ao salvar — feedback visual de sucesso/erro
6. Status de integração visível: conectada, desconectada, erro
7. Botão para desconectar integração
8. Apenas admin pode gerenciar integrações (verificação de permissão)

---

#### Story 5.2: Importação de Produtos

**Como** gestor de marca,
**Quero** que os produtos da minha loja sejam importados automaticamente,
**Para que** eu tenha o catálogo com custos disponível para cálculo de lucro.

**Acceptance Criteria:**

1. Ao conectar integração, trigger de importação inicial de todos os produtos
2. Produtos importados para tabela `products`: id, tenant_id, external_id, name, sku, price, cost, image_url, source (shopify/yampi), synced_at
3. Página "Produtos" com tabela: nome, SKU, preço, custo, fonte, última sync
4. Edição manual do campo "custo" para cada produto (override do valor da integração)
5. Indicador visual quando custo não foi informado (importado como null)
6. Sincronização periódica configurável: diária, 6h, manual (botão "Sincronizar agora")
7. Sync via Supabase Edge Function com cron trigger
8. Log de sincronização com timestamp e resultado (sucesso, erros, produtos novos/atualizados)

---

### Epic 6: Vendas, Atribuição e Cálculo de ROI

**Goal:** Implementar o core da plataforma: puxar vendas da Shopify/Yampi, atribuir ao influencer pelo cupom, vincular à campanha pelo período, e calcular lucro real usando custos de produto. Este é o epic que dá vida às métricas.

---

#### Story 6.1: Importação de Vendas e Webhooks

**Como** sistema,
**Quero** receber e armazenar vendas da Shopify/Yampi em tempo real,
**Para que** as métricas de campanha e influencer estejam sempre atualizadas.

**Acceptance Criteria:**

1. Endpoint de webhook para receber notificações de novas vendas (Shopify: orders/create, Yampi: order.paid)
2. Edge Function para processar webhook: validar assinatura, extrair dados do pedido
3. Tabela `orders` com: id, tenant_id, external_id, order_date, total_amount, discount_code, source, raw_data (jsonb), processed (boolean), timestamps
4. Tabela `order_items` com: id, order_id, product_id, quantity, unit_price, unit_cost
5. Ao processar pedido: mapear product_id usando external_id/SKU da tabela products
6. Fallback: polling periódico (Edge Function com cron) para buscar vendas não capturadas por webhook
7. Deduplicação por external_id — não processar mesma venda duas vezes
8. Log de processamento com status (sucesso, erro, produto não encontrado)

---

#### Story 6.2: Atribuição de Vendas a Influencers

**Como** sistema,
**Quero** atribuir cada venda ao influencer correto com base no cupom utilizado,
**Para que** saibamos exatamente quanto cada influencer vendeu.

**Acceptance Criteria:**

1. Ao processar uma venda com cupom, buscar influencer do tenant cujo cupom match com o discount_code
2. Tabela `order_attributions` com: id, order_id, influencer_id, campaign_id (nullable), attributed_at
3. Lógica de atribuição à campanha: se o influencer está vinculado a uma campanha E a data da venda está dentro do período da campanha → atribuir à campanha
4. Se influencer está em múltiplas campanhas com períodos sobrepostos, atribuir à campanha mais recente (ou com match mais específico)
5. Vendas com cupom válido mas fora de período de campanha: atribuir ao influencer mas sem campanha (organic)
6. Recálculo de atribuições quando uma campanha é editada (período alterado) — via trigger ou função

---

#### Story 6.3: Cálculo de Métricas e ROI

**Como** gestor de marca,
**Quero** ver métricas de lucro real e ROI calculados automaticamente,
**Para que** eu saiba o retorno exato de cada influencer e campanha.

**Acceptance Criteria:**

1. View ou função SQL que calcula por venda: receita (total_amount), custo (soma de unit_cost * quantity dos items), lucro (receita - custo)
2. Métricas por influencer: total de vendas, receita total, custo total, lucro total, ROI = (lucro / investimento) * 100
3. Métricas por campanha: vendas totais, receita, custo produtos, lucro, ROI, por influencer dentro da campanha
4. Métricas atualizadas em near-real-time (materializar via view ou cache com invalidação)
5. Integrar métricas reais na UI de perfil do influencer (substituir placeholders da Story 3.3)
6. Integrar métricas reais na UI de detalhe da campanha (substituir placeholders da Story 4.3)
7. Precisão de 2 casas decimais (NFR7)

---

### Epic 7: Dashboards e Visualizações

**Goal:** Entregar dashboards visuais que permitam à marca tomar decisões rápidas. Dashboard geral com visão macro e dashboard individual por influencer com visão detalhada de performance.

---

#### Story 7.1: Dashboard Geral

**Como** gestor de marca,
**Quero** um dashboard com visão geral de todas as campanhas e influencers,
**Para que** eu veja rapidamente a saúde do meu programa de influência.

**Acceptance Criteria:**

1. Página "Dashboard" como home após login
2. Cards de KPI: total de vendas (mês), receita total, lucro total, nº campanhas ativas, nº influencers ativos
3. Gráfico de linha: receita e lucro ao longo do tempo (últimos 30/60/90 dias)
4. Top 5 influencers por ROI (tabela rankeada)
5. Top 5 campanhas por lucro (tabela rankeada)
6. Filtros: período customizado, campanha específica, influencer específico
7. Dados atualizados com base nas métricas do Epic 6
8. Loading states e empty states para quando não há dados

---

#### Story 7.2: Dashboard Individual de Influencer

**Como** gestor de marca,
**Quero** ver um dashboard dedicado à performance de cada influencer,
**Para que** eu avalie detalhadamente o valor de cada parceria.

**Acceptance Criteria:**

1. Acessível via perfil do influencer (tab "Performance") ou link direto
2. Cards de KPI: vendas totais, receita, lucro, ROI médio, nº campanhas
3. Gráfico de linha: vendas ao longo do tempo (por mês)
4. Gráfico de barras: comparativo de ROI por campanha participada
5. Tabela detalhada: cada campanha com período, vendas, receita, custo, lucro, ROI
6. Gráfico de evolução de seguidores (dados do histórico de crescimento)
7. Filtro por período

---

#### Story 7.3: Comparativo de Influencers

**Como** gestor de marca,
**Quero** comparar a performance de influencers dentro de uma campanha,
**Para que** eu identifique os melhores performers e otimize investimentos futuros.

**Acceptance Criteria:**

1. Na página de detalhe da campanha, seção "Comparativo"
2. Gráfico de barras comparando: vendas, receita, lucro e ROI de cada influencer da campanha
3. Tabela rankeada por ROI (ou outra métrica selecionável)
4. Indicadores visuais: verde (acima da média), amarelo (na média), vermelho (abaixo da média)
5. Exportar comparativo como CSV (enhancement futuro — não bloqueia)

---

### Epic 8: Mineração e Análise de Influencers

**Goal:** Permitir que a marca descubra novos influencers via busca por palavras-chave no Instagram/TikTok e analise perfis completos com score de compatibilidade baseado no brand asset.

---

#### Story 8.1: Configuração de API de Scraping

**Como** admin da marca,
**Quero** configurar a integração com Apify para mineração de influencers,
**Para que** o módulo de mineração funcione.

**Acceptance Criteria:**

1. Na página de Configurações > Integrações, card "Apify" com campo para API Token
2. Teste de conexão ao salvar
3. Credencial armazenada de forma segura na tabela `integrations`
4. Status visual: conectada/desconectada
5. Informar ao usuário que a mineração requer créditos na conta Apify

---

#### Story 8.2: Mineração de Influencers por Palavras-Chave

**Como** gestor de marca,
**Quero** buscar influencers no Instagram e TikTok por palavras-chave,
**Para que** eu descubra novos influencers relevantes para minha marca.

**Acceptance Criteria:**

1. Página "Mineração" com formulário: palavras-chave (tags), plataforma (Instagram/TikTok/ambos), filtros opcionais (mín. seguidores, país)
2. Botão "Buscar" dispara chamada à Apify API usando Actor apropriado para cada plataforma
3. Resultados em tabela: foto, nome, handle, plataforma, seguidores, taxa de engajamento, link do perfil
4. Loading state durante busca (pode levar segundos/minutos)
5. Botão "Salvar como Influencer" em cada resultado — pré-preenche formulário de cadastro de influencer
6. Histórico de buscas salvas com: palavras-chave, data, nº resultados
7. Possibilidade de re-executar busca salva
8. Tratamento de erro: API key inválida, créditos insuficientes, timeout

---

#### Story 8.3: Análise Completa de Perfil

**Como** gestor de marca,
**Quero** analisar o perfil completo de um influencer e ver se ele combina com minha marca,
**Para que** eu tome decisões informadas antes de propor parcerias.

**Acceptance Criteria:**

1. Página "Análise" com input: handle do influencer + plataforma
2. Botão "Analisar" busca dados via Apify: métricas de engajamento, crescimento recente (últimos 30 dias), frequência de posts, tipo de conteúdo predominante, audiência estimada
3. Resultado em layout de relatório: cards de métrica, gráficos, resumo textual
4. Score de compatibilidade (0-100) calculado cruzando dados do perfil com brand asset do tenant (FR36, FR41):
   - Tom de voz do influencer vs tom da marca
   - Nicho do influencer vs segmento da marca
   - Audiência do influencer vs público-alvo da marca
   - Engajamento (qualidade > quantidade)
5. Classificação: Recomendado (70-100), Neutro (40-69), Não Recomendado (0-39)
6. Pontos fortes e pontos de atenção listados
7. Botão "Salvar como Influencer" para cadastrar diretamente
8. Histórico de análises realizadas

---

## 7. Checklist Results Report

*A ser preenchido após execução do pm-checklist.*

---

## 8. Next Steps

### 8.1 UX Expert Prompt

> @ux-design-expert — Revisar o PRD do InfluTrack em `docs/prd/influtrack-prd.md`, focar nas Core Screens (seção 3.3) e criar wireframes conceituais de baixa fidelidade para as 13 telas listadas. Definir o design system base (cores, tipografia, spacing, componentes) e os fluxos de navegação entre módulos. Considerar que a plataforma é web responsive, desktop-first, com foco em data visualization.

### 8.2 Architect Prompt

> @architect — Revisar o PRD do InfluTrack em `docs/prd/influtrack-prd.md` e criar o documento de arquitetura técnica. Focar em: schema do Supabase (todas as tabelas, RLS policies, views materializadas), design das APIs (Next.js API Routes), fluxo de webhooks (Shopify/Yampi), integração com Apify, estratégia de cache para dashboards, e diagrama de arquitetura. Stack definida: Next.js 14+, Supabase, Vercel.

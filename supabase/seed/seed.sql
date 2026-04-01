-- InfluTrack Seed Data
-- For local development only. DO NOT run in production.
-- Requires a user already created via Supabase Auth.
-- Usage: After signup, run this to populate demo data.

-- NOTE: This seed assumes tenant_id and user context exist.
-- In practice, the handle_new_user() trigger creates tenant on signup.
-- This file populates additional demo data for the first tenant.

-- =============================================================================
-- To use: Replace 'YOUR_TENANT_ID' with the actual tenant UUID after signup.
-- Or run via Edge Function that gets tenant_id from session.
-- =============================================================================

-- Demo Brand Asset
INSERT INTO public.brand_assets (tenant_id, brand_name, mission, vision, "values", tone_of_voice, target_audience, customer_pain_points, product_benefits, competitive_differentiators, brand_keywords)
VALUES (
  'YOUR_TENANT_ID',
  'Glow Naturals',
  'Democratizar cosméticos naturais de alta performance',
  'Ser a marca de beleza natural mais amada do Brasil',
  ARRAY['Transparência', 'Sustentabilidade', 'Eficácia', 'Inclusão'],
  'Acolhedor, confiante, educativo. Fala como uma amiga que entende de skincare.',
  'Mulheres 25-40 anos, classes B/C, interessadas em skincare natural e sustentável',
  ARRAY['Produtos caros sem resultado', 'Ingredientes tóxicos', 'Falta de transparência nos rótulos'],
  ARRAY['100% ingredientes naturais', 'Resultado em 30 dias', 'Cruelty-free e vegano'],
  ARRAY['Preço acessível vs concorrentes naturais', 'Transparência total de ingredientes', 'Comunidade ativa'],
  ARRAY['skincare', 'natural', 'vegano', 'beleza', 'sustentável', 'pele', 'cuidados']
);

-- Demo Influencers
INSERT INTO public.influencers (tenant_id, name, email, instagram_handle, tiktok_handle, city, state, niche, coupon_code) VALUES
  ('YOUR_TENANT_ID', 'Maria Silva', 'maria@email.com', '@mariasilva.skin', '@mariasilvaskin', 'São Paulo', 'SP', 'Skincare', 'MARIA15'),
  ('YOUR_TENANT_ID', 'Ana Costa', 'ana@email.com', '@anacosta.beauty', '@anacostabeauty', 'Rio de Janeiro', 'RJ', 'Beleza', 'ANA10'),
  ('YOUR_TENANT_ID', 'Julia Santos', 'julia@email.com', '@julinha.natural', '@julinhanatural', 'Belo Horizonte', 'MG', 'Lifestyle', 'JULIA20');

-- Demo Campaign
INSERT INTO public.campaigns (tenant_id, name, description, budget, start_date, end_date) VALUES
  ('YOUR_TENANT_ID', 'Lançamento Sérum Vitamina C', 'Campanha de lançamento do novo sérum com 3 influencers', 5000.00, '2026-04-01', '2026-04-30'),
  ('YOUR_TENANT_ID', 'Dia das Mães 2026', 'Promoção especial Dia das Mães com kits exclusivos', 8000.00, '2026-05-01', '2026-05-15');

-- Demo Products
INSERT INTO public.products (tenant_id, name, sku, price, cost, source) VALUES
  ('YOUR_TENANT_ID', 'Sérum Vitamina C 30ml', 'SERUM-VC-30', 89.90, 22.50, 'manual'),
  ('YOUR_TENANT_ID', 'Hidratante Facial Natural 50ml', 'HIDRA-NAT-50', 69.90, 18.00, 'manual'),
  ('YOUR_TENANT_ID', 'Kit Skincare Completo', 'KIT-SKIN-01', 199.90, 55.00, 'manual'),
  ('YOUR_TENANT_ID', 'Protetor Solar Mineral FPS 50', 'PROT-MIN-50', 79.90, 20.00, 'manual');

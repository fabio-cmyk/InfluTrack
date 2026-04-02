-- Migration: 00009_add_influencer_commission_fields
-- Description: Add commission, contact, and classification fields to influencers
-- Date: 2026-04-02

-- New fields for influencer profile
ALTER TABLE public.influencers
  ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
  ADD COLUMN IF NOT EXISTS utm_medium TEXT,
  ADD COLUMN IF NOT EXISTS size TEXT CHECK (size IN ('pequena', 'micro', 'nano', 'mid', 'macro', 'celebridade')),
  ADD COLUMN IF NOT EXISTS origin TEXT,
  ADD COLUMN IF NOT EXISTS commission_type TEXT NOT NULL DEFAULT 'percentage' CHECK (commission_type IN ('percentage', 'fixed')),
  ADD COLUMN IF NOT EXISTS commission_rate DECIMAL(5,2) NOT NULL DEFAULT 0 CHECK (commission_rate >= 0),
  ADD COLUMN IF NOT EXISTS monthly_fee DECIMAL(12,2) NOT NULL DEFAULT 0 CHECK (monthly_fee >= 0),
  ADD COLUMN IF NOT EXISTS bonus_rules TEXT,
  ADD COLUMN IF NOT EXISTS pix_key TEXT,
  ADD COLUMN IF NOT EXISTS address TEXT,
  ADD COLUMN IF NOT EXISTS payment_info TEXT;

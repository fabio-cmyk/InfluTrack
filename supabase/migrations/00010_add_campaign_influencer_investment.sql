-- Migration: 00010_add_campaign_influencer_investment
-- Description: Add investment field per influencer per campaign
-- Date: 2026-04-02

ALTER TABLE public.campaign_influencers
  ADD COLUMN IF NOT EXISTS investment DECIMAL(12,2) NOT NULL DEFAULT 0 CHECK (investment >= 0);

COMMENT ON COLUMN public.campaign_influencers.investment IS 'Investment amount for this influencer in this campaign. Sum of all = total campaign investment.';

"use server";

import { createClient } from "@/lib/supabase/server";

export type InfluencerMetrics = {
  total_orders: number;
  total_revenue: number;
  total_cost: number;
  total_profit: number;
  campaigns_count: number;
};

export type CampaignMetrics = {
  total_orders: number;
  total_revenue: number;
  total_cost: number;
  total_profit: number;
  influencers_count: number;
};

export type CampaignInfluencerMetrics = {
  influencer_id: string;
  total_orders: number;
  total_revenue: number;
  total_cost: number;
  total_profit: number;
};

export async function getInfluencerMetrics(influencerId: string): Promise<InfluencerMetrics | null> {
  const supabase = await createClient();

  const { data } = await supabase
    .from("v_influencer_metrics")
    .select("*")
    .eq("influencer_id", influencerId)
    .single();

  return data;
}

export async function getCampaignMetrics(campaignId: string): Promise<CampaignMetrics | null> {
  const supabase = await createClient();

  const { data } = await supabase
    .from("v_campaign_metrics")
    .select("*")
    .eq("campaign_id", campaignId)
    .single();

  return data;
}

export async function getCampaignInfluencerMetrics(campaignId: string): Promise<CampaignInfluencerMetrics[]> {
  const supabase = await createClient();

  const { data } = await supabase
    .from("v_campaign_influencer_metrics")
    .select("*")
    .eq("campaign_id", campaignId);

  return data || [];
}

"use server";

import { createClient } from "@/lib/supabase/server";

export type DashboardData = {
  totalOrders: number;
  totalRevenue: number;
  totalProfit: number;
  activeCampaigns: number;
  activeInfluencers: number;
  topInfluencers: { influencer_id: string; name: string; total_orders: number; total_revenue: number }[];
  topCampaigns: { campaign_id: string; name: string; total_orders: number; total_profit: number }[];
};

export async function getDashboardData(): Promise<DashboardData> {
  const supabase = await createClient();

  // All queries in parallel - no sequential round-trips
  const [metricsRes, campaignsRes, influencersRes, topInfRes, topCampRes, allInfluencerNames, allCampaignNames] = await Promise.all([
    supabase.from("v_influencer_metrics").select("total_orders, total_revenue, total_profit"),
    supabase.from("campaigns").select("id").eq("status", "active").eq("is_archived", false),
    supabase.from("influencers").select("id").eq("is_archived", false),
    supabase.from("v_influencer_metrics").select("influencer_id, total_orders, total_revenue").order("total_revenue", { ascending: false }).limit(5),
    supabase.from("v_campaign_metrics").select("campaign_id, total_orders, total_profit").order("total_profit", { ascending: false }).limit(5),
    supabase.from("influencers").select("id, name"),
    supabase.from("campaigns").select("id, name"),
  ]);

  // Sum totals
  const metrics = metricsRes.data || [];
  const totalOrders = metrics.reduce((sum, m) => sum + (m.total_orders || 0), 0);
  const totalRevenue = metrics.reduce((sum, m) => sum + Number(m.total_revenue || 0), 0);
  const totalProfit = metrics.reduce((sum, m) => sum + Number(m.total_profit || 0), 0);

  // Build name maps from parallel-fetched data
  const nameMap = new Map((allInfluencerNames.data || []).map((i) => [i.id, i.name]));
  const campNameMap = new Map((allCampaignNames.data || []).map((c) => [c.id, c.name]));

  return {
    totalOrders,
    totalRevenue,
    totalProfit,
    activeCampaigns: campaignsRes.data?.length || 0,
    activeInfluencers: influencersRes.data?.length || 0,
    topInfluencers: (topInfRes.data || []).map((i) => ({
      ...i,
      name: nameMap.get(i.influencer_id) || "—",
    })),
    topCampaigns: (topCampRes.data || []).map((c) => ({
      ...c,
      name: campNameMap.get(c.campaign_id) || "—",
    })),
  };
}

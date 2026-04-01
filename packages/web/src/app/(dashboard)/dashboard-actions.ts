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

  // Aggregate metrics from views
  const [metricsRes, campaignsRes, influencersRes, topInfRes, topCampRes] = await Promise.all([
    supabase.from("v_influencer_metrics").select("total_orders, total_revenue, total_profit"),
    supabase.from("campaigns").select("id").eq("status", "active").eq("is_archived", false),
    supabase.from("influencers").select("id").eq("is_archived", false),
    supabase.from("v_influencer_metrics").select("influencer_id, total_orders, total_revenue").order("total_revenue", { ascending: false }).limit(5),
    supabase.from("v_campaign_metrics").select("campaign_id, total_orders, total_profit").order("total_profit", { ascending: false }).limit(5),
  ]);

  // Sum totals
  const metrics = metricsRes.data || [];
  const totalOrders = metrics.reduce((sum, m) => sum + (m.total_orders || 0), 0);
  const totalRevenue = metrics.reduce((sum, m) => sum + Number(m.total_revenue || 0), 0);
  const totalProfit = metrics.reduce((sum, m) => sum + Number(m.total_profit || 0), 0);

  // Enrich top influencers with names
  const topInfIds = (topInfRes.data || []).map((i) => i.influencer_id);
  const { data: infNames } = topInfIds.length > 0
    ? await supabase.from("influencers").select("id, name").in("id", topInfIds)
    : { data: [] };
  const nameMap = new Map((infNames || []).map((i) => [i.id, i.name]));

  // Enrich top campaigns with names
  const topCampIds = (topCampRes.data || []).map((c) => c.campaign_id);
  const { data: campNames } = topCampIds.length > 0
    ? await supabase.from("campaigns").select("id, name").in("id", topCampIds)
    : { data: [] };
  const campNameMap = new Map((campNames || []).map((c) => [c.id, c.name]));

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

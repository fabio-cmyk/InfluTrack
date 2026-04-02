"use server";

import { createClient } from "@/lib/supabase/server";

export type InfluencerPerformance = {
  influencer_id: string;
  name: string;
  coupon_code: string;
  size: string | null;
  commission_type: string;
  commission_rate: number;
  monthly_fee: number;
  total_orders: number;
  total_revenue: number;
  total_cost: number;
  total_profit: number;
  commission_amount: number;
  net_profit: number; // profit - commission
  campaigns_count: number;
};

export async function getPerformanceData(
  period?: { from: string; to: string }
): Promise<{ data: InfluencerPerformance[] }> {
  const supabase = await createClient();

  // Get all active influencers with their data
  const { data: influencers } = await supabase
    .from("influencers")
    .select("id, name, coupon_code, size, commission_type, commission_rate, monthly_fee")
    .eq("is_archived", false)
    .eq("status", "active");

  if (!influencers?.length) return { data: [] };

  // Get metrics from view
  const { data: metrics } = await supabase
    .from("v_influencer_metrics")
    .select("*");

  const metricsMap = new Map(
    (metrics || []).map((m) => [m.influencer_id, m])
  );

  // If period filter, get orders within period for accurate calculation
  const periodOrderMap = new Map<string, { revenue: number; orders: number }>();
  if (period?.from && period?.to) {
    const { data: attributions } = await supabase
      .from("order_attributions")
      .select("influencer_id, order_id, orders(total_amount, order_date)")
      .gte("orders.order_date", period.from)
      .lte("orders.order_date", period.to);

    for (const attr of attributions || []) {
      const order = attr.orders as unknown as { total_amount: number; order_date: string } | null;
      if (!order) continue;
      const existing = periodOrderMap.get(attr.influencer_id) || { revenue: 0, orders: 0 };
      existing.revenue += Number(order.total_amount);
      existing.orders += 1;
      periodOrderMap.set(attr.influencer_id, existing);
    }
  }

  const result: InfluencerPerformance[] = influencers.map((inf) => {
    const m = metricsMap.get(inf.id);
    const usePeriod = period?.from && periodOrderMap.size > 0;
    const periodData = periodOrderMap.get(inf.id);

    const totalOrders = usePeriod ? (periodData?.orders || 0) : (m?.total_orders || 0);
    const totalRevenue = usePeriod ? (periodData?.revenue || 0) : Number(m?.total_revenue || 0);
    const totalCost = Number(m?.total_cost || 0);
    const totalProfit = totalRevenue - totalCost;

    // Calculate commission
    let commissionAmount = 0;
    if (inf.commission_type === "percentage" && inf.commission_rate > 0) {
      commissionAmount = totalRevenue * (Number(inf.commission_rate) / 100);
    } else if (inf.commission_type === "fixed" && inf.commission_rate > 0) {
      commissionAmount = totalOrders * Number(inf.commission_rate);
    }

    const netProfit = totalProfit - commissionAmount;

    return {
      influencer_id: inf.id,
      name: inf.name,
      coupon_code: inf.coupon_code,
      size: inf.size,
      commission_type: inf.commission_type,
      commission_rate: Number(inf.commission_rate),
      monthly_fee: Number(inf.monthly_fee),
      total_orders: totalOrders,
      total_revenue: totalRevenue,
      total_cost: totalCost,
      total_profit: totalProfit,
      commission_amount: commissionAmount,
      net_profit: netProfit,
      campaigns_count: m?.campaigns_count || 0,
    };
  });

  // Sort by net profit descending
  result.sort((a, b) => b.net_profit - a.net_profit);

  return { data: result };
}

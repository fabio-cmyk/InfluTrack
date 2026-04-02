"use server";

import { createClient } from "@/lib/supabase/server";

export type Order = {
  id: string;
  external_id: string;
  order_date: string;
  total_amount: number;
  discount_code: string | null;
  source: string;
  processed: boolean;
  created_at: string;
  influencer_name: string | null;
  campaign_name: string | null;
  items_count: number;
};

export type OrderItem = {
  id: string;
  product_name: string;
  quantity: number;
  unit_price: number;
  unit_cost: number | null;
};

export async function getOrders(filters?: {
  source?: string;
  hasCoupon?: boolean;
  limit?: number;
}): Promise<{ data: Order[]; error?: string }> {
  const supabase = await createClient();

  let query = supabase
    .from("orders")
    .select("id, external_id, order_date, total_amount, discount_code, source, processed, created_at")
    .order("order_date", { ascending: false })
    .limit(filters?.limit || 50);

  if (filters?.source) {
    query = query.eq("source", filters.source);
  }

  if (filters?.hasCoupon === true) {
    query = query.not("discount_code", "is", null);
  } else if (filters?.hasCoupon === false) {
    query = query.is("discount_code", null);
  }

  const { data: orders, error } = await query;

  if (error) return { data: [], error: error.message };
  if (!orders?.length) return { data: [] };

  // Get attributions for these orders
  const orderIds = orders.map((o) => o.id);
  const { data: attributions } = await supabase
    .from("order_attributions")
    .select("order_id, influencer_id, campaign_id")
    .in("order_id", orderIds);

  // Get influencer names
  const influencerIds = [...new Set((attributions || []).map((a) => a.influencer_id))];
  const { data: influencers } = influencerIds.length > 0
    ? await supabase.from("influencers").select("id, name").in("id", influencerIds)
    : { data: [] };
  const infMap = new Map((influencers || []).map((i) => [i.id, i.name]));

  // Get campaign names
  const campaignIds = [...new Set((attributions || []).filter((a) => a.campaign_id).map((a) => a.campaign_id!))];
  const { data: campaigns } = campaignIds.length > 0
    ? await supabase.from("campaigns").select("id, name").in("id", campaignIds)
    : { data: [] };
  const campMap = new Map((campaigns || []).map((c) => [c.id, c.name]));

  // Get item counts
  const { data: itemCounts } = await supabase
    .from("order_items")
    .select("order_id")
    .in("order_id", orderIds);

  const countMap = new Map<string, number>();
  (itemCounts || []).forEach((ic) => {
    countMap.set(ic.order_id, (countMap.get(ic.order_id) || 0) + 1);
  });

  // Attribution map
  const attrMap = new Map((attributions || []).map((a) => [a.order_id, a]));

  const result: Order[] = orders.map((o) => {
    const attr = attrMap.get(o.id);
    return {
      ...o,
      influencer_name: attr ? infMap.get(attr.influencer_id) || null : null,
      campaign_name: attr?.campaign_id ? campMap.get(attr.campaign_id) || null : null,
      items_count: countMap.get(o.id) || 0,
    };
  });

  return { data: result };
}

export async function getOrderItems(orderId: string): Promise<{ data: OrderItem[] }> {
  const supabase = await createClient();

  const { data } = await supabase
    .from("order_items")
    .select("id, product_name, quantity, unit_price, unit_cost")
    .eq("order_id", orderId);

  return { data: data || [] };
}

export async function getOrderStats(): Promise<{
  totalOrders: number;
  totalRevenue: number;
  withCoupon: number;
  withoutCoupon: number;
}> {
  const supabase = await createClient();

  const { data: orders } = await supabase
    .from("orders")
    .select("total_amount, discount_code");

  const all = orders || [];
  return {
    totalOrders: all.length,
    totalRevenue: all.reduce((sum, o) => sum + Number(o.total_amount), 0),
    withCoupon: all.filter((o) => o.discount_code).length,
    withoutCoupon: all.filter((o) => !o.discount_code).length,
  };
}

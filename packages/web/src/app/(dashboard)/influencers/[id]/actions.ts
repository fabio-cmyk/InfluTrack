"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export type GrowthEntry = {
  id: string;
  record_date: string;
  platform: string;
  followers: number | null;
  engagement_rate: number | null;
  posts_count: number | null;
};

export async function getGrowthHistory(influencerId: string): Promise<{ data: GrowthEntry[]; error?: string }> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("influencer_growth_history")
    .select("*")
    .eq("influencer_id", influencerId)
    .order("record_date", { ascending: false });

  if (error) return { data: [], error: error.message };
  return { data: data || [] };
}

export async function addGrowthEntry(formData: {
  influencer_id: string;
  record_date: string;
  platform: string;
  followers: number;
  engagement_rate: number;
  posts_count: number;
}): Promise<{ error?: string }> {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Nao autenticado" };

  const { data: tenantUser } = await supabase
    .from("tenant_users")
    .select("tenant_id")
    .eq("user_id", user.id)
    .single();

  if (!tenantUser) return { error: "Tenant nao encontrado" };

  const { error } = await supabase.from("influencer_growth_history").insert({
    ...formData,
    tenant_id: tenantUser.tenant_id,
  });

  if (error) {
    if (error.code === "23505") return { error: "Ja existe registro para esta data e plataforma" };
    return { error: error.message };
  }

  revalidatePath(`/influencers/${formData.influencer_id}`);
  return {};
}

export type InfluencerCampaign = {
  id: string;
  campaign_id: string;
  campaign_name: string;
  start_date: string | null;
  end_date: string | null;
  status: string;
  investment: number;
};

export async function getInfluencerCampaigns(influencerId: string): Promise<{ data: InfluencerCampaign[] }> {
  const supabase = await createClient();

  const { data } = await supabase
    .from("campaign_influencers")
    .select("id, campaign_id, investment, campaigns(name, start_date, end_date, status)")
    .eq("influencer_id", influencerId);

  const result = (data || []).map((ci) => {
    const camp = ci.campaigns as unknown as { name: string; start_date: string | null; end_date: string | null; status: string };
    return {
      id: ci.id,
      campaign_id: ci.campaign_id,
      campaign_name: camp?.name || "—",
      start_date: camp?.start_date,
      end_date: camp?.end_date,
      status: camp?.status || "draft",
      investment: Number(ci.investment) || 0,
    };
  });

  return { data: result };
}

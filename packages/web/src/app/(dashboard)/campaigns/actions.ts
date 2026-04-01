"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export type Campaign = {
  id: string;
  name: string;
  description: string | null;
  budget: number | null;
  start_date: string | null;
  end_date: string | null;
  status: string;
  is_archived: boolean;
  created_at: string;
  influencer_count?: number;
};

export type CampaignInfluencer = {
  id: string;
  influencer_id: string;
  name: string;
  instagram_handle: string | null;
  coupon_code: string;
  niche: string | null;
  added_at: string;
};

export async function getCampaigns(): Promise<{ data: Campaign[]; error?: string }> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("campaigns")
    .select("*, campaign_influencers(count)")
    .eq("is_archived", false)
    .order("created_at", { ascending: false });

  if (error) return { data: [], error: error.message };

  const campaigns = (data || []).map((c) => ({
    ...c,
    influencer_count: c.campaign_influencers?.[0]?.count || 0,
  }));

  return { data: campaigns };
}

export async function getCampaign(id: string): Promise<{ data: Campaign | null; error?: string }> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("campaigns")
    .select("*")
    .eq("id", id)
    .single();

  if (error) return { data: null, error: error.message };
  return { data };
}

export async function createCampaign(formData: {
  name: string;
  description: string;
  budget: number | null;
  start_date: string | null;
  end_date: string | null;
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

  const { error } = await supabase.from("campaigns").insert({
    tenant_id: tenantUser.tenant_id,
    ...formData,
  });

  if (error) return { error: error.message };

  revalidatePath("/campaigns");
  return {};
}

export async function updateCampaign(id: string, formData: {
  name: string;
  description: string;
  budget: number | null;
  start_date: string | null;
  end_date: string | null;
}): Promise<{ error?: string }> {
  const supabase = await createClient();

  const { error } = await supabase
    .from("campaigns")
    .update(formData)
    .eq("id", id);

  if (error) return { error: error.message };

  revalidatePath("/campaigns");
  revalidatePath(`/campaigns/${id}`);
  return {};
}

export async function archiveCampaign(id: string): Promise<{ error?: string }> {
  const supabase = await createClient();

  const { error } = await supabase
    .from("campaigns")
    .update({ is_archived: true })
    .eq("id", id);

  if (error) return { error: error.message };

  revalidatePath("/campaigns");
  return {};
}

export async function getCampaignInfluencers(campaignId: string): Promise<{ data: CampaignInfluencer[]; error?: string }> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("campaign_influencers")
    .select("id, influencer_id, added_at, influencers(name, instagram_handle, coupon_code, niche)")
    .eq("campaign_id", campaignId);

  if (error) return { data: [], error: error.message };

  const result = (data || []).map((ci) => {
    const inf = ci.influencers as unknown as { name: string; instagram_handle: string | null; coupon_code: string; niche: string | null };
    return {
      id: ci.id,
      influencer_id: ci.influencer_id,
      name: inf?.name || "—",
      instagram_handle: inf?.instagram_handle,
      coupon_code: inf?.coupon_code || "—",
      niche: inf?.niche,
      added_at: ci.added_at,
    };
  });

  return { data: result };
}

export async function addInfluencersToCampaign(
  campaignId: string,
  influencerIds: string[]
): Promise<{ error?: string }> {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Nao autenticado" };

  const { data: tenantUser } = await supabase
    .from("tenant_users")
    .select("tenant_id")
    .eq("user_id", user.id)
    .single();

  if (!tenantUser) return { error: "Tenant nao encontrado" };

  const rows = influencerIds.map((infId) => ({
    campaign_id: campaignId,
    influencer_id: infId,
    tenant_id: tenantUser.tenant_id,
  }));

  const { error } = await supabase
    .from("campaign_influencers")
    .insert(rows);

  if (error) return { error: error.message };

  revalidatePath(`/campaigns/${campaignId}`);
  return {};
}

export async function removeInfluencerFromCampaign(linkId: string, campaignId: string): Promise<{ error?: string }> {
  const supabase = await createClient();

  const { error } = await supabase
    .from("campaign_influencers")
    .delete()
    .eq("id", linkId);

  if (error) return { error: error.message };

  revalidatePath(`/campaigns/${campaignId}`);
  return {};
}

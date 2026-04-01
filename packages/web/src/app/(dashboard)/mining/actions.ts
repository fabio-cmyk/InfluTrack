"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export type MiningSearch = {
  id: string;
  keywords: string[];
  platforms: string[];
  results_count: number;
  created_at: string;
};

export type MiningResult = {
  id: string;
  platform: string;
  handle: string;
  display_name: string | null;
  followers: number | null;
  engagement_rate: number | null;
  niche_estimate: string | null;
  profile_url: string | null;
  saved_as_influencer_id: string | null;
};

export async function getSearchHistory(): Promise<{ data: MiningSearch[] }> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("mining_searches")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(20);
  return { data: data || [] };
}

export async function getSearchResults(searchId: string): Promise<{ data: MiningResult[] }> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("mining_results")
    .select("id, platform, handle, display_name, followers, engagement_rate, niche_estimate, profile_url, saved_as_influencer_id")
    .eq("search_id", searchId);
  return { data: data || [] };
}

export async function createSearch(keywords: string[], platforms: string[]): Promise<{ id?: string; error?: string }> {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Nao autenticado" };

  const { data: tenantUser } = await supabase
    .from("tenant_users")
    .select("tenant_id")
    .eq("user_id", user.id)
    .single();

  if (!tenantUser) return { error: "Tenant nao encontrado" };

  const { data, error } = await supabase
    .from("mining_searches")
    .insert({ tenant_id: tenantUser.tenant_id, keywords, platforms })
    .select("id")
    .single();

  if (error) return { error: error.message };

  revalidatePath("/mining");
  return { id: data?.id };
}

export async function saveResultAsInfluencer(resultId: string): Promise<{ error?: string }> {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Nao autenticado" };

  const { data: tenantUser } = await supabase
    .from("tenant_users")
    .select("tenant_id")
    .eq("user_id", user.id)
    .single();

  if (!tenantUser) return { error: "Tenant nao encontrado" };

  const { data: result } = await supabase
    .from("mining_results")
    .select("*")
    .eq("id", resultId)
    .single();

  if (!result) return { error: "Resultado nao encontrado" };

  const { data: influencer, error: insertError } = await supabase
    .from("influencers")
    .insert({
      tenant_id: tenantUser.tenant_id,
      name: result.display_name || result.handle,
      [`${result.platform}_handle`]: result.handle,
      niche: result.niche_estimate,
      coupon_code: result.handle.replace("@", "").toUpperCase().slice(0, 20),
    })
    .select("id")
    .single();

  if (insertError) return { error: insertError.message };

  await supabase
    .from("mining_results")
    .update({ saved_as_influencer_id: influencer?.id })
    .eq("id", resultId);

  revalidatePath("/mining");
  return {};
}

"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { mineInstagramByKeyword, mineTikTokByKeyword, type MinedInfluencer } from "@/lib/scrapecreators";

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
  avatar_url: string | null;
  saved_as_influencer_id: string | null;
  raw_data: {
    following?: number;
    posts_count?: number;
    total_views?: number;
    total_likes?: number;
    total_comments?: number;
    total_shares?: number;
    content_found?: number;
    sample_caption?: string;
    is_verified?: boolean;
  } | null;
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
    .select("id, platform, handle, display_name, followers, engagement_rate, niche_estimate, profile_url, avatar_url, saved_as_influencer_id, raw_data")
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

  const searchId = data?.id;
  if (!searchId) return { error: "Falha ao criar busca" };

  // ScrapeCreators API key (global, from env)
  const apiKey = process.env.SCRAPECREATORS_API_KEY;

  if (apiKey) {
    try {
      const query = keywords.join(" ");
      const allMinedInfluencers: MinedInfluencer[] = [];

      // Instagram: search reels by keyword → extract creators with metrics
      if (platforms.includes("instagram")) {
        const igResults = await mineInstagramByKeyword(query, apiKey);
        allMinedInfluencers.push(...igResults);
      }

      // TikTok: search videos by keyword → extract creators with metrics
      if (platforms.includes("tiktok")) {
        const ttResults = await mineTikTokByKeyword(query, apiKey);
        allMinedInfluencers.push(...ttResults);
      }

      // Insert all results with full metrics
      if (allMinedInfluencers.length > 0) {
        const rows = allMinedInfluencers.map((r) => ({
          search_id: searchId,
          tenant_id: tenantUser.tenant_id,
          platform: r.platform,
          handle: r.handle,
          display_name: r.display_name,
          followers: r.followers,
          engagement_rate: r.avg_engagement_rate,
          profile_url: r.profile_url,
          avatar_url: r.profile_pic,
          raw_data: {
            following: r.following,
            posts_count: r.posts_count,
            total_views: r.total_views,
            total_likes: r.total_likes,
            total_comments: r.total_comments,
            total_shares: r.total_shares,
            content_found: r.content_found,
            sample_caption: r.sample_caption,
            is_verified: r.is_verified,
          },
        }));
        await supabase.from("mining_results").insert(rows);
      }

      // Update results count
      const { count } = await supabase
        .from("mining_results")
        .select("id", { count: "exact", head: true })
        .eq("search_id", searchId);

      await supabase
        .from("mining_searches")
        .update({ results_count: count || 0 })
        .eq("id", searchId);
    } catch {
      // API call failed, search saved without results
    }
  }

  revalidatePath("/mining");
  return { id: searchId };
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

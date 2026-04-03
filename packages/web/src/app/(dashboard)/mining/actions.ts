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

function looksPortuguese(text: string): boolean {
  if (!text) return false;
  const lower = text.toLowerCase();
  // Common Portuguese words and patterns
  const ptWords = [
    "voce", "você", "para", "como", "que", "esse", "essa", "isso", "isto",
    "nao", "não", "muito", "mais", "aqui", "agora", "hoje", "ainda",
    "gente", "pra", "tudo", "meu", "minha", "seu", "sua", "nosso",
    "quer", "pode", "vai", "vem", "olha", "ficou", "demais",
    "arrasta", "comenta", "salva", "curte", "segue", "link na bio",
    "brasil", "brasileir", "sao paulo", "são paulo", "rio de janeiro",
    "emagrecer", "saude", "saúde", "beleza", "cabelo", "pele", "corpo",
    "treino", "dieta", "receita", "dica", "fica", "bora",
    "ção", "ções", "ão", "ões", "ência", "ância",
  ];
  return ptWords.some((w) => lower.includes(w));
}

function looksPortugueseName(name: string): boolean {
  if (!name) return false;
  const lower = name.toLowerCase();
  const brNameParts = [
    "silva", "santos", "oliveira", "souza", "costa", "rodrigues", "ferreira",
    "almeida", "pereira", "lima", "gomes", "ribeiro", "martins", "carvalho",
    "araujo", "araújo", "melo", "barbosa", "cardoso", "nascimento",
    "ana", "maria", "fernanda", "camila", "juliana", "patricia", "patrícia",
    "lucas", "matheus", "rafael", "gabriel", "bruno", "pedro", "thiago",
    "leticia", "letícia", "beatriz", "larissa", "bianca", "nanda", "juh",
    "oficial", "fit", "blog", "dra", "dicas",
  ];
  return brNameParts.some((w) => lower.includes(w));
}

export async function createSearch(keywords: string[], platforms: string[], region: string = "brasil"): Promise<{ id?: string; error?: string }> {
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
      // Append region context to bias API results toward local creators
      const baseQuery = keywords.join(" ");
      const query = region === "global" ? baseQuery : `${baseQuery} ${region}`;
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

      // Filter by region heuristics (Portuguese content/names for Brasil)
      const filtered = region === "global"
        ? allMinedInfluencers
        : allMinedInfluencers.filter((r) => {
            const captionMatch = looksPortuguese(r.sample_caption);
            const nameMatch = looksPortugueseName(r.display_name) || looksPortugueseName(r.handle);
            return captionMatch || nameMatch;
          });

      // Fallback: if filter is too aggressive (< 3 results), keep all but sort PT first
      const finalResults = filtered.length >= 3
        ? filtered
        : allMinedInfluencers.sort((a, b) => {
            const aScore = (looksPortuguese(a.sample_caption) ? 2 : 0) + (looksPortugueseName(a.display_name) ? 1 : 0);
            const bScore = (looksPortuguese(b.sample_caption) ? 2 : 0) + (looksPortugueseName(b.display_name) ? 1 : 0);
            return bScore - aScore;
          });

      // Insert all results with full metrics
      if (finalResults.length > 0) {
        const rows = finalResults.map((r) => ({
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

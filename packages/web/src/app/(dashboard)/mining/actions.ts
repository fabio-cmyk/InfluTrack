"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import {
  mineInstagramByKeyword,
  mineTikTokByKeyword,
  getTikTokPopularCreators,
  getTikTokPopularHashtags,
  getInstagramEnrichedProfile,
  type MinedInfluencer,
} from "@/lib/scrapecreators";
import { getNicheLabel } from "@/lib/niches";

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
    ig_category?: string;
    ig_city?: string;
    ig_bio?: string;
    discovered_via?: string;
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

// Brazilian hashtags that strongly signal influencer content
const BR_SIGNAL_HASHTAGS = ["publipost", "publi", "recebidos", "influenciadordigital", "parceria", "blogueira"];

export async function createSearch(
  keywords: string[],
  platforms: string[],
  region: string = "brasil",
  niche: string = ""
): Promise<{ id?: string; error?: string }> {
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
    .insert({
      tenant_id: tenantUser.tenant_id,
      keywords,
      platforms,
      filters: { region, niche: niche || null },
    })
    .select("id")
    .single();

  if (error) return { error: error.message };

  const searchId = data?.id;
  if (!searchId) return { error: "Falha ao criar busca" };

  const apiKey = process.env.SCRAPECREATORS_API_KEY;
  const isBrasil = region === "brasil";
  const nicheLabel = niche ? getNicheLabel(niche) : null;

  if (apiKey) {
    try {
      const baseQuery = keywords.join(" ");
      const allMinedInfluencers: MinedInfluencer[] = [];

      // ── INSTAGRAM ──────────────────────────────────────────
      if (platforms.includes("instagram")) {
        // Primary search: user keywords (API uses Google Search internally)
        const igResults = await mineInstagramByKeyword(baseQuery, apiKey);
        allMinedInfluencers.push(...igResults);

        // Secondary search: if Brasil + few results, try with BR hashtag to find more
        if (isBrasil && igResults.length < 5) {
          try {
            const brQuery = `${BR_SIGNAL_HASHTAGS[0]} ${baseQuery}`;
            const brResults = await mineInstagramByKeyword(brQuery, apiKey);
            const existingHandles = new Set(allMinedInfluencers.map((r) => r.handle));
            for (const r of brResults) {
              if (!existingHandles.has(r.handle)) {
                allMinedInfluencers.push(r);
                existingHandles.add(r.handle);
              }
            }
          } catch {
            // BR secondary search failed, continue with primary results
          }
        }
      }

      // ── TIKTOK ─────────────────────────────────────────────
      if (platforms.includes("tiktok")) {
        // Strategy 1: Popular Creators BR (native country filter — most assertive)
        if (isBrasil) {
          try {
            const popularCreators = await getTikTokPopularCreators(apiKey, {
              creatorCountry: "BR",
              audienceCountry: "BR",
              sortBy: "follower_count",
              page: 1,
            });
            // Convert PopularCreator → MinedInfluencer format
            for (const c of popularCreators) {
              allMinedInfluencers.push({
                handle: c.handle,
                display_name: c.display_name,
                followers: c.followers,
                following: c.following,
                posts_count: c.posts_count,
                profile_pic: c.profile_pic,
                profile_url: c.profile_url,
                is_verified: c.is_verified,
                platform: "tiktok",
                total_views: c.avg_views,
                total_likes: 0,
                total_comments: 0,
                total_shares: 0,
                content_found: 0,
                avg_engagement_rate: c.engagement_rate,
                sample_caption: "",
              });
            }
          } catch {
            // Popular creators endpoint failed, continue with keyword search
          }
        }

        // Strategy 2: Niche hashtags → keyword search (when niche selected)
        if (niche && isBrasil) {
          try {
            const trendingHashtags = await getTikTokPopularHashtags(apiKey, {
              countryCode: "BR",
              industry: niche,
              period: 7,
              page: 1,
            });
            // Use top 3 trending hashtags as additional search terms
            const topHashtags = trendingHashtags.slice(0, 3).map((h) => h.hashtag_name);
            if (topHashtags.length > 0) {
              const nicheQuery = `${topHashtags[0]} ${baseQuery}`;
              const nicheResults = await mineTikTokByKeyword(nicheQuery, apiKey);
              // Deduplicate by handle
              const existingHandles = new Set(allMinedInfluencers.map((r) => r.handle));
              for (const r of nicheResults) {
                if (!existingHandles.has(r.handle)) {
                  allMinedInfluencers.push(r);
                  existingHandles.add(r.handle);
                }
              }
            }
          } catch {
            // Hashtag discovery failed, continue with keyword search
          }
        }

        // Strategy 3: Standard keyword search (always runs as fallback/complement)
        const ttQuery = isBrasil ? `${baseQuery} brasil` : baseQuery;
        const ttResults = await mineTikTokByKeyword(ttQuery, apiKey);
        // Deduplicate
        const existingHandles = new Set(allMinedInfluencers.map((r) => r.handle));
        for (const r of ttResults) {
          if (!existingHandles.has(r.handle)) {
            allMinedInfluencers.push(r);
            existingHandles.add(r.handle);
          }
        }
      }

      // ── FILTER BY REGION HEURISTICS ────────────────────────
      const filtered = !isBrasil
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

      // ── ENRICH INSTAGRAM PROFILES (FASE 2) ─────────────────
      // For top IG results, fetch full profile for category, city, bio
      const enrichmentMap = new Map<string, { category: string | null; city: string | null; bio: string }>();
      if (isBrasil && apiKey) {
        const igResults = finalResults.filter((r) => r.platform === "instagram").slice(0, 15);
        const enrichPromises = igResults.map(async (r) => {
          try {
            const enriched = await getInstagramEnrichedProfile(r.handle, apiKey);
            enrichmentMap.set(r.handle, {
              category: enriched.category_name,
              city: enriched.business_city,
              bio: enriched.biography,
            });
          } catch {
            // Enrichment failed for this profile, skip
          }
        });
        await Promise.all(enrichPromises);
      }

      // ── INSERT RESULTS ─────────────────────────────────────
      if (finalResults.length > 0) {
        const rows = finalResults.map((r) => {
          const enrichment = enrichmentMap.get(r.handle);
          // Determine niche: from enrichment category, or from selected niche, or null
          let estimatedNiche = nicheLabel || null;
          if (enrichment?.category && !estimatedNiche) {
            estimatedNiche = enrichment.category;
          }

          return {
            search_id: searchId,
            tenant_id: tenantUser.tenant_id,
            platform: r.platform,
            handle: r.handle,
            display_name: r.display_name,
            followers: r.followers,
            engagement_rate: r.avg_engagement_rate,
            niche_estimate: estimatedNiche,
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
              // Enrichment data
              ...(enrichment && {
                ig_category: enrichment.category,
                ig_city: enrichment.city,
                ig_bio: enrichment.bio?.slice(0, 300),
              }),
            },
          };
        });
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
    } catch (err) {
      console.error("[Mining] Search failed:", err);
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

// ── FASE 3: Find similar Instagram profiles via edge_related_profiles ──

export async function findSimilarProfiles(
  searchId: string,
  handle: string
): Promise<{ added: number; error?: string }> {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { added: 0, error: "Nao autenticado" };

  const { data: tenantUser } = await supabase
    .from("tenant_users")
    .select("tenant_id")
    .eq("user_id", user.id)
    .single();

  if (!tenantUser) return { added: 0, error: "Tenant nao encontrado" };

  const apiKey = process.env.SCRAPECREATORS_API_KEY;
  if (!apiKey) return { added: 0, error: "API key nao configurada" };

  try {
    const enriched = await getInstagramEnrichedProfile(handle, apiKey);

    if (enriched.related_profiles.length === 0) {
      return { added: 0, error: "Nenhum perfil similar encontrado" };
    }

    // Fetch full profile for each related profile
    const newResults: Array<Record<string, unknown>> = [];

    for (const related of enriched.related_profiles) {
      try {
        const profile = await getInstagramEnrichedProfile(related.handle, apiKey);

        newResults.push({
          search_id: searchId,
          tenant_id: tenantUser.tenant_id,
          platform: "instagram",
          handle: profile.handle,
          display_name: profile.display_name,
          followers: profile.followers,
          engagement_rate: null,
          niche_estimate: profile.category_name || enriched.category_name || null,
          profile_url: `https://instagram.com/${profile.handle}`,
          avatar_url: profile.profile_pic,
          raw_data: {
            following: profile.following,
            posts_count: profile.posts_count,
            is_verified: profile.is_verified,
            ig_category: profile.category_name,
            ig_city: profile.business_city,
            ig_bio: profile.biography?.slice(0, 300),
            discovered_via: handle,
          },
        });
      } catch {
        // Skip profiles that fail to enrich
      }
    }

    if (newResults.length > 0) {
      await supabase.from("mining_results").insert(newResults);

      // Update results count
      const { count } = await supabase
        .from("mining_results")
        .select("id", { count: "exact", head: true })
        .eq("search_id", searchId);

      await supabase
        .from("mining_searches")
        .update({ results_count: count || 0 })
        .eq("id", searchId);
    }

    revalidatePath("/mining");
    return { added: newResults.length };
  } catch {
    return { added: 0, error: "Falha ao buscar perfis similares" };
  }
}

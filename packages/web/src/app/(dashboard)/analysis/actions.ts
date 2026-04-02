"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getInstagramProfile, getTikTokProfile, type ScrapedProfile } from "@/lib/scrapecreators";

export type AnalysisEntry = {
  id: string;
  handle: string;
  platform: string;
  fit_score: number | null;
  fit_classification: string | null;
  strengths: string[];
  concerns: string[];
  saved_as_influencer_id: string | null;
  created_at: string;
  analysis_data?: Record<string, unknown>;
};

export async function getAnalysisHistory(): Promise<{ data: AnalysisEntry[] }> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("analysis_history")
    .select("id, handle, platform, fit_score, fit_classification, strengths, concerns, saved_as_influencer_id, created_at, analysis_data")
    .order("created_at", { ascending: false })
    .limit(20);
  return { data: data || [] };
}

function calculateFitScore(profile: ScrapedProfile, brandAsset: Record<string, unknown> | null): {
  score: number;
  strengths: string[];
  concerns: string[];
} {
  let score = 50; // Base
  const strengths: string[] = [];
  const concerns: string[] = [];

  // Followers analysis
  if (profile.followers >= 100000) { score += 10; strengths.push(`Grande audiencia: ${(profile.followers / 1000).toFixed(0)}k seguidores`); }
  else if (profile.followers >= 10000) { score += 5; strengths.push(`Audiencia solida: ${(profile.followers / 1000).toFixed(0)}k seguidores`); }
  else if (profile.followers >= 1000) { strengths.push(`Micro-influencer: ${(profile.followers / 1000).toFixed(1)}k seguidores`); }
  else { score -= 10; concerns.push(`Audiencia pequena: ${profile.followers} seguidores`); }

  // Verified
  if (profile.is_verified) { score += 10; strengths.push("Perfil verificado"); }

  // Posts count (activity)
  if (profile.posts_count > 500) { score += 5; strengths.push(`Conteudo consistente: ${profile.posts_count} posts`); }
  else if (profile.posts_count > 100) { strengths.push(`${profile.posts_count} posts publicados`); }
  else if (profile.posts_count < 30) { score -= 5; concerns.push(`Pouco conteudo: ${profile.posts_count} posts`); }

  // Following ratio
  if (profile.followers > 0 && profile.following > 0) {
    const ratio = profile.followers / profile.following;
    if (ratio > 10) { score += 10; strengths.push(`Otima proporcao seguidores/seguindo (${ratio.toFixed(0)}:1)`); }
    else if (ratio < 1) { score -= 10; concerns.push("Segue mais do que e seguido — possivel audiencia nao organica"); }
  }

  // Bio check
  if (profile.biography && profile.biography.length > 20) { score += 5; }
  else { concerns.push("Bio curta ou vazia"); }

  // Brand fit (if brand asset exists)
  if (brandAsset) {
    const brandKeywords = (brandAsset.brand_keywords as string[]) || [];
    const bio = profile.biography.toLowerCase();
    const matches = brandKeywords.filter(k => bio.includes(k.toLowerCase()));
    if (matches.length > 0) {
      score += matches.length * 5;
      strengths.push(`Palavras-chave da marca encontradas no bio: ${matches.join(", ")}`);
    }
  }

  // Clamp
  score = Math.max(0, Math.min(100, score));

  return { score, strengths, concerns };
}

export async function createAnalysis(handle: string, platform: string): Promise<{ data?: AnalysisEntry; error?: string }> {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Nao autenticado" };

  const { data: tenantUser } = await supabase
    .from("tenant_users")
    .select("tenant_id")
    .eq("user_id", user.id)
    .single();

  if (!tenantUser) return { error: "Tenant nao encontrado" };

  // ScrapeCreators API key (global, from env)
  const apiKey = process.env.SCRAPECREATORS_API_KEY;

  let profile: ScrapedProfile | null = null;
  let analysisData: Record<string, unknown> = {};

  if (apiKey) {
    try {
      if (platform === "instagram") {
        profile = await getInstagramProfile(handle, apiKey);
      } else if (platform === "tiktok") {
        profile = await getTikTokProfile(handle, apiKey);
      }

      if (profile) {
        analysisData = {
          followers: profile.followers,
          following: profile.following,
          posts_count: profile.posts_count,
          biography: profile.biography,
          is_verified: profile.is_verified,
          profile_pic: profile.profile_pic,
          display_name: profile.display_name,
        };
      }
    } catch (err) {
      return { error: `Erro ao buscar perfil: ${String(err)}` };
    }
  }

  // Get brand asset for fit calculation
  const { data: brandAsset } = await supabase
    .from("brand_assets")
    .select("*")
    .eq("tenant_id", tenantUser.tenant_id)
    .single();

  // Calculate fit score
  const { score, strengths, concerns } = profile
    ? calculateFitScore(profile, brandAsset)
    : { score: 50, strengths: ["Dados reais indisponiveis sem API key"], concerns: ["Configure ScrapeCreators em Configuracoes > Integracoes (Apify)"] };

  const classification = score >= 70 ? "recommended" : score >= 40 ? "neutral" : "not_recommended";

  const { data, error } = await supabase
    .from("analysis_history")
    .insert({
      tenant_id: tenantUser.tenant_id,
      handle,
      platform,
      analysis_data: analysisData,
      fit_score: score,
      fit_classification: classification,
      strengths,
      concerns,
    })
    .select("id, handle, platform, fit_score, fit_classification, strengths, concerns, saved_as_influencer_id, created_at, analysis_data")
    .single();

  if (error) return { error: error.message };

  revalidatePath("/analysis");
  return { data };
}

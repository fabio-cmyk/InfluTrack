"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import {
  getInstagramProfile, getTikTokProfile,
  getInstagramPosts, getTikTokVideos,
  getInstagramComments, getTikTokComments,
  type ScrapedProfile, type ScrapedPost, type ScrapedComment,
} from "@/lib/scrapecreators";

export type AnalysisResult = {
  profile: ScrapedProfile;
  posts: ScrapedPost[];
  comments: ScrapedComment[];
  metrics: {
    avg_likes: number;
    avg_comments: number;
    avg_views: number;
    engagement_rate: number;
    ratio: number;
  };
  fit_score: number;
  fit_classification: string;
  strengths: string[];
  concerns: string[];
  brandKeywords: string[];
};

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

function calculateMetrics(posts: ScrapedPost[], followers: number, platform: string) {
  if (posts.length === 0) return { avg_likes: 0, avg_comments: 0, avg_views: 0, avg_shares: 0, engagement_rate: 0 };

  const totalLikes = posts.reduce((s, p) => s + p.like_count, 0);
  const totalComments = posts.reduce((s, p) => s + p.comment_count, 0);
  const totalViews = posts.reduce((s, p) => s + p.play_count, 0);

  const avg_likes = Math.round(totalLikes / posts.length);
  const avg_comments = Math.round(totalComments / posts.length);
  const avg_views = Math.round(totalViews / posts.length);
  const avg_shares = 0; // TikTok shares not available in current ScrapedPost type

  // TikTok: engagement = (likes+comments) / views (industry standard)
  // Instagram: engagement = (likes+comments) / followers
  let engagement_rate: number;
  if (platform === "tiktok") {
    engagement_rate = avg_views > 0
      ? Number((((avg_likes + avg_comments) / avg_views) * 100).toFixed(2))
      : 0;
  } else {
    engagement_rate = followers > 0
      ? Number((((avg_likes + avg_comments) / followers) * 100).toFixed(2))
      : 0;
  }

  return { avg_likes, avg_comments, avg_views, avg_shares, engagement_rate };
}

function calculateFitScore(
  profile: ScrapedProfile,
  metrics: ReturnType<typeof calculateMetrics>,
  posts: ScrapedPost[],
  brandKeywords: string[],
  platform: string
): { score: number; strengths: string[]; concerns: string[] } {
  let score = 50;
  const strengths: string[] = [];
  const concerns: string[] = [];
  const isTikTok = platform === "tiktok";

  // Followers
  if (profile.followers >= 500000) { score += 8; strengths.push(`Grande audiencia: ${(profile.followers / 1000).toFixed(0)}K seguidores`); }
  else if (profile.followers >= 100000) { score += 6; strengths.push(`Audiencia solida: ${(profile.followers / 1000).toFixed(0)}K seguidores`); }
  else if (profile.followers >= 10000) { score += 3; strengths.push(`Micro-influencer: ${(profile.followers / 1000).toFixed(1)}K seguidores`); }
  else if (profile.followers < 1000) { score -= 10; concerns.push(`Audiencia pequena: ${profile.followers} seguidores`); }

  // Ratio seguidores/seguindo
  const ratio = profile.following > 0 ? profile.followers / profile.following : 0;
  if (ratio > 20) { score += 8; strengths.push(`Excelente ratio: ${ratio.toFixed(0)}:1`); }
  else if (ratio > 5) { score += 4; strengths.push(`Bom ratio: ${ratio.toFixed(1)}:1`); }
  else if (ratio < 1) { score -= 8; concerns.push("Segue mais do que e seguido"); }

  // Engagement — different thresholds per platform
  if (isTikTok) {
    // TikTok engagement = (likes+comments)/views — thresholds are higher
    if (metrics.engagement_rate > 5) { score += 10; strengths.push(`Engajamento alto: ${metrics.engagement_rate}% (sobre views)`); }
    else if (metrics.engagement_rate > 2) { score += 5; strengths.push(`Engajamento bom: ${metrics.engagement_rate}% (sobre views)`); }
    else if (metrics.engagement_rate < 1) { score -= 5; concerns.push(`Engajamento baixo: ${metrics.engagement_rate}% (sobre views)`); }
  } else {
    if (metrics.engagement_rate > 3) { score += 10; strengths.push(`Engajamento alto: ${metrics.engagement_rate}%`); }
    else if (metrics.engagement_rate > 1) { score += 5; strengths.push(`Engajamento bom: ${metrics.engagement_rate}%`); }
    else if (metrics.engagement_rate < 0.5 && profile.followers > 10000) { score -= 5; concerns.push(`Engajamento baixo: ${metrics.engagement_rate}%`); }
  }

  // Verified
  if (profile.is_verified) { score += 5; strengths.push("Perfil verificado"); }

  // Content volume — TikTok has different thresholds
  if (isTikTok) {
    if (profile.posts_count > 200) { score += 3; strengths.push(`Conteudo consistente: ${profile.posts_count} videos`); }
    else if (profile.posts_count < 20) { score -= 3; concerns.push(`Pouco conteudo: ${profile.posts_count} videos`); }
  } else {
    if (profile.posts_count > 500) { score += 3; strengths.push(`Conteudo consistente: ${profile.posts_count} posts`); }
    else if (profile.posts_count < 30) { score -= 3; concerns.push(`Pouco conteudo: ${profile.posts_count} posts`); }
  }

  // TikTok: avg views is the key metric
  if (isTikTok) {
    if (metrics.avg_views > 50000) { score += 8; strengths.push(`Views medias altas: ${(metrics.avg_views / 1000).toFixed(0)}K por video`); }
    else if (metrics.avg_views > 10000) { score += 5; strengths.push(`Boas views: ${(metrics.avg_views / 1000).toFixed(0)}K por video`); }
    else if (metrics.avg_views > 1000) { score += 2; }
    else if (metrics.avg_views < 500 && profile.followers > 10000) { score -= 3; concerns.push(`Views baixas para o tamanho: ${metrics.avg_views} views medias`); }
  }

  // Average likes
  if (metrics.avg_likes > 5000) { score += 5; strengths.push(`Media de ${(metrics.avg_likes / 1000).toFixed(1)}K likes por ${isTikTok ? "video" : "post"}`); }
  else if (metrics.avg_likes > 1000) { score += 2; }

  // Brand keyword match
  if (brandKeywords.length > 0 && posts.length > 0) {
    const allCaptions = posts.map(p => p.caption.toLowerCase()).join(" ");
    const matches = brandKeywords.filter(k => allCaptions.includes(k.toLowerCase()));
    if (matches.length > 0) {
      score += matches.length * 3;
      strengths.push(`Conteudo alinhado: "${matches.slice(0, 3).join('", "')}"`);
    }
  }

  // Bio check
  if (profile.biography.length > 50) { score += 2; }
  else if (profile.biography.length < 10) { concerns.push("Bio muito curta"); }

  score = Math.max(0, Math.min(100, score));
  return { score, strengths, concerns };
}

export async function analyzeProfile(rawHandle: string, platform: string): Promise<{ data?: AnalysisResult; error?: string }> {
  const handle = rawHandle.replace("@", "").replace(/https?:\/\/(www\.)?(instagram\.com|tiktok\.com)\/?@?/g, "").trim();
  if (!handle) return { error: "Handle obrigatorio" };

  const apiKey = process.env.SCRAPECREATORS_API_KEY;
  if (!apiKey) return { error: "SCRAPECREATORS_API_KEY nao configurada" };

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Nao autenticado" };

  const { data: tenantUser } = await supabase
    .from("tenant_users")
    .select("tenant_id")
    .eq("user_id", user.id)
    .single();
  if (!tenantUser) return { error: "Tenant nao encontrado" };

  try {
    // Fetch profile
    const profile = platform === "tiktok"
      ? await getTikTokProfile(handle, apiKey)
      : await getInstagramProfile(handle, apiKey);

    // Fetch posts/videos
    const posts = platform === "tiktok"
      ? await getTikTokVideos(handle, apiKey, 12)
      : await getInstagramPosts(handle, apiKey, 12);

    // Fetch comments from top 3 posts
    let comments: ScrapedComment[] = [];
    try {
      const topPosts = posts.slice(0, 3);
      const commentPromises = topPosts.map((p) =>
        platform === "tiktok"
          ? getTikTokComments(p.id, apiKey, 10)
          : getInstagramComments(p.code, apiKey, 10)
      );
      const commentResults = await Promise.all(commentPromises);
      comments = commentResults.flat();
    } catch {
      // Comments are optional — continue without them
    }

    // Calculate metrics (platform-specific engagement)
    const metrics = calculateMetrics(posts, profile.followers, platform);
    const ratio = profile.following > 0 ? Number((profile.followers / profile.following).toFixed(1)) : 0;

    // Get brand keywords for fit score
    const { data: brandAsset } = await supabase
      .from("brand_assets")
      .select("brand_keywords")
      .eq("tenant_id", tenantUser.tenant_id)
      .single();
    const brandKeywords = (brandAsset?.brand_keywords as string[]) || [];

    // Calculate fit score
    const { score, strengths, concerns } = calculateFitScore(profile, metrics, posts, brandKeywords, platform);
    const classification = score >= 70 ? "recommended" : score >= 40 ? "neutral" : "not_recommended";

    const result: AnalysisResult = {
      profile,
      posts,
      comments,
      metrics: { ...metrics, ratio },
      fit_score: score,
      fit_classification: classification,
      strengths,
      concerns,
      brandKeywords,
    };

    // Save to history
    await supabase.from("analysis_history").insert({
      tenant_id: tenantUser.tenant_id,
      handle,
      platform,
      analysis_data: {
        profile: { followers: profile.followers, following: profile.following, posts_count: profile.posts_count, biography: profile.biography, is_verified: profile.is_verified, profile_pic: profile.profile_pic, display_name: profile.display_name },
        metrics: result.metrics,
        posts_count_analyzed: posts.length,
        top_post: posts[0] ? { likes: posts[0].like_count, comments: posts[0].comment_count, views: posts[0].play_count, caption: posts[0].caption.slice(0, 200) } : null,
      },
      fit_score: score,
      fit_classification: classification,
      strengths,
      concerns,
    });

    revalidatePath("/analysis");
    return { data: result };
  } catch (err) {
    return { error: `Erro ao analisar perfil: ${String(err)}` };
  }
}

export async function saveAIReport(handle: string, platform: string, aiMarkdown: string): Promise<{ success: boolean }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { success: false };

  const { data: tenantUser } = await supabase
    .from("tenant_users")
    .select("tenant_id")
    .eq("user_id", user.id)
    .single();
  if (!tenantUser) return { success: false };

  // Update the most recent analysis for this handle with the AI report
  await supabase
    .from("analysis_history")
    .update({ ai_report: aiMarkdown })
    .eq("tenant_id", tenantUser.tenant_id)
    .eq("handle", handle)
    .eq("platform", platform)
    .order("created_at", { ascending: false })
    .limit(1);

  return { success: true };
}

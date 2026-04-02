"use server";

const API_BASE = "https://api.scrapecreators.com";

async function apiCall(path: string, apiKey: string): Promise<Record<string, unknown>> {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { "x-api-key": apiKey },
  });
  const data = await res.json();
  if (!data.success) {
    throw new Error(data.message || "ScrapeCreators API error");
  }
  return data;
}

export type ScrapedProfile = {
  handle: string;
  display_name: string;
  followers: number;
  following: number;
  posts_count: number;
  biography: string;
  profile_pic: string;
  is_verified: boolean;
  engagement_rate: number | null;
  platform: string;
};

export type ScrapedSearchResult = {
  handle: string;
  display_name: string;
  followers: number;
  profile_pic: string;
  is_verified: boolean;
  platform: string;
  post_count?: number;
};

// ============================================================
// PROFILE ENDPOINTS
// ============================================================

export async function getInstagramProfile(handle: string, apiKey: string): Promise<ScrapedProfile> {
  const cleanHandle = handle.replace("@", "").replace("https://instagram.com/", "").replace("https://www.instagram.com/", "").trim();
  const data = await apiCall(`/v1/instagram/profile?handle=${encodeURIComponent(cleanHandle)}`, apiKey);
  const user = (data.data as Record<string, unknown>)?.user as Record<string, unknown> || {};

  const followers = ((user.edge_followed_by as Record<string, number>)?.count) || 0;
  const following = ((user.edge_follow as Record<string, number>)?.count) || 0;
  const posts = ((user.edge_owner_to_timeline_media as Record<string, number>)?.count) || 0;

  return {
    handle: cleanHandle,
    display_name: (user.full_name as string) || cleanHandle,
    followers,
    following,
    posts_count: posts,
    biography: (user.biography as string) || "",
    profile_pic: (user.profile_pic_url as string) || "",
    is_verified: (user.is_verified as boolean) || false,
    engagement_rate: null,
    platform: "instagram",
  };
}

export async function getTikTokProfile(handle: string, apiKey: string): Promise<ScrapedProfile> {
  const cleanHandle = handle.replace("@", "").replace("https://tiktok.com/@", "").replace("https://www.tiktok.com/@", "").trim();
  const data = await apiCall(`/v1/tiktok/profile?username=${encodeURIComponent(cleanHandle)}`, apiKey);
  const userInfo = (data.data as Record<string, unknown>) || {};
  const user = (userInfo.user as Record<string, unknown>) || {};
  const stats = (userInfo.stats as Record<string, number>) || {};

  return {
    handle: cleanHandle,
    display_name: (user.nickname as string) || cleanHandle,
    followers: stats.followerCount || 0,
    following: stats.followingCount || 0,
    posts_count: stats.videoCount || 0,
    biography: (user.signature as string) || "",
    profile_pic: (user.avatarLarger as string) || (user.avatarMedium as string) || "",
    is_verified: (user.verified as boolean) || false,
    engagement_rate: null,
    platform: "tiktok",
  };
}

// ============================================================
// SEARCH/MINING ENDPOINTS — Find influencers by keyword
// ============================================================

/**
 * Instagram: Search reels by keyword → extract unique creators from reel owners
 * Endpoint: /v2/instagram/reels/search
 */
export async function searchInstagramByKeyword(query: string, apiKey: string): Promise<ScrapedSearchResult[]> {
  const data = await apiCall(`/v2/instagram/reels/search?query=${encodeURIComponent(query)}&count=30`, apiKey);
  const reels = (data.reels as Array<Record<string, unknown>>) || [];

  // Extract unique creators from reel owners
  const seen = new Set<string>();
  const results: ScrapedSearchResult[] = [];

  for (const reel of reels) {
    const owner = (reel.owner as Record<string, unknown>) || {};
    const username = (owner.username as string) || "";
    if (!username || seen.has(username)) continue;
    seen.add(username);

    results.push({
      handle: username,
      display_name: (owner.full_name as string) || username,
      followers: (owner.follower_count as number) || 0,
      profile_pic: (owner.profile_pic_url as string) || "",
      is_verified: (owner.is_verified as boolean) || false,
      post_count: (owner.post_count as number) || 0,
      platform: "instagram",
    });
  }

  return results;
}

/**
 * TikTok: Search videos by keyword → extract unique creators from video authors
 * Endpoint: /v1/tiktok/search/keyword
 */
export async function searchTikTokByKeyword(query: string, apiKey: string): Promise<ScrapedSearchResult[]> {
  const data = await apiCall(`/v1/tiktok/search/keyword?query=${encodeURIComponent(query)}&count=30`, apiKey);
  const items = (data.search_item_list as Array<Record<string, unknown>>) || [];

  // Extract unique creators from video authors
  const seen = new Set<string>();
  const results: ScrapedSearchResult[] = [];

  for (const item of items) {
    const aweme = (item.aweme_info as Record<string, unknown>) || {};
    const author = (aweme.author as Record<string, unknown>) || {};
    const uniqueId = (author.unique_id as string) || "";
    if (!uniqueId || seen.has(uniqueId)) continue;
    seen.add(uniqueId);

    const avatar = (author.avatar_medium as Record<string, unknown>) || {};
    const avatarUrls = (avatar.url_list as string[]) || [];

    results.push({
      handle: uniqueId,
      display_name: (author.nickname as string) || uniqueId,
      followers: (author.follower_count as number) || 0,
      profile_pic: avatarUrls[0] || "",
      is_verified: false,
      platform: "tiktok",
    });
  }

  return results;
}

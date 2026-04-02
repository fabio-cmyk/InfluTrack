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

export type MinedInfluencer = {
  handle: string;
  display_name: string;
  followers: number;
  following: number;
  posts_count: number;
  profile_pic: string;
  profile_url: string;
  is_verified: boolean;
  platform: string;
  // Engagement from content found
  total_views: number;
  total_likes: number;
  total_comments: number;
  total_shares: number;
  content_found: number; // how many reels/videos matched
  avg_engagement_rate: number; // (likes+comments) / views * 100
  sample_caption: string;
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
// MINING — Search content by keyword, extract creators
// ============================================================

export async function mineInstagramByKeyword(query: string, apiKey: string): Promise<MinedInfluencer[]> {
  const data = await apiCall(`/v2/instagram/reels/search?query=${encodeURIComponent(query)}&count=50`, apiKey);
  const reels = (data.reels as Array<Record<string, unknown>>) || [];

  // Aggregate by creator
  const creatorMap = new Map<string, MinedInfluencer>();

  for (const reel of reels) {
    const owner = (reel.owner as Record<string, unknown>) || {};
    const username = (owner.username as string) || "";
    if (!username) continue;

    const views = (reel.video_view_count as number) || (reel.video_play_count as number) || 0;
    const likes = (reel.like_count as number) || 0;
    const caption = typeof reel.caption === "object" && reel.caption
      ? ((reel.caption as Record<string, unknown>).text as string) || ""
      : (reel.caption as string) || "";

    const existing = creatorMap.get(username);
    if (existing) {
      existing.total_views += views;
      existing.total_likes += likes;
      existing.content_found += 1;
      if (!existing.sample_caption && caption) existing.sample_caption = caption;
    } else {
      creatorMap.set(username, {
        handle: username,
        display_name: (owner.full_name as string) || username,
        followers: (owner.follower_count as number) || 0,
        following: 0,
        posts_count: (owner.post_count as number) || 0,
        profile_pic: (owner.profile_pic_url as string) || "",
        profile_url: `https://instagram.com/${username}`,
        is_verified: (owner.is_verified as boolean) || false,
        platform: "instagram",
        total_views: views,
        total_likes: likes,
        total_comments: 0,
        total_shares: 0,
        content_found: 1,
        avg_engagement_rate: 0,
        sample_caption: caption,
      });
    }
  }

  // Calculate engagement rates
  const results = Array.from(creatorMap.values()).map((c) => {
    c.avg_engagement_rate = c.total_views > 0
      ? Number(((c.total_likes / c.total_views) * 100).toFixed(2))
      : 0;
    return c;
  });

  // Sort by followers descending
  results.sort((a, b) => b.followers - a.followers);
  return results;
}

export async function mineTikTokByKeyword(query: string, apiKey: string): Promise<MinedInfluencer[]> {
  const data = await apiCall(`/v1/tiktok/search/keyword?query=${encodeURIComponent(query)}&count=30`, apiKey);
  const items = (data.search_item_list as Array<Record<string, unknown>>) || [];

  // Aggregate by creator
  const creatorMap = new Map<string, MinedInfluencer>();

  for (const item of items) {
    const aweme = (item.aweme_info as Record<string, unknown>) || {};
    const author = (aweme.author as Record<string, unknown>) || {};
    const stats = (aweme.statistics as Record<string, number>) || {};
    const uniqueId = (author.unique_id as string) || "";
    if (!uniqueId) continue;

    const views = stats.play_count || 0;
    const likes = stats.digg_count || 0;
    const comments = stats.comment_count || 0;
    const shares = stats.share_count || 0;
    const caption = (aweme.desc as string) || "";

    const avatar = (author.avatar_medium as Record<string, unknown>) || {};
    const avatarUrls = (avatar.url_list as string[]) || [];

    const existing = creatorMap.get(uniqueId);
    if (existing) {
      existing.total_views += views;
      existing.total_likes += likes;
      existing.total_comments += comments;
      existing.total_shares += shares;
      existing.content_found += 1;
      if (!existing.sample_caption && caption) existing.sample_caption = caption;
    } else {
      creatorMap.set(uniqueId, {
        handle: uniqueId,
        display_name: (author.nickname as string) || uniqueId,
        followers: (author.follower_count as number) || 0,
        following: (author.following_count as number) || 0,
        posts_count: (author.aweme_count as number) || 0,
        profile_pic: avatarUrls[0] || "",
        profile_url: `https://tiktok.com/@${uniqueId}`,
        is_verified: false,
        platform: "tiktok",
        total_views: views,
        total_likes: likes,
        total_comments: comments,
        total_shares: shares,
        content_found: 1,
        avg_engagement_rate: 0,
        sample_caption: caption,
      });
    }
  }

  // Calculate engagement rates
  const results = Array.from(creatorMap.values()).map((c) => {
    c.avg_engagement_rate = c.total_views > 0
      ? Number((((c.total_likes + c.total_comments) / c.total_views) * 100).toFixed(2))
      : 0;
    return c;
  });

  results.sort((a, b) => b.followers - a.followers);
  return results;
}

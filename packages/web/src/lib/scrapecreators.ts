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

// Enriched Instagram profile with category, location, related profiles
export type EnrichedInstagramProfile = {
  handle: string;
  display_name: string;
  followers: number;
  following: number;
  posts_count: number;
  biography: string;
  profile_pic: string;
  is_verified: boolean;
  category_name: string | null;
  business_city: string | null;
  is_business: boolean;
  related_profiles: { handle: string; display_name: string; is_verified: boolean; profile_pic: string }[];
};

export async function getInstagramEnrichedProfile(handle: string, apiKey: string): Promise<EnrichedInstagramProfile> {
  const cleanHandle = handle.replace("@", "").replace("https://instagram.com/", "").replace("https://www.instagram.com/", "").trim();
  const data = await apiCall(`/v1/instagram/profile?handle=${encodeURIComponent(cleanHandle)}`, apiKey);
  const user = (data.data as Record<string, unknown>)?.user as Record<string, unknown> || {};

  const followers = ((user.edge_followed_by as Record<string, number>)?.count) || 0;
  const following = ((user.edge_follow as Record<string, number>)?.count) || 0;
  const posts = ((user.edge_owner_to_timeline_media as Record<string, number>)?.count) || 0;

  // Business address
  const bizAddr = user.business_address_json as Record<string, unknown> | null;
  const businessCity = bizAddr ? (bizAddr.city_name as string) || null : null;

  // Related profiles
  const relatedEdges = (user.edge_related_profiles as Record<string, unknown>) || {};
  const relatedNodes = (relatedEdges.edges as Array<Record<string, unknown>>) || [];
  const relatedProfiles = relatedNodes.map((edge) => {
    const node = (edge.node as Record<string, unknown>) || {};
    return {
      handle: (node.username as string) || "",
      display_name: (node.full_name as string) || "",
      is_verified: (node.is_verified as boolean) || false,
      profile_pic: (node.profile_pic_url as string) || "",
    };
  }).filter((p) => p.handle);

  return {
    handle: cleanHandle,
    display_name: (user.full_name as string) || cleanHandle,
    followers,
    following,
    posts_count: posts,
    biography: (user.biography as string) || "",
    profile_pic: (user.profile_pic_url as string) || "",
    is_verified: (user.is_verified as boolean) || false,
    category_name: (user.category_name as string) || (user.overall_category_name as string) || null,
    business_city: businessCity,
    is_business: (user.is_business_account as boolean) || (user.is_professional_account as boolean) || false,
    related_profiles: relatedProfiles,
  };
}

export async function getTikTokProfile(handle: string, apiKey: string): Promise<ScrapedProfile> {
  const cleanHandle = handle.replace("@", "").replace("https://tiktok.com/@", "").replace("https://www.tiktok.com/@", "").trim();
  const data = await apiCall(`/v1/tiktok/profile?handle=${encodeURIComponent(cleanHandle)}`, apiKey);

  // API may return data in different structures depending on version
  // Try: data.data.user/stats, data.user/stats, or flat data
  const rawData = (data.data as Record<string, unknown>) || data;
  const user = (rawData.user as Record<string, unknown>)
    || (rawData.userInfo as Record<string, unknown>)
    || rawData;
  const stats = (rawData.stats as Record<string, number>)
    || (rawData.userInfo as Record<string, unknown>)?.stats as Record<string, number>
    || {};

  console.log("[TikTok Profile] Response keys:", Object.keys(data), "| data keys:", Object.keys(rawData));

  const followers = stats.followerCount || stats.follower_count || (user.follower_count as number) || (rawData.follower_count as number) || 0;
  const following = stats.followingCount || stats.following_count || (user.following_count as number) || (rawData.following_count as number) || 0;
  const videoCount = stats.videoCount || stats.video_count || (user.aweme_count as number) || (rawData.aweme_count as number) || 0;

  return {
    handle: cleanHandle,
    display_name: (user.nickname as string) || (rawData.nickname as string) || cleanHandle,
    followers,
    following,
    posts_count: videoCount,
    biography: (user.signature as string) || (rawData.signature as string) || "",
    profile_pic: (user.avatarLarger as string) || (user.avatarMedium as string) || (rawData.avatar_url as string) || "",
    is_verified: (user.verified as boolean) || (rawData.verified as boolean) || false,
    engagement_rate: null,
    platform: "tiktok",
  };
}

// ============================================================
// POSTS / CONTENT ENDPOINTS — For profile analysis
// ============================================================

export type ScrapedPost = {
  id: string;
  code: string;
  type: string; // "reel", "carousel", "photo"
  caption: string;
  like_count: number;
  comment_count: number;
  play_count: number;
  thumbnail: string;
  url: string;
  taken_at: number;
};

export async function getInstagramPosts(handle: string, apiKey: string, count = 12): Promise<ScrapedPost[]> {
  const data = await apiCall(`/v2/instagram/user/posts?handle=${encodeURIComponent(handle)}&count=${count}`, apiKey);
  const items = (data.items as Array<Record<string, unknown>>) || [];

  return items.map((p) => {
    const caption = p.caption as Record<string, unknown> | null;
    const imgs = ((p.image_versions2 as Record<string, unknown>)?.candidates as Array<Record<string, string>>) || [];
    const productType = (p.product_type as string) || "";
    const mediaType = p.media_type as number;

    let type = "photo";
    if (productType === "clips" || mediaType === 2) type = "reel";
    else if (productType === "carousel_container" || mediaType === 8) type = "carousel";

    return {
      id: (p.id as string) || "",
      code: (p.code as string) || "",
      type,
      caption: caption?.text as string || "",
      like_count: (p.like_count as number) || 0,
      comment_count: (p.comment_count as number) || 0,
      play_count: (p.play_count as number) || 0,
      thumbnail: imgs[0]?.url || "",
      url: `https://instagram.com/p/${p.code}`,
      taken_at: (p.taken_at as number) || 0,
    };
  });
}

export async function getTikTokVideos(handle: string, apiKey: string, count = 12): Promise<ScrapedPost[]> {
  const data = await apiCall(`/v3/tiktok/profile/videos?handle=${encodeURIComponent(handle)}`, apiKey);
  const items = (data.aweme_list as Array<Record<string, unknown>>) || (data.videos as Array<Record<string, unknown>>) || (data.itemList as Array<Record<string, unknown>>) || [];

  return items.map((p) => {
    const stats = (p.stats as Record<string, number>) || (p.statistics as Record<string, number>) || {};
    const video = (p.video as Record<string, unknown>) || {};

    // TikTok cover can be: string, or object with url_list array
    const coverObj = video.cover as string | Record<string, unknown> | undefined;
    const dynamicCover = video.dynamicCover as string | Record<string, unknown> | undefined;
    const originCover = video.originCover as string | Record<string, unknown> | undefined;

    function extractUrl(val: string | Record<string, unknown> | undefined): string {
      if (!val) return "";
      if (typeof val === "string") return val;
      const urls = val.url_list as string[];
      return urls?.[0] || "";
    }

    const thumbnail = extractUrl(originCover) || extractUrl(dynamicCover) || extractUrl(coverObj) || (p.cover as string) || "";
    const videoId = (p.aweme_id as string) || (p.id as string) || "";

    return {
      id: videoId,
      code: videoId,
      type: "video",
      caption: (p.desc as string) || (p.title as string) || "",
      like_count: stats.diggCount || stats.digg_count || 0,
      comment_count: stats.commentCount || stats.comment_count || 0,
      play_count: stats.playCount || stats.play_count || 0,
      thumbnail,
      url: `https://www.tiktok.com/@${handle}/video/${videoId}`,
      taken_at: (p.createTime as number) || (p.create_time as number) || 0,
    };
  });
}

// ============================================================
// COMMENTS ENDPOINTS — For AI analysis
// ============================================================

export type ScrapedComment = {
  username: string;
  text: string;
  likes: number;
  timestamp: number;
};

export async function getInstagramComments(shortcode: string, apiKey: string, count = 20): Promise<ScrapedComment[]> {
  const data = await apiCall(`/v2/instagram/post/comments?shortcode=${encodeURIComponent(shortcode)}&count=${count}`, apiKey);
  const comments = (data.comments as Array<Record<string, unknown>>) || [];

  return comments.slice(0, count).map((c) => {
    const user = (c.user as Record<string, unknown>) || {};
    return {
      username: (user.username as string) || "",
      text: ((c.text as string) || "").slice(0, 200),
      likes: (c.comment_like_count as number) || 0,
      timestamp: (c.created_at as number) || 0,
    };
  });
}

export async function getTikTokComments(videoUrl: string, apiKey: string, count = 20): Promise<ScrapedComment[]> {
  // Try with full URL first, then extract video_id as fallback
  let data: Record<string, unknown>;
  try {
    data = await apiCall(`/v1/tiktok/video/comments?url=${encodeURIComponent(videoUrl)}`, apiKey);
  } catch {
    // Fallback: extract video ID from URL and try with video_id param
    const videoId = videoUrl.split("/video/")[1]?.split("?")[0] || "";
    if (!videoId) return [];
    data = await apiCall(`/v1/tiktok/video/comments?video_id=${encodeURIComponent(videoId)}`, apiKey);
  }

  const comments = (data.comments as Array<Record<string, unknown>>) || [];

  return comments.slice(0, count).map((c) => {
    const user = (c.user as Record<string, unknown>) || {};
    return {
      username: (user.unique_id as string) || (user.nickname as string) || "",
      text: ((c.text as string) || "").slice(0, 200),
      likes: (c.digg_count as number) || 0,
      timestamp: (c.create_time as number) || 0,
    };
  });
}

// ============================================================
// TIKTOK DISCOVERY — Popular creators, hashtags, videos (with country filter)
// ============================================================

export type PopularCreator = {
  handle: string;
  display_name: string;
  followers: number;
  following: number;
  posts_count: number;
  profile_pic: string;
  profile_url: string;
  is_verified: boolean;
  avg_views: number;
  engagement_rate: number;
};

export async function getTikTokPopularCreators(
  apiKey: string,
  opts: { creatorCountry?: string; audienceCountry?: string; sortBy?: string; followerCount?: string; page?: number } = {}
): Promise<PopularCreator[]> {
  const params = new URLSearchParams();
  if (opts.creatorCountry) params.set("creatorCountry", opts.creatorCountry);
  if (opts.audienceCountry) params.set("audienceCountry", opts.audienceCountry);
  if (opts.sortBy) params.set("sortBy", opts.sortBy);
  if (opts.followerCount) params.set("followerCount", opts.followerCount);
  if (opts.page) params.set("page", String(opts.page));

  const data = await apiCall(`/v1/tiktok/creators/popular?${params.toString()}`, apiKey);
  const creators = (data.creators as Array<Record<string, unknown>>) || (data.data as Array<Record<string, unknown>>) || [];

  return creators.map((c) => {
    const stats = (c.stats as Record<string, number>) || {};
    const avatar = (c.avatar_medium as Record<string, unknown>) || {};
    const avatarUrls = (avatar.url_list as string[]) || [];
    const uniqueId = (c.unique_id as string) || (c.uniqueId as string) || "";

    return {
      handle: uniqueId,
      display_name: (c.nickname as string) || uniqueId,
      followers: (c.follower_count as number) || stats.followerCount || 0,
      following: (c.following_count as number) || stats.followingCount || 0,
      posts_count: (c.aweme_count as number) || stats.videoCount || 0,
      profile_pic: avatarUrls[0] || (c.avatar_url as string) || "",
      profile_url: `https://tiktok.com/@${uniqueId}`,
      is_verified: (c.verified as boolean) || false,
      avg_views: (c.avg_views as number) || 0,
      engagement_rate: (c.engagement_rate as number) || 0,
    };
  });
}

export type PopularHashtag = {
  hashtag_id: string;
  hashtag_name: string;
  video_count: number;
  view_count: number;
  is_trending: boolean;
};

export async function getTikTokPopularHashtags(
  apiKey: string,
  opts: { countryCode?: string; industry?: string; period?: number; page?: number } = {}
): Promise<PopularHashtag[]> {
  const params = new URLSearchParams();
  if (opts.countryCode) params.set("countryCode", opts.countryCode);
  if (opts.industry) params.set("industry", opts.industry);
  if (opts.period) params.set("period", String(opts.period));
  if (opts.page) params.set("page", String(opts.page));

  const data = await apiCall(`/v1/tiktok/hashtags/popular?${params.toString()}`, apiKey);
  const hashtags = (data.hashtags as Array<Record<string, unknown>>) || (data.data as Array<Record<string, unknown>>) || [];

  return hashtags.map((h) => ({
    hashtag_id: (h.hashtag_id as string) || (h.id as string) || "",
    hashtag_name: (h.hashtag_name as string) || (h.name as string) || "",
    video_count: (h.video_count as number) || (h.publish_cnt as number) || 0,
    view_count: (h.view_count as number) || (h.video_views as number) || 0,
    is_trending: (h.is_new_on_board as boolean) || (h.trend as number) === 1 || false,
  }));
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

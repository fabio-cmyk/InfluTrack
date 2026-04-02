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
};

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

export async function searchTikTokUsers(query: string, apiKey: string, count = 10): Promise<ScrapedSearchResult[]> {
  const data = await apiCall(`/v1/tiktok/search/users?query=${encodeURIComponent(query)}&count=${count}`, apiKey);
  // user_list is at root level, not inside data
  const userList = (data.user_list as Array<Record<string, unknown>>) || [];

  return userList.map((item) => {
    // Fields are directly in user_info, not in user_info.user
    const info = (item.user_info as Record<string, unknown>) || {};
    const avatar = (info.avatar_medium as Record<string, unknown>) || {};
    const avatarUrls = (avatar.url_list as string[]) || [];
    return {
      handle: (info.unique_id as string) || "",
      display_name: (info.nickname as string) || "",
      followers: (info.follower_count as number) || 0,
      profile_pic: avatarUrls[0] || "",
      is_verified: (info.verification_type as number) === 1,
      platform: "tiktok",
    };
  });
}

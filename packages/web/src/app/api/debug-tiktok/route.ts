import { NextRequest, NextResponse } from "next/server";

const API_BASE = "https://api.scrapecreators.com";

async function rawCall(path: string, apiKey: string) {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { "x-api-key": apiKey },
  });
  return res.json();
}

export async function GET(req: NextRequest) {
  const handle = req.nextUrl.searchParams.get("handle") || "flaa_13";
  const apiKey = process.env.SCRAPECREATORS_API_KEY;
  if (!apiKey) return NextResponse.json({ error: "No API key" });

  // Test ALL variations of video endpoints
  const [v3Handle, v3Username, v1Handle, v1Username, comments] = await Promise.all([
    rawCall(`/v3/tiktok/profile/videos?handle=${handle}&count=2`, apiKey).catch((e) => ({ error: String(e) })),
    rawCall(`/v3/tiktok/profile/videos?username=${handle}&count=2`, apiKey).catch((e) => ({ error: String(e) })),
    rawCall(`/v1/tiktok/user/posts?handle=${handle}&count=2`, apiKey).catch((e) => ({ error: String(e) })),
    rawCall(`/v1/tiktok/user/posts?username=${handle}&count=2`, apiKey).catch((e) => ({ error: String(e) })),
    rawCall(`/v1/tiktok/video/comments?video_id=test&count=1`, apiKey).catch((e) => ({ error: String(e) })),
  ]);

  const summarize = (data: Record<string, unknown>) => ({
    success: data.success,
    message: data.message || null,
    topKeys: Object.keys(data),
    videoCount: Array.isArray(data.videos) ? data.videos.length : Array.isArray(data.data) ? data.data.length : Array.isArray(data.itemList) ? data.itemList.length : 0,
    sample: JSON.stringify(data).slice(0, 800),
  });

  return NextResponse.json({
    handle,
    "v3_videos_handle": summarize(v3Handle),
    "v3_videos_username": summarize(v3Username),
    "v1_posts_handle": summarize(v1Handle),
    "v1_posts_username": summarize(v1Username),
    "comments_test": summarize(comments),
  });
}

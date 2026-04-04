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

  // Test all 3 endpoints
  const [profile, videos, videosAlt] = await Promise.all([
    rawCall(`/v1/tiktok/profile?handle=${encodeURIComponent(handle)}`, apiKey).catch((e) => ({ error: String(e) })),
    rawCall(`/v3/tiktok/profile/videos?handle=${encodeURIComponent(handle)}&count=3`, apiKey).catch((e) => ({ error: String(e) })),
    rawCall(`/v3/tiktok/profile/videos?username=${encodeURIComponent(handle)}&count=3`, apiKey).catch((e) => ({ error: String(e) })),
  ]);

  return NextResponse.json({
    handle,
    profile: {
      success: profile.success,
      topKeys: Object.keys(profile),
      dataKeys: profile.data ? Object.keys(profile.data) : null,
      sample: JSON.stringify(profile).slice(0, 1000),
    },
    videos_with_handle: {
      success: videos.success,
      message: videos.message,
      topKeys: Object.keys(videos),
      hasVideos: !!videos.videos,
      hasData: !!videos.data,
      hasItemList: !!videos.itemList,
      sample: JSON.stringify(videos).slice(0, 1000),
    },
    videos_with_username: {
      success: videosAlt.success,
      message: videosAlt.message,
      topKeys: Object.keys(videosAlt),
      hasVideos: !!videosAlt.videos,
      hasData: !!videosAlt.data,
      hasItemList: !!videosAlt.itemList,
      sample: JSON.stringify(videosAlt).slice(0, 1000),
    },
  });
}

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

  const videos = await rawCall(`/v3/tiktok/profile/videos?handle=${handle}`, apiKey).catch((e) => ({ error: String(e) }));

  const awemeList = videos.aweme_list || [];
  const first = awemeList[0] || null;

  if (!first) {
    return NextResponse.json({
      handle,
      videoCount: 0,
      topKeys: Object.keys(videos),
      raw: JSON.stringify(videos).slice(0, 1500),
    });
  }

  const videoObj = first.video || {};

  return NextResponse.json({
    handle,
    videoCount: awemeList.length,
    firstItem: {
      keys: Object.keys(first),
      videoKeys: Object.keys(videoObj),
      coverType: typeof videoObj.cover,
      coverValue: JSON.stringify(videoObj.cover)?.slice(0, 300),
      dynamicCoverType: typeof videoObj.dynamicCover,
      dynamicCoverValue: JSON.stringify(videoObj.dynamicCover)?.slice(0, 300),
      originCoverType: typeof videoObj.originCover,
      originCoverValue: JSON.stringify(videoObj.originCover)?.slice(0, 300),
      // snake_case variants
      dynamic_cover: JSON.stringify(videoObj.dynamic_cover)?.slice(0, 300),
      origin_cover: JSON.stringify(videoObj.origin_cover)?.slice(0, 300),
      // item level
      itemCover: JSON.stringify(first.cover)?.slice(0, 300),
      itemCoverType: typeof first.cover,
      // full video obj sample
      videoSample: JSON.stringify(videoObj).slice(0, 800),
    },
  });
}

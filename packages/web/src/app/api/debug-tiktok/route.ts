import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const handle = req.nextUrl.searchParams.get("handle") || "flaa_13";
  const apiKey = process.env.SCRAPECREATORS_API_KEY;
  if (!apiKey) return NextResponse.json({ error: "No API key" });

  const res = await fetch(`https://api.scrapecreators.com/v1/tiktok/profile?handle=${encodeURIComponent(handle)}`, {
    headers: { "x-api-key": apiKey },
  });
  const data = await res.json();

  // Return the raw response structure
  return NextResponse.json({
    status: res.status,
    topLevelKeys: Object.keys(data),
    dataKeys: data.data ? Object.keys(data.data) : null,
    dataUserKeys: data.data?.user ? Object.keys(data.data.user) : null,
    dataStatsKeys: data.data?.stats ? Object.keys(data.data.stats) : null,
    sample: JSON.stringify(data).slice(0, 2000),
  });
}

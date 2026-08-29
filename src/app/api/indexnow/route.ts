import { submitIndexNowUrls } from "@/lib/indexnow";
import { NextResponse } from "next/server";

/**
 * POST /api/indexnow — submit canonical URLs to IndexNow (operator / cron).
 * Body: { urls: string[] } or { url: string }
 * Requires INDEXNOW_KEY + optional INDEXNOW_HOST in env.
 */
export async function POST(req: Request) {
  const apiKey = req.headers.get("X-API-Key")?.trim();
  const expected =
    process.env.DG_API_KEY?.trim() ||
    process.env.INDEXNOW_API_KEY?.trim();
  if (!expected || apiKey !== expected) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: { urls?: string[]; url?: string } = {};
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const urls = body.urls?.length
    ? body.urls
    : body.url
      ? [body.url]
      : [];

  const result = await submitIndexNowUrls(urls);
  return NextResponse.json(result, { status: result.ok ? 200 : 502 });
}

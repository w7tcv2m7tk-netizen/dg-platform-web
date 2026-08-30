import { timingSafeEqual } from "node:crypto";

import { submitIndexNowUrls } from "@/lib/indexnow";
import { NextResponse } from "next/server";

function safeEqual(a: string, b: string): boolean {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) return false;
  return timingSafeEqual(bufA, bufB);
}

/**
 * POST /api/indexnow — submit canonical URLs to IndexNow (operator / cron).
 * Body: { urls: string[] } or { url: string }
 * Requires INDEXNOW_KEY + optional INDEXNOW_HOST in env.
 */
export async function POST(req: Request) {
  // Prefer the dedicated key. DG_API_KEY remains accepted as a legacy
  // fallback because it is still the configured value in some environments,
  // but it spans unrelated trust domains and should be retired here.
  const apiKey = req.headers.get("X-API-Key")?.trim() ?? "";
  const expected =
    process.env.INDEXNOW_API_KEY?.trim() || process.env.DG_API_KEY?.trim();
  if (!expected || !apiKey || !safeEqual(apiKey, expected)) {
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

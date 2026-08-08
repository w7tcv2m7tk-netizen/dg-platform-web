import { extractReviewThemes, type ReviewFeedItem } from "@dg/platform-core";
import { NextResponse } from "next/server";

import { isNextResponse, requirePlatformAuth } from "@/lib/platform-api";

export async function POST(req: Request) {
  const session = await requirePlatformAuth(req);
  if (isNextResponse(session)) return session;

  const body = await req.json().catch(() => ({}));
  const raw = Array.isArray(body.reviews) ? body.reviews : [];
  const reviews: ReviewFeedItem[] = raw.map((r: Record<string, unknown>, i: number) => ({
    id: String(r.id ?? `tmp-${i}`),
    source: String(r.source ?? "unknown"),
    authorName: typeof r.authorName === "string" ? r.authorName : null,
    rating: typeof r.rating === "number" ? r.rating : null,
    title: typeof r.title === "string" ? r.title : null,
    content: typeof r.content === "string" ? r.content : null,
    reviewDate: typeof r.reviewDate === "string" ? r.reviewDate : null,
  }));

  const themes = await extractReviewThemes(reviews);
  return NextResponse.json({ data: themes });
}

import {
  createActivity,
  draftReviewReply,
  type ReviewFeedItem,
} from "@dg/platform-core";
import { NextResponse } from "next/server";

import { isNextResponse, requirePlatformAuth } from "@/lib/platform-api";

export async function POST(req: Request) {
  const session = await requirePlatformAuth(req);
  if (isNextResponse(session)) return session;

  const body = await req.json().catch(() => ({}));
  const raw = body.review as Record<string, unknown> | undefined;
  if (!raw || typeof raw !== "object") {
    return NextResponse.json(
      { error: { message: "review object required" } },
      { status: 400 },
    );
  }

  const review: ReviewFeedItem = {
    id: String(raw.id ?? "unknown"),
    source: String(raw.source ?? "unknown"),
    authorName: typeof raw.authorName === "string" ? raw.authorName : null,
    rating: typeof raw.rating === "number" ? raw.rating : null,
    title: typeof raw.title === "string" ? raw.title : null,
    content: typeof raw.content === "string" ? raw.content : null,
    reviewDate: typeof raw.reviewDate === "string" ? raw.reviewDate : null,
    sourceUrl: typeof raw.sourceUrl === "string" ? raw.sourceUrl : null,
    listingId: typeof raw.listingId === "string" ? raw.listingId : null,
    responded: Boolean(raw.responded),
  };

  const businessName =
    typeof body.businessName === "string" ? body.businessName : session.organisationName;

  const result = await draftReviewReply({ review, businessName });

  const persist = body.persist !== false;
  let activityId: string | undefined;
  if (persist) {
    const activity = await createActivity({
      organisationId: session.organisationId,
      actorId: session.clerkUserId,
      entityType: "Review",
      entityId: review.id,
      activityType: "reviews.reply_draft",
      title: `Reply draft · ${review.authorName ?? review.id}`,
      body: result.draft,
      sourceApp: "reviews",
      metadata: {
        reviewId: review.id,
        source: review.source,
        draftSource: result.source,
      },
    });
    activityId = activity.id;
  }

  return NextResponse.json({
    data: { ...result, activityId },
  });
}

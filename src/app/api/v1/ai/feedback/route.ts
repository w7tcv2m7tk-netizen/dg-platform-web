import { NextResponse } from "next/server";
import { recordAiFeedback, type AiFeedbackRating } from "@dg/platform-core";

import { isNextResponse, requirePlatformAuth } from "@/lib/platform-api";

/** POST /api/v1/ai/feedback — organisation-scoped human quality signal. */
export async function POST(req: Request) {
  const session = await requirePlatformAuth(req);
  if (isNextResponse(session)) return session;

  let body: {
    correlationId?: string;
    recommendationId?: string;
    rating?: AiFeedbackRating;
    note?: string;
  };
  try {
    body = (await req.json()) as typeof body;
  } catch {
    return NextResponse.json(
      { error: { code: "invalid_json", message: "Invalid JSON body" } },
      { status: 400 },
    );
  }

  const correlationId = body.correlationId?.trim();
  if (!correlationId) {
    return NextResponse.json(
      { error: { code: "validation_error", message: "correlationId is required" } },
      { status: 422 },
    );
  }
  if (body.rating !== "useful" && body.rating !== "not_useful") {
    return NextResponse.json(
      { error: { code: "validation_error", message: "rating must be useful or not_useful" } },
      { status: 422 },
    );
  }

  await recordAiFeedback({
    organisationId: session.organisationId,
    actorId: session.clerkUserId,
    correlationId,
    recommendationId: body.recommendationId?.trim() || undefined,
    rating: body.rating,
    note: body.note?.trim() || undefined,
  });

  return NextResponse.json({ data: { ok: true } });
}

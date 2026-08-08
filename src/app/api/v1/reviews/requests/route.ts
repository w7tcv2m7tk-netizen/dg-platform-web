import { queueReviewRequest } from "@dg/platform-core";
import { NextResponse } from "next/server";

import { isNextResponse, requirePlatformAuth } from "@/lib/platform-api";

export async function POST(req: Request) {
  const session = await requirePlatformAuth(req);
  if (isNextResponse(session)) return session;

  const body = await req.json().catch(() => ({}));
  const candidateId = typeof body.candidateId === "string" ? body.candidateId.trim() : "";
  if (!candidateId) {
    return NextResponse.json(
      { error: { code: "validation", message: "candidateId required" } },
      { status: 422 },
    );
  }

  const result = await queueReviewRequest({
    organisationId: session.organisationId,
    actorId: session.clerkUserId,
    candidateId,
    contactId: typeof body.contactId === "string" ? body.contactId : null,
    channel: body.channel === "sms" || body.channel === "manual" ? body.channel : "email",
    note: typeof body.note === "string" ? body.note : undefined,
  });

  return NextResponse.json({ data: result });
}

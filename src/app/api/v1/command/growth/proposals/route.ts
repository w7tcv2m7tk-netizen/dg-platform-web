import {
  createGrowthProposalQuote,
  listGrowthProposalDrafts,
} from "@dg/platform-core";
import { NextResponse } from "next/server";

import { isNextResponse, requireFeature, requirePlatformAuth } from "@/lib/platform-api";

export async function GET(req: Request) {
  const session = await requirePlatformAuth(req);
  if (isNextResponse(session)) return session;

  const denied = requireFeature(session, "command.growth.read");
  if (denied) return denied;

  const drafts = await listGrowthProposalDrafts();
  return NextResponse.json({ data: drafts });
}

export async function POST(req: Request) {
  const session = await requirePlatformAuth(req);
  if (isNextResponse(session)) return session;

  const denied = requireFeature(session, "command.growth.manage");
  if (denied) return denied;

  const body = await req.json().catch(() => null);
  const prospectId = typeof body?.prospectId === "string" ? body.prospectId.trim() : "";
  if (!prospectId) {
    return NextResponse.json(
      { error: { code: "validation_error", message: "prospectId is required" } },
      { status: 422 },
    );
  }

  const result = await createGrowthProposalQuote({
    prospectId,
    organisationId: session.organisationId,
    actorId: session.clerkUserId,
  });

  if (!result) {
    return NextResponse.json(
      { error: { code: "not_found", message: "Prospect not found" } },
      { status: 404 },
    );
  }

  if ("error" in result && result.error === "audit_required") {
    return NextResponse.json(
      {
        error: {
          code: "audit_required",
          message: "Run a presence audit before creating a priced proposal quote",
        },
      },
      { status: 422 },
    );
  }

  return NextResponse.json({ data: result }, { status: 201 });
}

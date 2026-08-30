import {
  createGrowthProposalQuote,
  listGrowthProposalDrafts,
  organisationGrowthScope,
} from "@dg/platform-core";
import { NextResponse } from "next/server";

import { isNextResponse } from "@/lib/platform-api";
import { requireProspectingEngine } from "@/lib/prospecting-api";

export async function GET(req: Request) {
  const session = await requireProspectingEngine(req, "command.growth.read");
  if (isNextResponse(session)) return session;

  const drafts = await listGrowthProposalDrafts(
    organisationGrowthScope(session.organisationId),
  );
  return NextResponse.json({ data: drafts });
}

export async function POST(req: Request) {
  const session = await requireProspectingEngine(req, "command.growth.manage");
  if (isNextResponse(session)) return session;

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
    scope: organisationGrowthScope(session.organisationId),
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

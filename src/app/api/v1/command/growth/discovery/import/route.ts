import { importDiscoveryCandidates, type DiscoveryCandidate } from "@dg/platform-core";
import { NextResponse } from "next/server";

import { isNextResponse, requireFeature, requirePlatformAuth } from "@/lib/platform-api";

function isCandidate(value: unknown): value is DiscoveryCandidate {
  if (!value || typeof value !== "object") return false;
  const c = value as Record<string, unknown>;
  return (
    typeof c.key === "string" &&
    typeof c.businessName === "string" &&
    typeof c.provider === "string" &&
    typeof c.externalId === "string" &&
    typeof c.providerRefs === "object" &&
    c.providerRefs !== null
  );
}

/** Selective import of discovery candidates → GrowthProspect (not CRM Company). */
export async function POST(req: Request) {
  const session = await requirePlatformAuth(req);
  if (isNextResponse(session)) return session;

  const denied = requireFeature(session, "command.growth.manage");
  if (denied) return denied;

  const body = await req.json().catch(() => null);
  if (!body || typeof body !== "object") {
    return NextResponse.json(
      { error: { code: "validation_error", message: "JSON body required" } },
      { status: 422 },
    );
  }

  const raw = body.candidates;
  if (!Array.isArray(raw) || raw.length === 0) {
    return NextResponse.json(
      { error: { code: "validation_error", message: "candidates array required" } },
      { status: 422 },
    );
  }
  if (raw.length > 50) {
    return NextResponse.json(
      { error: { code: "validation_error", message: "Import at most 50 candidates at once" } },
      { status: 422 },
    );
  }

  const candidates = raw.filter(isCandidate);
  if (candidates.length === 0) {
    return NextResponse.json(
      { error: { code: "validation_error", message: "No valid candidates" } },
      { status: 422 },
    );
  }

  const result = await importDiscoveryCandidates({
    candidates,
    industry: typeof body.industry === "string" ? body.industry : undefined,
    location: typeof body.location === "string" ? body.location : undefined,
    businessType: typeof body.businessType === "string" ? body.businessType : undefined,
    runAudit: body.runAudit === true,
    ownerClerkUserId: session.clerkUserId,
    actorId: session.clerkUserId,
    operatorOrganisationId: session.organisationId,
  });

  return NextResponse.json({ data: result }, { status: 201 });
}

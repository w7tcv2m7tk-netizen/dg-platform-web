import { provisionInfraDomainsBetaOrganisation } from "@dg/platform-core";
import { NextResponse } from "next/server";

import { requireCommandCentre } from "@/lib/command-api";
import { isNextResponse } from "@/lib/platform-api";

/**
 * Staff: enrol Domains beta + install Infrastructure.
 * Does not enable infra.domain_register (paid).
 * POST { organisationId }
 */
export async function POST(req: Request) {
  const session = await requireCommandCentre(req, "command.flags.manage");
  if (isNextResponse(session)) return session;

  const body = await req.json().catch(() => ({}));
  const organisationId =
    typeof body.organisationId === "string" ? body.organisationId.trim() : "";

  if (!organisationId) {
    return NextResponse.json(
      { error: { code: "validation_error", message: "organisationId required" } },
      { status: 422 },
    );
  }

  try {
    const result = await provisionInfraDomainsBetaOrganisation({
      organisationId,
      actorId: session.clerkUserId,
    });
    return NextResponse.json({ data: result });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Provision failed";
    return NextResponse.json(
      { error: { code: "provision_failed", message } },
      { status: 422 },
    );
  }
}

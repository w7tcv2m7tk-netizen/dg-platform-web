import { provisionReBetaOrganisation } from "@dg/platform-core";
import { NextResponse } from "next/server";

import { requireCommandCentre } from "@/lib/command-api";
import { isNextResponse } from "@/lib/platform-api";

/**
 * Staff provisioning: enable re.beta + install Real Estate app for a tenant.
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
    const result = await provisionReBetaOrganisation({
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

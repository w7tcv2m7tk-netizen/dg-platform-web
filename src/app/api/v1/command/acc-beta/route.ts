import { provisionAccBetaOrganisation } from "@dg/platform-core";
import { NextResponse } from "next/server";

import { requirePlatformOperator } from "@/lib/command-api";
import { isNextResponse } from "@/lib/platform-api";

/**
 * Platform-operator provisioning: enable acc.beta + install Accommodation app for a tenant.
 * POST { organisationId }
 */
export async function POST(req: Request) {
  const auth = await requirePlatformOperator(req, "command.flags.manage");
  if (isNextResponse(auth)) return auth;

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
    const result = await provisionAccBetaOrganisation({
      organisationId,
      actorId: auth.operator.actorId,
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

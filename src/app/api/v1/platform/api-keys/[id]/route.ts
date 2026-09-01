import { revokePlatformApiKey } from "@dg/platform-core";
import { NextResponse } from "next/server";

import {
  isNextResponse,
  requireClerkSession,
  requireOrgAdmin,
} from "@/lib/platform-api";
import {
  tenantWriteEntitlementBlock,
  writeEntitlementResponse,
} from "@/lib/write-entitlement";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function DELETE(_req: Request, { params }: RouteParams) {
  const session = await requireClerkSession();
  if (isNextResponse(session)) return session;

  const denied = requireOrgAdmin(session);
  if (denied) return denied;

  const block = await tenantWriteEntitlementBlock(session);
  if (block) return writeEntitlementResponse(block);

  const { id } = await params;
  const revoked = await revokePlatformApiKey({
    organisationId: session.organisationId,
    keyId: id,
    actorId: session.clerkUserId,
  });

  if (!revoked) {
    return NextResponse.json(
      { error: { code: "not_found", message: "API key not found" } },
      { status: 404 },
    );
  }

  return NextResponse.json({ data: revoked });
}

import { revokePlatformApiKey } from "@dg/platform-core";
import { NextResponse } from "next/server";

import {
  isNextResponse,
  requireClerkSession,
  requireOrgAdmin,
} from "@/lib/platform-api";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function DELETE(req: Request, { params }: RouteParams) {
  const session = await requireClerkSession(req);
  if (isNextResponse(session)) return session;

  const denied = requireOrgAdmin(session);
  if (denied) return denied;

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

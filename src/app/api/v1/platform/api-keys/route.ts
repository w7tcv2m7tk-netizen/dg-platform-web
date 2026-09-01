import {
  createPlatformApiKey,
  listPlatformApiKeys,
} from "@dg/platform-core";
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

export async function GET() {
  const session = await requireClerkSession();
  if (isNextResponse(session)) return session;

  const denied = requireOrgAdmin(session);
  if (denied) return denied;

  const keys = await listPlatformApiKeys(session.organisationId);
  return NextResponse.json({ data: keys });
}

export async function POST(req: Request) {
  const session = await requireClerkSession();
  if (isNextResponse(session)) return session;

  const denied = requireOrgAdmin(session);
  if (denied) return denied;

  const block = await tenantWriteEntitlementBlock(session);
  if (block) return writeEntitlementResponse(block);

  const body = await req.json().catch(() => null);
  const name = typeof body?.name === "string" ? body.name.trim() : "";
  if (!name) {
    return NextResponse.json(
      { error: { code: "validation_error", message: "name is required" } },
      { status: 422 },
    );
  }

  const result = await createPlatformApiKey({
    organisationId: session.organisationId,
    name,
    actorId: session.clerkUserId,
  });

  return NextResponse.json(
    {
      data: {
        key: result.key,
        secret: result.secret,
      },
      meta: {
        message: "Copy the secret now — it will not be shown again.",
      },
    },
    { status: 201 },
  );
}

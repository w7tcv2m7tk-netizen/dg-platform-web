import { listAuditLogs } from "@dg/platform-core";
import { NextResponse } from "next/server";

import { isNextResponse, requireOrgAdmin, requirePlatformAuth } from "@/lib/platform-api";

export async function GET(req: Request) {
  const session = await requirePlatformAuth(req);
  if (isNextResponse(session)) return session;

  const denied = requireOrgAdmin(session);
  if (denied) return denied;

  const { searchParams } = new URL(req.url);
  const result = await listAuditLogs({
    organisationId: session.organisationId,
    entityType: searchParams.get("entityType") ?? undefined,
    limit: searchParams.get("limit")
      ? Number.parseInt(searchParams.get("limit")!, 10)
      : undefined,
    offset: searchParams.get("offset")
      ? Number.parseInt(searchParams.get("offset")!, 10)
      : undefined,
  });

  return NextResponse.json({ data: result.items, meta: result.meta });
}

import { listCommunicationSessions } from "@dg/platform-core";
import { NextResponse } from "next/server";

import { isNextResponse, requireFeature, requirePlatformAuth } from "@/lib/platform-api";

export async function GET(req: Request) {
  const session = await requirePlatformAuth(req);
  if (isNextResponse(session)) return session;
  const denied = requireFeature(session, "comms.call_centre.read");
  if (denied) return denied;

  const { searchParams } = new URL(req.url);
  const from = searchParams.get("from");
  const to = searchParams.get("to");

  const result = await listCommunicationSessions({
    organisationId: session.organisationId,
    agentId: searchParams.get("agentId") ?? undefined,
    status: searchParams.get("status") ?? undefined,
    direction: searchParams.get("direction") ?? undefined,
    outcome: searchParams.get("outcome") ?? undefined,
    contactId: searchParams.get("contactId") ?? undefined,
    opportunityId: searchParams.get("opportunityId") ?? undefined,
    from: from ? new Date(from) : undefined,
    to: to ? new Date(to) : undefined,
    limit: searchParams.get("limit")
      ? Number.parseInt(searchParams.get("limit")!, 10)
      : undefined,
    offset: searchParams.get("offset")
      ? Number.parseInt(searchParams.get("offset")!, 10)
      : undefined,
  });

  return NextResponse.json({ data: result.items, meta: result.meta });
}

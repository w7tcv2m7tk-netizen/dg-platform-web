import { listOrgSeoAudits, runOrgSeoAudit } from "@dg/platform-core";
import { NextResponse } from "next/server";

import { isNextResponse, requirePlatformAuth } from "@/lib/platform-api";

export async function GET(req: Request) {
  const session = await requirePlatformAuth(req);
  if (isNextResponse(session)) return session;

  const items = await listOrgSeoAudits(session.organisationId);
  return NextResponse.json({ data: { items } });
}

export async function POST(req: Request) {
  const session = await requirePlatformAuth(req);
  if (isNextResponse(session)) return session;

  let websiteUrl: string | undefined;
  try {
    const body = await req.json();
    if (body?.websiteUrl != null) {
      websiteUrl = String(body.websiteUrl);
    }
  } catch {
    /* empty body is fine */
  }

  const result = await runOrgSeoAudit({
    organisationId: session.organisationId,
    websiteUrl,
    actorId: session.clerkUserId,
    persist: true,
  });

  return NextResponse.json({ data: result });
}

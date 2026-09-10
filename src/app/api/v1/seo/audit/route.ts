import { listOrgSeoAudits, runOrgSeoAudit } from "@dg/platform-core";
import { NextResponse } from "next/server";

import { isNextResponse, requireFeature, requirePlatformAuth } from "@/lib/platform-api";
import { canAccessWebsiteStudio } from "@/lib/website-studio-access";

export async function GET(req: Request) {
  const session = await requirePlatformAuth(req);
  if (isNextResponse(session)) return session;

  const denied = requireFeature(session, "seo.read");
  if (denied) return denied;

  const items = await listOrgSeoAudits(session.organisationId);
  return NextResponse.json({ data: { items } });
}

export async function POST(req: Request) {
  const session = await requirePlatformAuth(req);
  if (isNextResponse(session)) return session;

  const denied = requireFeature(session, "seo.read");
  if (denied) return denied;

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
    includeNativeStudio: canAccessWebsiteStudio(session, "view"),
  });

  return NextResponse.json({ data: result });
}

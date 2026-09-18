import { getOrgLinkedInConnectorTokens, saveOrgLinkedInConnectorTokens } from "@dg/platform-core";
import { NextResponse } from "next/server";
import { isNextResponse, requirePlatformAuth } from "@/lib/platform-api";
export const dynamic = "force-dynamic";
export async function POST(req: Request) {
  const session = await requirePlatformAuth(req);
  if (isNextResponse(session)) return session;
  const body = await req.json().catch(() => null) as { organizationUrn?: unknown } | null;
  const organizationUrn = typeof body?.organizationUrn === "string" ? body.organizationUrn.trim() : "";
  const tokens = await getOrgLinkedInConnectorTokens(session.organisationId);
  if (!tokens) return NextResponse.json({ error: { message: "LinkedIn is not connected for this organisation" } }, { status: 400 });
  if (organizationUrn && !(tokens.organizations ?? []).some((o) => o.urn === organizationUrn)) return NextResponse.json({ error: { message: "That LinkedIn company page is not available to this organisation connection" } }, { status: 400 });
  await saveOrgLinkedInConnectorTokens(session.organisationId, { ...tokens, selectedOrganizationUrn: organizationUrn || undefined });
  return NextResponse.json({ data: { selectedOrganizationUrn: organizationUrn || null } });
}

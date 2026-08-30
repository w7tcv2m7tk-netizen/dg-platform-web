import { fixOrgSeoFromAudit } from "@dg/platform-core";
import { NextResponse } from "next/server";

import { isNextResponse, requirePlatformAuth } from "@/lib/platform-api";

/**
 * POST /api/v1/seo/fix
 * Apply AI SEO metadata (title / description / OG) from the latest Page Audit.
 */
export async function POST(req: Request) {
  const session = await requirePlatformAuth(req);
  if (isNextResponse(session)) return session;

  let websiteUrl: string | undefined;
  let findings: unknown;
  let probes: unknown;
  try {
    const body = await req.json();
    if (body?.websiteUrl != null) websiteUrl = String(body.websiteUrl);
    findings = body?.findings;
    probes = body?.probes;
  } catch {
    /* empty body is fine — server will use Studio + profile defaults */
  }

  const result = await fixOrgSeoFromAudit({
    organisationId: session.organisationId,
    actorId: session.clerkUserId,
    websiteUrl,
    findings: Array.isArray(findings) ? findings : undefined,
    probes:
      probes && typeof probes === "object"
        ? (probes as {
            title: string | null;
            hasMetaDescription: boolean;
            hasOpenGraph: boolean;
          })
        : undefined,
  });

  return NextResponse.json({ data: result });
}

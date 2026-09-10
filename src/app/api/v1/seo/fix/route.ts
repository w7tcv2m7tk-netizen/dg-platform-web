import { fixOrgSeoFromAudit } from "@dg/platform-core";
import { NextResponse } from "next/server";

import { isNextResponse, requireFeature, requirePlatformAuth } from "@/lib/platform-api";
import { canAccessWebsiteStudio } from "@/lib/website-studio-access";

/**
 * POST /api/v1/seo/fix
 * Apply AI SEO metadata (title / description / OG) from the latest Page Audit.
 */
export async function POST(req: Request) {
  const session = await requirePlatformAuth(req);
  if (isNextResponse(session)) return session;

  const denied = requireFeature(session, "seo.write");
  if (denied) return denied;

  if (!canAccessWebsiteStudio(session, "edit")) {
    return NextResponse.json(
      {
        error: {
          code: "forbidden",
          message: "Website Studio edit permission is required to apply SEO metadata.",
        },
      },
      { status: 403 },
    );
  }

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

import {
  fixOrgSeoFromAudit,
  getOrganisationBusinessProfile,
  listWebsitesWithPages,
} from "@dg/platform-core";
import { NextResponse } from "next/server";

import { isNextResponse, requireFeature, requirePlatformAuth } from "@/lib/platform-api";
import { canAccessWebsiteStudio } from "@/lib/website-studio-access";

function hostname(value: string | null | undefined): string | null {
  const trimmed = value?.trim();
  if (!trimmed) return null;
  try {
    const url = new URL(/^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`);
    return url.hostname.toLowerCase().replace(/^www\./, "");
  } catch {
    return null;
  }
}

/**
 * POST /api/v1/seo/fix
 * Apply SEO metadata (title / description / OG) from the latest Page Audit.
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

  const [profile, studioSites] = await Promise.all([
    getOrganisationBusinessProfile(session.organisationId),
    listWebsitesWithPages(session.organisationId),
  ]);

  if (studioSites.length > 1) {
    return NextResponse.json(
      {
        error: {
          code: "ambiguous_studio_target",
          message:
            "More than one Design Studio website exists for this organisation. Open Design Studio and choose the site you want to update before applying SEO fixes.",
        },
      },
      { status: 409 },
    );
  }

  const auditHost = hostname(websiteUrl);
  const profileHost = hostname(profile?.websiteUrl);

  if (auditHost && !profileHost) {
    return NextResponse.json(
      {
        error: {
          code: "website_target_unverified",
          message:
            "Set this website as the organisation website in Business Profile before applying automatic SEO fixes.",
        },
      },
      { status: 409 },
    );
  }

  if (auditHost && profileHost && auditHost !== profileHost) {
    return NextResponse.json(
      {
        error: {
          code: "website_target_mismatch",
          message:
            "The audited website does not match the organisation website in Business Profile. Automatic SEO fixes were not applied.",
        },
      },
      { status: 409 },
    );
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

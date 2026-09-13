import {
  fixOrgSeoFromAudit,
  getOrganisationBusinessProfile,
  listWebsitesWithPages,
  runOrgSeoAudit,
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
 * Re-check the verified public website, then apply only SEO metadata issues that
 * are still observable. Client audit payloads are deliberately not trusted for
 * writes because a stored finding can be stale by the time Fix now is clicked.
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
  try {
    const body = await req.json();
    if (body?.websiteUrl != null) websiteUrl = String(body.websiteUrl);
  } catch {
    /* empty body is fine — server will use the Business Profile website */
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

  const targetUrl = websiteUrl?.trim() || profile?.websiteUrl?.trim() || undefined;
  const auditHost = hostname(targetUrl);
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

  const liveAudit = await runOrgSeoAudit({
    organisationId: session.organisationId,
    websiteUrl: targetUrl,
    persist: false,
    includeNativeStudio: false,
  });

  if (liveAudit.presence.probes.reachable !== true) {
    return NextResponse.json(
      {
        error: {
          code: "live_verification_failed",
          message:
            "DigitalGate could not verify the public website right now, so no automatic change was made. Re-run the scan and try again.",
        },
      },
      { status: 409 },
    );
  }

  const result = await fixOrgSeoFromAudit({
    organisationId: session.organisationId,
    actorId: session.clerkUserId,
    websiteUrl: liveAudit.websiteUrl ?? targetUrl,
    findings: liveAudit.findings,
    probes: {
      title: liveAudit.presence.probes.title,
      hasMetaDescription: liveAudit.presence.probes.hasMetaDescription,
      hasOpenGraph: liveAudit.presence.probes.hasOpenGraph,
    },
  });

  return NextResponse.json({
    data: {
      ...result,
      liveAudit: {
        auditedAt: liveAudit.auditedAt,
        websiteUrl: liveAudit.websiteUrl,
        probes: {
          title: liveAudit.presence.probes.title,
          hasMetaDescription: liveAudit.presence.probes.hasMetaDescription,
          hasOpenGraph: liveAudit.presence.probes.hasOpenGraph,
        },
      },
    },
  });
}

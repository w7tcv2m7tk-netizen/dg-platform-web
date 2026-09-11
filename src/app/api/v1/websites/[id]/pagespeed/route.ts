import {
  getWebsite,
  listOrganisationDomains,
  organisationHasWebsitesBuilder,
  publicHttpsUrlForDomain,
  refreshWebsitePagespeedForLiveUrl,
  resolvePrimaryLinkedDomain,
} from "@dg/platform-core";
import { NextResponse } from "next/server";

import { isNextResponse, requirePlatformAuth } from "@/lib/platform-api";
import { canAccessWebsiteStudio } from "@/lib/website-studio-access";

export const maxDuration = 60;

type Ctx = { params: Promise<{ id: string }> };

export async function POST(req: Request, ctx: Ctx) {
  const session = await requirePlatformAuth(req);
  if (isNextResponse(session)) return session;
  if (!canAccessWebsiteStudio(session, "edit")) {
    return NextResponse.json(
      { error: { code: "forbidden", message: "You do not have permission to refresh website health data." } },
      { status: 403 },
    );
  }

  const { id } = await ctx.params;
  const allowed = await organisationHasWebsitesBuilder(session.organisationId);
  if (!allowed) {
    return NextResponse.json(
      { error: { code: "feature_disabled", message: "Design Studio isn't enabled for this business yet." } },
      { status: 403 },
    );
  }

  const website = await getWebsite(session.organisationId, id);
  if (!website) {
    return NextResponse.json(
      { error: { code: "not_found", message: "Website not found" } },
      { status: 404 },
    );
  }

  const domains = await listOrganisationDomains(session.organisationId);
  const primary = resolvePrimaryLinkedDomain(website, domains);
  const url = publicHttpsUrlForDomain(primary?.name);
  if (!url) {
    return NextResponse.json(
      {
        error: {
          code: "no_live_url",
          message: "Connect a live domain before running PageSpeed",
        },
      },
      { status: 400 },
    );
  }

  try {
    const pagespeed = await refreshWebsitePagespeedForLiveUrl({
      organisationId: session.organisationId,
      websiteId: website.id,
      url,
    });
    return NextResponse.json({ data: pagespeed });
  } catch {
    return NextResponse.json(
      {
        error: {
          code: "pagespeed_failed",
          message: "PageSpeed could not be refreshed right now. Please try again.",
        },
      },
      { status: 502 },
    );
  }
}

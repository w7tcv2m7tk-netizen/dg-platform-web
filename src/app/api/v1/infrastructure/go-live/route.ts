import {
  applyWebsiteHostingDns,
  attachDomainToWebsite,
  attachVercelWebsiteHostnames,
  buildGoLiveChecklist,
  getOrganisationDomain,
  listOrganisationDomains,
  resolveWebsiteHostingDnsTargets,
  shouldSkipDreamscapeDnsApply,
  updateWebsite,
  upsertInfrastructureDomain,
  websiteHostingDnsRecords,
} from "@dg/platform-core";
import { NextResponse } from "next/server";

import { isNextResponse, requireFeature, requirePlatformAuth } from "@/lib/platform-api";

export const runtime = "nodejs";

function customerDomain(domain: {
  id: string;
  name: string;
  status: string;
  managed: boolean;
  websiteId: string | null;
  dnsConfiguredAt: string | null;
  sslState: string;
}) {
  return {
    id: domain.id,
    name: domain.name,
    status: domain.status,
    managed: domain.managed,
    websiteId: domain.websiteId,
    dnsConfiguredAt: domain.dnsConfiguredAt,
    sslState: domain.sslState,
  };
}

type CustomerDnsRecord = {
  type: string;
  name: string;
  content: string;
  priority?: number;
  purpose?: string;
};

/** GET /api/v1/infrastructure/go-live?websiteId=&domain= */
export async function GET(req: Request) {
  const session = await requirePlatformAuth(req);
  if (isNextResponse(session)) return session;
  const denied = requireFeature(session, "infrastructure.read");
  if (denied) return denied;

  const url = new URL(req.url);
  const websiteId = url.searchParams.get("websiteId") ?? undefined;
  const domain = url.searchParams.get("domain") ?? undefined;

  const checklist = await buildGoLiveChecklist({
    organisationId: session.organisationId,
    websiteId,
    domainIdOrName: domain,
  });
  const domains = await listOrganisationDomains(session.organisationId);
  const suggestedDomain = checklist.domain ?? "example.com.au";
  const targets = await resolveWebsiteHostingDnsTargets(suggestedDomain);

  return NextResponse.json({
    data: {
      checklist,
      domains: domains.map(customerDomain),
      suggestedDns: websiteHostingDnsRecords(suggestedDomain, "full", targets),
    },
  });
}

/**
 * POST /api/v1/infrastructure/go-live
 * Connect domain → optional DNS hosting records → publish website → checklist.
 */
export async function POST(req: Request) {
  const session = await requirePlatformAuth(req);
  if (isNextResponse(session)) return session;
  const denied = requireFeature(session, "infrastructure.write");
  if (denied) return denied;

  const body = (await req.json().catch(() => null)) as {
    websiteId?: string;
    domainId?: string;
    domain?: string;
    applyDns?: boolean;
    attachVercel?: boolean;
    publish?: boolean;
  } | null;

  if (!body?.websiteId) {
    return NextResponse.json(
      { error: { code: "validation_error", message: "Choose a website before going live." } },
      { status: 400 },
    );
  }

  let domainRow = body.domainId
    ? await getOrganisationDomain(session.organisationId, body.domainId)
    : body.domain
      ? await getOrganisationDomain(session.organisationId, body.domain)
      : null;

  if (!domainRow && body.domain) {
    domainRow = await upsertInfrastructureDomain({
      organisationId: session.organisationId,
      name: body.domain.trim().toLowerCase(),
      status: "connected",
      source: "connected",
      managed: true,
      websiteId: body.websiteId,
    });
  }

  if (!domainRow) {
    return NextResponse.json(
      { error: { code: "validation_error", message: "Choose or connect a domain before going live." } },
      { status: 400 },
    );
  }

  domainRow = await attachDomainToWebsite({
    organisationId: session.organisationId,
    domainId: domainRow.id,
    websiteId: body.websiteId,
  });

  let dns: {
    state: "not_requested" | "applied" | "manual" | "failed";
    records?: CustomerDnsRecord[];
    fellBack?: boolean;
  } = { state: "not_requested" };
  const warnings: string[] = [];

  const useManualDns = shouldSkipDreamscapeDnsApply({
    hostname: domainRow.name,
    source: domainRow.source,
  });

  if (body.applyDns && useManualDns) {
    const targets = await resolveWebsiteHostingDnsTargets(domainRow.name);
    const suggested = websiteHostingDnsRecords(domainRow.name, "subdomain", targets);
    domainRow = await upsertInfrastructureDomain({
      organisationId: session.organisationId,
      name: domainRow.name,
      managed: false,
      dnsRecords: suggested,
      dnsConfiguredAt: new Date().toISOString(),
      sslState: "pending",
      metadata: {
        ...(domainRow.metadata ?? {}),
        dnsTargets: targets,
        dnsModeApplied: "external_subdomain",
      },
    });
    dns = { state: "manual", records: suggested };
    warnings.push("This domain uses external DNS. Apply the suggested DNS record at your DNS host, then allow time for verification.");
  } else if (body.applyDns) {
    try {
      const result = await applyWebsiteHostingDns({
        domainName: domainRow.name,
        mode: "full",
        allowWwwFallback: true,
      });
      domainRow = await upsertInfrastructureDomain({
        organisationId: session.organisationId,
        name: domainRow.name,
        dnsRecords: result.records,
        dnsConfiguredAt: new Date().toISOString(),
        sslState: "pending",
        metadata: {
          ...(domainRow.metadata ?? {}),
          dnsTargets: result.targets,
        },
      });
      dns = { state: "applied", records: result.records, fellBack: result.fellBack };
      if (result.fellBack) {
        warnings.push("Some DNS changes require manual completion. Review the suggested records before going live.");
      }
    } catch {
      const targets = await resolveWebsiteHostingDnsTargets(domainRow.name);
      const suggested = websiteHostingDnsRecords(domainRow.name, "full", targets);
      dns = { state: "failed", records: suggested };
      warnings.push("DNS could not be updated automatically. Apply the suggested records at your DNS host and try again.");
    }
  }

  let hostingState: "not_requested" | "attached" | "pending" = "not_requested";
  if (body.attachVercel !== false) {
    try {
      const hosting = await attachVercelWebsiteHostnames(domainRow.name);
      const anyOk = hosting.apex.ok || hosting.www.ok;
      if (anyOk) {
        domainRow = await upsertInfrastructureDomain({
          organisationId: session.organisationId,
          name: domainRow.name,
          sslState: "pending",
          metadata: {
            ...(domainRow.metadata ?? {}),
            vercelDomain: hosting,
          },
        });
        const awaitingVerification =
          (hosting.apex.ok && hosting.apex.verified === false) ||
          (hosting.www.ok && hosting.www.verified === false);
        hostingState = awaitingVerification ? "pending" : "attached";
        if (awaitingVerification) {
          warnings.push("Hosting is connected and SSL is waiting for DNS verification.");
        }
      } else {
        hostingState = "pending";
        warnings.push("Hosting connection is still pending. Try again after DNS changes have propagated.");
      }
    } catch {
      hostingState = "pending";
      warnings.push("Hosting connection is still pending. Try again shortly.");
    }
  }

  let website = null;
  if (body.publish) {
    website = await updateWebsite({
      organisationId: session.organisationId,
      websiteId: body.websiteId,
      actorId: session.clerkUserId,
      status: "published",
    });
  }

  const checklist = await buildGoLiveChecklist({
    organisationId: session.organisationId,
    websiteId: body.websiteId,
    domainIdOrName: domainRow.id,
  });

  return NextResponse.json({
    data: {
      domain: customerDomain(domainRow),
      website,
      dns,
      hosting: { state: hostingState },
      checklist,
      warnings,
    },
  });
}

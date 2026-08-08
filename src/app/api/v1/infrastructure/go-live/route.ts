import {
  attachDomainToWebsite,
  attachVercelProjectDomain,
  buildGoLiveChecklist,
  getOrganisationDomain,
  listOrganisationDomains,
  requireDnsProvider,
  updateWebsite,
  upsertInfrastructureDomain,
  websiteHostingDnsRecords,
} from "@dg/platform-core";
import { NextResponse } from "next/server";

import { isNextResponse, requirePlatformAuth } from "@/lib/platform-api";

export const runtime = "nodejs";

/** GET /api/v1/infrastructure/go-live?websiteId=&domain= */
export async function GET(req: Request) {
  const session = await requirePlatformAuth(req);
  if (isNextResponse(session)) return session;

  const url = new URL(req.url);
  const websiteId = url.searchParams.get("websiteId") ?? undefined;
  const domain = url.searchParams.get("domain") ?? undefined;

  const checklist = await buildGoLiveChecklist({
    organisationId: session.organisationId,
    websiteId,
    domainIdOrName: domain,
  });
  const domains = await listOrganisationDomains(session.organisationId);

  return NextResponse.json({
    data: {
      checklist,
      domains,
      suggestedDns: checklist.domain
        ? websiteHostingDnsRecords(checklist.domain)
        : websiteHostingDnsRecords("example.com.au"),
    },
  });
}

/**
 * POST /api/v1/infrastructure/go-live
 * Connect domain → optional DNS hosting records → publish website → checklist
 */
export async function POST(req: Request) {
  const session = await requirePlatformAuth(req);
  if (isNextResponse(session)) return session;

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
      { error: { code: "validation_error", message: "websiteId is required" } },
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
      {
        error: {
          code: "validation_error",
          message: "domainId or domain is required",
        },
      },
      { status: 400 },
    );
  }

  domainRow = await attachDomainToWebsite({
    organisationId: session.organisationId,
    domainId: domainRow.id,
    websiteId: body.websiteId,
  });

  let dns = null;
  let vercel = null;
  const warnings: string[] = [];
  if (body.applyDns) {
    const records = websiteHostingDnsRecords(domainRow.name).map((r) => ({
      type: r.type,
      name: r.name,
      content: r.content,
      priority: r.priority,
    }));
    try {
      const applied = await requireDnsProvider().upsertRecords(
        domainRow.name,
        records,
      );
      domainRow = await upsertInfrastructureDomain({
        organisationId: session.organisationId,
        name: domainRow.name,
        dnsRecords: applied,
        dnsConfiguredAt: new Date().toISOString(),
        sslState: "pending",
      });
      dns = applied;
    } catch (err) {
      const message = err instanceof Error ? err.message : "DNS apply failed";
      dns = {
        error: message,
        suggested: records,
      };
      warnings.push(
        `DNS apply failed: ${message}. Retry from Domains → Apply website DNS, or set records manually at the registrar.`,
      );
    }
  }

  if (body.attachVercel !== false) {
    vercel = await attachVercelProjectDomain(domainRow.name);
    if (vercel.ok) {
      domainRow = await upsertInfrastructureDomain({
        organisationId: session.organisationId,
        name: domainRow.name,
        sslState: "pending",
        metadata: {
          ...(domainRow.metadata ?? {}),
          vercelDomain: vercel,
        },
      });
      if (vercel.verified === false) {
        warnings.push(
          "SSL pending: hostname attached but not verified yet — wait for DNS propagation.",
        );
      }
    } else if (!vercel.configured) {
      warnings.push(
        vercel.message ||
          "SSL pending: Vercel attach not configured (VERCEL_TOKEN + VERCEL_PROJECT_ID).",
      );
    } else {
      warnings.push(
        `SSL pending: Vercel attach failed (${vercel.message}). Add the hostname manually in Vercel → Domains.`,
      );
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
      domain: domainRow,
      website,
      dns,
      vercel,
      checklist,
      warnings,
    },
  });
}

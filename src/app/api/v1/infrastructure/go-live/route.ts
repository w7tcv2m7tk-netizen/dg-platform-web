import {
  DreamscapeApiError,
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
  const suggestedDomain = checklist.domain ?? "example.com.au";
  const targets = await resolveWebsiteHostingDnsTargets(suggestedDomain);

  return NextResponse.json({
    data: {
      checklist,
      domains,
      targets,
      suggestedDns: websiteHostingDnsRecords(suggestedDomain, "full", targets),
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
  const skipDreamscapeDns = shouldSkipDreamscapeDnsApply({
    hostname: domainRow.name,
    source: domainRow.source,
  });

  if (body.applyDns && skipDreamscapeDns) {
    const targets = await resolveWebsiteHostingDnsTargets(domainRow.name);
    const suggested = websiteHostingDnsRecords(
      domainRow.name,
      "subdomain",
      targets,
    );
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
        dnsInstructions: `Dreamscape SOAP skipped — ${domainRow.name} is not a reseller apex zone. Set CNAME on the apex DNS (usually Cloudflare) → ${targets.cnameTarget}.`,
      },
    });
    dns = {
      skipped: true,
      reason: "external_subdomain",
      records: suggested,
      modeApplied: "subdomain",
      note: `Skipped Dreamscape DNS apply for ${domainRow.name} (subdomain / product funnel). Keep CNAME at Cloudflare/registrar → ${targets.cnameTarget}, then rely on Vercel attach for SSL.`,
      suggested,
      targets,
    };
    warnings.push(
      `DNS: Dreamscape skipped for ${domainRow.name} — not a reseller apex. Keep CNAME ${suggested[0]?.name || "host"} → ${targets.cnameTarget} at Cloudflare/registrar.`,
    );
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
      dns = {
        records: result.records,
        modeApplied: result.modeApplied,
        fellBack: result.fellBack,
        note: result.note,
        targets: result.targets,
      };
      if (result.fellBack && result.note) warnings.push(result.note);
      else if (result.note) warnings.push(result.note);
    } catch (err) {
      const message = err instanceof Error ? err.message : "DNS apply failed";
      const hint =
        err instanceof DreamscapeApiError ? err.hint : undefined;
      const targets = await resolveWebsiteHostingDnsTargets(domainRow.name);
      const suggested = websiteHostingDnsRecords(
        domainRow.name,
        "full",
        targets,
      );
      dns = {
        error: message,
        hint,
        suggested,
        targets,
      };
      warnings.push(
        `DNS apply failed: ${message}${hint ? ` — ${hint}` : ""}. Retry from Domains → Inspect DNS / Apply www only, or set records manually at the registrar.`,
      );
    }
  }

  if (body.attachVercel !== false) {
    vercel = await attachVercelWebsiteHostnames(domainRow.name);
    const anyOk = vercel.apex.ok || vercel.www.ok;
    const configured = vercel.apex.configured || vercel.www.configured;
    if (anyOk) {
      domainRow = await upsertInfrastructureDomain({
        organisationId: session.organisationId,
        name: domainRow.name,
        sslState: "pending",
        metadata: {
          ...(domainRow.metadata ?? {}),
          vercelDomain: vercel,
        },
      });
      const apexVerified = vercel.apex.ok ? vercel.apex.verified : null;
      const wwwVerified = vercel.www.ok ? vercel.www.verified : null;
      if (apexVerified === false || wwwVerified === false) {
        warnings.push(
          "SSL pending: hostname attached but not verified yet — wait for DNS propagation.",
        );
      }
    } else if (!configured) {
      const msg =
        (!vercel.apex.ok && vercel.apex.message) ||
        (!vercel.www.ok && vercel.www.message) ||
        "SSL pending: Vercel attach not configured (VERCEL_TOKEN + VERCEL_PROJECT_ID).";
      warnings.push(msg);
    } else {
      const msg =
        (!vercel.apex.ok && vercel.apex.message) ||
        (!vercel.www.ok && vercel.www.message) ||
        "unknown error";
      warnings.push(
        `SSL pending: Vercel attach failed (${msg}). Add the hostname manually in Vercel → Domains.`,
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

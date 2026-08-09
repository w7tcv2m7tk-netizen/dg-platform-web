import {
  DreamscapeApiError,
  InfrastructureNotConfiguredError,
  applyWebsiteHostingDns,
  attachVercelProjectDomain,
  getOrganisationDomain,
  inspectDnsZone,
  requireDnsProvider,
  upsertInfrastructureDomain,
  websiteHostingDnsRecords,
  type DnsRecord,
  type WebsiteHostingDnsMode,
} from "@dg/platform-core";
import { NextResponse } from "next/server";

import { isNextResponse, requirePlatformAuth } from "@/lib/platform-api";

export const runtime = "nodejs";

type Ctx = { params: Promise<{ id: string }> };

function parseHostingMode(
  raw: unknown,
): WebsiteHostingDnsMode | null {
  if (raw === true || raw === "full") return "full";
  if (raw === "www" || raw === "apex") return raw;
  return null;
}

/** GET /api/v1/infrastructure/domains/[id]/dns */
export async function GET(req: Request, ctx: Ctx) {
  const session = await requirePlatformAuth(req);
  if (isNextResponse(session)) return session;
  const { id } = await ctx.params;

  const domain = await getOrganisationDomain(session.organisationId, id);
  if (!domain) {
    return NextResponse.json(
      { error: { code: "not_found", message: "Domain not found" } },
      { status: 404 },
    );
  }

  const suggested = websiteHostingDnsRecords(domain.name, "full");
  let zone = null;
  let providerError: string | null = null;
  try {
    zone = await inspectDnsZone(domain.name);
  } catch (err) {
    providerError = err instanceof Error ? err.message : "DNS inspect failed";
  }

  let providerRecords: DnsRecord[] = zone?.records ?? [];
  if (!zone) {
    try {
      providerRecords = await requireDnsProvider().listRecords(domain.name);
    } catch (err) {
      providerError =
        providerError ||
        (err instanceof Error ? err.message : "DNS list failed");
    }
  }

  return NextResponse.json({
    data: {
      domain,
      stored: domain.dnsRecords ?? [],
      provider: providerRecords,
      suggestedHosting: suggested,
      zone,
      providerError,
      sslNote:
        "SSL is auto-issued by Vercel after the custom domain is attached and DNS propagates.",
    },
  });
}

/**
 * POST /api/v1/infrastructure/domains/[id]/dns
 * Body: {
 *   records?: DnsRecord[],
 *   applyHosting?: true | 'full' | 'www' | 'apex',
 *   attachVercel?: boolean,
 *   allowWwwFallback?: boolean
 * }
 */
export async function POST(req: Request, ctx: Ctx) {
  const session = await requirePlatformAuth(req);
  if (isNextResponse(session)) return session;
  const { id } = await ctx.params;

  const domain = await getOrganisationDomain(session.organisationId, id);
  if (!domain) {
    return NextResponse.json(
      { error: { code: "not_found", message: "Domain not found" } },
      { status: 404 },
    );
  }

  const body = (await req.json().catch(() => null)) as {
    records?: DnsRecord[];
    applyHosting?: boolean | WebsiteHostingDnsMode;
    attachVercel?: boolean;
    allowWwwFallback?: boolean;
  } | null;

  const hostingMode = parseHostingMode(body?.applyHosting);
  const customRecords: DnsRecord[] = Array.isArray(body?.records)
    ? body!.records!
    : [];

  if (!hostingMode && customRecords.length === 0) {
    return NextResponse.json(
      {
        error: {
          code: "validation_error",
          message:
            "Provide records[] or applyHosting: true | 'full' | 'www' | 'apex'",
        },
      },
      { status: 400 },
    );
  }

  try {
    let applied: DnsRecord[];
    let modeApplied: WebsiteHostingDnsMode | "custom" = "custom";
    let fellBack = false;
    let note: string | undefined;
    let zone = null;

    if (hostingMode) {
      const result = await applyWebsiteHostingDns({
        domainName: domain.name,
        mode: hostingMode,
        allowWwwFallback: body?.allowWwwFallback !== false,
      });
      applied = result.records;
      modeApplied = result.modeApplied;
      fellBack = result.fellBack;
      note = result.note;
      zone = result.zone;
    } else {
      applied = await requireDnsProvider().upsertRecords(
        domain.name,
        customRecords,
      );
      try {
        zone = await inspectDnsZone(domain.name);
      } catch {
        zone = null;
      }
    }

    const updated = await upsertInfrastructureDomain({
      organisationId: session.organisationId,
      name: domain.name,
      dnsRecords: applied,
      dnsConfiguredAt: new Date().toISOString(),
      sslState: "pending",
      managed: true,
    });

    let vercel = null;
    if (body?.attachVercel || hostingMode) {
      vercel = await attachVercelProjectDomain(domain.name);
      if (vercel.ok) {
        await upsertInfrastructureDomain({
          organisationId: session.organisationId,
          name: domain.name,
          sslState: "pending",
          metadata: {
            ...(updated.metadata ?? {}),
            vercelDomain: vercel,
            dnsModeApplied: modeApplied,
          },
        });
      }
    }

    return NextResponse.json({
      data: {
        domain: updated,
        records: applied,
        modeApplied,
        fellBack,
        note,
        zone,
        vercel,
        instructions: vercel?.configured
          ? null
          : [
              `Apex A → ${process.env.DG_WEBSITE_DNS_A_TARGET || "76.76.21.21"}`,
              `www CNAME → ${process.env.DG_WEBSITE_DNS_CNAME_TARGET || "cname.vercel-dns.com"}`,
              "Add the hostname in Vercel → Project → Domains (or set VERCEL_TOKEN + VERCEL_PROJECT_ID)",
              "SSL provisions automatically once DNS verifies",
            ],
      },
    });
  } catch (err) {
    if (err instanceof InfrastructureNotConfiguredError) {
      return NextResponse.json(
        { error: { code: err.code, message: err.message } },
        { status: 503 },
      );
    }
    if (err instanceof DreamscapeApiError) {
      return NextResponse.json(
        {
          error: {
            code: err.code ?? "provider_error",
            message: err.message,
            hint: err.hint,
            providerBodySnippet: err.providerBodySnippet,
          },
        },
        { status: err.status === 422 ? 422 : 502 },
      );
    }
    return NextResponse.json(
      {
        error: {
          code: "provider_error",
          message: err instanceof Error ? err.message : "DNS update failed",
        },
      },
      { status: 502 },
    );
  }
}

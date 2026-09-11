import {
  DreamscapeApiError,
  InfrastructureNotConfiguredError,
  applyWebsiteHostingDns,
  attachVercelWebsiteHostnames,
  getOrganisationDomain,
  inspectDnsZone,
  requireDnsProvider,
  resolveWebsiteHostingDnsTargets,
  upsertInfrastructureDomain,
  websiteHostingDnsRecords,
  type DnsRecord,
  type WebsiteHostingDnsMode,
} from "@dg/platform-core";
import { NextResponse } from "next/server";

import { isNextResponse, requireFeature, requirePlatformAuth } from "@/lib/platform-api";

export const runtime = "nodejs";

type Ctx = { params: Promise<{ id: string }> };

function parseHostingMode(raw: unknown): WebsiteHostingDnsMode | null {
  if (raw === true || raw === "full") return "full";
  if (raw === "www" || raw === "apex") return raw;
  return null;
}

/** GET /api/v1/infrastructure/domains/[id]/dns */
export async function GET(req: Request, ctx: Ctx) {
  const session = await requirePlatformAuth(req);
  if (isNextResponse(session)) return session;
  const denied = requireFeature(session, "infrastructure.read");
  if (denied) return denied;
  const { id } = await ctx.params;

  const domain = await getOrganisationDomain(session.organisationId, id);
  if (!domain) {
    return NextResponse.json(
      { error: { code: "not_found", message: "Domain not found." } },
      { status: 404 },
    );
  }

  const targets = await resolveWebsiteHostingDnsTargets(domain.name);
  const suggested = websiteHostingDnsRecords(domain.name, "full", targets);
  let zone = null;
  let providerError: string | null = null;
  try {
    zone = await inspectDnsZone(domain.name);
  } catch {
    providerError = "DNS status is temporarily unavailable.";
  }

  let providerRecords: DnsRecord[] = zone?.records ?? [];
  if (!zone) {
    try {
      providerRecords = await requireDnsProvider().listRecords(domain.name);
    } catch {
      providerError = "DNS status is temporarily unavailable.";
    }
  }

  const safeZone = zone
    ? {
        manageable: zone.manageable,
        nameservers: zone.nameservers,
        recordCount: zone.records?.length ?? 0,
        status: zone.status ?? null,
        message: zone.manageable === false
          ? "This DNS zone is not currently manageable from DigitalGate."
          : "DNS zone inspected.",
        hint: zone.manageable === false
          ? "Check the domain's nameservers or contact DigitalGate for help."
          : null,
      }
    : null;

  return NextResponse.json({
    data: {
      domain,
      stored: domain.dnsRecords ?? [],
      provider: providerRecords,
      suggestedHosting: suggested,
      zone: safeZone,
      providerError,
      sslNote:
        "SSL is issued automatically after the custom domain is connected and DNS verification completes.",
    },
  });
}

/** POST /api/v1/infrastructure/domains/[id]/dns */
export async function POST(req: Request, ctx: Ctx) {
  const session = await requirePlatformAuth(req);
  if (isNextResponse(session)) return session;
  const denied = requireFeature(session, "infrastructure.write");
  if (denied) return denied;
  const { id } = await ctx.params;

  const domain = await getOrganisationDomain(session.organisationId, id);
  if (!domain) {
    return NextResponse.json(
      { error: { code: "not_found", message: "Domain not found." } },
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
          message: "Choose hosting DNS or provide DNS records to update.",
        },
      },
      { status: 400 },
    );
  }

  try {
    let applied: DnsRecord[];
    let modeApplied: WebsiteHostingDnsMode | "custom" = "custom";
    let fellBack = false;
    let targets = null as Awaited<
      ReturnType<typeof resolveWebsiteHostingDnsTargets>
    > | null;

    if (hostingMode) {
      const result = await applyWebsiteHostingDns({
        domainName: domain.name,
        mode: hostingMode,
        allowWwwFallback: body?.allowWwwFallback !== false,
      });
      applied = result.records;
      modeApplied = result.modeApplied;
      fellBack = result.fellBack;
      targets = result.targets;
    } else {
      applied = await requireDnsProvider().upsertRecords(
        domain.name,
        customRecords,
      );
      targets = await resolveWebsiteHostingDnsTargets(domain.name);
    }

    const updated = await upsertInfrastructureDomain({
      organisationId: session.organisationId,
      name: domain.name,
      dnsRecords: applied,
      dnsConfiguredAt: new Date().toISOString(),
      sslState: "pending",
      managed: true,
    });

    if (body?.attachVercel || hostingMode) {
      const vercel = await attachVercelWebsiteHostnames(domain.name);
      if (vercel.apex.ok || vercel.www.ok) {
        await upsertInfrastructureDomain({
          organisationId: session.organisationId,
          name: domain.name,
          sslState: "pending",
          metadata: {
            ...(updated.metadata ?? {}),
            vercelDomain: vercel,
            dnsModeApplied: modeApplied,
            dnsTargets: targets,
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
        instructions: [
          "DNS update submitted.",
          "Verification and SSL can take a few minutes after DNS changes propagate.",
        ],
      },
    });
  } catch (err) {
    if (err instanceof InfrastructureNotConfiguredError) {
      return NextResponse.json(
        {
          error: {
            code: "provider_not_configured",
            message: "DNS management is temporarily unavailable.",
          },
        },
        { status: 503 },
      );
    }
    if (err instanceof DreamscapeApiError) {
      return NextResponse.json(
        {
          error: {
            code: "provider_error",
            message: "We couldn't update DNS right now. Please try again.",
          },
        },
        { status: err.status === 422 ? 422 : 502 },
      );
    }
    return NextResponse.json(
      {
        error: {
          code: "provider_error",
          message: "We couldn't update DNS right now. Please try again.",
        },
      },
      { status: 502 },
    );
  }
}

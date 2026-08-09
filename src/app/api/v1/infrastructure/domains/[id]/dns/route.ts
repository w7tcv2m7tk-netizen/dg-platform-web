import {
  DreamscapeApiError,
  InfrastructureNotConfiguredError,
  attachVercelProjectDomain,
  getOrganisationDomain,
  requireDnsProvider,
  upsertInfrastructureDomain,
  websiteHostingDnsRecords,
  type DnsRecord,
} from "@dg/platform-core";
import { NextResponse } from "next/server";

import { isNextResponse, requirePlatformAuth } from "@/lib/platform-api";

export const runtime = "nodejs";

type Ctx = { params: Promise<{ id: string }> };

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

  const suggested = websiteHostingDnsRecords(domain.name);
  let providerRecords: DnsRecord[] = [];
  let providerError: string | null = null;
  try {
    providerRecords = await requireDnsProvider().listRecords(domain.name);
  } catch (err) {
    providerError = err instanceof Error ? err.message : "DNS list failed";
  }

  return NextResponse.json({
    data: {
      domain,
      stored: domain.dnsRecords ?? [],
      provider: providerRecords,
      suggestedHosting: suggested,
      providerError,
      sslNote:
        "SSL is auto-issued by Vercel after the custom domain is attached and DNS propagates.",
    },
  });
}

/**
 * POST /api/v1/infrastructure/domains/[id]/dns
 * Body: { records?: DnsRecord[], applyHosting?: boolean, attachVercel?: boolean }
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
    applyHosting?: boolean;
    attachVercel?: boolean;
  } | null;

  let records: DnsRecord[] = Array.isArray(body?.records) ? body!.records! : [];
  if (body?.applyHosting) {
    records = websiteHostingDnsRecords(domain.name).map((r) => ({
      type: r.type,
      name: r.name,
      content: r.content,
      priority: r.priority,
    }));
  }

  if (records.length === 0) {
    return NextResponse.json(
      {
        error: {
          code: "validation_error",
          message: "Provide records[] or applyHosting: true",
        },
      },
      { status: 400 },
    );
  }

  try {
    const applied = await requireDnsProvider().upsertRecords(
      domain.name,
      records,
    );
    const updated = await upsertInfrastructureDomain({
      organisationId: session.organisationId,
      name: domain.name,
      dnsRecords: applied,
      dnsConfiguredAt: new Date().toISOString(),
      sslState: "pending",
      managed: true,
    });

    let vercel = null;
    if (body?.attachVercel || body?.applyHosting) {
      vercel = await attachVercelProjectDomain(domain.name);
      if (vercel.ok) {
        await upsertInfrastructureDomain({
          organisationId: session.organisationId,
          name: domain.name,
          sslState: "pending",
          metadata: {
            ...(updated.metadata ?? {}),
            vercelDomain: vercel,
          },
        });
      }
    }

    return NextResponse.json({
      data: {
        domain: updated,
        records: applied,
        vercel,
        instructions: vercel?.configured
          ? null
          : [
              `Point www → ${process.env.DG_WEBSITE_DNS_CNAME_TARGET || "cname.vercel-dns.com"}`,
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
        { status: 502 },
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

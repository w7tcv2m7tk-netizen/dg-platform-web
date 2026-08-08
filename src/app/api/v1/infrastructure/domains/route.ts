import {
  DomainRegisterBlockedError,
  DreamscapeApiError,
  InfrastructureNotConfiguredError,
  auEligibilityFromProfile,
  assertDomainRegisterAllowed,
  domainNeedsAuEligibility,
  getDomainProvider,
  getOrganisationBusinessProfile,
  getPersistedDreamscapeCustomerLink,
  listOrganisationDomains,
  resolveDreamscapeConfig,
  upsertDreamscapeCustomerForOrg,
  upsertInfrastructureDomain,
} from "@dg/platform-core";
import { NextResponse } from "next/server";

import { isNextResponse, requirePlatformAuth } from "@/lib/platform-api";

export const runtime = "nodejs";

/** GET /api/v1/infrastructure/domains — org domain inventory */
export async function GET(req: Request) {
  const session = await requirePlatformAuth(req);
  if (isNextResponse(session)) return session;

  const data = await listOrganisationDomains(session.organisationId);
  const link = await getPersistedDreamscapeCustomerLink(session.organisationId);
  const { isSandbox, apiMode, soapEnv } = resolveDreamscapeConfig();

  return NextResponse.json({
    data,
    customerLink: link,
    provider: {
      configured: Boolean(getDomainProvider()),
      isSandbox,
      apiMode,
      soapEnv,
    },
  });
}

/**
 * POST /api/v1/infrastructure/domains
 * Body: { action: "register" | "connect", ... }
 */
export async function POST(req: Request) {
  const session = await requirePlatformAuth(req);
  if (isNextResponse(session)) return session;

  const body = (await req.json().catch(() => null)) as {
    action?: string;
    domain?: string;
    confirmDomain?: string;
    confirmProduction?: boolean;
    periodMonths?: number;
    websiteId?: string;
    managed?: boolean;
  } | null;

  const action = body?.action?.trim();
  const domain = body?.domain?.trim().toLowerCase();
  if (!action || !domain) {
    return NextResponse.json(
      {
        error: {
          code: "validation_error",
          message: "action and domain are required",
        },
      },
      { status: 400 },
    );
  }

  if (action === "connect") {
    const row = await upsertInfrastructureDomain({
      organisationId: session.organisationId,
      name: domain,
      status: "connected",
      source: "connected",
      managed: body?.managed ?? true,
      websiteId: body?.websiteId ?? null,
      sslState: "unknown",
      metadata: {
        connectedAt: new Date().toISOString(),
        dnsInstructions: "Apply hosting CNAME/A records from DNS panel",
      },
    });
    return NextResponse.json({ data: row }, { status: 201 });
  }

  if (action === "register") {
    try {
      const gate = await assertDomainRegisterAllowed({
        organisationId: session.organisationId,
        domain,
        confirmDomain: body?.confirmDomain ?? "",
        confirmProduction: body?.confirmProduction,
      });

      const link = await upsertDreamscapeCustomerForOrg({
        organisationId: session.organisationId,
      });
      const contactId =
        link.contactIdentifier || link.dreamscapeCustomerId;
      if (!contactId) {
        return NextResponse.json(
          {
            error: {
              code: "customer_required",
              message: "Could not create provider contact from Business Profile",
            },
          },
          { status: 400 },
        );
      }

      const profile =
        (await getOrganisationBusinessProfile(session.organisationId)) ?? {};
      const { prisma } = await import("@dg/database");
      const org = await prisma.organisation.findUnique({
        where: { id: session.organisationId },
        select: { name: true },
      });
      let eligibility: Record<string, unknown> | undefined;
      if (domainNeedsAuEligibility(domain)) {
        const e = auEligibilityFromProfile(profile, org?.name || "Business");
        if (!e) {
          return NextResponse.json(
            {
              error: {
                code: "eligibility_required",
                message:
                  ".au registration requires ABN on Business Profile (Organisation settings).",
              },
            },
            { status: 400 },
          );
        }
        eligibility = e;
      }

      const provider = getDomainProvider();
      if (!provider) {
        throw new InfrastructureNotConfiguredError();
      }

      const registered = await provider.register({
        domain,
        organisationId: session.organisationId,
        providerCustomerId: contactId,
        periodMonths: body?.periodMonths ?? 12,
        eligibility,
      });

      const row = await upsertInfrastructureDomain({
        organisationId: session.organisationId,
        name: domain,
        status: registered.status || "pending",
        source: "registered",
        providerId: registered.providerId,
        providerDomainId:
          registered.id !== domain ? registered.id : null,
        providerCustomerId: contactId,
        websiteId: body?.websiteId ?? null,
        managed: true,
        expiresAt: registered.expiresAt ?? null,
        nameservers: registered.nameservers ?? null,
        eligibility: eligibility ?? null,
        sslState: "unknown",
        metadata: {
          registeredAt: new Date().toISOString(),
          isSandbox: gate.isSandbox,
          apiMode: gate.apiMode,
        },
      });

      return NextResponse.json(
        {
          data: row,
          provider: registered,
          warning: gate.isSandbox
            ? null
            : "Production registration submitted — reseller account may be charged.",
        },
        { status: 201 },
      );
    } catch (err) {
      if (err instanceof DomainRegisterBlockedError) {
        return NextResponse.json(
          { error: { code: err.code, message: err.message } },
          { status: 403 },
        );
      }
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
          { status: err.status === 400 ? 400 : 502 },
        );
      }
      return NextResponse.json(
        {
          error: {
            code: "provider_error",
            message: err instanceof Error ? err.message : "Register failed",
          },
        },
        { status: 502 },
      );
    }
  }

  return NextResponse.json(
    { error: { code: "validation_error", message: "Unknown action" } },
    { status: 400 },
  );
}

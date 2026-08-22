/**
 * DigitalGate Infrastructure — Core Platform Service
 *
 * Layout (provider-agnostic + Dreamscape first):
 *   core/                  shared types, org↔customer map, checklist
 *   domains/               DomainProvider + resolve
 *   dns/ hosting/ ssl/ email/   capability stubs
 *   providers/dreamscape/  DreamscapeDomainProvider + REST/SOAP auth
 *
 * Customer UX never names Dreamscape — only DigitalGate Domains/Hosting/Email/DNS/SSL.
 */

import {
  emptyProvisioningChecklist,
  type InfrastructureHealth,
  type ProvisioningHealthChecklist,
} from "./core";
import {
  buildGoLiveChecklist,
  countOrganisationDomains,
  getDomainProvider,
  requireDomainProvider,
} from "./domains";
import {
  DreamscapeDomainProvider,
  isDreamscapeConfigured,
  resolveDreamscapeConfig,
} from "./providers/dreamscape";

export * from "./core";
export * from "./domains";
export * from "./dns";
export * from "./hosting";
export * from "./ssl";
export * from "./email";
export * from "./providers/dreamscape";
export * from "./providers/cloudflare";
export * from "./beta";
export * from "./backup";
export * from "./nav";

/** Compatibility alias used by early API route */
export function getInfrastructureProvider() {
  return getDomainProvider();
}

export function requireInfrastructureProvider() {
  return requireDomainProvider();
}

/**
 * Command Centre — Digital Infrastructure health + asset counts.
 */
export async function getDigitalInfrastructureOverview(organisationId: string): Promise<{
  configured: boolean;
  provider: string | null;
  isSandbox: boolean;
  baseUrl: string;
  health: InfrastructureHealth;
  checklist: ProvisioningHealthChecklist;
  assets: { domains: number; websites: number };
  notes: string[];
}> {
  const { activeEndpoint, isSandbox, apiMode } = resolveDreamscapeConfig();
  const configured = isDreamscapeConfigured();
  let checklist = emptyProvisioningChecklist(organisationId);
  let domainCount = 0;
  let websiteCount = 0;

  if (process.env.DATABASE_URL && organisationId !== "platform") {
    try {
      domainCount = await countOrganisationDomains(organisationId);
      const { prisma } = await import("@dg/database");
      websiteCount = await prisma.website.count({
        where: { organisationId },
      });
      checklist = await buildGoLiveChecklist({ organisationId });
    } catch {
      /* ignore — overview still useful without DB counts */
    }
  } else if (process.env.DATABASE_URL && organisationId === "platform") {
    try {
      const { prisma } = await import("@dg/database");
      domainCount = await prisma.infrastructureDomain.count();
      websiteCount = await prisma.website.count();
    } catch {
      /* ignore */
    }
  }

  const assets = { domains: domainCount, websites: websiteCount };

  if (!configured) {
    return {
      configured: false,
      provider: null,
      isSandbox,
      baseUrl: activeEndpoint,
      health: {
        status: "not_configured",
        providerId: "dreamscape",
        checkedAt: new Date().toISOString(),
        message:
          apiMode === "soap"
            ? "Set DREAMSCAPE_API_KEY + DREAMSCAPE_RESELLER_ID (SOAP) against sandbox before provisioning"
            : "Set DREAMSCAPE_API_KEY against sandbox before provisioning",
        details: { baseUrl: activeEndpoint, isSandbox, apiMode },
      },
      checklist,
      assets,
      notes: [
        "Infrastructure is a Core Platform Service — not an industry App",
        "Develop against sandbox only until automated tests pass",
        "Customer UX: DigitalGate Domains / Hosting / Email — never Dreamscape",
        "Paid registration requires org flag infra.domain_register + typed confirm",
      ],
    };
  }

  const dreamscape = new DreamscapeDomainProvider();
  const check = await dreamscape.healthCheck();

  return {
    configured: true,
    provider: "dreamscape",
    isSandbox: check.isSandbox,
    baseUrl: check.baseUrl,
    health: {
      status: check.ok ? "ok" : "degraded",
      providerId: "dreamscape",
      checkedAt: new Date().toISOString(),
      message: check.message,
      details: {
        baseUrl: check.baseUrl,
        isSandbox: check.isSandbox,
        apiMode: check.apiMode,
      },
    },
    checklist,
    assets,
    notes: [
      check.isSandbox
        ? "Sandbox mode — safe for availability tests; registrations still need infra.domain_register"
        : "Production API — registration charges reseller balance; flag + confirmProduction required",
      `Transport: ${check.apiMode.toUpperCase()}`,
      `${domainCount} domain(s) · ${websiteCount} website(s)`,
    ],
  };
}

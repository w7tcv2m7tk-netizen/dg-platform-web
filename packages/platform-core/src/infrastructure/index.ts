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
import { getDomainProvider, requireDomainProvider } from "./domains";
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

/** Compatibility alias used by early API route */
export function getInfrastructureProvider() {
  return getDomainProvider();
}

export function requireInfrastructureProvider() {
  return requireDomainProvider();
}

/**
 * Command Centre — Digital Infrastructure health (scaffold).
 * Vision: assets list + health score + AI renew recommendations.
 */
export async function getDigitalInfrastructureOverview(organisationId: string): Promise<{
  configured: boolean;
  provider: string | null;
  isSandbox: boolean;
  baseUrl: string;
  health: InfrastructureHealth;
  checklist: ProvisioningHealthChecklist;
  notes: string[];
}> {
  const { activeEndpoint, isSandbox, apiMode } = resolveDreamscapeConfig();
  const configured = isDreamscapeConfigured();
  const checklist = emptyProvisioningChecklist(organisationId);

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
      notes: [
        "Infrastructure is a Core Platform Service — not an industry App",
        "Develop against sandbox only until automated tests pass",
        "Customer UX: DigitalGate Domains / Hosting / Email — never Dreamscape",
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
    notes: [
      check.isSandbox
        ? "Sandbox mode — safe for availability tests; no real registrations"
        : "Production API — do not provision without automated test pass",
      `Transport: ${check.apiMode.toUpperCase()}`,
      "AI renew recommendations and asset inventory: planned for Command Centre",
    ],
  };
}

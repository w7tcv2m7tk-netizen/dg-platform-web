import type { DreamscapeCustomerLink, ProvisioningHealthChecklist } from "./types";

/**
 * In-memory Org ↔ Dreamscape Customer map (scaffold).
 * Persist to Postgres when Domains MVP ships — twin/profile needs durable ownership.
 */
const customerLinks = new Map<string, DreamscapeCustomerLink>();

export function getDreamscapeCustomerLink(
  organisationId: string,
): DreamscapeCustomerLink | null {
  return customerLinks.get(organisationId) ?? null;
}

export function upsertDreamscapeCustomerLink(
  link: DreamscapeCustomerLink,
): DreamscapeCustomerLink {
  const next: DreamscapeCustomerLink = {
    ...link,
    linkedAt: link.linkedAt || new Date().toISOString(),
  };
  customerLinks.set(link.organisationId, next);
  return next;
}

export function listDreamscapeCustomerLinks(): DreamscapeCustomerLink[] {
  return [...customerLinks.values()];
}

/** Empty checklist template for Command Centre / post-publish UX */
export function emptyProvisioningChecklist(
  organisationId: string,
  opts?: { websiteId?: string; domain?: string },
): ProvisioningHealthChecklist {
  return {
    organisationId,
    websiteId: opts?.websiteId,
    domain: opts?.domain,
    checkedAt: new Date().toISOString(),
    score: 0,
    items: [
      { id: "domain", label: "Domain", state: "unknown" },
      { id: "dns", label: "DNS", state: "unknown" },
      { id: "hosting", label: "Hosting", state: "unknown" },
      { id: "ssl", label: "SSL", state: "unknown" },
      { id: "website", label: "Website", state: "unknown" },
      { id: "email", label: "Email", state: "unknown" },
    ],
  };
}

export * from "./types";

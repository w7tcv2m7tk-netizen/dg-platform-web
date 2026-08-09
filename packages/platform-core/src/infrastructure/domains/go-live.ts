/**
 * Website go-live checklist: Domain · DNS · SSL · Website (+ hosting/email stubs).
 */

import {
  emptyProvisioningChecklist,
  type ProvisioningCheckItem,
  type ProvisioningCheckState,
  type ProvisioningHealthChecklist,
} from "../core";
import { getOrganisationDomain, listOrganisationDomains } from "./inventory";

function scoreOf(items: ProvisioningCheckItem[]): number {
  if (items.length === 0) return 0;
  const weight: Record<ProvisioningCheckState, number> = {
    pass: 1,
    pending: 0.4,
    skipped: 0.5,
    fail: 0,
    unknown: 0,
  };
  const sum = items.reduce((acc, i) => acc + (weight[i.state] ?? 0), 0);
  return Math.round((sum / items.length) * 100);
}

/**
 * Hosting DNS records for DigitalGate / Vercel.
 *
 * Dreamscape (and DNS generally) rejects CNAME on the root zone. Always use an A
 * record for apex; CNAME only for www (and other subdomains).
 *
 * Override targets via:
 *   DG_WEBSITE_DNS_CNAME_TARGET (default cname.vercel-dns.com)
 *   DG_WEBSITE_DNS_A_TARGET (default 76.76.21.21 — Vercel anycast)
 */
export function websiteHostingDnsRecords(domainName: string): Array<{
  type: string;
  name: string;
  content: string;
  priority?: number;
  purpose: string;
}> {
  const cnameTarget =
    process.env.DG_WEBSITE_DNS_CNAME_TARGET?.trim() || "cname.vercel-dns.com";
  const aTarget =
    process.env.DG_WEBSITE_DNS_A_TARGET?.trim() || "76.76.21.21";
  const apex = domainName.toLowerCase();

  return [
    {
      type: "A",
      name: "@",
      content: aTarget,
      purpose: `Apex ${apex} → hosting IP (CNAME not allowed on root zone)`,
    },
    {
      type: "CNAME",
      name: "www",
      content: cnameTarget,
      purpose: "www → DigitalGate / Vercel hosting",
    },
  ];
}

export async function buildGoLiveChecklist(input: {
  organisationId: string;
  websiteId?: string;
  domainIdOrName?: string;
}): Promise<ProvisioningHealthChecklist> {
  const base = emptyProvisioningChecklist(input.organisationId, {
    websiteId: input.websiteId,
  });

  let domainRow = input.domainIdOrName
    ? await getOrganisationDomain(input.organisationId, input.domainIdOrName)
    : null;

  if (!domainRow && input.websiteId) {
    const all = await listOrganisationDomains(input.organisationId);
    domainRow = all.find((d) => d.websiteId === input.websiteId) ?? null;
  }

  let websiteStatus: string | null = null;
  let websiteSlug: string | null = null;
  if (input.websiteId && process.env.DATABASE_URL) {
    const { prisma } = await import("@dg/database");
    const site = await prisma.website.findFirst({
      where: { id: input.websiteId, organisationId: input.organisationId },
      select: { status: true, slug: true },
    });
    websiteStatus = site?.status ?? null;
    websiteSlug = site?.slug ?? null;
  }

  base.domain = domainRow?.name;
  base.websiteId = input.websiteId ?? domainRow?.websiteId ?? undefined;

  const domainState: ProvisioningCheckState = !domainRow
    ? "fail"
    : domainRow.status === "registered" || domainRow.status === "connected"
      ? "pass"
      : domainRow.status === "pending" || domainRow.status === "transferring"
        ? "pending"
        : "fail";

  const dnsState: ProvisioningCheckState = !domainRow
    ? "unknown"
    : domainRow.dnsConfiguredAt
      ? "pass"
      : domainRow.managed
        ? "pending"
        : "unknown";

  const sslState: ProvisioningCheckState =
    domainRow?.sslState === "active"
      ? "pass"
      : domainRow?.sslState === "pending"
        ? "pending"
        : domainRow?.dnsConfiguredAt
          ? "pending"
          : "unknown";

  const websiteState: ProvisioningCheckState =
    websiteStatus === "published"
      ? "pass"
      : websiteStatus === "draft"
        ? "pending"
        : input.websiteId
          ? "fail"
          : "unknown";

  const hostingState: ProvisioningCheckState =
    websiteState === "pass" && (dnsState === "pass" || dnsState === "pending")
      ? dnsState === "pass"
        ? "pass"
        : "pending"
      : "unknown";

  base.items = [
    {
      id: "domain",
      label: "Domain",
      state: domainState,
      detail: domainRow
        ? `${domainRow.name} · ${domainRow.status} (${domainRow.source})`
        : "Connect or register a domain",
    },
    {
      id: "dns",
      label: "DNS",
      state: dnsState,
      detail: domainRow?.dnsConfiguredAt
        ? `Configured ${domainRow.dnsConfiguredAt}`
        : domainRow
          ? "Pending — Apply website DNS (Domains) or Make it live. Uses apex A + www CNAME (never apex CNAME — Dreamscape rejects root CNAME)."
          : undefined,
    },
    {
      id: "hosting",
      label: "Hosting",
      state: hostingState,
      detail: "DigitalGate website hosting via Vercel custom domain",
    },
    {
      id: "ssl",
      label: "SSL",
      state: sslState,
      detail:
        domainRow?.sslState === "active"
          ? "Auto SSL active (Vercel)"
          : domainRow?.sslState === "pending"
            ? "Pending — wait for DNS propagation, confirm Vercel project has the hostname (VERCEL_TOKEN + VERCEL_PROJECT_ID or manual Domains add). Certificate issues after that are Vercel-side."
            : domainRow?.dnsConfiguredAt
              ? "DNS set — SSL should flip to pending/active after Vercel verifies the hostname"
              : "SSL provisions automatically after DNS points at hosting",
    },
    {
      id: "website",
      label: "Published",
      state: websiteState,
      detail: websiteSlug
        ? `${websiteStatus === "published" ? "Live" : websiteStatus ?? "unknown"} · /sites/${websiteSlug}`
        : "Publish from Website Studio",
    },
    {
      id: "email",
      label: "Email",
      state: "skipped",
      detail: "Business mailbox provisioning — later",
    },
  ];
  base.score = scoreOf(base.items);
  base.checkedAt = new Date().toISOString();
  return base;
}

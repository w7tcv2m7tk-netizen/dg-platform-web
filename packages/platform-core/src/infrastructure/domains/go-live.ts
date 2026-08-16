/**
 * Website go-live checklist: Domain · DNS · SSL · Website (+ hosting/email stubs).
 */

import {
  emptyProvisioningChecklist,
  type ProvisioningCheckItem,
  type ProvisioningCheckState,
  type ProvisioningHealthChecklist,
} from "../core";
import {
  getOrganisationDomain,
  listOrganisationDomains,
  resolvePrimaryLinkedDomain,
} from "./inventory";

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

import {
  LEGACY_VERCEL_A_TARGET,
  LEGACY_VERCEL_CNAME_TARGET,
  type WebsiteHostingDnsTargets,
} from "../hosting/vercel-domains";

/**
 * Hosting DNS records for DigitalGate / Vercel.
 *
 * Dreamscape (and DNS generally) rejects CNAME on the root zone. Always use an A
 * record for apex; CNAME only for www (and other subdomains).
 *
 * Modes:
 *   full — apex A + www CNAME (default)
 *   www  — www CNAME only (safer first step / fallback after HTTP 500)
 *   apex — apex A only
 *
 * Prefer `resolveWebsiteHostingDnsTargets()` (Vercel project recommendations).
 * Sync fallback / overrides:
 *   DG_WEBSITE_DNS_CNAME_TARGET
 *   DG_WEBSITE_DNS_A_TARGET
 * Legacy anycast: 76.76.21.21 + cname.vercel-dns.com (still work; often Invalid in UI).
 */
export type WebsiteHostingDnsMode = "full" | "www" | "apex" | "subdomain";

/** Common AU/NZ multi-label public suffixes used for apex vs subdomain checks. */
const MULTI_PART_PUBLIC_SUFFIXES = [
  ".com.au",
  ".net.au",
  ".org.au",
  ".asn.au",
  ".id.au",
  ".co.nz",
  ".org.nz",
  ".net.nz",
];

/**
 * Registrable apex for DNS / Dreamscape DomainDNSUpdate.
 * Dreamscape reseller APIs only accept apex zones (e.g. digitalgate.com.au),
 * never hostnames like audit.digitalgate.com.au.
 */
export function registrableApexHostname(hostname: string): string {
  const host = hostname.trim().toLowerCase().replace(/\.$/, "");
  if (!host) return host;
  for (const suffix of MULTI_PART_PUBLIC_SUFFIXES) {
    if (!host.endsWith(suffix)) continue;
    const without = host.slice(0, -suffix.length);
    const labels = without.split(".").filter(Boolean);
    if (labels.length <= 1) return host;
    return `${labels[labels.length - 1]}${suffix}`;
  }
  const labels = host.split(".").filter(Boolean);
  if (labels.length <= 2) return host;
  return labels.slice(-2).join(".");
}

/** True when hostname is not the registrable apex (subdomain / product funnel host). */
export function isSubdomainHostname(hostname: string): boolean {
  const host = hostname.trim().toLowerCase().replace(/\.$/, "");
  if (!host) return false;
  return registrableApexHostname(host) !== host;
}

/**
 * Dreamscape DomainDNSUpdate cannot manage these — DNS lives on the apex zone
 * (often Cloudflare). Go-live should skip SOAP and return manual CNAME guidance.
 */
export function shouldSkipDreamscapeDnsApply(input: {
  hostname: string;
  source?: string | null;
}): boolean {
  const source = (input.source || "").toLowerCase();
  if (source === "product_funnel" || source === "external" || source === "cloudflare") {
    return true;
  }
  return isSubdomainHostname(input.hostname);
}

export function websiteHostingDnsRecords(
  domainName: string,
  mode: WebsiteHostingDnsMode = "full",
  targets?: Pick<WebsiteHostingDnsTargets, "aTarget" | "cnameTarget">,
): Array<{
  type: string;
  name: string;
  content: string;
  priority?: number;
  purpose: string;
}> {
  const cnameTarget =
    targets?.cnameTarget?.trim() ||
    process.env.DG_WEBSITE_DNS_CNAME_TARGET?.trim() ||
    LEGACY_VERCEL_CNAME_TARGET;
  const aTarget =
    targets?.aTarget?.trim() ||
    process.env.DG_WEBSITE_DNS_A_TARGET?.trim() ||
    LEGACY_VERCEL_A_TARGET;
  const host = domainName.toLowerCase().replace(/\.$/, "");

  // Product funnel / branded subdomain — CNAME the leaf on the apex zone.
  if (mode === "subdomain" || isSubdomainHostname(host)) {
    const apex = registrableApexHostname(host);
    const leaf = host.slice(0, -(apex.length + 1));
    return [
      {
        type: "CNAME",
        name: leaf || host,
        content: cnameTarget,
        purpose: `${host} → Vercel (set on ${apex} zone — Cloudflare/registrar, not Dreamscape SOAP)`,
      },
    ];
  }

  const apexRecord = {
    type: "A",
    name: "@",
    content: aTarget,
    purpose: `Apex ${host} → hosting IP (CNAME not allowed on root zone)`,
  };
  const wwwRecord = {
    type: "CNAME",
    name: "www",
    content: cnameTarget,
    purpose: "www → DigitalGate / Vercel hosting",
  };

  if (mode === "www") return [wwwRecord];
  if (mode === "apex") return [apexRecord];
  return [apexRecord, wwwRecord];
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

  let websiteStatus: string | null = null;
  let websiteSlug: string | null = null;
  let websiteMeta: Record<string, unknown> | null = null;
  if (input.websiteId && process.env.DATABASE_URL) {
    const { prisma } = await import("@dg/database");
    const site = await prisma.website.findFirst({
      where: { id: input.websiteId, organisationId: input.organisationId },
      select: { status: true, slug: true, metadata: true },
    });
    websiteStatus = site?.status ?? null;
    websiteSlug = site?.slug ?? null;
    websiteMeta = (site?.metadata as Record<string, unknown> | null) ?? null;
  }

  if (!domainRow && input.websiteId) {
    const all = await listOrganisationDomains(input.organisationId);
    domainRow =
      resolvePrimaryLinkedDomain(
        { id: input.websiteId, metadata: websiteMeta },
        all,
      ) ?? null;
  }

  if (domainRow?.name) {
    try {
      const { refreshInfrastructureDomainSslFromVercel } = await import(
        "../hosting/vercel-domains"
      );
      const refreshed = await refreshInfrastructureDomainSslFromVercel({
        organisationId: input.organisationId,
        domainName: domainRow.name,
        currentSslState: domainRow.sslState,
      });
      if (refreshed.updated || refreshed.sslState !== domainRow.sslState) {
        domainRow = {
          ...domainRow,
          sslState: refreshed.sslState,
        };
      }
    } catch {
      /* Vercel token optional — leave stored sslState */
    }
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

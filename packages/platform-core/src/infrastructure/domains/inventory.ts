/**
 * Domain inventory — Prisma InfrastructureDomain persistence.
 */

import type { Prisma } from "@dg/database";

import type { DnsRecord, Domain, DomainStatus } from "../core/types";

export type SerializedInfrastructureDomain = {
  id: string;
  organisationId: string;
  name: string;
  status: string;
  source: string;
  providerId: string;
  providerDomainId: string | null;
  providerCustomerId: string | null;
  websiteId: string | null;
  managed: boolean;
  autoRenew: boolean | null;
  expiresAt: string | null;
  nameservers: string[] | null;
  dnsRecords: DnsRecord[] | null;
  dnsConfiguredAt: string | null;
  sslState: string;
  eligibility: Record<string, unknown> | null;
  metadata: Record<string, unknown> | null;
  createdAt: string;
  updatedAt: string;
};

function asStringArray(value: unknown): string[] | null {
  if (!Array.isArray(value)) return null;
  return value.filter((v): v is string => typeof v === "string");
}

function asDnsRecords(value: unknown): DnsRecord[] | null {
  if (!Array.isArray(value)) return null;
  const out: DnsRecord[] = [];
  for (const row of value) {
    if (!row || typeof row !== "object") continue;
    const r = row as Record<string, unknown>;
    if (
      typeof r.type !== "string" ||
      typeof r.name !== "string" ||
      typeof r.content !== "string"
    ) {
      continue;
    }
    out.push({
      id: typeof r.id === "string" ? r.id : undefined,
      type: r.type,
      name: r.name,
      content: r.content,
      ttl: typeof r.ttl === "number" ? r.ttl : undefined,
      priority: typeof r.priority === "number" ? r.priority : undefined,
    });
  }
  return out;
}

function serialize(
  row: {
    id: string;
    organisationId: string;
    name: string;
    status: string;
    source: string;
    providerId: string;
    providerDomainId: string | null;
    providerCustomerId: string | null;
    websiteId: string | null;
    managed: boolean;
    autoRenew: boolean | null;
    expiresAt: Date | null;
    nameservers: unknown;
    dnsRecords: unknown;
    dnsConfiguredAt: Date | null;
    sslState: string;
    eligibility: unknown;
    metadata: unknown;
    createdAt: Date;
    updatedAt: Date;
  },
): SerializedInfrastructureDomain {
  return {
    id: row.id,
    organisationId: row.organisationId,
    name: row.name,
    status: row.status,
    source: row.source,
    providerId: row.providerId,
    providerDomainId: row.providerDomainId,
    providerCustomerId: row.providerCustomerId,
    websiteId: row.websiteId,
    managed: row.managed,
    autoRenew: row.autoRenew,
    expiresAt: row.expiresAt?.toISOString() ?? null,
    nameservers: asStringArray(row.nameservers),
    dnsRecords: asDnsRecords(row.dnsRecords),
    dnsConfiguredAt: row.dnsConfiguredAt?.toISOString() ?? null,
    sslState: row.sslState,
    eligibility:
      row.eligibility && typeof row.eligibility === "object"
        ? (row.eligibility as Record<string, unknown>)
        : null,
    metadata:
      row.metadata && typeof row.metadata === "object"
        ? (row.metadata as Record<string, unknown>)
        : null,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

export function toProviderDomain(row: SerializedInfrastructureDomain): Domain {
  return {
    id: row.id,
    name: row.name,
    status: (row.status as DomainStatus) || "unknown",
    providerId: row.providerId,
    organisationId: row.organisationId,
    providerCustomerId: row.providerCustomerId ?? undefined,
    expiresAt: row.expiresAt ?? undefined,
    autoRenew: row.autoRenew ?? undefined,
    nameservers: row.nameservers ?? undefined,
  };
}

export async function listOrganisationDomains(organisationId: string) {
  const { prisma } = await import("@dg/database");
  const rows = await prisma.infrastructureDomain.findMany({
    where: { organisationId },
    orderBy: { updatedAt: "desc" },
  });
  return rows.map(serialize);
}

export async function getOrganisationDomain(
  organisationId: string,
  domainIdOrName: string,
) {
  const { prisma } = await import("@dg/database");
  const row = await prisma.infrastructureDomain.findFirst({
    where: {
      organisationId,
      OR: [{ id: domainIdOrName }, { name: domainIdOrName.toLowerCase() }],
    },
  });
  return row ? serialize(row) : null;
}

export async function findDomainByHostname(hostname: string) {
  const { prisma } = await import("@dg/database");
  const name = hostname.toLowerCase().replace(/\.$/, "");
  const include = {
    website: {
      select: { id: true, slug: true, status: true, organisationId: true },
    },
  } as const;

  // Prefer a row linked to a website when duplicates exist across orgs
  // (e.g. stale inventory on another organisation).
  const linked = await prisma.infrastructureDomain.findFirst({
    where: { name, websiteId: { not: null } },
    orderBy: { updatedAt: "desc" },
    include,
  });
  const row =
    linked ??
    (await prisma.infrastructureDomain.findFirst({
      where: { name },
      orderBy: { updatedAt: "desc" },
      include,
    }));
  if (!row) return null;
  return {
    domain: serialize(row),
    website: row.website,
  };
}

export async function countOrganisationDomains(organisationId: string) {
  const { prisma } = await import("@dg/database");
  return prisma.infrastructureDomain.count({ where: { organisationId } });
}

export async function upsertInfrastructureDomain(input: {
  organisationId: string;
  name: string;
  status?: string;
  source?: string;
  providerId?: string;
  providerDomainId?: string | null;
  providerCustomerId?: string | null;
  websiteId?: string | null;
  managed?: boolean;
  autoRenew?: boolean | null;
  expiresAt?: Date | string | null;
  nameservers?: string[] | null;
  dnsRecords?: DnsRecord[] | null;
  dnsConfiguredAt?: Date | string | null;
  sslState?: string;
  eligibility?: Record<string, unknown> | null;
  metadata?: Record<string, unknown> | null;
}): Promise<SerializedInfrastructureDomain> {
  const { prisma } = await import("@dg/database");
  const name = input.name.trim().toLowerCase();
  const expiresAt =
    input.expiresAt == null
      ? undefined
      : typeof input.expiresAt === "string"
        ? new Date(input.expiresAt)
        : input.expiresAt;
  const dnsConfiguredAt =
    input.dnsConfiguredAt == null
      ? undefined
      : typeof input.dnsConfiguredAt === "string"
        ? new Date(input.dnsConfiguredAt)
        : input.dnsConfiguredAt;

  const data = {
    status: input.status,
    source: input.source,
    providerId: input.providerId,
    providerDomainId: input.providerDomainId,
    providerCustomerId: input.providerCustomerId,
    websiteId: input.websiteId,
    managed: input.managed,
    autoRenew: input.autoRenew,
    expiresAt,
    nameservers: input.nameservers as Prisma.InputJsonValue | undefined,
    dnsRecords: input.dnsRecords as Prisma.InputJsonValue | undefined,
    dnsConfiguredAt,
    sslState: input.sslState,
    eligibility: input.eligibility as Prisma.InputJsonValue | undefined,
    metadata: input.metadata as Prisma.InputJsonValue | undefined,
  };

  const row = await prisma.infrastructureDomain.upsert({
    where: {
      organisationId_name: {
        organisationId: input.organisationId,
        name,
      },
    },
    create: {
      organisationId: input.organisationId,
      name,
      status: input.status ?? "unknown",
      source: input.source ?? "connected",
      providerId: input.providerId ?? "dreamscape",
      providerDomainId: input.providerDomainId ?? null,
      providerCustomerId: input.providerCustomerId ?? null,
      websiteId: input.websiteId ?? null,
      managed: input.managed ?? true,
      autoRenew: input.autoRenew ?? null,
      expiresAt: expiresAt ?? null,
      nameservers: (input.nameservers ?? undefined) as Prisma.InputJsonValue | undefined,
      dnsRecords: (input.dnsRecords ?? undefined) as Prisma.InputJsonValue | undefined,
      dnsConfiguredAt: dnsConfiguredAt ?? null,
      sslState: input.sslState ?? "unknown",
      eligibility: (input.eligibility ?? undefined) as Prisma.InputJsonValue | undefined,
      metadata: (input.metadata ?? undefined) as Prisma.InputJsonValue | undefined,
    },
    update: Object.fromEntries(
      Object.entries(data).filter(([, v]) => v !== undefined),
    ) as Prisma.InfrastructureDomainUpdateInput,
  });

  return serialize(row);
}

export async function updateDomainStatusByName(
  name: string,
  status: DomainStatus,
  extra?: { metadata?: Record<string, unknown> },
) {
  const { prisma } = await import("@dg/database");
  const domain = name.trim().toLowerCase();
  const existing = await prisma.infrastructureDomain.findFirst({
    where: { name: domain },
  });
  if (!existing) return null;
  const metadata = {
    ...((existing.metadata as Record<string, unknown> | null) ?? {}),
    ...(extra?.metadata ?? {}),
    lastWebhookStatus: status,
    lastWebhookAt: new Date().toISOString(),
  };
  const row = await prisma.infrastructureDomain.update({
    where: { id: existing.id },
    data: {
      status,
      metadata: metadata as Prisma.InputJsonValue,
    },
  });
  return serialize(row);
}

/**
 * Prefer website.metadata.customHostname / customDomainId when a site has
 * multiple linked domains (e.g. aetherra.com.au primary + aetheriel.com.au alias).
 */
export function resolvePrimaryLinkedDomain<
  T extends { id: string; name: string; websiteId: string | null },
>(
  website: { id: string; metadata?: Record<string, unknown> | null },
  domains: T[],
): T | null {
  const linked = domains.filter((d) => d.websiteId === website.id);
  if (linked.length === 0) return null;

  const meta = website.metadata ?? {};
  const preferredId =
    typeof meta.customDomainId === "string" ? meta.customDomainId : null;
  const preferredHost =
    typeof meta.customHostname === "string"
      ? meta.customHostname.trim().toLowerCase()
      : null;

  if (preferredId) {
    const byId = linked.find((d) => d.id === preferredId);
    if (byId) return byId;
  }
  if (preferredHost) {
    const byHost = linked.find((d) => d.name.toLowerCase() === preferredHost);
    if (byHost) return byHost;
  }
  return linked[0] ?? null;
}

export async function attachDomainToWebsite(input: {
  organisationId: string;
  domainId: string;
  websiteId: string;
}) {
  const { prisma } = await import("@dg/database");
  const domain = await prisma.infrastructureDomain.findFirst({
    where: { id: input.domainId, organisationId: input.organisationId },
  });
  if (!domain) throw new Error("Domain not found");
  const website = await prisma.website.findFirst({
    where: { id: input.websiteId, organisationId: input.organisationId },
  });
  if (!website) throw new Error("Website not found");

  const meta = (website.metadata as Record<string, unknown> | null) ?? {};
  await prisma.website.update({
    where: { id: website.id },
    data: {
      metadata: {
        ...meta,
        customHostname: domain.name,
        customDomainId: domain.id,
      } as Prisma.InputJsonValue,
    },
  });

  const row = await prisma.infrastructureDomain.update({
    where: { id: domain.id },
    data: { websiteId: website.id, managed: true },
  });
  return serialize(row);
}

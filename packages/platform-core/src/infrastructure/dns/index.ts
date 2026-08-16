import type { DnsRecord } from "../core/types";
import {
  InfrastructureNotConfiguredError,
  InfrastructureNotImplementedError,
} from "../core/types";
import {
  type WebsiteHostingDnsMode,
  isSubdomainHostname,
  shouldSkipDreamscapeDnsApply,
  websiteHostingDnsRecords,
} from "../domains/go-live";
import {
  resolveWebsiteHostingDnsTargets,
  type WebsiteHostingDnsTargets,
} from "../hosting/vercel-domains";
import {
  DreamscapeApiError,
  dreamscapeFetch,
  isDreamscapeConfigured,
  resolveDreamscapeConfig,
} from "../providers/dreamscape/client";
import { DreamscapeSoapError } from "../providers/dreamscape/soap";
import {
  dreamscapeSoapDomainDnsUpdate,
  dreamscapeSoapDomainInfo,
} from "../providers/dreamscape/soap-ops";

export interface DnsProvider {
  readonly id: string;
  listRecords(domainName: string): Promise<DnsRecord[]>;
  upsertRecords(domainName: string, records: DnsRecord[]): Promise<DnsRecord[]>;
  /** @deprecated Prefer upsertRecords — single-record stub */
  upsertRecord(domainName: string, record: DnsRecord): Promise<DnsRecord>;
  deleteRecord(domainName: string, recordId: string): Promise<void>;
}

export type DnsZoneInspection = {
  domainName: string;
  manageable: boolean;
  nameservers: string[];
  records: DnsRecord[];
  recordCount: number;
  status: string | null;
  message: string;
  hint?: string;
};

function soapErrorToApiError(err: DreamscapeSoapError): DreamscapeApiError {
  return new DreamscapeApiError(err.status, err.message, err.body, {
    code: err.code,
    hint: err.hint,
    providerBodySnippet: err.providerBodySnippet,
  });
}

function looksLikeDreamscapeNs(ns: string[]): boolean {
  if (ns.length === 0) return false;
  return ns.some((h) =>
    /dreamscape|ds\.network|crazydomains|vodien|secureapi|secureparkme|nameserver/i.test(
      h,
    ),
  );
}

/**
 * Preflight before DomainDNSUpdate — DomainInfo + NS heuristics.
 * DomainDNSUpdate only works when the zone is hosted on Dreamscape DNS.
 */
export async function inspectDnsZone(
  domainName: string,
): Promise<DnsZoneInspection> {
  const name = domainName.toLowerCase();
  if (!isDreamscapeConfigured()) {
    throw new InfrastructureNotConfiguredError(
      "Domain provider is not configured for DNS",
    );
  }
  const { apiMode, apiKey, resellerId, soapEndpoint, isSandbox } =
    resolveDreamscapeConfig();

  if (apiMode === "soap" && apiKey && resellerId) {
    try {
      const info = await dreamscapeSoapDomainInfo({
        endpoint: soapEndpoint,
        resellerId,
        apiKey,
        isSandbox,
        domainName: name,
      });
      if (!info) {
        return {
          domainName: name,
          manageable: false,
          nameservers: [],
          records: [],
          recordCount: 0,
          status: null,
          message:
            "DomainInfo returned no details — domain may not be at this reseller.",
          hint: "Register or transfer the domain into the Dreamscape reseller account before Apply website DNS.",
        };
      }
      const ns = info.nameservers ?? [];
      // If DomainInfo succeeded, the reseller can usually update DNS even when
      // NS strings don’t match our heuristic — treat readable zone as manageable.
      const manageable = true;
      return {
        domainName: name,
        manageable,
        nameservers: ns,
        records: info.dnsRecords ?? [],
        recordCount: info.dnsRecords?.length ?? 0,
        status: info.statusLabel ?? info.status,
        message: `Zone readable · ${info.dnsRecords?.length ?? 0} record(s)`,
        hint: looksLikeDreamscapeNs(ns)
          ? undefined
          : ns.length === 0
            ? "Nameservers empty in DomainInfo — Apply may still work; if SOAP 500 persists, set Dreamscape NS at the registrar."
            : "NS hostnames don’t look like Dreamscape — confirm the zone is hosted here before relying on DomainDNSUpdate.",
      };
    } catch (err) {
      if (err instanceof DreamscapeSoapError) {
        return {
          domainName: name,
          manageable: false,
          nameservers: [],
          records: [],
          recordCount: 0,
          status: null,
          message: err.message,
          hint:
            err.hint ||
            "DomainInfo failed — domain may not be in this reseller account, or NS are external.",
        };
      }
      throw err;
    }
  }

  try {
    const records = await requireDnsProvider().listRecords(name);
    return {
      domainName: name,
      manageable: true,
      nameservers: [],
      records,
      recordCount: records.length,
      status: null,
      message: `REST DNS list · ${records.length} record(s)`,
    };
  } catch (err) {
    return {
      domainName: name,
      manageable: false,
      nameservers: [],
      records: [],
      recordCount: 0,
      status: null,
      message: err instanceof Error ? err.message : "DNS inspect failed",
    };
  }
}

export type ApplyHostingDnsResult = {
  records: DnsRecord[];
  modeRequested: WebsiteHostingDnsMode;
  modeApplied: WebsiteHostingDnsMode;
  fellBack: boolean;
  note?: string;
  zone: DnsZoneInspection;
  targets: WebsiteHostingDnsTargets;
};

/**
 * Apply Vercel hosting DNS with optional www-only fallback after SOAP HTTP 500.
 * Resolves project-specific A/CNAME via Vercel when VERCEL_TOKEN is set.
 */
export async function applyWebsiteHostingDns(input: {
  domainName: string;
  mode?: WebsiteHostingDnsMode;
  /** When true (default), retry www-only if full/apex hits soap_http_500 */
  allowWwwFallback?: boolean;
  /** Inventory source — product_funnel / external skips Dreamscape SOAP */
  source?: string | null;
}): Promise<ApplyHostingDnsResult> {
  const modeRequested = input.mode ?? "full";
  const allowWwwFallback = input.allowWwwFallback !== false;
  const host = input.domainName.toLowerCase();

  // Subdomains / product funnels are not Dreamscape reseller apex zones.
  if (
    shouldSkipDreamscapeDnsApply({
      hostname: host,
      source: input.source,
    }) ||
    isSubdomainHostname(host)
  ) {
    const targets = await resolveWebsiteHostingDnsTargets(host);
    const records = websiteHostingDnsRecords(host, "subdomain", targets).map(
      (r) => ({
        type: r.type,
        name: r.name,
        content: r.content,
        priority: r.priority,
      }),
    );
    throw new DreamscapeApiError(
      422,
      `${host} is not a Dreamscape reseller apex zone — DomainDNSUpdate cannot manage it`,
      null,
      {
        code: "dns_external_subdomain",
        hint: `Set CNAME ${records[0]?.name || "host"} → ${targets.cnameTarget} on the apex DNS (Cloudflare/registrar). Vercel attach still works for SSL. Do not use Apply website DNS / Dreamscape SOAP for product funnel hosts.`,
      },
    );
  }

  const zone = await inspectDnsZone(input.domainName);

  if (!zone.manageable) {
    throw new DreamscapeApiError(
      422,
      zone.message || "DNS zone is not manageable via Dreamscape",
      null,
      {
        code: "dns_zone_not_manageable",
        hint:
          zone.hint ||
          "Confirm the domain is in the reseller account and uses Dreamscape nameservers, then retry.",
      },
    );
  }

  const targets = await resolveWebsiteHostingDnsTargets(input.domainName);
  const provider = requireDnsProvider();
  const plan = (mode: WebsiteHostingDnsMode) =>
    websiteHostingDnsRecords(input.domainName, mode, targets).map((r) => ({
      type: r.type,
      name: r.name,
      content: r.content,
      priority: r.priority,
    }));

  const targetNote =
    targets.source === "vercel"
      ? targets.note
      : targets.note
        ? targets.note
        : undefined;

  try {
    const records = await provider.upsertRecords(
      input.domainName,
      plan(modeRequested),
    );
    return {
      records,
      modeRequested,
      modeApplied: modeRequested,
      fellBack: false,
      note: targetNote,
      zone,
      targets,
    };
  } catch (err) {
    const canFallback =
      allowWwwFallback &&
      modeRequested !== "www" &&
      err instanceof DreamscapeApiError &&
      (err.code === "soap_http_500" ||
        err.status === 500 ||
        /HTTP 500/i.test(err.message));

    if (!canFallback) throw err;

    const records = await provider.upsertRecords(
      input.domainName,
      plan("www"),
    );
    return {
      records,
      modeRequested,
      modeApplied: "www",
      fellBack: true,
      note: [
        "Full/apex apply failed (SOAP HTTP 500) — applied www CNAME only. Fix apex A in the Dreamscape DNS panel or retry apex later.",
        targetNote,
      ]
        .filter(Boolean)
        .join(" · "),
      zone,
      targets,
    };
  }
}

/** Dreamscape DNS via SOAP DomainDNSUpdate / DomainInfo (REST fallback list). */
export class DreamscapeDnsProvider implements DnsProvider {
  readonly id = "dreamscape";

  async listRecords(domainName: string): Promise<DnsRecord[]> {
    if (!isDreamscapeConfigured()) {
      throw new InfrastructureNotConfiguredError(
        "Domain provider is not configured for DNS",
      );
    }
    const { apiMode, apiKey, resellerId, soapEndpoint, isSandbox } =
      resolveDreamscapeConfig();

    if (apiMode === "soap" && apiKey && resellerId) {
      try {
        const info = await dreamscapeSoapDomainInfo({
          endpoint: soapEndpoint,
          resellerId,
          apiKey,
          isSandbox,
          domainName: domainName.toLowerCase(),
        });
        return info?.dnsRecords ?? [];
      } catch (err) {
        if (err instanceof DreamscapeSoapError) throw soapErrorToApiError(err);
        throw err;
      }
    }

    try {
      const payload = await dreamscapeFetch<unknown>(
        `/domains/${encodeURIComponent(domainName)}/dns`,
        { method: "GET" },
      );
      if (Array.isArray(payload)) {
        return payload as DnsRecord[];
      }
      if (payload && typeof payload === "object") {
        const data = (payload as { data?: unknown }).data;
        if (Array.isArray(data)) return data as DnsRecord[];
        const records = (payload as { records?: unknown }).records;
        if (Array.isArray(records)) return records as DnsRecord[];
      }
    } catch {
      /* fall through */
    }
    return [];
  }

  async upsertRecords(
    domainName: string,
    records: DnsRecord[],
  ): Promise<DnsRecord[]> {
    if (!isDreamscapeConfigured()) {
      throw new InfrastructureNotConfiguredError(
        "Domain provider is not configured for DNS",
      );
    }
    const { apiMode, apiKey, resellerId, soapEndpoint, isSandbox } =
      resolveDreamscapeConfig();

    if (apiMode === "soap" && apiKey && resellerId) {
      try {
        const result = await dreamscapeSoapDomainDnsUpdate({
          endpoint: soapEndpoint,
          resellerId,
          apiKey,
          isSandbox,
          domainName: domainName.toLowerCase(),
          records,
        });
        return result.records;
      } catch (err) {
        if (err instanceof DreamscapeSoapError) throw soapErrorToApiError(err);
        throw err;
      }
    }

    await dreamscapeFetch(`/domains/${encodeURIComponent(domainName)}/dns`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ records }),
    });
    return records;
  }

  async upsertRecord(domainName: string, record: DnsRecord): Promise<DnsRecord> {
    const existing = await this.listRecords(domainName);
    const next = [
      ...existing.filter(
        (r) => !(r.type === record.type && r.name === record.name),
      ),
      record,
    ];
    await this.upsertRecords(domainName, next);
    return record;
  }

  async deleteRecord(): Promise<void> {
    throw new InfrastructureNotImplementedError(this.id, "deleteRecord");
  }
}

/** Stub — when provider not configured */
export class UnimplementedDnsProvider implements DnsProvider {
  readonly id = "unimplemented";

  async listRecords(): Promise<DnsRecord[]> {
    throw new InfrastructureNotImplementedError(this.id, "listRecords");
  }

  async upsertRecords(): Promise<DnsRecord[]> {
    throw new InfrastructureNotImplementedError(this.id, "upsertRecords");
  }

  async upsertRecord(): Promise<DnsRecord> {
    throw new InfrastructureNotImplementedError(this.id, "upsertRecord");
  }

  async deleteRecord(): Promise<void> {
    throw new InfrastructureNotImplementedError(this.id, "deleteRecord");
  }
}

export function getDnsProvider(): DnsProvider | null {
  if (!isDreamscapeConfigured()) return null;
  return new DreamscapeDnsProvider();
}

export function requireDnsProvider(): DnsProvider {
  const provider = getDnsProvider();
  if (!provider) {
    throw new InfrastructureNotConfiguredError(
      "No DNS provider configured. Set Dreamscape credentials first.",
    );
  }
  return provider;
}

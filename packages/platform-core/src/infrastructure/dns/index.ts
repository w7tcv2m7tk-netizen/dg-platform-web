import type { DnsRecord } from "../core/types";
import {
  InfrastructureNotConfiguredError,
  InfrastructureNotImplementedError,
} from "../core/types";
import {
  DreamscapeApiError,
  dreamscapeFetch,
  isDreamscapeConfigured,
  resolveDreamscapeConfig,
} from "../providers/dreamscape/client";
import { DreamscapeSoapError } from "../providers/dreamscape/soap";
import { dreamscapeSoapDomainDnsUpdate, dreamscapeSoapDomainInfo } from "../providers/dreamscape/soap-ops";

export interface DnsProvider {
  readonly id: string;
  listRecords(domainName: string): Promise<DnsRecord[]>;
  upsertRecords(domainName: string, records: DnsRecord[]): Promise<DnsRecord[]>;
  /** @deprecated Prefer upsertRecords — single-record stub */
  upsertRecord(domainName: string, record: DnsRecord): Promise<DnsRecord>;
  deleteRecord(domainName: string, recordId: string): Promise<void>;
}

function soapErrorToApiError(err: DreamscapeSoapError): DreamscapeApiError {
  return new DreamscapeApiError(err.status, err.message, err.body, {
    code: err.code,
    hint: err.hint,
    providerBodySnippet: err.providerBodySnippet,
  });
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

    // REST — best-effort common paths
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

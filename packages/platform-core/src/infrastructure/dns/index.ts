import type { DnsRecord } from "../core/types";
import { InfrastructureNotImplementedError } from "../core/types";

export interface DnsProvider {
  readonly id: string;
  listRecords(domainName: string): Promise<DnsRecord[]>;
  upsertRecord(domainName: string, record: DnsRecord): Promise<DnsRecord>;
  deleteRecord(domainName: string, recordId: string): Promise<void>;
}

/** Stub — Dreamscape DNS then Cloudflare */
export class UnimplementedDnsProvider implements DnsProvider {
  readonly id = "unimplemented";

  async listRecords(): Promise<DnsRecord[]> {
    throw new InfrastructureNotImplementedError(this.id, "listRecords");
  }

  async upsertRecord(): Promise<DnsRecord> {
    throw new InfrastructureNotImplementedError(this.id, "upsertRecord");
  }

  async deleteRecord(): Promise<void> {
    throw new InfrastructureNotImplementedError(this.id, "deleteRecord");
  }
}

export function getDnsProvider(): DnsProvider | null {
  return null;
}

import type { HostingSite } from "../core/types";
import { InfrastructureNotImplementedError } from "../core/types";

export interface HostingProvider {
  readonly id: string;
  getSite(siteId: string): Promise<HostingSite | null>;
  listSites(organisationId: string): Promise<HostingSite[]>;
}

export class UnimplementedHostingProvider implements HostingProvider {
  readonly id = "unimplemented";

  async getSite(): Promise<HostingSite | null> {
    throw new InfrastructureNotImplementedError(this.id, "getSite");
  }

  async listSites(): Promise<HostingSite[]> {
    throw new InfrastructureNotImplementedError(this.id, "listSites");
  }
}

export function getHostingProvider(): HostingProvider | null {
  return null;
}

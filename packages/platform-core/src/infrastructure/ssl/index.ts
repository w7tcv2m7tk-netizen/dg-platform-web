import type { SslStatus } from "../core/types";

export interface SslProvider {
  readonly id: string;
  getStatus(domainName: string): Promise<SslStatus>;
}

/** SSL is invisible on the default path — auto via hosting/edge */
export class AutoSslProvider implements SslProvider {
  readonly id = "auto";

  async getStatus(domainName: string): Promise<SslStatus> {
    return {
      domain: domainName,
      state: "unknown",
      autoManaged: true,
      providerId: this.id,
    };
  }
}

export function getSslProvider(): SslProvider {
  return new AutoSslProvider();
}

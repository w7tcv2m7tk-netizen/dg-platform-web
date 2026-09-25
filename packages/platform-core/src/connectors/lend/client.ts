/**
 * Lend BrokerAPI connector foundation.
 *
 * Scope: Finance Industry App -> Mortgage / finance broking template only.
 * Lend remains the specialist loan/broker workflow system; DigitalGate consumes
 * or submits governed data through the Connector Layer.
 *
 * API docs: https://broker-api-docs.lend.com.au/
 */

export const LEND_CONNECTOR_ID = "lend" as const;
export const LEND_INDUSTRY_TEMPLATE_ID = "mortgage_broking" as const;

export type LendEnvironment = "sandbox" | "live";

export type LendCredentials = {
  apiKey: string;
  apiSecret: string;
  environment?: LendEnvironment;
};

export type LendClientOptions = LendCredentials & {
  baseUrl?: string;
  fetchImpl?: typeof fetch;
};

const DEFAULT_BASE_URL = "https://partners.lend.com.au";
const API_VERSION = "20190501";

function basicAuth(apiKey: string, apiSecret: string): string {
  return `Basic ${Buffer.from(`${apiKey}:${apiSecret}`, "utf8").toString("base64")}`;
}

export function createLendClient(options: LendClientOptions) {
  const fetchImpl = options.fetchImpl ?? fetch;
  const baseUrl = (options.baseUrl ?? DEFAULT_BASE_URL).replace(/\/$/, "");
  const environment = options.environment ?? "sandbox";

  async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
    const headers = new Headers(init.headers);
    headers.set("Accept", "application/json");
    if (!(init.body instanceof FormData)) headers.set("Content-Type", "application/json");
    headers.set("Version", API_VERSION);
    headers.set("Environment", environment);
    headers.set("Authorization", basicAuth(options.apiKey, options.apiSecret));

    const response = await fetchImpl(`${baseUrl}${path}`, { ...init, headers });
    const payload = (await response.json().catch(() => null)) as T | null;
    if (!response.ok) {
      throw new Error(`Lend BrokerAPI request failed (${response.status})`);
    }
    if (payload === null) throw new Error("Lend BrokerAPI returned an empty response");
    return payload;
  }

  return {
    environment,
    /** Low-risk connection/config probe. */
    getPurposes<T = unknown>() {
      return request<T>("/api/configs/purposes");
    },
    getProductTypes<T = unknown>() {
      return request<T>("/api/configs/producttypes");
    },
    getReferrers<T = unknown>() {
      return request<T>("/api/configs/referrers");
    },
    /** Write capability is exposed deliberately but is not called automatically. */
    submitLead<T = unknown>(payload: Record<string, unknown>) {
      return request<T>("/api/leads", { method: "POST", body: JSON.stringify(payload) });
    },
  };
}

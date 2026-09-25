/**
 * Equifax Australia specialist Finance connector foundation.
 *
 * Equifax Developer Portal documents OAuth 2.0 client-credentials, separate
 * sandbox/test/live credentials and protected product APIs. Product-specific
 * credit-report endpoints remain access-controlled and are not invented here.
 */
export const EQUIFAX_AU_CONNECTOR_ID = "equifax-au" as const;
export const EQUIFAX_AU_TEMPLATE_ID = "mortgage_broking" as const;

export type EquifaxEnvironment = "sandbox" | "test" | "live";

export const EQUIFAX_AU_BASE_URLS: Record<EquifaxEnvironment, string> = {
  sandbox: "https://api.sandbox.equifax.com.au",
  test: "https://api.uat.equifax.com.au",
  live: "https://api.equifax.com.au",
};

export type EquifaxCredentials = {
  clientId: string;
  clientSecret: string;
  scope: string;
  environment?: EquifaxEnvironment;
};

export type EquifaxCreditReportReference = {
  externalId: string;
  requestedAt?: string;
  receivedAt?: string;
  reportType?: string;
  status?: string;
};

export function mapEquifaxReportMetadata(input: EquifaxCreditReportReference) {
  return {
    connector: EQUIFAX_AU_CONNECTOR_ID,
    externalId: input.externalId,
    requestedAt: input.requestedAt ?? null,
    receivedAt: input.receivedAt ?? null,
    reportType: input.reportType ?? null,
    providerStatus: input.status ?? null,
  };
}

export function equifaxExternalRef(externalId: string): string {
  return `equifax-au:${externalId.trim()}`;
}

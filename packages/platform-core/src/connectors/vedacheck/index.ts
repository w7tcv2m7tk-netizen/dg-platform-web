/**
 * Vedacheck specialist Finance connector foundation.
 *
 * The provider-specific transport contract remains intentionally incomplete
 * until AIM/Vedacheck supplies approved integration documentation. DigitalGate
 * does not guess authentication schemes, endpoints or credit-report schemas.
 */
export const VEDACHECK_CONNECTOR_ID = "vedacheck" as const;
export const VEDACHECK_TEMPLATE_ID = "mortgage_broking" as const;

export type VedacheckReportReference = {
  externalId: string;
  requestedAt?: string;
  receivedAt?: string;
  reportType?: string;
  status?: string;
};

export function mapVedacheckReportMetadata(input: VedacheckReportReference) {
  return {
    connector: VEDACHECK_CONNECTOR_ID,
    externalId: input.externalId,
    requestedAt: input.requestedAt ?? null,
    receivedAt: input.receivedAt ?? null,
    reportType: input.reportType ?? null,
    providerStatus: input.status ?? null,
  };
}

export function vedacheckExternalRef(externalId: string): string {
  return `vedacheck:${externalId.trim()}`;
}

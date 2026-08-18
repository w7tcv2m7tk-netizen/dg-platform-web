/**
 * Public marketing domains served by Gen 2 Website Studio — live `/wp-json`
 * Acc/RE APIs are retired. Keep URLs only for migration/import against a
 * legacy or staging WordPress host.
 */

export function isGen2MarketingApexBaseUrl(
  baseUrl: string | null | undefined,
): boolean {
  if (!baseUrl?.trim()) return false;
  try {
    const host = new URL(
      baseUrl.includes("://") ? baseUrl : `https://${baseUrl}`,
    ).hostname.replace(/^www\./i, "");
    return (
      /currumbinvalleyhideaway\.com\.au$/i.test(host) ||
      /roerealty\.com\.au$/i.test(host) ||
      /^digitalgate\.com\.au$/i.test(host) ||
      /aetherra\.com\.au$/i.test(host)
    );
  } catch {
    return /currumbinvalleyhideaway|roerealty|digitalgate\.com\.au|aetherra/i.test(
      baseUrl,
    );
  }
}

export const GEN2_APEX_WP_RETIRED_MESSAGE =
  "WordPress live APIs are retired on this public Gen 2 domain. Use Neon / Website Studio as source of truth, or point the connector at a legacy/staging WordPress host for migration import only.";

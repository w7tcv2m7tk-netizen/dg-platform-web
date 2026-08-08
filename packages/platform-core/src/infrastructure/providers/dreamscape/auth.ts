import { createHash, randomBytes } from "node:crypto";

/**
 * Default Reseller ID header per Dreamscape support (Aug 2026): try
 * `X-Reseller-Id` or `Reseller-Id`. Override via DREAMSCAPE_RESELLER_ID_HEADER.
 */
export const DREAMSCAPE_DEFAULT_RESELLER_ID_HEADER = "X-Reseller-Id";

/** Unique MD5 request id per Dreamscape API call. */
export function dreamscapeRequestId(): string {
  return createHash("md5")
    .update(`${Date.now()}-${randomBytes(16).toString("hex")}`)
    .digest("hex");
}

/** Api-Signature = md5(request_id + api_key) — server-side only */
export function dreamscapeSignature(requestId: string, apiKey: string): string {
  return createHash("md5").update(`${requestId}${apiKey}`).digest("hex");
}

export type DreamscapeAuthHeaderOptions = {
  /** Numeric Reseller ID from API Setup (required per Dreamscape support). */
  resellerId?: string | null;
  /**
   * Header name for Reseller ID. Public REST docs omit this; support says it
   * must be sent. Default `X-Reseller-Id` (support also mentioned `Reseller-Id`).
   * Override with DREAMSCAPE_RESELLER_ID_HEADER if needed.
   */
  resellerIdHeader?: string | null;
};

/**
 * REST auth headers per https://doc-reseller-api.ds.network/ plus Reseller ID.
 *
 * Documented: Api-Request-Id + Api-Signature (md5(request_id + api_key)).
 * Support (Aug 2026): also pass Reseller ID alongside the API key. Public docs
 * do not name the header — we default to X-Reseller-Id.
 */
export function dreamscapeAuthHeaders(
  apiKey: string,
  opts?: DreamscapeAuthHeaderOptions,
): Record<string, string> {
  const requestId = dreamscapeRequestId();
  const headers: Record<string, string> = {
    Accept: "application/json",
    "Api-Request-Id": requestId,
    "Api-Signature": dreamscapeSignature(requestId, apiKey),
  };

  const resellerId = opts?.resellerId?.trim();
  if (resellerId) {
    const headerName =
      opts?.resellerIdHeader?.trim() || DREAMSCAPE_DEFAULT_RESELLER_ID_HEADER;
    headers[headerName] = resellerId;
  }

  return headers;
}

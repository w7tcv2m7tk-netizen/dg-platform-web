import { createHash, randomBytes } from "node:crypto";

/**
 * Reseller ID header names to send together (same value).
 * Public REST docs omit Reseller ID; support (Aug 2026) says it must be
 * passed with the API key but did not name a single header — send all known
 * variants so one of them matches.
 */
export const DREAMSCAPE_RESELLER_ID_HEADERS = [
  "X-Reseller-Id",
  "Reseller-Id",
  "Api-Reseller-Id",
] as const;

/** @deprecated Prefer DREAMSCAPE_RESELLER_ID_HEADERS — kept for env/docs. */
export const DREAMSCAPE_DEFAULT_RESELLER_ID_HEADER = "X-Reseller-Id";

/** Unique MD5 request id per Dreamscape API call. */
export function dreamscapeRequestId(): string {
  return createHash("md5")
    .update(`${Date.now()}-${randomBytes(16).toString("hex")}`)
    .digest("hex");
}

/**
 * Api-Signature = md5(request_id + api_key) — documented formula only.
 * Do not invent variants (e.g. including reseller_id) unless support confirms.
 */
export function dreamscapeSignature(requestId: string, apiKey: string): string {
  return createHash("md5").update(`${requestId}${apiKey}`).digest("hex");
}

export type DreamscapeAuthHeaderOptions = {
  /** Numeric Reseller ID from API Setup (required per Dreamscape support). */
  resellerId?: string | null;
  /**
   * Extra / override header name. Always also send the standard trio
   * (X-Reseller-Id, Reseller-Id, Api-Reseller-Id). Override via
   * DREAMSCAPE_RESELLER_ID_HEADER if support names something else.
   */
  resellerIdHeader?: string | null;
};

export type DreamscapeAuthHeadersResult = {
  headers: Record<string, string>;
  /** Header names present (values redacted for logs/debug). */
  headerNames: string[];
  requestId: string;
  /** Documented signature formula label (never includes the key). */
  signatureAlgo: "md5(request_id + api_key)";
  resellerIdHeadersSent: string[];
};

/**
 * REST auth headers per https://doc-reseller-api.ds.network/ plus Reseller ID.
 *
 * Documented: Api-Request-Id + Api-Signature (md5(request_id + api_key)).
 * Support (Aug 2026): also pass Reseller ID alongside the API key. Public docs
 * do not name the header — we send X-Reseller-Id, Reseller-Id, and
 * Api-Reseller-Id with the same value.
 */
export function dreamscapeAuthHeaders(
  apiKey: string,
  opts?: DreamscapeAuthHeaderOptions,
): Record<string, string> {
  return buildDreamscapeAuthHeaders(apiKey, opts).headers;
}

/** Same as dreamscapeAuthHeaders but includes debug metadata (no secrets). */
export function buildDreamscapeAuthHeaders(
  apiKey: string,
  opts?: DreamscapeAuthHeaderOptions,
): DreamscapeAuthHeadersResult {
  const requestId = dreamscapeRequestId();
  const headers: Record<string, string> = {
    Accept: "application/json",
    "Api-Request-Id": requestId,
    "Api-Signature": dreamscapeSignature(requestId, apiKey),
  };

  const resellerIdHeadersSent: string[] = [];
  const resellerId = opts?.resellerId?.trim();
  if (resellerId) {
    const names = new Set<string>([...DREAMSCAPE_RESELLER_ID_HEADERS]);
    const extra = opts?.resellerIdHeader?.trim();
    if (extra) names.add(extra);
    for (const name of names) {
      headers[name] = resellerId;
      resellerIdHeadersSent.push(name);
    }
  }

  return {
    headers,
    headerNames: Object.keys(headers),
    requestId,
    signatureAlgo: "md5(request_id + api_key)",
    resellerIdHeadersSent,
  };
}

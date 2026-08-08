import { createHash, randomBytes } from "node:crypto";

/**
 * Reseller ID header names used only when opt-in
 * `DREAMSCAPE_SEND_RESELLER_ID=true` is set (support experiments).
 * Official REST docs do not use Reseller ID headers.
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
 * @see https://doc-reseller-api.ds.network/
 */
export function dreamscapeSignature(requestId: string, apiKey: string): string {
  return createHash("md5").update(`${requestId}${apiKey}`).digest("hex");
}

export type DreamscapeAuthHeaderOptions = {
  /**
   * When set with sendResellerId, attach Reseller ID headers (opt-in only).
   * Official REST auth does not require this.
   */
  resellerId?: string | null;
  /**
   * Extra / override header name when sendResellerId is true.
   * Override via DREAMSCAPE_RESELLER_ID_HEADER if support names something else.
   */
  resellerIdHeader?: string | null;
  /**
   * Opt-in: send Reseller ID headers. Default false — official docs use only
   * Api-Request-Id + Api-Signature (+ Accept).
   */
  sendResellerId?: boolean;
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
 * REST auth headers per https://doc-reseller-api.ds.network/
 *
 * Default (official): Accept + Api-Request-Id + Api-Signature
 *   where Api-Signature = md5(request_id + api_key).
 *
 * Opt-in Reseller ID headers only when sendResellerId is true.
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
  if (opts?.sendResellerId && resellerId) {
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

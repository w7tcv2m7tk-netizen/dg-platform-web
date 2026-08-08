import { createHash, randomBytes } from "node:crypto";

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

export function dreamscapeAuthHeaders(apiKey: string): Record<string, string> {
  const requestId = dreamscapeRequestId();
  return {
    Accept: "application/json",
    "Api-Request-Id": requestId,
    "Api-Signature": dreamscapeSignature(requestId, apiKey),
  };
}

import { timingSafeEqual } from "node:crypto";

/**
 * Shared-secret webhook trust model (WordPress → Gen 2 bridges).
 *
 * Two problems this addresses:
 *
 * 1. Secret sprawl. Each bridge accepted any of up to five environment values,
 *    including the general-purpose DG_API_KEY (also the IndexNow key and a
 *    legacy connector key). One low-value credential therefore unlocked lead,
 *    booking, prospect and profile writes. Each bridge now has its own secret,
 *    with a single explicit legacy fallback during cutover.
 *
 * 2. Caller-chosen tenant. The handlers took `organisationId` straight from the
 *    request body, so anyone holding a secret could write into any tenant.
 *    Organisation identity is now resolved server-side; a body-supplied id is
 *    accepted only when it matches that resolution.
 *
 * Comparisons are constant time.
 */

function safeEqual(a: string, b: string): boolean {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) return false;
  return timingSafeEqual(bufA, bufB);
}

function readProvidedSecret(req: Request): string {
  return (
    req.headers.get("X-DG-Webhook-Secret")?.trim() ||
    req.headers.get("X-API-Key")?.trim() ||
    ""
  );
}

export type WebhookAuthResult =
  | { ok: true }
  | { ok: false; code: "not_configured" | "unauthorized"; message: string };

/**
 * Verify a bridge secret against an explicit, ordered list of env var names.
 * Fails closed when none of them are set.
 */
export function verifyWebhookSecret(
  req: Request,
  envNames: readonly string[],
): WebhookAuthResult {
  const configured = envNames
    .map((name) => process.env[name]?.trim())
    .filter((value): value is string => Boolean(value));

  if (!configured.length) {
    return {
      ok: false,
      code: "not_configured",
      message: "Webhook secret is not configured",
    };
  }

  const provided = readProvidedSecret(req);
  if (!provided) {
    return { ok: false, code: "unauthorized", message: "Missing webhook secret" };
  }

  const matched = configured.some((secret) => safeEqual(provided, secret));
  return matched
    ? { ok: true }
    : { ok: false, code: "unauthorized", message: "Invalid webhook secret" };
}

export type WebhookOrganisationResult =
  | { ok: true; organisationId: string }
  | { ok: false; code: "unresolved" | "forbidden"; message: string };

/**
 * Resolve which organisation a bridge request may write to.
 *
 * `resolved` is the server-side answer (env pin, connector/brand mapping).
 * `requested` is whatever the caller put in the body — it is never trusted on
 * its own, only used to disambiguate when it matches the server's answer.
 */
export function resolveWebhookOrganisation(input: {
  requested?: string | null;
  resolved?: string | null;
  /** Additional organisation ids this credential is explicitly scoped to. */
  allowed?: readonly string[];
}): WebhookOrganisationResult {
  const requested = input.requested?.trim() || "";
  const resolved = input.resolved?.trim() || "";
  const allowed = new Set(
    [resolved, ...(input.allowed ?? [])]
      .map((id) => id?.trim())
      .filter((id): id is string => Boolean(id)),
  );

  if (!requested) {
    if (resolved) return { ok: true, organisationId: resolved };
    return {
      ok: false,
      code: "unresolved",
      message:
        "Could not resolve a target organisation for this webhook credential",
    };
  }

  if (allowed.has(requested)) {
    return { ok: true, organisationId: requested };
  }

  return {
    ok: false,
    code: "forbidden",
    message:
      "This webhook credential is not authorised for the requested organisation",
  };
}

/** Organisation ids a bridge credential may target, from a comma-separated env var. */
export function webhookAllowedOrganisationIds(envName: string): string[] {
  return (
    process.env[envName]?.split(",")
      .map((id) => id.trim())
      .filter(Boolean) ?? []
  );
}

import * as Sentry from "@sentry/nextjs";

/**
 * Next.js instrumentation — earliest safe Node boundary for env pairing + Sentry.
 * Client init lives in instrumentation-client.ts.
 *
 * Pairing: scripts/env-pairing.mjs — DG_NEON_ENV must match the Neon host allowlist
 * classification, and Clerk×Neon must be an approved pair. Fail closed; never log URLs.
 */
export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { assertEnvironmentPairingOrThrow } = await import("../scripts/env-pairing.mjs");
    assertEnvironmentPairingOrThrow(process.env);
    await import("./sentry.server.config");
  }

  if (process.env.NEXT_RUNTIME === "edge") {
    await import("./sentry.edge.config");
  }
}

export const onRequestError = Sentry.captureRequestError;

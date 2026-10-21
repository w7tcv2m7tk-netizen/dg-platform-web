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
    const pairing = assertEnvironmentPairingOrThrow(process.env);
    if ("localCertification" in pairing && pairing.localCertification) {
      const { verifyLocalCheckoutCertificationDatabase } = await import("../scripts/env-pairing.mjs");
      const { prisma } = await import("@dg/database");
      await verifyLocalCheckoutCertificationDatabase(process.env, () => prisma.$transaction(async (tx) => {
        await tx.$executeRaw`SET LOCAL statement_timeout = '2000ms'`;
        return tx.$queryRaw<Array<{ nonce: string | null; database: string; address: string | null; port: number }>>`
          SELECT current_setting('dg.checkout_certification_nonce', true) AS nonce,
                 current_database() AS database, host(inet_server_addr()) AS address,
                 inet_server_port() AS port`;
      }, { maxWait: 1000, timeout: 3000 }));
    }
    await import("./sentry.server.config");
  }

  if (process.env.NEXT_RUNTIME === "edge") {
    await import("./sentry.edge.config");
  }
}

export const onRequestError = Sentry.captureRequestError;

import * as Sentry from "@sentry/nextjs";

/**
 * Next.js instrumentation — registers Sentry for Node and Edge.
 * Client init lives in instrumentation-client.ts.
 */
export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    await import("./sentry.server.config");
  }

  if (process.env.NEXT_RUNTIME === "edge") {
    await import("./sentry.edge.config");
  }
}

export const onRequestError = Sentry.captureRequestError;

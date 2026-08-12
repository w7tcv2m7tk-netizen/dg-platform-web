import * as Sentry from "@sentry/nextjs";

/**
 * Browser / client SDK. No-op when DSN is unset so local/dev without Sentry stays quiet.
 */
const dsn =
  process.env.NEXT_PUBLIC_SENTRY_DSN?.trim() ||
  process.env.SENTRY_DSN?.trim() ||
  "";

Sentry.init({
  dsn: dsn || undefined,
  enabled: Boolean(dsn),
  tracesSampleRate: process.env.NODE_ENV === "development" ? 1.0 : 0.1,
});

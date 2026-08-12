import * as Sentry from "@sentry/nextjs";

/**
 * Edge runtime SDK. Missing DSN → enabled:false (no crash, no events).
 */
const dsn =
  process.env.SENTRY_DSN?.trim() ||
  process.env.NEXT_PUBLIC_SENTRY_DSN?.trim() ||
  "";

Sentry.init({
  dsn: dsn || undefined,
  enabled: Boolean(dsn),
  tracesSampleRate: process.env.NODE_ENV === "development" ? 1.0 : 0.1,
});

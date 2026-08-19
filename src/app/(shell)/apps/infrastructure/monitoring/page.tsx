import Link from "next/link";

/** Placeholder — customer uptime product not shipped; ops error floor is Sentry when configured. */
export default function Page() {
  const sentryConfigured = Boolean(
    process.env.NEXT_PUBLIC_SENTRY_DSN?.trim() || process.env.SENTRY_DSN?.trim(),
  );

  return (
    <section className="mt-2 max-w-xl space-y-3 text-sm text-slate-300">
      <h1 className="text-xl font-semibold text-white">Monitoring</h1>
      <p className="text-slate-400">
        Customer-facing uptime and performance monitoring is not shipped for this app yet —
        this page is a placeholder, not a live status product.
      </p>
      <p className="text-slate-400">
        Ops error capture (Sentry) is separate:{" "}
        {sentryConfigured ? (
          <span className="text-emerald-300">DSN configured for this deployment</span>
        ) : (
          <span className="text-amber-200/90">
            no SENTRY_DSN / NEXT_PUBLIC_SENTRY_DSN set — errors are not forwarded
          </span>
        )}
        . See Command → Platform health for the ops floor note.
      </p>
      <p>
        For live sites, check{" "}
        <Link
          href="/apps/infrastructure/hosting"
          className="text-sky-400 hover:underline"
        >
          Hosting
        </Link>{" "}
        and domain SSL status under{" "}
        <Link
          href="/apps/infrastructure/domains"
          className="text-sky-400 hover:underline"
        >
          Domains
        </Link>
        .
      </p>
    </section>
  );
}

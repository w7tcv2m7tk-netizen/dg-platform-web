import Link from "next/link";
import { getPlatformAlertsCentre } from "@dg/platform-core";


export default async function PlatformSystemDiagnosticsPage() {
  const data = process.env.DATABASE_URL ? await getPlatformAlertsCentre() : null;
  const diagnostics = data?.diagnostics;

  return (
    <>
      <header className="dg-page-header">
        <Link href="/command/platform-health" className="text-sm text-sky-400 hover:underline">
          ← Alerts
        </Link>
        <h1 className="mt-2 text-2xl font-bold text-white">System diagnostics</h1>
        <p className="mt-1 text-sm text-slate-400">
          Developer and observability details — not shown in the primary operator experience.
        </p>
      </header>
      <main className="dg-page-main space-y-8">
        {!diagnostics ? (
          <p className="text-sm text-slate-500">Diagnostics unavailable.</p>
        ) : (
          <div className="space-y-6">
            <section className="rounded-xl border border-slate-700/80 bg-slate-950/50 px-5 py-5">
              <h2 className="text-sm font-semibold text-white">Observability</h2>
              <ul className="mt-3 space-y-2 text-sm text-slate-300">
                <li>
                  Sentry:{" "}
                  {diagnostics.sentryConfigured
                    ? "DSN configured — runtime errors can forward to Sentry"
                    : "DSN not set — set SENTRY_DSN / NEXT_PUBLIC_SENTRY_DSN"}
                </li>
                <li>App URL: {diagnostics.appUrl}</li>
                <li>Database: {diagnostics.databaseConfigured ? "Connected" : "Not configured"}</li>
              </ul>
            </section>
            <section className="rounded-xl border border-slate-700/80 bg-slate-950/50 px-5 py-5">
              <h2 className="text-sm font-semibold text-white">Planned diagnostics</h2>
              <p className="mt-2 text-sm text-slate-400">
                API health, error rates, webhook logs, background jobs, queue health, deployment
                status, database health, environment variables and service dependencies.
              </p>
            </section>
          </div>
        )}
      </main>
    </>
  );
}

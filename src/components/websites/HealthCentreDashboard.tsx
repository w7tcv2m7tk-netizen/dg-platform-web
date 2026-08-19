import type { SiteHealthSnapshot } from "@dg/platform-core";

function scoreColor(score: number): string {
  if (score >= 85) return "text-emerald-400";
  if (score >= 70) return "text-amber-400";
  return "text-red-400";
}

function statusBadge(status: "pass" | "warn" | "fail") {
  const styles = {
    pass: "bg-emerald-500/15 text-emerald-300 ring-emerald-500/30",
    warn: "bg-amber-500/15 text-amber-300 ring-amber-500/30",
    fail: "bg-red-500/15 text-red-300 ring-red-500/30",
  };
  return (
    <span
      className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset ${styles[status]}`}
    >
      {status}
    </span>
  );
}

function StatCard({
  label,
  value,
  hint,
}: {
  label: string;
  value: string | number;
  hint?: string;
}) {
  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-4">
      <p className="text-xs uppercase tracking-wide text-slate-500">{label}</p>
      <p className="mt-1 text-2xl font-bold text-white">{value}</p>
      {hint ? <p className="mt-1 text-xs text-slate-500">{hint}</p> : null}
    </div>
  );
}

export function HealthCentreDashboard({
  snapshot,
  connectorBaseUrl,
}: {
  snapshot: SiteHealthSnapshot;
  connectorBaseUrl: string;
}) {
  const generated = snapshot.generatedAt
    ? new Date(snapshot.generatedAt).toLocaleString("en-AU")
    : "Unknown";

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Website Health Score™"
          value={snapshot.score}
          hint={snapshot.site || connectorBaseUrl.replace(/\/wp-json.*/, "")}
        />
        <StatCard label="Pass" value={snapshot.pass} />
        <StatCard label="Warnings" value={snapshot.warn} />
        <StatCard label="Failures" value={snapshot.fail} />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="dg-card lg:col-span-2">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h2 className="font-semibold text-white">Health checks</h2>
              <p className="mt-1 text-sm text-slate-400">
                Platform checks from your live site · {generated}
              </p>
            </div>
            <p className={`text-3xl font-bold ${scoreColor(snapshot.score)}`}>
              {snapshot.score}
            </p>
          </div>
          <div className="mt-4 overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-slate-800 text-slate-500">
                  <th className="py-2 pr-4 font-medium">Check</th>
                  <th className="py-2 pr-4 font-medium">Status</th>
                  <th className="py-2 font-medium">Detail</th>
                </tr>
              </thead>
              <tbody>
                {snapshot.checks.map((check) => (
                  <tr key={check.id} className="border-b border-slate-800/60">
                    <td className="py-3 pr-4 text-slate-200">{check.label}</td>
                    <td className="py-3 pr-4">{statusBadge(check.status)}</td>
                    <td className="py-3 text-slate-400">{check.detail}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="space-y-4">
          <div className="dg-card">
            <h2 className="font-semibold text-white">PageSpeed</h2>
            <p className="mt-1 text-sm text-slate-400">
              Google PageSpeed Insights (cached on this site)
            </p>
            <div className="mt-4 grid grid-cols-2 gap-3">
              <StatCard
                label="Mobile"
                value={snapshot.pagespeed.mobile ?? "—"}
              />
              <StatCard
                label="Desktop"
                value={snapshot.pagespeed.desktop ?? "—"}
              />
            </div>
            {snapshot.pagespeed.checkedAt ? (
              <p className="mt-3 text-xs text-slate-500">
                Last checked:{" "}
                {new Date(snapshot.pagespeed.checkedAt).toLocaleString("en-AU")}
              </p>
            ) : (
              <p className="mt-3 text-xs text-slate-500">
                Refresh scores from Health Centre, or wait for the overnight probe
              </p>
            )}
          </div>

          <div className="dg-card">
            <h2 className="font-semibold text-white">SSL</h2>
            <p className="mt-2 text-sm text-slate-300">
              {snapshot.ssl.enabled
                ? "HTTPS enabled on connected site"
                : "HTTPS not detected — review SSL configuration"}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export function HealthCentreError({
  code,
  message,
  connectorBaseUrl,
}: {
  code: string;
  message: string;
  connectorBaseUrl: string;
}) {
  return (
    <div className="dg-card border-amber-500/30 bg-amber-500/5">
      <h2 className="font-semibold text-amber-200">Could not load site health</h2>
      <p className="mt-2 text-sm text-slate-300">{message}</p>
      <dl className="mt-4 space-y-1 text-xs text-slate-500">
        <div>
          <dt className="inline font-medium text-slate-400">Code:</dt>{" "}
          <dd className="inline font-mono">{code}</dd>
        </div>
        <div>
          <dt className="inline font-medium text-slate-400">Connector:</dt>{" "}
          <dd className="inline font-mono">{connectorBaseUrl}</dd>
        </div>
      </dl>
      {code === "not_found" ? (
        <p className="mt-4 text-sm text-slate-400">
          Deploy the latest DG Platform plugin on roerealty.com.au — it adds{" "}
          <code className="text-slate-300">GET /site/health</code> to the dev API.
        </p>
      ) : null}
    </div>
  );
}

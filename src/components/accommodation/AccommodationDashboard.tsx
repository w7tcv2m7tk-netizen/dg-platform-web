import type { WpAccommodationSummary } from "@/lib/dg-api";

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

export function AccommodationDashboard({
  summary,
  error,
  siteLabel,
}: {
  summary?: WpAccommodationSummary;
  error?: string;
  siteLabel?: string;
}) {
  if (error) {
    return (
      <div className="dg-card border-amber-500/30">
        <p className="text-amber-300">{error}</p>
        <p className="mt-2 text-sm text-slate-500">
          Open Settings → Connectors → apply the CVH preset and paste the API key from
          currumbinvalleyhideaway.com.au → DG Platform → API Settings. Do not reuse the Roe or
          DigitalGate key. Or set{" "}
          <code className="text-slate-400">apiKey</code> in{" "}
          <code className="text-slate-400">DG_WP_ACCOMMODATION_SITES</code> /{" "}
          <code className="text-slate-400">DG_WP_ACCOMMODATION_API_KEY</code> on Vercel.
        </p>
      </div>
    );
  }

  if (!summary) {
    return <p className="text-sm text-slate-400">Loading accommodation data…</p>;
  }

  const occupancy =
    typeof summary.occupancy_rate === "number"
      ? `${Math.round(
          summary.occupancy_rate <= 1
            ? summary.occupancy_rate * 100
            : summary.occupancy_rate,
        )}%`
      : "—";

  const revenue =
    summary.revenue_mtd ?? summary.revenue_month;

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Occupancy" value={occupancy} hint={siteLabel ?? summary.site} />
        <StatCard
          label="Check-ins tomorrow"
          value={summary.checkins_tomorrow ?? 0}
        />
        <StatCard
          label="Revenue MTD"
          value={
            typeof revenue === "number"
              ? `$${revenue.toLocaleString("en-AU")}`
              : "—"
          }
        />
        <StatCard label="Site" value={summary.site_profile ?? siteLabel ?? "CVH"} />
      </div>

      {summary.recent_bookings?.length ? (
        <div className="dg-card">
          <h2 className="font-semibold text-white">Recent bookings</h2>
          <ul className="mt-3 space-y-2 text-sm">
            {summary.recent_bookings.slice(0, 5).map((b) => (
              <li
                key={b.id}
                className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800 pb-2 last:border-0"
              >
                <span className="text-slate-200">{b.guest_name ?? b.ref ?? "Guest"}</span>
                <span className="text-slate-500">{b.accommodation}</span>
                <span className="text-xs text-slate-500">
                  {b.checkin} → {b.checkout}
                </span>
                <span className="rounded-full bg-slate-800 px-2 py-0.5 text-xs capitalize text-slate-300">
                  {b.status}
                </span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}

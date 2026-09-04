import Link from "next/link";

import type { AccommodationSummary } from "@/lib/accommodation-summary";

function StatCard({
  label,
  value,
  hint,
  href,
}: {
  label: string;
  value: string | number;
  hint?: string;
  href?: string;
}) {
  const inner = (
    <>
      <p className="text-xs uppercase tracking-wide text-slate-500">{label}</p>
      <p className="mt-1 text-2xl font-bold text-white">{value}</p>
      {hint ? <p className="mt-1 text-xs text-slate-500">{hint}</p> : null}
    </>
  );
  if (href) {
    return (
      <Link
        href={href}
        className="block rounded-xl border border-slate-800 bg-slate-900/50 p-4 transition hover:border-blue-500/40"
      >
        {inner}
      </Link>
    );
  }
  return <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-4">{inner}</div>;
}

function housekeepingDirty(summary?: AccommodationSummary): number {
  const hk = summary?.housekeeping;
  if (!hk) return 0;
  return (hk.dirty ?? 0) + (hk.in_progress ?? 0) + (hk.inspection ?? 0);
}

export function AccommodationDashboard({
  summary,
  error,
  siteLabel,
}: {
  summary?: AccommodationSummary;
  error?: string;
  siteLabel?: string;
}) {
  if (error) {
    return (
      <div className="space-y-6">
        <div className="dg-card border-amber-500/30">
          <p className="text-amber-300">{error}</p>
          <p className="mt-2 text-sm text-slate-500">
            Add units in Accommodation → Units, then open Availability and Bookings. WordPress
            import is optional for legacy migrations only.
          </p>
        </div>
      </div>
    );
  }

  if (!summary) {
    return (
      <div className="space-y-6">
        <div className="dg-card border-dashed border-slate-700">
          <h2 className="text-lg font-semibold text-white">Add your first units</h2>
          <p className="mt-2 max-w-xl text-sm text-slate-400">
            Add units in DigitalGate, set OTA calendar URLs, then open Availability and Bookings.
          </p>
          <div className="mt-4 flex flex-wrap gap-3">
            <Link
              href="/apps/accommodation/units"
              className="rounded-full bg-blue-600 px-5 py-2 text-sm font-semibold text-white hover:bg-blue-500"
            >
              Open units
            </Link>
            <Link
              href="/apps/accommodation/calendar"
              className="rounded-full border border-slate-600 px-5 py-2 text-sm text-slate-300 hover:bg-slate-900"
            >
              Open availability
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const occupancy = `${Math.round(summary.occupancy_rate * 100)}%`;
  const revenue = summary.revenue_mtd;
  const dirty = housekeepingDirty(summary);
  const isEmpty =
    summary.properties === 0 && summary.upcoming_30d === 0 && !summary.recent_bookings.length;

  return (
    <div className="space-y-6">
      {isEmpty ? (
        <div className="dg-card border-dashed border-slate-700">
          <h2 className="text-lg font-semibold text-white">Add your first units</h2>
          <p className="mt-2 max-w-xl text-sm text-slate-400">
            Open Units to manage listings and OTA calendar URLs.
          </p>
          <div className="mt-4 flex flex-wrap gap-3">
            <Link
              href="/apps/accommodation/units"
              className="rounded-full bg-blue-600 px-5 py-2 text-sm font-semibold text-white hover:bg-blue-500"
            >
              Open units
            </Link>
            <Link
              href="/apps/accommodation/calendar"
              className="rounded-full border border-slate-600 px-5 py-2 text-sm text-slate-300 hover:bg-slate-900"
            >
              Open availability
            </Link>
          </div>
        </div>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Occupancy" value={occupancy} hint={siteLabel ?? summary.site} />
        <StatCard
          label="Check-ins today"
          value={summary.checkins_today}
          href="/apps/accommodation/check-ins"
          hint={`${summary.checkouts_today} checkouts today`}
        />
        <StatCard
          label="Check-ins tomorrow"
          value={summary.checkins_tomorrow}
          href="/apps/accommodation/check-ins"
        />
        <StatCard
          label="Revenue MTD"
          value={`$${revenue.toLocaleString("en-AU")}`}
          href="/apps/accommodation/payments"
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Properties" value={summary.properties} href="/apps/accommodation/units" />
        <StatCard label="Guests" value={summary.guests} href="/apps/accommodation/guests" />
        <StatCard label="Upcoming 30d" value={summary.upcoming_30d} href="/apps/accommodation/bookings" />
        <StatCard
          label="Housekeeping"
          value={dirty}
          hint={dirty ? "Need attention" : "All clear"}
          href="/apps/accommodation/housekeeping"
        />
      </div>

      <div className="flex flex-wrap gap-2 text-sm">
        {[
          { href: "/apps/accommodation/bookings", label: "Bookings" },
          { href: "/apps/accommodation/check-ins", label: "Check-ins" },
          { href: "/apps/accommodation/payments", label: "Payments" },
          { href: "/apps/accommodation/housekeeping", label: "Housekeeping" },
          { href: "/apps/accommodation/calendar", label: "Availability" },
          { href: "/apps/accommodation/reviews", label: "Reviews" },
        ].map((l) => (
          <Link
            key={l.href}
            href={l.href}
            className="rounded-full border border-slate-700 px-3 py-1 text-slate-300 hover:border-blue-500 hover:text-white"
          >
            {l.label}
          </Link>
        ))}
      </div>

      {summary.recent_bookings.length ? (
        <div className="dg-card">
          <div className="flex items-baseline justify-between gap-2">
            <h2 className="font-semibold text-white">Recent bookings</h2>
            <Link href="/apps/accommodation/bookings" className="text-xs text-blue-400 hover:underline">
              View all →
            </Link>
          </div>
          <ul className="mt-3 space-y-2 text-sm">
            {summary.recent_bookings.slice(0, 5).map((b) => (
              <li
                key={b.platform_id ?? b.id}
                className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800 pb-2 last:border-0"
              >
                <span className="text-slate-200">{b.guest_name ?? b.ref ?? "Guest"}</span>
                <span className="text-slate-500">{b.accommodation}</span>
                <span className="text-xs text-slate-500">
                  {b.checkin} → {b.checkout}
                </span>
                <span className="rounded-full bg-slate-800 px-2 py-0.5 text-xs capitalize text-slate-300">
                  {b.status}
                  {b.paid === "yes" ? " · paid" : b.paid === "no" ? " · unpaid" : ""}
                </span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}

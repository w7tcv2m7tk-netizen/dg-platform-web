import Link from "next/link";

import type { ReDashboardStats } from "@dg/platform-core";
import type { WpRePipelineSummary } from "@/lib/dg-api";

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
    <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-4 transition hover:border-slate-700">
      <p className="text-xs uppercase tracking-wide text-slate-500">{label}</p>
      <p className="mt-1 text-2xl font-bold text-white">{value}</p>
      {hint ? <p className="mt-1 text-xs text-slate-500">{hint}</p> : null}
    </div>
  );

  return href ? <Link href={href}>{inner}</Link> : inner;
}

const VENDOR_STAGE_LABELS: Record<string, string> = {
  vendor_lead: "Vendor lead",
  appraisal: "Appraisal",
  listing: "Listing",
  sale: "Sale",
  settlement: "Settlement",
  past_client: "Past client",
};

const BUYER_STAGE_LABELS: Record<string, string> = {
  inquiry: "Inquiry",
  qualified: "Qualified",
  viewing: "Viewing",
  offer: "Offer",
  purchased: "Purchased",
};

export function ReDashboard({
  stats,
  wpSummary,
  wpError,
  showWordPress = false,
}: {
  stats: ReDashboardStats;
  wpSummary?: WpRePipelineSummary;
  wpError?: string;
  showWordPress?: boolean;
}) {
  const isEmpty =
    stats.vendorLeads === 0 && stats.buyerLeads === 0 && stats.properties === 0;

  return (
    <div className="space-y-8">
      {isEmpty ? (
        <div className="dg-card border-dashed border-slate-700">
          <h2 className="text-lg font-semibold text-white">
            Add your first vendor lead
          </h2>
          <p className="mt-2 max-w-xl text-sm text-slate-400">
            Start with a vendor lead, book an appraisal, then progress through listing → offer →
            settlement.
            {showWordPress
              ? " Or sync leads from WordPress once the connector is live."
              : " Add contacts and pipeline stages directly in DigitalGate."}
          </p>
          <div className="mt-4 flex flex-wrap gap-3">
            <Link
              href="/apps/re/vendor-leads"
              className="rounded-full bg-blue-600 px-5 py-2 text-sm font-semibold text-white hover:bg-blue-500"
            >
              Add vendor lead
            </Link>
            {showWordPress ? (
              <Link
                href="/dashboard/settings/connectors"
                className="rounded-full border border-slate-600 px-5 py-2 text-sm text-slate-300 hover:bg-slate-900"
              >
                Connect WordPress
              </Link>
            ) : null}
          </div>
        </div>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Vendor leads"
          value={stats.vendorLeads}
          href="/apps/re/vendor-leads"
        />
        <StatCard label="Buyer leads" value={stats.buyerLeads} href="/apps/re/buyer-leads" />
        <StatCard
          label="Active listings"
          value={stats.listed}
          hint={`${stats.underOffer} under offer`}
          href="/apps/re/listings"
        />
        <StatCard
          label="Appraisals"
          value={stats.appraisals}
          hint={`${stats.properties} properties total`}
          href="/apps/re/properties"
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="dg-card">
          <h2 className="font-semibold text-white">Vendor pipeline</h2>
          <ul className="mt-4 space-y-2 text-sm">
            {Object.entries(stats.vendorByStage).map(([stage, count]) => (
              <li key={stage} className="flex justify-between text-slate-300">
                <span>{VENDOR_STAGE_LABELS[stage] ?? stage}</span>
                <span className="font-medium text-white">{count}</span>
              </li>
            ))}
            {!Object.keys(stats.vendorByStage).length ? (
              <li className="text-slate-500">
                No vendor leads yet —{" "}
                <Link href="/apps/re/vendor-leads" className="text-sky-400 hover:underline">
                  add your first
                </Link>
              </li>
            ) : null}
          </ul>
          <Link
            href="/apps/re/vendor-leads"
            className="mt-4 inline-block text-sm text-blue-400 hover:underline"
          >
            Open vendor pipeline →
          </Link>
        </div>

        <div className="dg-card">
          <h2 className="font-semibold text-white">Buyer pipeline</h2>
          <ul className="mt-4 space-y-2 text-sm">
            {Object.entries(stats.buyerByStage).map(([stage, count]) => (
              <li key={stage} className="flex justify-between text-slate-300">
                <span>{BUYER_STAGE_LABELS[stage] ?? stage}</span>
                <span className="font-medium text-white">{count}</span>
              </li>
            ))}
            {!Object.keys(stats.buyerByStage).length ? (
              <li className="text-slate-500">
                No buyer leads yet
                {showWordPress ? " — sync from WordPress or add manually" : " — add manually"}
              </li>
            ) : null}
          </ul>
          <Link
            href="/apps/re/buyer-leads"
            className="mt-4 inline-block text-sm text-blue-400 hover:underline"
          >
            Open buyer pipeline →
          </Link>
        </div>
      </div>

      {showWordPress && wpError ? (
        <div className="dg-card border-amber-500/30">
          <p className="text-sm text-amber-300">WordPress summary unavailable: {wpError}</p>
          <Link
            href="/dashboard/settings/connectors"
            className="mt-2 inline-block text-sm text-sky-400 hover:underline"
          >
            Fix WordPress connector →
          </Link>
        </div>
      ) : showWordPress && wpSummary ? (
        <div className="dg-card">
          <h2 className="font-semibold text-white">WordPress site — last 30 days</h2>
          <div className="mt-4 grid gap-4 sm:grid-cols-3">
            <StatCard
              label="Property reports"
              value={wpSummary.property_reports_this_month ?? "—"}
            />
            <StatCard label="Bookings" value={wpSummary.bookings_this_month ?? "—"} />
            <StatCard label="Site" value={wpSummary.site ?? "Connected"} />
          </div>
        </div>
      ) : null}

      <div className="flex flex-wrap gap-3">
        <Link
          href="/apps/re/bookings"
          className="rounded-full border border-slate-700 px-4 py-2 text-sm text-slate-300 hover:bg-slate-900"
        >
          Bookings
        </Link>
        <Link
          href="/apps/re/settlements"
          className="rounded-full border border-slate-700 px-4 py-2 text-sm text-slate-300 hover:bg-slate-900"
        >
          Settlements
        </Link>
        <Link
          href="/dashboard/apps/real-estate/setup"
          className="rounded-full border border-slate-700 px-4 py-2 text-sm text-slate-300 hover:bg-slate-900"
        >
          Setup guide
        </Link>
      </div>
    </div>
  );
}

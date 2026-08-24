import Link from "next/link";
import {
  REAL_ESTATE_VENDOR_DISCOVERY_PROFILE,
  VENDOR_SIGNAL_CATALOGUE,
  bandForPropertyScore,
} from "@dg/platform-core";

/**
 * Vendor Prospecting — Real Estate Industry App front end.
 * Shared Prospecting Engine · Vendor Discovery mode — not the Growth B2B prospect book.
 * @see docs/foundations/PROSPECTING-ENGINE.md
 */
export default function VendorProspectingPage() {
  const example = bandForPropertyScore(84);
  const workflow = REAL_ESTATE_VENDOR_DISCOVERY_PROFILE.workflowSteps;

  return (
    <>
      <header className="dg-page-header">
        <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Real Estate</p>
        <h1 className="mt-2 text-2xl font-bold text-white">Vendor Prospecting</h1>
        <p className="mt-2 max-w-2xl text-sm text-slate-400">
          The owners most worth speaking to this week — and why. Not a database of every house
          in the suburb.
        </p>
      </header>

      <main className="dg-page-main space-y-10">
        <section className="max-w-2xl space-y-3">
          <p className="text-sm text-slate-300">
            Vendor Discovery runs on the shared Prospecting & Opportunity Engine. Residential
            prospects stay here in the Real Estate App; Business Discovery (agencies, partners)
            stays in Growth.
          </p>
          <p className="text-xs text-slate-500">
            Property market and ownership sources are modular — enabled only after privacy,
            licensing and platform-terms review. Nothing is hard-coded to a single data vendor.
          </p>
        </section>

        <section>
          <h2 className="text-sm font-medium text-slate-200">This week</h2>
          <p className="mt-1 text-sm text-slate-500">
            Live ranked owners appear when CRM + approved market sources are connected. Until
            then, this is the operating model.
          </p>

          <article className="mt-6 max-w-xl border-t border-slate-800 pt-6">
            <p className="text-xs uppercase tracking-wide text-slate-500">
              Property Opportunity Score™ · example
            </p>
            <p className="mt-2 text-3xl font-semibold tabular-nums text-white">
              84
              <span className="ml-2 text-base font-normal text-slate-400">/ 100</span>
            </p>
            <p className="mt-1 text-sm text-sky-300/90">{example.bandLabel}</p>
            <ul className="mt-4 space-y-1.5 text-sm text-slate-400">
              <li>Owned for 11 years</li>
              <li>Comparable properties selling strongly</li>
              <li>Estimated equity: High</li>
              <li>Local buyer demand: High</li>
              <li>Existing CRM relationship · last contacted 14 months ago</li>
            </ul>
            <p className="mt-5 text-sm text-slate-200">
              Recommended action: Offer a complimentary market appraisal.
            </p>
          </article>
        </section>

        <section>
          <h2 className="text-sm font-medium text-slate-200">Workflow</h2>
          <ol className="mt-3 flex flex-wrap gap-x-2 gap-y-1 text-sm text-slate-400">
            {workflow.map((step, i) => (
              <li key={step} className="flex items-center gap-2">
                {i > 0 ? <span className="text-slate-600">→</span> : null}
                <span>{step}</span>
              </li>
            ))}
          </ol>
          <div className="mt-4 flex flex-wrap gap-4 text-sm">
            <Link href="/apps/re/vendor-leads" className="text-sky-400 hover:underline">
              Vendor leads
            </Link>
            <Link href="/apps/re/bookings" className="text-sky-400 hover:underline">
              Appraisals
            </Link>
            <Link href="/apps/re/listings" className="text-sky-400 hover:underline">
              Listings
            </Link>
            <Link href="/apps/prospecting/discovery" className="text-slate-500 hover:underline">
              Business Discovery (Growth)
            </Link>
          </div>
        </section>

        <section>
          <h2 className="text-sm font-medium text-slate-200">Signal catalogue</h2>
          <p className="mt-1 text-sm text-slate-500">
            Scoring inputs the engine can use once lawful sources are attached.
          </p>
          <ul className="mt-4 columns-1 gap-x-8 text-sm text-slate-400 sm:columns-2">
            {VENDOR_SIGNAL_CATALOGUE.map((s) => (
              <li key={s.id} className="mb-1.5 break-inside-avoid">
                {s.label}
              </li>
            ))}
          </ul>
        </section>
      </main>
    </>
  );
}

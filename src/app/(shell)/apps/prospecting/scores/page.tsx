import Link from "next/link";

const DIMENSIONS = [
  {
    label: "Fit",
    example: 92,
    meaning: "Would we want this business as a customer?",
  },
  {
    label: "Need",
    meaning: "Do they have a problem DigitalGate (or you) solve?",
    example: 88,
  },
  {
    label: "Reachability",
    meaning: "Can we actually start a conversation?",
    example: 94,
  },
  {
    label: "Commercial",
    meaning: "Is the deal worth pursuing?",
    example: 81,
  },
  {
    label: "Weakness",
    meaning: "Where are they exposed — digital presence, funnel, process?",
    example: 86,
  },
] as const;

export default async function ProspectingScoresPage() {
  return (
    <>
      <header className="dg-page-header">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-sky-400">
          Opportunity Score™
        </p>
        <h1 className="mt-2 text-2xl font-bold text-white">Opportunity Scoring</h1>
        <p className="mt-2 max-w-2xl text-sm text-slate-400">
          Not a simple lead score. Fit × Need × Reachability × Commercial × Weakness compounds so
          one zero factor collapses the ranking — DigitalGate prioritises; humans decide.
        </p>
      </header>
      <main className="dg-page-main space-y-6">
        <section className="rounded-xl border border-sky-500/25 bg-sky-500/5 px-5 py-5">
          <p className="text-3xl font-semibold text-white">
            87 / 100 <span className="text-lg font-medium text-emerald-300">— High Opportunity</span>
          </p>
          <p className="mt-2 text-sm text-slate-400">
            Illustrative score card — live scores populate as Discovery and Digital Presence signals
            connect.
          </p>
          <ul className="mt-4 grid gap-2 sm:grid-cols-5">
            {DIMENSIONS.map((dim) => (
              <li
                key={dim.label}
                className="rounded-lg border border-slate-700/80 bg-slate-950/50 px-3 py-3"
              >
                <p className="text-xs uppercase tracking-wide text-slate-500">{dim.label}</p>
                <p className="mt-1 text-xl font-semibold text-white">{dim.example}</p>
                <p className="mt-1 text-xs text-slate-500">{dim.meaning}</p>
              </li>
            ))}
          </ul>
          <p className="mt-4 text-sm text-slate-200">
            <span className="text-slate-400">Recommended action:</span> Contact today.
          </p>
        </section>

        <section className="dg-card space-y-3">
          <h2 className="font-semibold text-white">Why this prospect?</h2>
          <p className="text-sm text-slate-400">
            Recommendations should always answer Why, What to say, Best contact, Best channel and
            Next action — not just a number. That is what makes Prospecting & Opportunity Engine
            intelligent rather than a prospect database.
          </p>
          <Link href="/apps/prospecting" className="text-sm text-sky-400 hover:underline">
            See recommendation pattern on overview →
          </Link>
        </section>

        <section className="dg-card space-y-2">
          <p className="text-sm text-slate-300">
            After a sales or qualification call, voice{" "}
            <Link
              href="/apps/ai-communications/call-centre"
              className="text-sky-400 hover:underline"
            >
              Opportunity Intelligence
            </Link>{" "}
            also writes structured scores onto CRM Opportunities. Over time this connects into
            Business Brain / Digital Twin.
          </p>
        </section>
      </main>
    </>
  );
}

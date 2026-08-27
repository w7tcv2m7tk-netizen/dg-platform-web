import Link from "next/link";

import { getPlatformPageContext } from "@/lib/org-apps";

/** Find → Discover → Score → Qualify → Activate → Pipeline → Recommend → Convert */
const JOURNEY = [
  {
    step: "Prospect",
    detail: "Find the right businesses.",
    href: "/apps/prospecting/prospects",
  },
  {
    step: "Discover",
    detail: "Understand their business, digital presence and situation.",
    href: "/apps/prospecting/discovery",
  },
  {
    step: "Score",
    detail: "Fit × Need × Reachability × Commercial × Weakness.",
    href: "/apps/prospecting/scores",
  },
  {
    step: "Qualify",
    detail: "Decide whether the opportunity is worth pursuing.",
    href: "/apps/prospecting/scores",
  },
  {
    step: "Activate",
    detail: "Create or promote Contact, Company and Opportunity in CRM.",
    href: "/apps/crm/contacts",
  },
  {
    step: "Pipeline",
    detail: "Manage the opportunity through the sales process.",
    href: "/apps/prospecting/pipeline",
  },
  {
    step: "AI recommendation",
    detail: "Who to contact, when, and what to do next.",
    href: "/apps/prospecting/scores",
  },
  {
    step: "Follow-up → Conversion",
    detail: "Calls, communications, tasks, automation — won or lost.",
    href: "/apps/prospecting/activity",
  },
] as const;

const MODULES = [
  {
    title: "Discovery",
    body: "Business information, digital presence and market signals.",
  },
  {
    title: "Opportunity Scoring™",
    body: "Fit × Need × Reachability × Commercial × Weakness — not a simple lead score.",
  },
  {
    title: "Prospect Pipeline",
    body: "Track prospects before they become customers.",
  },
  {
    title: "AI Recommendations",
    body: "Know who to contact and what to do next.",
  },
  {
    title: "CRM",
    body: "Promote qualified prospects into the Core CRM — same business context.",
  },
  {
    title: "Follow-up",
    body: "Calls, messages, notes, tasks and follow-ups across your prospect pipeline.",
  },
  {
    title: "Digital Presence Signals",
    body: "Website, SEO, AI Visibility and other connected signals.",
  },
] as const;

const SCORE_EXAMPLE = {
  total: 87,
  band: "High Opportunity",
  dimensions: [
    { label: "Fit", value: 92 },
    { label: "Need", value: 88 },
    { label: "Reachability", value: 94 },
    { label: "Commercial", value: 81 },
    { label: "Weakness", value: 86 },
  ],
  recommendedAction: "Contact today.",
} as const;

const WHY_EXAMPLE = {
  prospect: "ABC Realty",
  why: "High-fit boutique agency with strong local presence but weak AI Visibility, no visible vendor lead funnel and declining website engagement.",
  whatToSay:
    "Introduce the AI Visibility opportunity and offer a complimentary Agency Growth Audit.",
  bestContact: "John Smith — Director",
  bestChannel: "Phone",
  nextAction: "Call today",
} as const;

export default async function ProspectingOverviewPage() {
  const { session } = await getPlatformPageContext();

  return (
    <>
      <header className="dg-page-header">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-sky-400">
          Growth App
        </p>
        <h1 className="mt-2 text-2xl font-bold text-white sm:text-3xl">
          Prospecting & Opportunity Engine
        </h1>
        <p className="mt-3 max-w-2xl text-base text-slate-200">
          Find the right businesses. Understand their situation. Know which opportunities deserve
          your attention.
        </p>
        <p className="mt-3 max-w-2xl text-sm text-slate-400">
          DigitalGate&apos;s intelligent prospecting and opportunity engine turns business discovery
          into qualified pipeline — using business, digital presence, CRM and AI signals in one
          connected system.
        </p>
        <p className="mt-3 text-sm font-medium text-slate-300">
          $99/month · Growth App
          {session?.organisationName ? (
            <span className="font-normal text-slate-500"> · {session.organisationName}</span>
          ) : null}
        </p>
      </header>

      <main className="dg-page-main space-y-8">
        <section className="dg-card space-y-3">
          <h2 className="font-semibold text-white">The journey</h2>
          <p className="text-sm text-slate-400">
            Find → Discover → Score → Qualify → Activate → Pipeline → Recommend → Convert
          </p>
          <p className="text-sm text-slate-500">
            One App — not separate charges for Prospecting, Discovery or Opportunity Engine.
            Applications are capabilities within an operating system, not a collection of
            micro-subscriptions.
          </p>
          <ol className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {JOURNEY.map((item, index) => (
              <li key={item.step}>
                <Link
                  href={item.href}
                  className="block h-full rounded-xl border border-slate-700/80 bg-slate-950/50 p-4 transition hover:border-sky-500/50"
                >
                  <p className="text-xs font-semibold uppercase tracking-widest text-sky-400">
                    {index + 1}. {item.step}
                  </p>
                  <p className="mt-2 text-sm text-slate-300">{item.detail}</p>
                </Link>
              </li>
            ))}
          </ol>
        </section>

        <section className="rounded-xl border border-sky-500/25 bg-sky-500/5 px-5 py-5">
          <p className="text-xs font-medium uppercase tracking-[0.18em] text-sky-400">
            Opportunity Score™
          </p>
          <p className="mt-2 text-3xl font-semibold text-white">
            {SCORE_EXAMPLE.total} / 100{" "}
            <span className="text-lg font-medium text-emerald-300">— {SCORE_EXAMPLE.band}</span>
          </p>
          <p className="mt-2 text-sm text-slate-400">
            This is not a simple lead score. It compounds Fit × Need × Reachability × Commercial ×
            Weakness — so one weak factor can collapse the ranking.
          </p>
          <ul className="mt-4 grid gap-2 sm:grid-cols-5">
            {SCORE_EXAMPLE.dimensions.map((dim) => (
              <li
                key={dim.label}
                className="rounded-lg border border-slate-700/80 bg-slate-950/50 px-3 py-2 text-center"
              >
                <p className="text-xs uppercase tracking-wide text-slate-500">{dim.label}</p>
                <p className="mt-1 text-lg font-semibold text-white">{dim.value}</p>
              </li>
            ))}
          </ul>
          <p className="mt-4 text-sm text-slate-200">
            <span className="text-slate-400">Recommended action:</span>{" "}
            {SCORE_EXAMPLE.recommendedAction}
          </p>
          <Link
            href="/apps/prospecting/scores"
            className="mt-3 inline-block text-sm text-sky-400 hover:underline"
          >
            Open Opportunity Scoring →
          </Link>
        </section>

        <section className="rounded-xl border border-violet-500/25 bg-violet-500/5 px-5 py-5">
          <p className="text-xs font-medium uppercase tracking-[0.18em] text-violet-400">
            Why this prospect?
          </p>
          <h2 className="mt-2 text-lg font-semibold text-white">
            Contact {WHY_EXAMPLE.prospect} today
          </h2>
          <dl className="mt-4 space-y-3 text-sm">
            <div>
              <dt className="text-xs uppercase tracking-wide text-slate-500">Why</dt>
              <dd className="mt-1 text-slate-300">{WHY_EXAMPLE.why}</dd>
            </div>
            <div>
              <dt className="text-xs uppercase tracking-wide text-slate-500">What to say</dt>
              <dd className="mt-1 text-slate-300">{WHY_EXAMPLE.whatToSay}</dd>
            </div>
            <div className="grid gap-3 sm:grid-cols-3">
              <div>
                <dt className="text-xs uppercase tracking-wide text-slate-500">Best contact</dt>
                <dd className="mt-1 text-slate-200">{WHY_EXAMPLE.bestContact}</dd>
              </div>
              <div>
                <dt className="text-xs uppercase tracking-wide text-slate-500">Best channel</dt>
                <dd className="mt-1 text-slate-200">{WHY_EXAMPLE.bestChannel}</dd>
              </div>
              <div>
                <dt className="text-xs uppercase tracking-wide text-slate-500">Next action</dt>
                <dd className="mt-1 font-medium text-emerald-200">{WHY_EXAMPLE.nextAction}</dd>
              </div>
            </div>
          </dl>
          <p className="mt-4 text-xs text-slate-500">
            Illustrative recommendation pattern — live recommendations wire into Business Brain /
            Digital Twin as signals mature.
          </p>
        </section>

        <section className="dg-card space-y-3">
          <h2 className="font-semibold text-white">What&apos;s included</h2>
          <ul className="grid gap-3 sm:grid-cols-2">
            {MODULES.map((item) => (
              <li
                key={item.title}
                className="rounded-xl border border-slate-800 bg-slate-950/40 px-4 py-3"
              >
                <p className="font-medium text-white">{item.title}</p>
                <p className="mt-1 text-sm text-slate-400">{item.body}</p>
              </li>
            ))}
          </ul>
        </section>

        <section className="rounded-xl border border-dashed border-slate-700 bg-slate-950/30 px-5 py-4">
          <p className="text-xs font-medium uppercase tracking-[0.16em] text-slate-500">
            DigitalGate operator note
          </p>
          <p className="mt-2 text-sm text-slate-400">
            DigitalGate&apos;s own GTM prospecting remains under{" "}
            <Link href="/command/growth-engine" className="text-sky-400 hover:underline">
              Command Centre → Prospecting
            </Link>
            . This Growth App is the{" "}
            <span className="text-slate-200">tenant-facing product</span> — customers use it to find
            and convert <em>their</em> prospects.
          </p>
        </section>
      </main>
    </>
  );
}

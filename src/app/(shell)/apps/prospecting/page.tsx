import Link from "next/link";

import { ProspectingSubnav } from "@/components/prospecting/ProspectingSubnav";
import { getPlatformPageContext } from "@/lib/org-apps";

const JOURNEY = [
  {
    step: "Prospect",
    detail: "Find and organise target businesses",
    href: "/apps/prospecting/prospects",
  },
  {
    step: "Discovery",
    detail: "Understand their current situation",
    href: "/apps/prospecting/discovery",
  },
  {
    step: "Opportunity score",
    detail: "Fit × Need × Reachability × Commercial × Weakness",
    href: "/apps/prospecting/scores",
  },
  {
    step: "CRM",
    detail: "Promote qualified prospects to Contact / Company",
    href: "/apps/crm/contacts",
  },
  {
    step: "Pipeline",
    detail: "Track through the sales process",
    href: "/apps/prospecting/pipeline",
  },
  {
    step: "AI recommendation",
    detail: "Who to contact and what to do next",
    href: "/apps/prospecting/scores",
  },
  {
    step: "Follow-up",
    detail: "Calls, notes, tasks and activity",
    href: "/apps/prospecting/activity",
  },
  {
    step: "Conversion",
    detail: "Opportunity in CRM + automation",
    href: "/apps/crm/opportunities",
  },
] as const;

const CAPABILITIES = [
  {
    title: "Prospecting",
    body: "Find and organise target businesses — not a disconnected list tool.",
  },
  {
    title: "Discovery",
    body: "Structured discovery of the prospect’s current situation and systems.",
  },
  {
    title: "Opportunity scoring",
    body: "Fit × Need × Reachability × Commercial × Weakness → ranked next actions.",
  },
  {
    title: "Pipeline",
    body: "Track prospects through the sales process in one place.",
  },
  {
    title: "Activity",
    body: "Calls, notes, tasks and follow-ups against each prospect.",
  },
  {
    title: "AI recommendations",
    body: "Identify who to contact and what to do next.",
  },
  {
    title: "Digital Presence",
    body: "Website, SEO, AI Visibility and related signals feed the score.",
  },
  {
    title: "CRM integration",
    body: "Qualified prospects become Contacts, Companies and Opportunities.",
  },
] as const;

export default async function ProspectingOverviewPage() {
  const { session } = await getPlatformPageContext();

  return (
    <>
      <header className="dg-page-header">
        <h1 className="text-2xl font-bold text-white">Prospecting & Opportunity Engine</h1>
        <p className="text-sm text-slate-400">
          {session?.organisationName ?? "DigitalGate"} · Find → understand → score → pipeline →
          CRM · $99/mo Growth App
        </p>
        <ProspectingSubnav active="/apps/prospecting" />
      </header>
      <main className="dg-page-main space-y-8">
        <section className="dg-card space-y-3">
          <h2 className="font-semibold text-white">The journey</h2>
          <p className="text-sm text-slate-400">
            One App — not separate charges for Prospecting, Discovery or Opportunity Engine.
            Once qualified, the prospect joins the same CRM + Opportunity + AI + Automation
            ecosystem.
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

        <section className="dg-card space-y-3">
          <h2 className="font-semibold text-white">What’s included</h2>
          <ul className="grid gap-3 sm:grid-cols-2">
            {CAPABILITIES.map((item) => (
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

        <section className="dg-card space-y-2">
          <h2 className="font-semibold text-white">Demo framing</h2>
          <p className="text-sm text-slate-300">
            Find the right businesses → understand their situation → identify the opportunity →
            qualify it → put it into your pipeline → follow it through to conversion.
          </p>
          <p className="text-sm text-slate-500">
            Staff operating surface for DigitalGate GTM remains under Command Centre Prospecting;
            this Growth App is the tenant product.
          </p>
        </section>
      </main>
    </>
  );
}

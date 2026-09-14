import Link from "next/link";

import { getPlatformPageContext } from "@/lib/org-apps";

const SPECIALIST_APPS = [
  { href: "/apps/seo", name: "SEO", description: "Search performance and optimisation." },
  { href: "/apps/ai-visibility", name: "AI Visibility", description: "Understand and improve how AI systems recommend your business." },
  { href: "/apps/reputation", name: "Reputation", description: "Reviews, reputation signals and customer advocacy." },
  { href: "/apps/social", name: "Social", description: "Social publishing, engagement and performance." },
];

export default async function MarketingPage() {
  await getPlatformPageContext();
  return (
    <>
      <header className="dg-page-header">
        <p className="text-xs font-medium uppercase tracking-[0.2em] text-sky-400">Growth App</p>
        <h1 className="mt-1 text-2xl font-bold text-white">Marketing</h1>
        <p className="mt-1 max-w-3xl text-sm text-slate-400">Your growth command workspace for campaigns, audiences, lead generation, attribution and optimisation.</p>
      </header>
      <main className="dg-page-main space-y-6">
        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {[["Campaigns", "Plan and coordinate campaigns across your growth channels."], ["Audiences", "Turn CRM and Business Brain context into useful customer segments."], ["Funnels", "See how attention becomes enquiries, opportunities and customers."], ["Attribution", "Connect growth activity to leads, pipeline and revenue."]].map(([title, copy]) => <div key={title} className="dg-card"><h2 className="font-semibold text-white">{title}</h2><p className="mt-2 text-sm text-slate-400">{copy}</p></div>)}
        </section>
        <section className="dg-card">
          <div className="flex flex-wrap items-end justify-between gap-3"><div><p className="text-xs font-medium uppercase tracking-wide text-sky-400">Connected Growth</p><h2 className="mt-1 text-lg font-semibold text-white">Specialist growth apps</h2><p className="mt-1 text-sm text-slate-400">Marketing is the umbrella workspace. Specialist apps provide the channel intelligence and execution signals that feed it.</p></div><Link href="/dashboard/apps" className="text-sm font-medium text-sky-400 hover:underline">Manage Growth Apps →</Link></div>
          <div className="mt-4 grid gap-3 md:grid-cols-2">{SPECIALIST_APPS.map((app) => <Link key={app.href} href={app.href} className="rounded-xl border border-white/10 bg-white/[0.02] p-4 transition hover:border-sky-500/30 hover:bg-white/[0.04]"><h3 className="font-medium text-white">{app.name}</h3><p className="mt-1 text-sm text-slate-400">{app.description}</p></Link>)}</div>
        </section>
        <section className="dg-card border-amber-500/20"><p className="text-xs font-medium uppercase tracking-wide text-amber-300">Build horizon</p><h2 className="mt-1 font-semibold text-white">One measurable growth loop</h2><p className="mt-2 text-sm text-slate-400">The Marketing workspace is being expanded around a single closed loop: audience → campaign → enquiry → pipeline → revenue → optimisation. Existing specialist Growth Apps remain usable independently while their signals converge here.</p></section>
      </main>
    </>
  );
}

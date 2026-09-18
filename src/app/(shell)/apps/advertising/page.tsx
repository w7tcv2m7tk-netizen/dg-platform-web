import Link from "next/link";
import { getPlatformPageContext } from "@/lib/org-apps";

export default async function AdvertisingPage() {
  await getPlatformPageContext();
  return <>
    <header className="dg-page-header">
      <p className="text-xs font-medium uppercase tracking-[0.2em] text-sky-400">Growth App</p>
      <h1 className="mt-1 text-2xl font-bold text-white">Advertising</h1>
      <p className="mt-1 max-w-3xl text-sm text-slate-400">Understand paid media spend, campaign performance, leads and revenue across connected advertising channels.</p>
    </header>
    <main className="dg-page-main space-y-6">
      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {[
          ["Spend", "Paid media investment across connected channels."],
          ["Campaigns", "Campaign, ad set and ad performance in one workspace."],
          ["Leads & conversions", "Connect advertising activity to enquiries and outcomes."],
          ["Attribution", "Follow paid acquisition through pipeline and revenue."],
        ].map(([title,copy])=><div key={title} className="dg-card"><h2 className="font-semibold text-white">{title}</h2><p className="mt-2 text-sm text-slate-400">{copy}</p></div>)}
      </section>
      <section className="dg-card">
        <p className="text-xs font-medium uppercase tracking-wide text-sky-400">Advertising channels</p>
        <h2 className="mt-1 text-lg font-semibold text-white">Meta Ads</h2>
        <p className="mt-2 text-sm text-slate-400">Meta is the first live advertising provider. Connect Meta and discover the ad accounts available to this organisation before performance evidence is ingested.</p>
        <Link href="/apps/social/accounts" className="mt-4 inline-block text-sm font-medium text-sky-400 hover:underline">Manage Meta connection →</Link>
      </section>
      <section className="dg-card border-white/10">
        <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Business intelligence</p>
        <h2 className="mt-1 font-semibold text-white">Evidence before recommendations</h2>
        <p className="mt-2 text-sm text-slate-400">Advertising will use tenant-assigned accounts and canonical channel evidence so Digital Twin and Aida can reason from real spend, delivery, lead and revenue signals rather than inferred performance.</p>
      </section>
    </main>
  </>;
}

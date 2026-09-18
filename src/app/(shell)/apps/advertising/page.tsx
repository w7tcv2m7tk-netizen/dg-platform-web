import Link from "next/link";
import { getPlatformPageContext } from "@/lib/org-apps";
import { fetchOrgGoogleAdsEvidence, fetchOrgMetaAdsEvidence, fetchOrgMicrosoftAdsEvidence } from "@dg/platform-core";
import { GoogleAdsConnectorPanel } from "@/components/settings/GoogleAdsConnectorPanel";
import { MicrosoftAdsConnectorPanel } from "@/components/settings/MicrosoftAdsConnectorPanel";

export default async function AdvertisingPage() {
  const ctx=await getPlatformPageContext();
  const [meta, googleAds, microsoftAds] = ctx.session
    ? await Promise.all([fetchOrgMetaAdsEvidence(ctx.session.organisationId), fetchOrgGoogleAdsEvidence(ctx.session.organisationId), fetchOrgMicrosoftAdsEvidence(ctx.session.organisationId)])
    : [{ ok: false as const, message: "No active organisation session" }, { ok: false as const, message: "No active organisation session" }, { ok: false as const, message: "No active organisation session" }];
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
      <section className="dg-card">{meta.ok&&meta.data.length?<div className="mb-5 grid gap-3 md:grid-cols-4">{[["Spend",`${meta.data.reduce((n,x)=>n+x.performance.spend,0).toFixed(2)}`],["Impressions",meta.data.reduce((n,x)=>n+x.performance.impressions,0).toLocaleString()],["Reach",meta.data.reduce((n,x)=>n+x.performance.reach,0).toLocaleString()],["Clicks",meta.data.reduce((n,x)=>n+x.performance.clicks,0).toLocaleString()]].map(([k,v])=><div key={k} className="rounded-lg border border-slate-800 bg-slate-950/40 p-3"><p className="text-xs text-slate-500">{k} · last 30 days</p><p className="mt-1 text-xl font-semibold text-white">{v}</p></div>)}</div>:<p className="mb-4 text-sm text-amber-400">{meta.ok?"No selected Meta Ads evidence is available.":meta.message}</p>}
        <p className="text-xs font-medium uppercase tracking-wide text-sky-400">Advertising channels</p>
        <h2 className="mt-1 text-lg font-semibold text-white">Meta Ads</h2>
        <p className="mt-2 text-sm text-slate-400">Meta is the first live advertising provider. Connect Meta and discover the ad accounts available to this organisation before performance evidence is ingested.</p>
        {meta.ok?meta.data.map(x=><div key={x.account.id} className="mt-4"><p className="text-sm font-medium text-white">{x.account.name||x.account.accountId||x.account.id}</p><p className="mt-1 text-xs text-slate-500">{x.campaigns.length} campaigns returned · {x.period}</p>{x.campaigns.slice(0,10).map(c=><div key={c.id} className="mt-2 rounded-lg border border-slate-800 px-3 py-2 text-sm text-slate-300">{c.name}<span className="ml-2 text-xs text-slate-500">{c.status||""}</span></div>)}</div>):null}<Link href="/apps/social/accounts" className="mt-4 inline-block text-sm font-medium text-sky-400 hover:underline">Manage Meta connection →</Link>
      </section>
      <GoogleAdsConnectorPanel />
      <MicrosoftAdsConnectorPanel />
      <section className="dg-card">
        <p className="text-xs font-medium uppercase tracking-wide text-sky-400">Google Ads evidence</p>
        <h2 className="mt-1 text-lg font-semibold text-white">Last 30 days</h2>
        {googleAds.ok&&googleAds.data.length?<><div className="mt-4 grid gap-3 md:grid-cols-5">{[["Spend",googleAds.data.reduce((n,x)=>n+x.performance.spend,0).toFixed(2)],["Impressions",googleAds.data.reduce((n,x)=>n+x.performance.impressions,0).toLocaleString()],["Clicks",googleAds.data.reduce((n,x)=>n+x.performance.clicks,0).toLocaleString()],["Conversions",googleAds.data.reduce((n,x)=>n+x.performance.conversions,0).toFixed(1)],["Conversion value",googleAds.data.reduce((n,x)=>n+x.performance.conversionsValue,0).toFixed(2)]].map(([k,v])=><div key={k} className="rounded-lg border border-slate-800 bg-slate-950/40 p-3"><p className="text-xs text-slate-500">{k}</p><p className="mt-1 text-xl font-semibold text-white">{v}</p></div>)}</div>{googleAds.data.map(x=><div key={x.customerId} className="mt-4"><p className="text-sm font-medium text-white">Customer {x.customerId}</p><p className="mt-1 text-xs text-slate-500">{x.campaigns.length} campaigns returned · {x.period}</p>{x.campaigns.slice(0,10).map(c=><div key={c.id} className="mt-2 flex items-center justify-between gap-3 rounded-lg border border-slate-800 px-3 py-2 text-sm"><span className="text-slate-300">{c.name}<span className="ml-2 text-xs text-slate-500">{c.status||""}</span></span><span className="text-xs text-slate-500">{c.clicks.toLocaleString()} clicks · {c.cost.toFixed(2)} spend</span></div>)}</div>)}</>:<p className="mt-3 text-sm text-amber-400">{googleAds.ok?"Select a Google Ads account above to load live performance evidence.":googleAds.message}</p>}
      </section>
      <section className="dg-card">
        <p className="text-xs font-medium uppercase tracking-wide text-sky-400">Microsoft Advertising evidence</p>
        <h2 className="mt-1 text-lg font-semibold text-white">Last 30 days</h2>
        {microsoftAds.ok&&microsoftAds.data.length?<><div className="mt-4 grid gap-3 md:grid-cols-5">{[["Spend",microsoftAds.data.reduce((n,x)=>n+x.performance.spend,0).toFixed(2)],["Impressions",microsoftAds.data.reduce((n,x)=>n+x.performance.impressions,0).toLocaleString()],["Clicks",microsoftAds.data.reduce((n,x)=>n+x.performance.clicks,0).toLocaleString()],["Conversions",microsoftAds.data.reduce((n,x)=>n+x.performance.conversions,0).toFixed(1)],["Conversion value",microsoftAds.data.reduce((n,x)=>n+x.performance.conversionValue,0).toFixed(2)]].map(([k,v])=><div key={k} className="rounded-lg border border-slate-800 bg-slate-950/40 p-3"><p className="text-xs text-slate-500">{k}</p><p className="mt-1 text-xl font-semibold text-white">{v}</p></div>)}</div>{microsoftAds.data.map(x=><div key={x.account.accountId} className="mt-4"><p className="text-sm font-medium text-white">{x.account.name||`Microsoft Ads account ${x.account.accountId}`}</p><p className="mt-1 text-xs text-slate-500">{x.campaigns.length} campaigns returned · {x.period}</p>{x.campaigns.slice(0,10).map(c=><div key={c.id} className="mt-2 flex items-center justify-between gap-3 rounded-lg border border-slate-800 px-3 py-2 text-sm"><span className="text-slate-300">{c.name}<span className="ml-2 text-xs text-slate-500">{c.status||""}</span></span><span className="text-xs text-slate-500">{c.clicks.toLocaleString()} clicks · {c.spend.toFixed(2)} spend</span></div>)}</div>)}</>:<p className="mt-3 text-sm text-amber-400">{microsoftAds.ok?"Select a Microsoft Advertising account above to load live performance evidence.":microsoftAds.message}</p>}
      </section>
      <section className="dg-card border-white/10">
        <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Business intelligence</p>
        <h2 className="mt-1 font-semibold text-white">Evidence before recommendations</h2>
        <p className="mt-2 text-sm text-slate-400">Advertising will use tenant-assigned accounts and canonical channel evidence so Digital Twin and Aida can reason from real spend, delivery, lead and revenue signals rather than inferred performance.</p>
      </section>
    </main>
  </>;
}

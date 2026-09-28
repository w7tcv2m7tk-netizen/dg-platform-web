"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useEnabledAppsOptional } from "@/components/platform/EnabledAppsProvider";
import { LendConnectorPanel } from "@/components/finance/LendConnectorPanel";
import { IllionBankStatementsPanel } from "@/components/finance/IllionBankStatementsPanel";
import { EquifaxConnectorPanel } from "@/components/finance/EquifaxConnectorPanel";
import { VedacheckConnectorPanel } from "@/components/finance/VedacheckConnectorPanel";

type Step = "intro" | "recommended" | "review" | "finish";

type Recommendation = { label:string; detail:string; kind:"finance"|"standard"; priorities:string[] };

const SPECIALIST: Record<string,Recommendation> = {
  "mortgage-broking": { label:"Specialist finance connections", detail:"Lend, illion BankStatements, Equifax and Vedacheck are prepared for Mortgage & Finance Broking. Scale or Enterprise is required before specialist Industry API connections can be authorised.", kind:"finance", priorities:["Lend","illion BankStatements","Equifax","Vedacheck"] },
  "real-estate-agency": { label:"Real estate connections", detail:"Start with the systems that support listings, enquiries, advertising and customer relationships.", kind:"standard", priorities:["Google Business Profile","Google Ads","Meta","LinkedIn"] },
  "short-stay": { label:"Accommodation connections", detail:"Start with the services that support reputation, guest acquisition, communications and marketing.", kind:"standard", priorities:["Google Business Profile","Google Ads","Meta","YouTube"] },
  "musicians": { label:"Music & audience connections", detail:"Start with the marketing, audience, social and content services you already use.", kind:"standard", priorities:["Meta","YouTube","TikTok Ads","LinkedIn"] },
};

const DEFAULT_RECOMMENDATION: Recommendation = { label:"Recommended connections", detail:"Start with the customer, marketing and communications systems your business already uses.", kind:"standard", priorities:["Google Business Profile","Google Ads","Meta","LinkedIn"] };

export function ConnectBusinessSetup(){
  const apps=useEnabledAppsOptional();
  const [step,setStep]=useState<Step>("intro");
  const [skipped,setSkipped]=useState(false);
  const recommendation=useMemo(()=>{
    const ids=apps?.industrySelectionIds??[];
    for(const id of ids){if(SPECIALIST[id])return SPECIALIST[id];}
    return DEFAULT_RECOMMENDATION;
  },[apps?.industrySelectionIds]);

  if(step==="intro")return <section className="mx-auto max-w-4xl space-y-6 py-8">
    <div className="rounded-3xl border border-violet-400/25 bg-violet-500/[0.07] p-8">
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-violet-300">Aida · Setup 2</p>
      <h1 className="mt-3 text-3xl font-semibold text-white">Now let’s connect your business</h1>
      <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-400">Your workspace is already configured. This short second setup helps me connect the systems you use so Business Brain, reporting and automation can work with authorised business data.</p>
      <div className="mt-6 flex flex-wrap gap-3"><button onClick={()=>setStep("recommended")} className="rounded-full bg-violet-600 px-6 py-3 text-sm font-semibold text-white">Start connection setup →</button><Link href="/dashboard" className="rounded-full border border-white/10 px-6 py-3 text-sm font-semibold text-slate-300">Do this later</Link></div>
    </div>
  </section>;

  if(step==="finish")return <section className="mx-auto max-w-4xl py-8"><div className="rounded-3xl border border-emerald-500/20 bg-emerald-500/[0.05] p-8"><p className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-300">Connection setup complete</p><h1 className="mt-3 text-3xl font-semibold text-white">{skipped?"You’re ready to keep working":"Your connected workspace is ready"}</h1><p className="mt-3 max-w-2xl text-sm leading-6 text-slate-400">You can add, replace or manage connections at any time from Connected Services. DigitalGate only uses services and resources you authorise.</p><Link href="/dashboard" className="mt-6 inline-flex rounded-full bg-violet-600 px-6 py-3 text-sm font-semibold text-white">Open Business Overview →</Link></div></section>;

  if(step==="review")return <section className="mx-auto max-w-4xl space-y-6 py-8">
    <div><p className="text-xs font-semibold uppercase tracking-[0.18em] text-violet-300">Aida · Guided connection review</p><h1 className="mt-2 text-3xl font-semibold text-white">Connect what matters first</h1><p className="mt-2 max-w-3xl text-sm leading-6 text-slate-400">Stay in this setup while you review the connections selected for your business. You can skip anything and manage the full catalogue later.</p></div>
    {recommendation.kind==="finance" ? <div className="space-y-4"><div className="rounded-xl border border-amber-500/20 bg-amber-500/[0.05] px-4 py-3 text-sm text-amber-100">Specialist Industry API connections require Scale or Enterprise. The connector cards below remain the source of truth for availability and authorisation.</div><LendConnectorPanel/><IllionBankStatementsPanel/><EquifaxConnectorPanel/><VedacheckConnectorPanel/></div> : <div className="grid gap-3 sm:grid-cols-2">{recommendation.priorities.map((name,index)=><div key={name} className="rounded-2xl border border-slate-800 bg-slate-950/40 p-5"><p className="text-xs font-semibold uppercase tracking-[0.14em] text-sky-300">Priority {index+1}</p><h2 className="mt-2 text-lg font-semibold text-white">{name}</h2><p className="mt-2 text-sm leading-6 text-slate-400">Recommended for this setup. Review and authorise this service from the connection catalogue when you are ready.</p><span className="mt-4 inline-flex rounded-full border border-white/10 px-4 py-2 text-xs font-semibold text-slate-400">Available to review</span></div>)}</div>}
    <div className="flex flex-wrap items-center justify-between gap-3"><button onClick={()=>setStep("recommended")} className="text-sm text-slate-500 hover:text-slate-300">← Back</button><div className="flex flex-wrap gap-3"><button onClick={()=>{setSkipped(true);setStep("finish")}} className="rounded-full border border-white/10 px-5 py-2.5 text-sm font-semibold text-slate-300">Skip remaining</button><button onClick={()=>setStep("finish")} className="rounded-full bg-violet-600 px-5 py-2.5 text-sm font-semibold text-white">Finish connection setup →</button></div></div>
  </section>;

  return <section className="mx-auto max-w-4xl space-y-6 py-8">
    <div><p className="text-xs font-semibold uppercase tracking-[0.18em] text-violet-300">Aida · Connect your business</p><h1 className="mt-2 text-3xl font-semibold text-white">Recommended for your setup</h1><p className="mt-2 text-sm text-slate-400">I’ve prioritised this from your Industry Template and selected Apps. Nothing here is required to keep using your workspace.</p></div>
    <div className="rounded-2xl border border-sky-500/20 bg-sky-500/[0.04] p-6"><p className="text-xs font-semibold uppercase tracking-[0.14em] text-sky-300">Recommended first</p><h2 className="mt-2 text-xl font-semibold text-white">{recommendation.label}</h2><p className="mt-2 text-sm leading-6 text-slate-400">{recommendation.detail}</p><div className="mt-4 flex flex-wrap gap-2">{recommendation.priorities.map(name=><span key={name} className="rounded-full border border-slate-700 bg-slate-950/40 px-3 py-1.5 text-xs text-slate-300">{name}</span>)}</div><div className="mt-5 flex flex-wrap gap-3"><button onClick={()=>setStep("review")} className="rounded-full bg-sky-600 px-5 py-2.5 text-sm font-semibold text-white">Review connections →</button><button onClick={()=>{setSkipped(true);setStep("finish")}} className="rounded-full border border-white/10 px-5 py-2.5 text-sm font-semibold text-slate-300">Skip for now</button></div></div>
    <div className="flex items-center justify-between"><button onClick={()=>setStep("intro")} className="text-sm text-slate-500 hover:text-slate-300">← Back</button><button onClick={()=>setStep("finish")} className="text-sm font-medium text-violet-300 hover:text-violet-200">Finish connection setup →</button></div>
  </section>;
}

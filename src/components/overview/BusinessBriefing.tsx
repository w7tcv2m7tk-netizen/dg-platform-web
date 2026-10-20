"use client";

import { useChatWidget } from "@/components/platform/ChatWidgetProvider";
import type { BriefingState } from "@/lib/business-briefing/contract";
import { safeSourceUrl } from "@/lib/business-briefing/contract";

export function BusinessBriefing({ state }: { state: BriefingState }) {
  const { openSupportChat } = useChatWidget();
  if (state.status === "disabled" || state.status === "forbidden") return null;
  const briefing = state.status === "ready" ? state.briefing : null;
  return <section aria-labelledby="business-briefing-title" aria-busy={state.status === "loading"} className="rounded-2xl border border-violet-500/20 bg-violet-500/5 p-5 sm:p-6">
    <h2 id="business-briefing-title" className="text-xs font-semibold uppercase tracking-[0.18em] text-violet-300">Your Business Briefing</h2>
    {briefing ? <>
      <h3 className="mt-3 text-xl font-semibold text-white">{briefing.headline}</h3>
      <p className="mt-2 text-xs text-slate-400">{briefing.industry} · {briefing.geography} · Last updated <time dateTime={briefing.generatedAt}>{briefing.generatedAt.replace("T", " ")}</time></p>
      <ul className="mt-4 space-y-4">{briefing.insights.map(insight => <li key={insight.id} className="rounded-xl border border-slate-800 p-4">
        <p className="font-medium text-white">{insight.title}</p>
        <p className="mt-2 text-sm text-slate-300">Why it matters: {insight.whyItMatters}</p>
        <p className="mt-2 text-sm text-violet-200">Next action: {insight.nextAction}</p>
        <p className="mt-2 text-xs text-slate-400">{insight.uncertainty}</p>
        <ul className="mt-2 flex flex-wrap gap-3 text-xs text-slate-400">{insight.sourceIds.map(id => {
          const source = briefing.sources.find(s => s.id === id);
          if (!source) return null;
          const url = safeSourceUrl(source.url);
          return <li key={id}>{url ? <a href={url} target="_blank" rel="noopener noreferrer" className="underline">{source.label}</a> : <span>{source.label}</span>} · {source.reference} · <time dateTime={source.observedAt}>{source.observedAt}</time></li>;
        })}</ul>
      </li>)}</ul>
    </> : <p role={state.status === "error" ? "alert" : "status"} className="mt-4 text-sm text-slate-300">{state.status === "loading" ? "Loading your business briefing…" : state.status === "error" ? "Your briefing could not be loaded. Please refresh to try again." : "No verified business briefing is available yet. Industry sources and business evidence must be approved before a briefing can be published."}</p>}
    <div className="mt-5 flex flex-wrap items-center gap-3">
      <button disabled title="Briefing playback is not available yet" className="rounded-full border border-slate-700 px-4 py-2 text-sm text-slate-500 disabled:cursor-not-allowed">Listen to Briefing</button>
      <button onClick={() => openSupportChat(briefing ? `Help me understand my Business Briefing from ${briefing.generatedAt}. What verified business evidence should I review?` : "What business evidence and industry sources are needed for my Business Briefing?")} className="rounded-full bg-violet-600 px-4 py-2 text-sm font-semibold text-white hover:bg-violet-500">Ask Aida</button>
      <a href="#growth-opportunities" className="text-sm text-violet-300 hover:underline">View Opportunities →</a>
    </div>
  </section>;
}

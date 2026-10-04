"use client";

import { useState } from "react";

export function ProspectReportActions({ prospectId, canGenerate }: { prospectId: string; canGenerate: boolean }) {
  const [shareUrl,setShareUrl]=useState<string|null>(null);
  const [loading,setLoading]=useState(false);
  const [error,setError]=useState<string|null>(null);

  async function generate() {
    setLoading(true); setError(null);
    try {
      const res=await fetch(`/api/v1/prospecting/prospects/${prospectId}/report`,{method:"POST"});
      const json=await res.json().catch(()=>null);
      if(!res.ok) throw new Error(json?.error?.message || "Report generation failed.");
      setShareUrl(json.data.shareUrl);
    } catch(e) { setError(e instanceof Error ? e.message : "Report generation failed."); }
    finally { setLoading(false); }
  }

  async function copy() {
    if(!shareUrl) return;
    await navigator.clipboard.writeText(shareUrl);
  }

  return <div className="mt-5">
    <div className="flex flex-wrap gap-2">
      <button type="button" onClick={()=>void generate()} disabled={!canGenerate||loading} className="rounded-lg bg-violet-600 px-4 py-2 text-sm font-medium text-white hover:bg-violet-500 disabled:cursor-not-allowed disabled:opacity-40">{loading?"Generating…":shareUrl?"Refresh share link":"Generate share link"}</button>
      {shareUrl ? <><a href={shareUrl} target="_blank" rel="noreferrer" className="rounded-lg border border-slate-700 px-4 py-2 text-sm text-slate-200 hover:border-slate-500">Open report</a><button type="button" onClick={()=>void copy()} className="rounded-lg border border-slate-700 px-4 py-2 text-sm text-slate-200 hover:border-slate-500">Copy link</button></> : null}
      <button type="button" disabled className="rounded-lg border border-slate-700 px-4 py-2 text-sm text-slate-500">Export PDF · next</button>
      <button type="button" disabled className="rounded-lg border border-slate-700 px-4 py-2 text-sm text-slate-500">Email report · next</button>
    </div>
    {shareUrl ? <p className="mt-3 break-all text-xs text-slate-400">{shareUrl}</p> : null}
    {error ? <p className="mt-3 text-xs text-rose-300">{error}</p> : null}
  </div>;
}

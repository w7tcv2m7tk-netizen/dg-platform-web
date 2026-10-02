"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";

type Candidate = { name: string | null; role: string | null; email: string | null; phone: string | null; sourceUrl: string; evidence: string; imageUrl: string | null; confidence: "high" | "medium"; rank: number };
export function DecisionMakerResearch({ prospectId }: { prospectId: string }) {
  const router = useRouter();
  const [loading,setLoading]=useState(false);
  const [saving,setSaving]=useState(false);
  const [candidates,setCandidates]=useState<Candidate[]|null>(null);
  const [note,setNote]=useState<string|null>(null);
  const [error,setError]=useState<string|null>(null);

  async function research() {
    setLoading(true); setError(null);
    try {
      const res=await fetch("/api/v1/prospecting/prospects/"+prospectId+"/decision-maker",{method:"POST"});
      const json=await res.json();
      if(!res.ok) throw new Error(json?.error?.message||"Research failed.");
      setCandidates(json.data.candidates||[]); setNote(json.data.note||null);
    } catch(e){setError(e instanceof Error?e.message:"Research failed.");} finally{setLoading(false);}
  }
  async function useCandidate(candidate:Candidate) {
    if(!candidate.name){setError("This source has contact details but no verified decision-maker name. Add the name manually before qualification.");return;}
    setSaving(true);setError(null);
    try {
      const res=await fetch("/api/v1/prospecting/prospects/"+prospectId,{method:"PATCH",headers:{"Content-Type":"application/json"},body:JSON.stringify({contactName:candidate.name,contactEmail:candidate.email||undefined,contactPhone:candidate.phone||undefined})});
      const json=await res.json().catch(()=>null);
      if(!res.ok) throw new Error(json?.error?.message||"Could not save candidate.");
      router.refresh();
    } catch(e){setError(e instanceof Error?e.message:"Could not save candidate.");} finally{setSaving(false);}
  }
  return <div className="mt-4 space-y-3">
    <button type="button" onClick={()=>void research()} disabled={loading||saving} className="rounded-lg bg-violet-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-40">{loading?"Researching public sources…":"Find decision-maker"}</button>
    {candidates?.length ? <div className="rounded-xl border border-violet-500/20 bg-slate-950/20 p-3">
      <div className="mb-3 flex items-center justify-between gap-3"><div><p className="text-xs font-semibold uppercase tracking-wide text-violet-300">Decision-maker candidates</p><p className="mt-1 text-xs text-slate-500">Ranked from public evidence. Verify the source before saving.</p></div><button type="button" onClick={()=>void research()} disabled={loading||saving} className="rounded-md border border-slate-700 px-3 py-1.5 text-xs text-slate-300 disabled:opacity-40">Search again</button></div>
      <div className="space-y-2">{candidates.map((c,i)=><div key={i} className="grid gap-3 rounded-lg border border-slate-800 bg-slate-950/40 p-3 sm:grid-cols-[56px_1fr_auto]">
        <div>{c.imageUrl?<img src={c.imageUrl} alt="" referrerPolicy="no-referrer" className="h-14 w-14 rounded-lg border border-slate-700 object-cover" />:<div className="flex h-14 w-14 items-center justify-center rounded-lg border border-slate-800 bg-slate-900 text-lg font-semibold text-slate-500">{c.name?.slice(0,1)||"?"}</div>}</div>
        <div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><p className="font-semibold text-white">{c.name||"Candidate"}</p>{i===0?<span className="rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-emerald-300">Best match</span>:null}</div><p className="mt-0.5 text-xs text-violet-200">{c.role||"Role not identified"}</p><p className="mt-2 text-xs text-slate-300">{c.phone||"No direct phone"}{c.email?" · "+c.email:" · No direct email"}</p><p className="mt-2 text-xs text-slate-500">{c.evidence}</p><a href={c.sourceUrl} target="_blank" rel="noreferrer" className="mt-1 inline-block text-xs text-violet-300 hover:underline">View source ↗</a></div>
        <div className="flex items-start"><button type="button" disabled={saving||!c.name} onClick={()=>void useCandidate(c)} className="rounded-md border border-violet-500/50 px-3 py-1.5 text-xs font-medium text-violet-200 disabled:opacity-40">{saving?"Saving…":"Use this candidate"}</button></div>
      </div>)}</div>
    </div>:null}
    {note?<p className="text-xs text-amber-200">{note}</p>:null}
    {error?<p className="text-xs text-rose-300">{error}</p>:null}
    <p className="text-xs text-slate-500">Candidates come from public pages on the business website. Verify the source before saving; manual Edit remains available when public research cannot establish the right person.</p>
  </div>;
}

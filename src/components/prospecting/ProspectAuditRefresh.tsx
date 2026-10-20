"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";
export function ProspectAuditRefresh({ prospectId, hasAudit = true, disabledReason }: { prospectId: string; hasAudit?: boolean; disabledReason?: string }) {
  const router=useRouter(); const [loading,setLoading]=useState(false); const [error,setError]=useState<string|null>(null);
  async function run(){if(disabledReason)return;setLoading(true);setError(null);try{const res=await fetch("/api/v1/prospecting/prospects/"+prospectId+"/audit",{method:"POST"});const json=await res.json().catch(()=>null);if(!res.ok)throw new Error(json?.error?.message||"Research failed.");router.refresh();}catch(e){setError(e instanceof Error?e.message:"Research failed.");}finally{setLoading(false);}}
  return <div><button type="button" onClick={()=>void run()} disabled={Boolean(disabledReason)||loading} className="rounded-md border border-slate-700 px-3 py-1.5 text-xs text-slate-300 hover:border-slate-500 disabled:opacity-40">{loading ? (hasAudit ? "Re-running Research…" : "Starting research…") : (hasAudit ? "Re-run Research" : "Start research")}</button>{disabledReason?<p className="mt-2 text-sm text-slate-400">{disabledReason}</p>:null}{error?<p className="mt-2 text-xs text-rose-300">{error}</p>:null}</div>;
}

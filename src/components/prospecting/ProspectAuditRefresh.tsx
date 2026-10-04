"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";
export function ProspectAuditRefresh({ prospectId }: { prospectId: string }) {
  const router=useRouter(); const [loading,setLoading]=useState(false); const [error,setError]=useState<string|null>(null);
  async function run(){setLoading(true);setError(null);try{const res=await fetch("/api/v1/prospecting/prospects/"+prospectId+"/audit",{method:"POST"});const json=await res.json().catch(()=>null);if(!res.ok)throw new Error(json?.error?.message||"Research failed.");router.refresh();}catch(e){setError(e instanceof Error?e.message:"Research failed.");}finally{setLoading(false);}}
  return <div><button type="button" onClick={()=>void run()} disabled={loading} className="rounded-md border border-slate-700 px-3 py-1.5 text-xs text-slate-300 hover:border-slate-500 disabled:opacity-40">{loading?"Re-running Research…":"Re-run Research"}</button>{error?<p className="mt-2 text-xs text-rose-300">{error}</p>:null}</div>;
}

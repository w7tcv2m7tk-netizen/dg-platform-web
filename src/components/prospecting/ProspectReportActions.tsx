"use client";

import { useState } from "react";

type Props = {
  prospectId: string;
  canGenerate: boolean;
  recipientName?: string | null;
  recipientEmail?: string | null;
  businessName: string;
};

export function ProspectReportActions({ prospectId, canGenerate, recipientName, recipientEmail, businessName }: Props) {
  const [shareUrl,setShareUrl]=useState<string|null>(null);
  const [loading,setLoading]=useState(false);
  const [error,setError]=useState<string|null>(null);
  const [emailOpen,setEmailOpen]=useState(false);
  const [sending,setSending]=useState(false);
  const [sent,setSent]=useState(false);
  const [to,setTo]=useState(recipientEmail || "");
  const [subject,setSubject]=useState(`${businessName} — Digital Opportunity Report`);
  const firstName=(recipientName || "").trim().split(/\s+/)[0] || "there";
  const [body,setBody]=useState(`Hi ${firstName},

I've prepared a Digital Opportunity Report for ${businessName} based on observable public digital signals.

It highlights the strongest opportunities we found across visibility, customer acquisition and digital operations.

REPORT_LINK

If you'd like to review the findings together, you can book a DigitalGate Strategy Session here:
https://digitalgate.com.au/strategy-session

Regards,
Ben Roe
DigitalGate`);

  async function ensureReport() {
    if(shareUrl) return shareUrl;
    const res=await fetch(`/api/v1/prospecting/prospects/${prospectId}/report`,{method:"POST"});
    const json=await res.json().catch(()=>null);
    if(!res.ok) throw new Error(json?.error?.message || "Report generation failed.");
    setShareUrl(json.data.shareUrl);
    return json.data.shareUrl as string;
  }
  async function generate() {
    setLoading(true); setError(null);
    try { await ensureReport(); }
    catch(e) { setError(e instanceof Error ? e.message : "Report generation failed."); }
    finally { setLoading(false); }
  }
  async function copy() { if(shareUrl) await navigator.clipboard.writeText(shareUrl); }
  async function exportPdf() {
    setLoading(true); setError(null);
    try {
      const url=await ensureReport();
      const printUrl=`${url}?print=1`;
      const win=window.open(printUrl,"_blank","noopener,noreferrer");
      if(!win) throw new Error("Allow pop-ups to open the PDF-ready report.");
    } catch(e) { setError(e instanceof Error ? e.message : "Could not open PDF-ready report."); }
    finally { setLoading(false); }
  }
  async function sendEmail() {
    setSending(true); setError(null); setSent(false);
    try {
      if(!to.trim()) throw new Error("Recipient email is required.");
      const url=await ensureReport();
      const message=body.replace("REPORT_LINK",url);
      const res=await fetch("/api/v1/communications/messages",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({
        channel:"email",to:to.trim(),subject:subject.trim(),body:message,
        metadata:{source:"prospecting_opportunity_report",prospectId,reportUrl:url,businessName}
      })});
      const json=await res.json().catch(()=>null);
      if(!res.ok) throw new Error(json?.error?.message || "Email send failed.");
      await fetch(`/api/v1/prospecting/prospects/${prospectId}/report`,{method:"PATCH",headers:{"Content-Type":"application/json"},body:JSON.stringify({action:"email_sent",to:to.trim(),subject:subject.trim()})});
      setSent(true); setEmailOpen(false);
    } catch(e) { setError(e instanceof Error ? e.message : "Email send failed."); }
    finally { setSending(false); }
  }

  return <div className="mt-5">
    <div className="flex flex-wrap gap-2">
      <button type="button" onClick={()=>void generate()} disabled={!canGenerate||loading} className="rounded-lg bg-violet-600 px-4 py-2 text-sm font-medium text-white hover:bg-violet-500 disabled:cursor-not-allowed disabled:opacity-40">{loading?"Generating…":shareUrl?"Refresh share link":"Generate share link"}</button>
      {shareUrl ? <><a href={shareUrl} target="_blank" rel="noreferrer" className="rounded-lg border border-slate-700 px-4 py-2 text-sm text-slate-200 hover:border-slate-500">Open report</a><button type="button" onClick={()=>void copy()} className="rounded-lg border border-slate-700 px-4 py-2 text-sm text-slate-200 hover:border-slate-500">Copy link</button></> : null}
      <button type="button" onClick={()=>void exportPdf()} disabled={!canGenerate||loading} className="rounded-lg border border-slate-700 px-4 py-2 text-sm text-slate-200 hover:border-slate-500 disabled:opacity-40">Export PDF</button>
      <button type="button" onClick={()=>setEmailOpen(true)} disabled={!canGenerate} className="rounded-lg border border-slate-700 px-4 py-2 text-sm text-slate-200 hover:border-slate-500 disabled:opacity-40">Email report</button>
    </div>
    {shareUrl ? <p className="mt-3 break-all text-xs text-slate-400">{shareUrl}</p> : null}
    {sent ? <p className="mt-3 text-xs text-emerald-300">Report email sent and recorded.</p> : null}
    {error ? <p className="mt-3 text-xs text-rose-300">{error}</p> : null}
    {emailOpen ? <div className="mt-4 max-w-2xl rounded-xl border border-violet-500/25 bg-slate-950/60 p-4">
      <div className="flex items-center justify-between gap-3"><div><p className="text-sm font-semibold text-white">Email Digital Opportunity Report</p><p className="mt-1 text-xs text-slate-400">Review before sending through DigitalGate Communications.</p></div><button type="button" onClick={()=>setEmailOpen(false)} className="text-sm text-slate-400 hover:text-white">Close</button></div>
      <label className="mt-4 block text-xs text-slate-400">To<input value={to} onChange={e=>setTo(e.target.value)} type="email" className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white"/></label>
      <label className="mt-3 block text-xs text-slate-400">Subject<input value={subject} onChange={e=>setSubject(e.target.value)} className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white"/></label>
      <label className="mt-3 block text-xs text-slate-400">Message<textarea value={body} onChange={e=>setBody(e.target.value)} rows={12} className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white"/></label>
      <p className="mt-2 text-xs text-slate-500">REPORT_LINK is replaced with the secure report link when sent.</p>
      <div className="mt-4 flex justify-end gap-2"><button type="button" onClick={()=>setEmailOpen(false)} className="rounded-lg border border-slate-700 px-4 py-2 text-sm text-slate-300">Cancel</button><button type="button" onClick={()=>void sendEmail()} disabled={sending||!to.trim()} className="rounded-lg bg-violet-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-40">{sending?"Sending…":"Send report"}</button></div>
    </div> : null}
  </div>;
}

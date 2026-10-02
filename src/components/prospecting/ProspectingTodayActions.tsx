"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";

type Row = {
  prospectId: string;
  businessName: string;
  score: number;
  bandLabel: string;
  recommendedAction: string;
  recommendedActionLabel: string;
  reasons: string[];
  approachHint: string;
  contactPhone: string | null;
  contactEmail: string | null;
  contactName: string | null;
  industry: string | null;
  location: string | null;
};

const outcomes = [
  ["no_answer", "No answer"],
  ["interested", "Interested"],
  ["follow_up", "Follow up"],
  ["not_interested", "Not interested"],
  ["wrong_contact", "Wrong contact"],
] as const;

export function ProspectingTodayActions({ rows }: { rows: Row[] }) {
  const [activeId, setActiveId] = useState(rows[0]?.prospectId ?? "");
  const active = useMemo(() => rows.find((r) => r.prospectId === activeId) ?? rows[0], [activeId, rows]);
  const [showLog, setShowLog] = useState(false);
  const [notes, setNotes] = useState("");
  const [followUpAt, setFollowUpAt] = useState("");
  const [saving, setSaving] = useState(false);
  const [draft, setDraft] = useState("");
  const router = useRouter();

  if (!active) return null;

  async function logOutcome(outcome: (typeof outcomes)[number][0]) {
    setSaving(true);
    try {
      const response = await fetch(`/api/v1/prospecting/prospects/${active.prospectId}/call-outcome`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ outcome, notes, followUpAt: followUpAt || null }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload?.error?.message || "Could not save call outcome");
      setDraft(payload.data.followUpDraft || "");
      setShowLog(false);
      setNotes("");
      setFollowUpAt("");
      router.refresh();
    } catch (error) {
      alert(error instanceof Error ? error.message : "Could not save call outcome");
    } finally {
      setSaving(false);
    }
  }

  const callHref = active.contactPhone ? `tel:${active.contactPhone}` : null;
  const emailHref = active.contactEmail ? `mailto:${active.contactEmail}` : null;
  const hasContactRoute = Boolean(callHref || emailHref);
  const needsResearch = active.recommendedAction === "research" || active.recommendedAction === "run_audit";

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <section className="rounded-2xl border border-violet-500/30 bg-violet-500/5 p-4 sm:p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-violet-300">Do this next</p>
            <h2 className="mt-1 truncate text-xl font-semibold text-white">{active.businessName}</h2>
            <p className="mt-1 text-sm text-slate-400">
              {[active.contactName, active.location].filter(Boolean).join(" · ") || active.industry || "Prospect"}
            </p>
          </div>
          <div className="shrink-0 rounded-xl border border-violet-400/30 bg-slate-950/60 px-3 py-2 text-center">
            <p className="text-xl font-bold text-white">{active.score}</p>
            <p className="text-[10px] uppercase text-violet-300">{active.bandLabel}</p>
          </div>
        </div>

        <div className="mt-4 rounded-xl border border-slate-800 bg-slate-950/55 p-3">
          <p className="text-xs uppercase tracking-wide text-slate-500">Why this prospect?</p>
          <ul className="mt-2 space-y-1 text-sm text-slate-300">
            {active.reasons.slice(0, 3).map((reason) => <li key={reason}>• {reason}</li>)}
          </ul>
        </div>

        <div className="mt-3 rounded-xl border border-slate-800 bg-slate-950/55 p-3">
          <p className="text-xs uppercase tracking-wide text-slate-500">{needsResearch ? "Research brief" : "Contact brief"}</p>
          <p className="mt-1 text-sm text-slate-300">{active.approachHint}</p>
          {needsResearch ? (
            <p className="mt-3 text-xs text-slate-500">
              Review the evidence, confirm the decision-maker and assess fit. Qualify the prospect before any outreach.
            </p>
          ) : (
            <p className="mt-3 text-xs text-slate-500">
              Lead with the observed opportunity. Keep first contact short; the goal is permission for the next conversation, not a platform pitch.
            </p>
          )}
        </div>

        <div className="mt-4 grid grid-cols-2 gap-2">
          {needsResearch ? (
            <>
              <a href={`/apps/prospecting/prospects/${active.prospectId}`} className="col-span-2 inline-flex min-h-12 items-center justify-center rounded-xl bg-violet-600 px-4 text-sm font-semibold text-white hover:bg-violet-500">
                Review research
              </a>
            </>
          ) : (
            <>
              {callHref ? (
                <a href={callHref} onClick={() => setShowLog(true)} className="inline-flex min-h-12 items-center justify-center rounded-xl bg-emerald-600 px-4 text-sm font-semibold text-white hover:bg-emerald-500">
                  Call now
                </a>
              ) : (
                <a href={emailHref ?? "#"} className="inline-flex min-h-12 items-center justify-center rounded-xl bg-emerald-600 px-4 text-sm font-semibold text-white">
                  Email
                </a>
              )}
              <button type="button" onClick={() => setShowLog(true)} className="min-h-12 rounded-xl border border-violet-500/40 bg-violet-500/10 px-4 text-sm font-semibold text-violet-100">
                Log outcome
              </button>
            </>
          )}
        </div>
      </section>

      {showLog ? (
        <section className="rounded-2xl border border-slate-700 bg-slate-950 p-4">
          <h3 className="font-semibold text-white">What happened?</h3>
          <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} placeholder="Quick note — what did they say?" className="mt-3 w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-3 text-base text-white placeholder:text-slate-600" />
          <label className="mt-3 block text-xs text-slate-400">
            Next follow-up (optional)
            <input type="datetime-local" value={followUpAt} onChange={(e) => setFollowUpAt(e.target.value)} className="mt-1 min-h-11 w-full rounded-xl border border-slate-700 bg-slate-900 px-3 text-base text-white" />
          </label>
          <div className="mt-4 grid grid-cols-2 gap-2">
            {outcomes.map(([id, label]) => (
              <button key={id} type="button" disabled={saving} onClick={() => logOutcome(id)} className="min-h-12 rounded-xl border border-slate-700 bg-slate-900 px-3 text-sm font-medium text-slate-100 disabled:opacity-50">
                {label}
              </button>
            ))}
          </div>
          <button type="button" onClick={() => setShowLog(false)} className="mt-3 min-h-11 w-full text-sm text-slate-500">Cancel</button>
        </section>
      ) : null}

      {draft ? (
        <section className="rounded-2xl border border-emerald-500/25 bg-emerald-500/5 p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-emerald-300">Personalised follow-up ready</p>
          <p className="mt-3 whitespace-pre-wrap text-sm text-slate-200">{draft}</p>
          <div className="mt-4 flex gap-2">
            <button type="button" onClick={() => navigator.clipboard.writeText(draft)} className="min-h-11 flex-1 rounded-xl border border-emerald-500/30 px-3 text-sm font-semibold text-emerald-200">Copy</button>
            {emailHref ? <a href={emailHref} className="inline-flex min-h-11 flex-1 items-center justify-center rounded-xl bg-emerald-600 px-3 text-sm font-semibold text-white">Email</a> : null}
          </div>
        </section>
      ) : null}

      {rows.length > 1 ? (
        <section>
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">Next prospects</p>
          <div className="space-y-2">
            {rows.filter((r) => r.prospectId !== active.prospectId).slice(0, 8).map((row) => (
              <button key={row.prospectId} type="button" onClick={() => { setActiveId(row.prospectId); setDraft(""); setShowLog(false); }} className="flex min-h-14 w-full items-center justify-between rounded-xl border border-slate-800 bg-slate-950/40 px-4 text-left">
                <span className="min-w-0">
                  <span className="block truncate text-sm font-medium text-white">{row.businessName}</span>
                  <span className="block truncate text-xs text-slate-500">{row.recommendedAction === "research" || row.recommendedAction === "run_audit" ? "Research" : row.recommendedActionLabel}</span>
                </span>
                <span className="ml-3 text-sm font-semibold text-violet-300">{row.score}</span>
              </button>
            ))}
          </div>
        </section>
      ) : null}
    </div>
  );
}

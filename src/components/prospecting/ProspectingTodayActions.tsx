"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";

type Row = {
  prospectId: string;
  businessName: string;
  stage: string;
  score: number;
  bandLabel: string;
  recommendedAction: string;
  recommendedActionLabel: string;
  reasons: string[];
  approachHint: string;
  businessHealthScore: number | null;
  auditScores: { businessHealth: number | null; aiVisibility: number | null; seo: number | null; websiteHealth: number | null } | null;
  auditFindings: Array<{ title: string; observed: string; detail: string; recommendedAction: string }>;
  reportViewCount: number;
  reportSent: boolean;
  reportFirstViewedAt: string | null;
  hasReport: boolean;
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
  const [showBrief, setShowBrief] = useState(false);
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
  // Lifecycle stage is authoritative. A qualified prospect must never be sent back through research
  // just because an older audit/recommendation field still says research or run_audit.
  const needsResearch = active.stage !== "qualified";
  const decisionMaker = active.contactName || "the decision-maker";
  const firstName = active.contactName?.trim().split(/\\s+/)[0] || "there";
  const scores = active.auditScores;
  const materialFindings = active.auditFindings
    .filter((finding) => finding.title && !/business health score/i.test(finding.title))
    .slice(0, 4);
  const evidence = materialFindings.length
    ? materialFindings.map((finding) =>
        [finding.title, finding.observed].filter(Boolean).join(" — "),
      )
    : [
        scores?.seo != null && scores.seo < 55 ? `SEO visibility is ${scores.seo}/100.` : null,
        scores?.aiVisibility != null && scores.aiVisibility < 50 ? `AI Visibility is ${scores.aiVisibility}/100.` : null,
        active.businessHealthScore != null && active.businessHealthScore < 60
          ? `Business Health is ${active.businessHealthScore}/100.`
          : null,
      ].filter((item): item is string => Boolean(item));
  const strongestFinding = materialFindings[0] ?? null;
  const strongestEvidence = evidence[0] || "The research identified a verified digital growth opportunity.";
  const opportunityParts = [
    materialFindings.some((finding) => /suburb|local|appraisal|enquiry|vendor/i.test(finding.title))
      ? "strengthen the path from local visibility and appraisal intent to enquiry"
      : null,
    scores?.seo != null && scores.seo < 55 ? "improve organic search visibility" : null,
    scores?.aiVisibility != null && scores.aiVisibility < 50 ? "improve AI/search discoverability" : null,
  ].filter(Boolean);
  const digitalGateOpportunity = opportunityParts.length
    ? `Explore whether DigitalGate can help ${opportunityParts.join(", ")} and connect captured intent to CRM follow-up and automation.`
    : "Use the verified research evidence to identify the highest-value acquisition or follow-up gap before recommending a DigitalGate capability.";
  const reportState = active.reportViewCount > 0
    ? `Opportunity Report viewed ${active.reportViewCount} time${active.reportViewCount === 1 ? "" : "s"}`
    : active.reportSent
      ? "Opportunity Report sent — not yet viewed"
      : active.hasReport
        ? "Opportunity Report prepared — not yet sent"
        : "Opportunity Report not yet prepared";
  const openingObservation = strongestFinding?.title
    ? strongestFinding.title.replace(/\.$/, "").toLowerCase()
    : scores?.seo != null && scores?.aiVisibility != null
      ? "some practical search and AI visibility opportunities"
      : "a couple of practical digital growth opportunities";
  const openingLine = active.reportViewCount > 0
    ? `Hi ${firstName}, Ben Roe from DigitalGate. I saw you had a look at the Digital Opportunity Report for ${active.businessName}. The ${openingObservation} stood out as one of the clearest opportunities — have you got a minute to compare notes?`
    : active.reportSent
      ? `Hi ${firstName}, Ben Roe from DigitalGate. I sent through the Digital Opportunity Report for ${active.businessName}. One finding worth flagging is ${openingObservation}. Have you got a minute and I’ll give you the short version?`
      : `Hi ${firstName}, Ben Roe from DigitalGate. I was looking at ${active.businessName} and found ${openingObservation}. I’ve got the evidence behind it rather than a generic pitch — have you got a minute?`;

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
          <p className="mt-1 text-sm text-slate-300">{needsResearch ? active.approachHint : digitalGateOpportunity}</p>
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
              <button type="button" onClick={() => setShowBrief((value) => !value)} className="col-span-2 min-h-12 rounded-xl bg-violet-600 px-4 text-sm font-semibold text-white hover:bg-violet-500">
                {showBrief ? "Hide call brief" : "Prepare call"}
              </button>
              {showBrief && callHref ? (
                <a href={callHref} onClick={() => setShowLog(true)} className="inline-flex min-h-12 items-center justify-center rounded-xl bg-emerald-600 px-4 text-sm font-semibold text-white hover:bg-emerald-500">
                  Call {active.contactName?.split(/\\s+/)[0] || "now"}
                </a>
              ) : showBrief && emailHref ? (
                <a href={emailHref} className="inline-flex min-h-12 items-center justify-center rounded-xl bg-emerald-600 px-4 text-sm font-semibold text-white">
                  Email
                </a>
              ) : null}
              {showBrief ? (
                <button type="button" onClick={() => setShowLog(true)} className="min-h-12 rounded-xl border border-violet-500/40 bg-violet-500/10 px-4 text-sm font-semibold text-violet-100">
                  Log outcome
                </button>
              ) : null}
            </>
          )}
        </div>
      </section>

      {showBrief && !needsResearch ? (
        <section className="rounded-2xl border border-violet-500/25 bg-slate-950/70 p-4 sm:p-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-violet-300">Contact brief</p>
              <h3 className="mt-1 text-lg font-semibold text-white">{decisionMaker} · {active.businessName}</h3>
              <p className="mt-1 text-sm text-slate-400">{[active.contactPhone, active.contactEmail].filter(Boolean).join(" · ")}</p>
            </div>
            <span className="rounded-lg border border-violet-500/30 px-3 py-1 text-xs font-semibold text-violet-200">Priority {active.score}</span>
          </div>

          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-3">
              <p className="text-xs uppercase tracking-wide text-slate-500">Evidence to lead with</p>
              <ul className="mt-2 space-y-1 text-sm text-slate-300">
                {evidence.slice(0, 4).map((item) => <li key={item}>• {item}</li>)}
              </ul>
            </div>
            <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-3">
              <p className="text-xs uppercase tracking-wide text-slate-500">DigitalGate opportunity</p>
              <p className="mt-2 text-sm text-slate-300">{digitalGateOpportunity}</p>
              <p className="mt-2 text-xs text-slate-500">Use the evidence to open the conversation; only introduce the relevant DigitalGate capability after confirming the problem matters to them.</p>
              <p className="mt-3 text-xs font-medium text-violet-300">{reportState}</p>
            </div>
          </div>

          <div className="mt-3 rounded-xl border border-slate-800 bg-slate-900/50 p-3">
            <p className="text-xs uppercase tracking-wide text-slate-500">Suggested opening</p>
            <p className="mt-2 text-sm text-slate-200">“{openingLine}”</p>
          </div>

          <div className="mt-3 grid gap-3 xl:grid-cols-2">
            <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-3">
              <p className="text-xs uppercase tracking-wide text-slate-500">Talking points</p>
              <ul className="mt-2 space-y-1 text-sm text-slate-300">
                <li>• Lead with: {strongestEvidence}</li>
                <li>• Ask: “How important is improving online enquiry volume for you over the next 6–12 months?”</li>
                <li>• Ask: “What happens today from a new website or portal enquiry through to follow-up?”</li>
                <li>• Ask: “Are SEO, AI visibility and lead follow-up managed together, or through separate systems/providers?”</li>
                <li>• Goal: earn a DigitalGate Strategy Session to review the Opportunity Report and agree the highest-value next steps.</li>
              </ul>
            </div>
            <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-3">
              <p className="text-xs uppercase tracking-wide text-slate-500">Likely objections</p>
              <ul className="mt-2 space-y-1 text-sm text-slate-300">
                <li>• “We already have systems.” — “Absolutely — I’m not suggesting replacing something that works. I’m interested in whether visibility, enquiry handling or follow-up still has any gaps.”</li>
                <li>• “Just send information.” — Send the specific observations from the audit, not a generic DigitalGate brochure, and agree a time to follow up.</li>
                <li>• “Not a priority.” — Ask whether the timing is the issue or whether the opportunity itself is not relevant, then record the answer.</li>
              </ul>
            </div>
          </div>
        </section>
      ) : null}

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
              <button key={row.prospectId} type="button" onClick={() => { setActiveId(row.prospectId); setDraft(""); setShowLog(false); setShowBrief(false); }} className="flex min-h-14 w-full items-center justify-between rounded-xl border border-slate-800 bg-slate-950/40 px-4 text-left">
                <span className="min-w-0">
                  <span className="block truncate text-sm font-medium text-white">{row.businessName}</span>
                  <span className="block truncate text-xs text-slate-500">{row.stage !== "qualified" ? "Research" : "Prepare call"}</span>
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

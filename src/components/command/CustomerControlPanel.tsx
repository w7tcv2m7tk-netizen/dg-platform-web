import Link from "next/link";
import type { OperatorCustomerControlSnapshot } from "@dg/platform-core";

function money(cents: number) {
  return new Intl.NumberFormat("en-AU", {
    style: "currency",
    currency: "AUD",
    maximumFractionDigits: 0,
  }).format(cents / 100);
}

function date(value: string | null) {
  if (!value) return null;
  return new Date(value).toLocaleDateString("en-AU");
}

function chips(items: Array<{ id: string; label: string }>, empty: string) {
  if (!items.length) return <span className="text-slate-500">{empty}</span>;
  return (
    <div className="flex flex-wrap gap-1.5">
      {items.map((item) => (
        <span key={item.id} className="rounded-full border border-slate-700 bg-slate-900 px-2.5 py-1 text-xs text-slate-200">
          {item.label}
        </span>
      ))}
    </div>
  );
}

const lifecycleClass: Record<OperatorCustomerControlSnapshot["lifecycle"], string> = {
  not_started: "border-slate-600 bg-slate-800/60 text-slate-200",
  onboarding: "border-sky-500/30 bg-sky-500/10 text-sky-200",
  checkout_ready: "border-violet-500/30 bg-violet-500/10 text-violet-200",
  trial: "border-amber-500/30 bg-amber-500/10 text-amber-200",
  active: "border-emerald-500/30 bg-emerald-500/10 text-emerald-200",
  attention: "border-rose-500/30 bg-rose-500/10 text-rose-200",
};

export function CustomerControlPanel({
  organisationId,
  organisationName,
  snapshot,
}: {
  organisationId: string;
  organisationName: string;
  snapshot: OperatorCustomerControlSnapshot;
}) {
  const customOffer = snapshot.commercial.customOffer;
  const billing = snapshot.billing;
  const incomplete = snapshot.onboarding.incompleteRequired;

  return (
    <section className="rounded-2xl border border-violet-400/20 bg-gradient-to-br from-violet-500/[0.08] to-slate-950/60 px-5 py-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-violet-300">Operator Customer Control</p>
          <h2 className="mt-1 text-xl font-semibold text-white">{organisationName}</h2>
          <p className="mt-1 text-xs text-slate-400">Commercial, onboarding and activation truth in one place.</p>
        </div>
        <span className={`rounded-full border px-3 py-1.5 text-sm font-semibold ${lifecycleClass[snapshot.lifecycle]}`}>
          {snapshot.lifecycleLabel}
        </span>
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-xl border border-slate-800 bg-slate-950/50 p-3">
          <p className="text-[11px] uppercase tracking-wide text-slate-500">Setup</p>
          <p className="mt-1 text-lg font-semibold text-white">{snapshot.onboarding.percentComplete}%</p>
          <p className="text-xs text-slate-400">{snapshot.onboarding.currentStepLabel}</p>
        </div>
        <div className="rounded-xl border border-slate-800 bg-slate-950/50 p-3">
          <p className="text-[11px] uppercase tracking-wide text-slate-500">Platform</p>
          <p className="mt-1 font-semibold text-white">{snapshot.commercial.platformLabel}</p>
          <p className="text-xs text-slate-400">{snapshot.commercial.supportLabel} support</p>
        </div>
        <div className="rounded-xl border border-slate-800 bg-slate-950/50 p-3">
          <p className="text-[11px] uppercase tracking-wide text-slate-500">Billing</p>
          <p className="mt-1 font-semibold text-white">{billing?.headline ?? "No billing snapshot"}</p>
          <p className="text-xs text-slate-400">
            {billing?.trialEnd ? `Trial ends ${date(billing.trialEnd)}` : billing?.commercialStatus ?? billing?.subscriptionStatus ?? "Pre-checkout"}
          </p>
        </div>
        <div className="rounded-xl border border-slate-800 bg-slate-950/50 p-3">
          <p className="text-[11px] uppercase tracking-wide text-slate-500">Custom offer</p>
          <p className="mt-1 font-semibold text-white">{customOffer ? money(customOffer.amountCents) : "None attached"}</p>
          <p className="text-xs text-slate-400">{customOffer ? `${customOffer.label} · ${customOffer.cadence}` : "Standard commercial path"}</p>
        </div>
      </div>

      <div className="mt-5 grid gap-4 lg:grid-cols-2">
        <div className="space-y-4 rounded-xl border border-slate-800 bg-slate-950/35 p-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Industry Apps</p>
            <div className="mt-2">{chips(snapshot.commercial.industryApps, "None selected")}</div>
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Industry Templates</p>
            <div className="mt-2">{chips(snapshot.commercial.industryTemplates, "None selected")}</div>
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Growth Apps</p>
            <div className="mt-2">{chips(snapshot.commercial.premiumApps, "None selected")}</div>
          </div>
        </div>

        <div className="rounded-xl border border-slate-800 bg-slate-950/35 p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Required before go-live</p>
          {incomplete.length ? (
            <ul className="mt-2 space-y-1.5 text-sm text-slate-300">
              {incomplete.slice(0, 7).map((item) => <li key={item}>○ {item}</li>)}
              {incomplete.length > 7 ? <li className="text-slate-500">+ {incomplete.length - 7} more</li> : null}
            </ul>
          ) : (
            <p className="mt-2 text-sm text-emerald-300">✓ Required activation items complete</p>
          )}
        </div>
      </div>

      <section className="mt-4 rounded-xl border border-slate-800 bg-slate-950/35 p-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Connected Services</p>
            <p className="mt-1 text-sm text-slate-300">Customer connection health at a glance — useful during the first days after activation.</p>
          </div>
          <div className="flex flex-wrap gap-2 text-xs">
            <span className="rounded-full border border-emerald-500/25 px-2.5 py-1 text-emerald-300">{snapshot.connections.connected} healthy</span>
            <span className="rounded-full border border-amber-500/25 px-2.5 py-1 text-amber-300">{snapshot.connections.attention} attention</span>
            <span className="rounded-full border border-slate-700 px-2.5 py-1 text-slate-400">{snapshot.connections.notConnected} not connected</span>
          </div>
        </div>
        {snapshot.connections.attentionItems.length ? (
          <ul className="mt-3 space-y-2 text-sm">
            {snapshot.connections.attentionItems.map((item) => (
              <li key={item.id} className="rounded-lg border border-amber-500/15 bg-amber-500/[0.04] px-3 py-2">
                <span className="font-medium text-amber-200">{item.label}</span>
                {item.reason ? <span className="ml-2 text-slate-400">{item.reason}</span> : null}
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-3 text-sm text-emerald-300">No connected service currently needs operator attention.</p>
        )}
      </section>

      {snapshot.alerts.length ? (
        <div className="mt-4 rounded-xl border border-rose-500/25 bg-rose-500/[0.07] p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-rose-300">Operator attention</p>
          <ul className="mt-2 space-y-1 text-sm text-rose-100">
            {snapshot.alerts.map((alert) => <li key={alert}>• {alert}</li>)}
          </ul>
        </div>
      ) : null}

      <div className="mt-5 flex flex-wrap gap-2">
        <Link href={`/onboarding?operatorOrg=${organisationId}`} className="inline-flex min-h-10 items-center rounded-full bg-violet-600 px-4 text-sm font-semibold text-white hover:bg-violet-500">
          Rehearse customer journey
        </Link>
        {customOffer?.crmOpportunityHref ? (
          <Link href={customOffer.crmOpportunityHref} className="inline-flex min-h-10 items-center rounded-full border border-sky-500/40 px-4 text-sm font-semibold text-sky-200 hover:border-sky-400">
            Open CRM / custom offer
          </Link>
        ) : (
          <Link href="/apps/crm/opportunities" className="inline-flex min-h-10 items-center rounded-full border border-sky-500/40 px-4 text-sm font-semibold text-sky-200 hover:border-sky-400">
            Open CRM opportunities
          </Link>
        )}
        <Link href={`/command/advisor?org=${organisationId}`} className="inline-flex min-h-10 items-center rounded-full border border-slate-600 px-4 text-sm font-semibold text-slate-200 hover:border-slate-500">
          Ask Aida / Advisor
        </Link>
        <Link href="/command/revenue" className="inline-flex min-h-10 items-center rounded-full border border-slate-600 px-4 text-sm font-semibold text-slate-200 hover:border-slate-500">
          Revenue & billing
        </Link>
      </div>

      <p className="mt-3 text-[11px] text-slate-500">
        Customer rehearsal is read-only for operator cross-tenant access; checkout and completion actions stay disabled.
      </p>
    </section>
  );
}

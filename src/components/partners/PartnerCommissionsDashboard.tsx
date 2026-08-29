import Link from "next/link";
import type { CommissionsWorkspace } from "@dg/platform-core";
import {
  COMMISSION_ARCHITECTURE_NOTE,
  COMMISSION_LIFECYCLE_STAGES,
  COMMISSION_LIFECYCLE_STRIP,
  COMMISSION_MODEL_SECTIONS,
} from "@dg/platform-core";

import { CommissionLedgerTable } from "@/components/partners/CommissionLedgerTable";

function formatAud(cents: number) {
  return (cents / 100).toLocaleString("en-AU", {
    style: "currency",
    currency: "AUD",
    maximumFractionDigits: 2,
    minimumFractionDigits: 2,
  });
}

export function PartnerCommissionsDashboard({ data }: { data: CommissionsWorkspace }) {
  const { pulse, lifecycleCounts, rows, commissions } = data;

  return (
    <>
      <header className="dg-page-header">
        <Link href="/command/partners" className="text-sm text-sky-400 hover:underline">
          ← Partner Network
        </Link>
        <p className="mt-4 text-xs font-semibold uppercase tracking-[0.22em] text-sky-400">
          Partners · Commissions
        </p>
        <h1 className="mt-2 text-2xl font-bold text-white sm:text-3xl">Partner Commissions</h1>
        <p className="mt-3 max-w-3xl text-base text-slate-200">
          Track commission earned, approved, payable and paid across the DigitalGate Partner
          Network.
        </p>
        <p className="mt-2 max-w-3xl text-sm text-slate-400">
          Commissions are calculated from attributable customer revenue and partner terms. Revenue
          remains owned and billed by DigitalGate.
        </p>
        <p className="mt-2 max-w-3xl text-xs text-slate-500">{COMMISSION_ARCHITECTURE_NOTE}</p>
      </header>

      <main className="dg-page-main space-y-8">
        <section>
          <p className="text-xs font-medium uppercase tracking-[0.18em] text-slate-500">
            Commission Pulse
          </p>
          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
            <PulseTile label="Total earned" value={formatAud(pulse.totalEarnedCents)} />
            <PulseTile label="Pending" value={formatAud(pulse.pendingCents)} />
            <PulseTile label="Approved" value={formatAud(pulse.approvedCents)} />
            <PulseTile label="Payable" value={formatAud(pulse.payableCents)} />
            <PulseTile label="Paid" value={formatAud(pulse.paidCents)} />
            <PulseTile label="This month" value={formatAud(pulse.thisMonthCents)} />
          </div>
        </section>

        <section>
          <div className="mb-3 flex items-center justify-between gap-3">
            <p className="text-xs font-medium uppercase tracking-[0.18em] text-slate-500">
              Commission ledger
            </p>
            <Link href="/command/referrals" className="text-xs text-sky-400 hover:underline">
              View referrals →
            </Link>
          </div>
          <CommissionLedgerTable rows={rows} commissions={commissions} />
        </section>

        <section className="rounded-xl border border-slate-700/80 bg-slate-950/40 px-5 py-5">
          <p className="text-xs font-medium uppercase tracking-[0.18em] text-slate-500">
            Commission model
          </p>
          <div className="mt-4 space-y-4">
            {COMMISSION_MODEL_SECTIONS.map((section) => (
              <article key={section.title}>
                <h3 className="text-sm font-semibold text-white">{section.title}</h3>
                <p className="mt-1 text-sm text-slate-400">{section.body}</p>
                {"note" in section && section.note ? (
                  <p className="mt-2 text-xs text-emerald-300/80">{section.note}</p>
                ) : null}
              </article>
            ))}
          </div>
        </section>

        <section className="rounded-xl border border-slate-700/80 bg-slate-950/40 px-5 py-5">
          <p className="text-xs font-medium uppercase tracking-[0.18em] text-slate-500">
            Commission lifecycle
          </p>
          <p className="mt-2 text-xs font-medium uppercase tracking-wide text-sky-400/90">
            {COMMISSION_LIFECYCLE_STRIP}
          </p>
          <div className="mt-4 flex flex-wrap gap-3">
            {lifecycleCounts.map((stage) => (
              <div
                key={stage.id}
                className="rounded-lg border border-slate-800 bg-slate-950/60 px-3 py-2 text-sm text-slate-300"
              >
                <span className="font-semibold text-white">{stage.count}</span> {stage.label}
              </div>
            ))}
          </div>
          <dl className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {COMMISSION_LIFECYCLE_STAGES.map((stage) => (
              <div key={stage.id}>
                <dt className="text-sm font-medium text-slate-200">{stage.label}</dt>
                <dd className="mt-1 text-xs text-slate-500">{stage.rule}</dd>
              </div>
            ))}
          </dl>
        </section>
      </main>
    </>
  );
}

function PulseTile({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-slate-800 bg-slate-950/60 px-3 py-3">
      <p className="text-[10px] uppercase tracking-wide text-slate-500">{label}</p>
      <p className="mt-1 text-xl font-bold text-white">{value}</p>
    </div>
  );
}

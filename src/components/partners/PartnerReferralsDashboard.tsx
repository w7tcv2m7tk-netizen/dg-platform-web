import Link from "next/link";
import type { ReferralsWorkspace } from "@dg/platform-core";
import {
  REFERRAL_ATTRIBUTION_RULES,
  REFERRAL_AUTOMATION_VISION,
  REFERRAL_DATA_CHAIN,
  REFERRAL_PIPELINE_STRIP,
} from "@dg/platform-core";

function formatAudOrDash(cents: number | null) {
  if (cents == null) return "—";
  return (cents / 100).toLocaleString("en-AU", {
    style: "currency",
    currency: "AUD",
    maximumFractionDigits: 0,
  });
}

function formatAud(cents: number) {
  return (cents / 100).toLocaleString("en-AU", {
    style: "currency",
    currency: "AUD",
    maximumFractionDigits: 0,
  });
}

export function PartnerReferralsDashboard({ data }: { data: ReferralsWorkspace }) {
  const { pulse, pipelineCounts, rows } = data;

  return (
    <>
      <header className="dg-page-header">
        <Link href="/command/partners" className="text-sm text-sky-400 hover:underline">
          ← Partner Network
        </Link>
        <p className="mt-4 text-xs font-semibold uppercase tracking-[0.22em] text-sky-400">
          Partners · Referrals
        </p>
        <h1 className="mt-2 text-2xl font-bold text-white sm:text-3xl">Partner Referrals</h1>
        <p className="mt-3 max-w-3xl text-base text-slate-200">
          Track every customer opportunity introduced through the DigitalGate Partner Network —
          from introduction through qualification, conversion and commission attribution.
        </p>
        <p className="mt-2 max-w-3xl text-sm text-slate-400">
          Acquisition Partner referrals generate Platform + App commission. Delivery Partner activity
          generates Professional Services and Support &amp; Success revenue. All customer ownership,
          billing and commercial attribution remain with DigitalGate.
        </p>
        <p className="mt-2 max-w-3xl text-xs text-slate-500">
          Sales / Growth Engine owns DigitalGate&apos;s own pipeline. This page tracks partner-attributed
          introductions only — not a second prospecting CRM.
        </p>
      </header>

      <main className="dg-page-main space-y-8">
        <section>
          <p className="text-xs font-medium uppercase tracking-[0.18em] text-slate-500">
            Referral Pulse
          </p>
          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7">
            <PulseTile label="Total referrals" value={String(pulse.totalReferrals)} />
            <PulseTile label="New this month" value={String(pulse.newThisMonth)} />
            <PulseTile label="Qualified" value={String(pulse.qualified)} />
            <PulseTile label="Converted" value={String(pulse.converted)} />
            <PulseTile label="Customers live" value={String(pulse.customersLive)} />
            <PulseTile
              label="Referred MRR"
              value={formatAudOrDash(pulse.referredMrrCents)}
              hint={
                pulse.referredMrrCents == null
                  ? "Scaffold until subscription attribution"
                  : undefined
              }
            />
            <PulseTile
              label="Commission owing"
              value={formatAud(pulse.commissionOwingCents)}
              href="/command/commissions"
            />
          </div>
        </section>

        <section className="rounded-xl border border-slate-700/80 bg-slate-950/40 px-5 py-5">
          <p className="text-xs font-medium uppercase tracking-[0.18em] text-slate-500">
            Referral pipeline
          </p>
          <p className="mt-2 text-xs font-medium uppercase tracking-wide text-sky-400/90">
            {REFERRAL_PIPELINE_STRIP}
          </p>
          <div className="mt-4 flex flex-wrap gap-3">
            {pipelineCounts.map((stage) => (
              <div
                key={stage.id}
                className="rounded-lg border border-slate-800 bg-slate-950/60 px-3 py-2 text-sm text-slate-300"
              >
                <span className="font-semibold text-white">{stage.count}</span> {stage.label}
              </div>
            ))}
          </div>
        </section>

        <section className="overflow-hidden rounded-xl border border-slate-700/60 bg-slate-950/40">
          <div className="border-b border-slate-700/60 px-4 py-3">
            <h2 className="text-sm font-semibold text-white">Referrals</h2>
          </div>
          {rows.length === 0 ? (
            <div className="px-6 py-12 text-center">
              <p className="text-sm text-slate-300">No referrals yet.</p>
              <p className="mt-2 max-w-xl mx-auto text-sm text-slate-500">
                When a partner introduces their first business, the referral will appear here and
                remain linked to the partner, customer, opportunity and resulting commission.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[56rem] text-sm">
                <thead>
                  <tr className="border-b border-slate-700/60 text-left text-xs font-medium uppercase tracking-wider text-slate-500">
                    <th className="px-4 py-3">Referral</th>
                    <th className="px-4 py-3">Partner</th>
                    <th className="px-4 py-3">Customer</th>
                    <th className="px-4 py-3">Type</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3">Value</th>
                    <th className="px-4 py-3">Commission</th>
                    <th className="px-4 py-3">Next action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-700/40">
                  {rows.map((row) => (
                    <tr key={row.id} className="hover:bg-slate-800/40">
                      <td className="px-4 py-3 font-medium text-white">{row.referralLabel}</td>
                      <td className="px-4 py-3">
                        <Link
                          href={`/command/partners/${row.partnerId}`}
                          className="text-sky-300 hover:underline"
                        >
                          {row.partnerName ?? "—"}
                        </Link>
                      </td>
                      <td className="px-4 py-3 text-slate-300">{row.customerLabel}</td>
                      <td className="px-4 py-3 text-slate-400">{row.typeLabel}</td>
                      <td className="px-4 py-3 text-slate-300">{row.statusLabel}</td>
                      <td className="px-4 py-3 text-slate-400">{row.valueLabel}</td>
                      <td className="px-4 py-3 text-slate-300">{row.commissionLabel}</td>
                      <td className="px-4 py-3 text-slate-400">{row.nextAction}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <section className="rounded-xl border border-slate-700/80 bg-slate-950/40 px-5 py-5">
          <p className="text-xs font-medium uppercase tracking-[0.18em] text-slate-500">
            Attribution rules
          </p>
          <div className="mt-4 grid gap-4 lg:grid-cols-3">
            {REFERRAL_ATTRIBUTION_RULES.map((rule) => (
              <article
                key={rule.title}
                className="rounded-lg border border-slate-800 bg-slate-950/60 px-4 py-4"
              >
                <h3 className="text-sm font-semibold text-white">{rule.title}</h3>
                <ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-slate-400">
                  {rule.bullets.map((bullet) => (
                    <li key={bullet}>{bullet}</li>
                  ))}
                </ul>
              </article>
            ))}
          </div>
        </section>

        <section className="rounded-xl border border-slate-800 bg-slate-950/30 px-5 py-5">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
            Data chain
          </p>
          <p className="mt-2 text-sm text-slate-300">{REFERRAL_DATA_CHAIN}</p>
          <p className="mt-3 text-xs text-slate-500">{REFERRAL_AUTOMATION_VISION}</p>
          <p className="mt-3 text-xs text-slate-500">
            Commissions should consume referral and revenue data — not require manual re-entry.
          </p>
        </section>
      </main>
    </>
  );
}

function PulseTile({
  label,
  value,
  hint,
  href,
}: {
  label: string;
  value: string;
  hint?: string;
  href?: string;
}) {
  const body = (
    <div className="rounded-lg border border-slate-800 bg-slate-950/60 px-3 py-3">
      <p className="text-[10px] uppercase tracking-wide text-slate-500">{label}</p>
      <p className="mt-1 text-xl font-bold text-white">{value}</p>
      {hint ? <p className="mt-1 text-[10px] text-slate-600">{hint}</p> : null}
    </div>
  );
  if (href) {
    return (
      <Link href={href} className="block transition hover:opacity-90">
        {body}
      </Link>
    );
  }
  return body;
}

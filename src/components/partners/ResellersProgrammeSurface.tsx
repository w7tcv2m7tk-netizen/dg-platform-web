import Link from "next/link";
import {
  FOUNDING_RESELLER_HOW_IT_WORKS,
  FOUNDING_RESELLER_POSITIONING,
  FOUNDING_RESELLER_WHY,
  FOUNDING_RESELLER_WORKFLOW_STRIP,
  buildPartnerDashboardWorkspace,
  type PartnerDashboardRow,
} from "@dg/platform-core";

import { InviteFoundingResellerForm } from "@/components/founding/InviteFoundingResellerForm";

const STATUS_COLOR: Record<string, string> = {
  active: "bg-emerald-900/40 text-emerald-300",
  pending: "bg-amber-900/40 text-amber-300",
  suspended: "bg-red-900/30 text-red-400",
  inactive: "bg-slate-700 text-slate-500",
};

const PIPELINE_STATUSES = [
  { id: "pending", label: "Invited / Pending" },
  { id: "active", label: "Active" },
  { id: "suspended", label: "Paused" },
  { id: "inactive", label: "Inactive" },
] as const;

function formatAud(cents: number) {
  return (cents / 100).toLocaleString("en-AU", {
    style: "currency",
    currency: "AUD",
    maximumFractionDigits: 0,
  });
}

export async function ResellersProgrammeSurface() {
  const data = await buildPartnerDashboardWorkspace();
  const { pulse, foundingSeats, resellers, recentActivity } = data;

  const pipelineCounts = PIPELINE_STATUSES.map((s) => ({
    ...s,
    count: resellers.filter((r) => r.status === s.id).length,
  }));

  return (
    <>
      <header className="dg-page-header">
        <Link href="/command/partners" className="text-sm text-sky-400 hover:underline">
          ← Partner Network
        </Link>
        <p className="mt-4 text-xs font-semibold uppercase tracking-[0.22em] text-sky-400">
          Partners · Acquisition
        </p>
        <h1 className="mt-2 text-2xl font-bold text-white sm:text-3xl">Acquisition Partners</h1>
        <p className="mt-3 max-w-2xl text-base text-slate-200">
          Trusted acquisition partners who open doors to businesses that DigitalGate can help.
        </p>
        <p className="mt-2 max-w-2xl text-sm text-slate-400">
          {FOUNDING_RESELLER_POSITIONING.body}
        </p>
        <p className="mt-3 max-w-2xl rounded-lg border border-emerald-500/25 bg-emerald-500/5 px-4 py-3 text-sm text-emerald-100/90">
          <span className="font-semibold text-white">
            {FOUNDING_RESELLER_POSITIONING.headline}
          </span>
          <br />
          {FOUNDING_RESELLER_POSITIONING.body}
        </p>
        <p className="mt-2 max-w-2xl text-sm text-slate-400">
          {FOUNDING_RESELLER_POSITIONING.principle}
        </p>
        <p className="mt-3 text-xs font-medium uppercase tracking-wide text-slate-500">
          {FOUNDING_RESELLER_WORKFLOW_STRIP}
        </p>
      </header>

      <main className="dg-page-main space-y-8">
        <section className="rounded-xl border border-emerald-500/30 bg-emerald-500/5 px-5 py-5">
          <p className="text-xs font-medium uppercase tracking-[0.18em] text-emerald-300">
            Founding Acquisition Partner Programme
          </p>
          <p className="mt-2 text-3xl font-bold text-white">
            {foundingSeats.used} / {foundingSeats.cap}{" "}
            <span className="text-lg font-medium text-slate-400">seats filled</span>
          </p>
          <p className="mt-2 max-w-xl text-sm text-slate-300">
            We&apos;re deliberately limiting the first cohort to 10 highly capable introducers.
            3–5 excellent partners are the immediate target.
          </p>
          <p className="mt-2 max-w-xl text-xs text-slate-500">
            Detailed commission rates, qualification rules and payment terms live under{" "}
            <Link href="/command/commissions" className="text-sky-400 hover:underline">
              Partners → Commissions
            </Link>
            .
          </p>
          <div className="mt-5 grid gap-6 lg:grid-cols-2">
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                Why become a Founding Acquisition Partner?
              </p>
              <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-slate-300">
                {FOUNDING_RESELLER_WHY.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </div>
            <InviteFoundingResellerForm compact />
          </div>
        </section>

        <section className="rounded-xl border border-slate-700/80 bg-slate-950/50 px-5 py-5">
          <p className="text-xs font-medium uppercase tracking-[0.18em] text-slate-500">
            Partner Pulse
          </p>
          <h2 className="mt-1 text-lg font-semibold text-white">Channel at a glance</h2>
          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <PulseTile label="Active" value={String(pulse.activeResellers)} />
            <PulseTile label="Pending" value={String(pulse.pendingApplications)} />
            <PulseTile label="Referrals (month)" value={String(pulse.referralsThisMonth)} />
            <PulseTile label="Customers referred" value={String(pulse.customersReferred)} />
            <PulseTile
              label="Commission owing"
              value={formatAud(pulse.commissionOwingCents)}
            />
            <PulseTile label="Commission paid" value={formatAud(pulse.commissionPaidCents)} />
          </div>
          <p className="mt-3 text-xs text-slate-500">
            Active referred customers and referred MRR land once the channel has volume — keep
            Partner Pulse light while the first partners come online.
          </p>
        </section>

        <section className="rounded-xl border border-slate-700/80 bg-slate-950/40 px-5 py-5">
          <p className="text-xs font-medium uppercase tracking-[0.18em] text-slate-500">
            How Acquisition Partnering works
          </p>
          <h2 className="mt-1 text-lg font-semibold text-white">
            Introduce → Qualify → Close → Go Live → Earn
          </h2>
          <ol className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {FOUNDING_RESELLER_HOW_IT_WORKS.map((step) => (
              <li
                key={step.n}
                className="rounded-lg border border-slate-800 bg-slate-950/60 px-4 py-3"
              >
                <p className="font-mono text-[11px] text-sky-400">{step.n}</p>
                <p className="mt-1 text-sm font-semibold text-white">{step.title}</p>
                <p className="mt-1 text-sm text-slate-400">{step.body}</p>
              </li>
            ))}
          </ol>
        </section>

        <section className="rounded-xl border border-slate-700/80 bg-slate-950/40 px-5 py-4">
          <p className="text-xs font-medium uppercase tracking-[0.16em] text-slate-500">
            Acquisition Partner pipeline
          </p>
          <div className="mt-3 flex flex-wrap gap-3">
            {pipelineCounts.map((s) => (
              <div
                key={s.id}
                className="rounded-lg border border-slate-800 px-3 py-2 text-sm text-slate-300"
              >
                <span className="font-semibold text-white">{s.count}</span> {s.label}
              </div>
            ))}
          </div>
          <p className="mt-3 text-xs text-slate-500">
            Partner status only — DigitalGate customer prospects live in Sales / Growth Engine.
          </p>
        </section>

        <section className="overflow-hidden rounded-xl border border-slate-700/60 bg-slate-950/40">
          <div className="flex items-center justify-between border-b border-slate-700/60 px-4 py-3">
            <h2 className="text-sm font-semibold text-white">Acquisition Partners</h2>
            <Link href="/command/partners" className="text-xs text-sky-400 hover:underline">
              Partner Network →
            </Link>
          </div>
          {resellers.length === 0 ? (
            <div className="px-6 py-12 text-center">
              <p className="text-sm text-slate-300">No partners registered yet.</p>
              <p className="mt-2 text-sm text-slate-500">
                Founding Acquisition Partner status is invitation only — recruit 3–5 excellent
                introducers first. The workflow that matters now: Invitation → acceptance →
                referral → opportunity → customer → commission.
              </p>
            </div>
          ) : (
            <AcquisitionPartnerTable rows={resellers} />
          )}
        </section>

        <section className="rounded-xl border border-slate-700/80 bg-slate-950/40 px-5 py-5">
          <p className="text-xs font-medium uppercase tracking-[0.16em] text-slate-500">
            Recent activity
          </p>
          <h2 className="mt-1 text-lg font-semibold text-white">
            Referrals · introductions · conversions · commissions
          </h2>
          {recentActivity.length === 0 ? (
            <p className="mt-4 text-sm text-slate-500">
              Activity appears here once partners start introducing businesses.
            </p>
          ) : (
            <ul className="mt-4 space-y-2">
              {recentActivity.map((row) => (
                <li key={row.id}>
                  <Link
                    href={row.href}
                    className="flex flex-wrap items-baseline justify-between gap-2 rounded-lg border border-slate-800 px-3 py-2 hover:border-sky-500/40"
                  >
                    <div>
                      <p className="text-xs uppercase tracking-wide text-slate-500">{row.label}</p>
                      <p className="text-sm text-slate-200">{row.detail}</p>
                    </div>
                    <p className="text-xs text-slate-500">
                      {new Date(row.at).toLocaleDateString("en-AU")}
                    </p>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>

        <p className="text-xs text-slate-500">
          Acquisition Partners introduce qualified businesses; DigitalGate owns discovery, sales,
          contracting, implementation coordination and the customer relationship. Sales / Growth
          Engine owns DigitalGate prospects. This page manages partners and their referrals — not
          a second prospecting CRM.
        </p>
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

function AcquisitionPartnerTable({ rows }: { rows: PartnerDashboardRow[] }) {
  return (
    <table className="w-full text-sm">
      <thead>
        <tr className="border-b border-slate-700/60 text-left text-xs font-medium uppercase tracking-wider text-slate-500">
          <th className="px-4 py-3">Partner</th>
          <th className="px-4 py-3">Type</th>
          <th className="px-4 py-3">Status</th>
          <th className="px-4 py-3">Joined</th>
          <th className="px-4 py-3" />
        </tr>
      </thead>
      <tbody className="divide-y divide-slate-700/40">
        {rows.map((p) => (
          <tr key={p.id} className="hover:bg-slate-800/40">
            <td className="px-4 py-3">
              <p className="font-medium text-white">{p.name}</p>
              {p.email ? <p className="text-xs text-slate-500">{p.email}</p> : null}
            </td>
            <td className="px-4 py-3 text-slate-300">{p.partnerTypeLabel}</td>
            <td className="px-4 py-3">
              <span
                className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium capitalize ${STATUS_COLOR[p.status] ?? "bg-slate-700 text-slate-400"}`}
              >
                {p.status}
              </span>
            </td>
            <td className="px-4 py-3 text-slate-400">
              {p.joinedAt ? new Date(p.joinedAt).toLocaleDateString("en-AU") : "—"}
            </td>
            <td className="px-4 py-3 text-right">
              <Link
                href={`/command/partners/${p.id}`}
                className="text-xs text-sky-400 hover:underline"
              >
                View →
              </Link>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

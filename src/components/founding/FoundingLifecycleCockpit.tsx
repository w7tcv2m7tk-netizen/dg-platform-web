import Link from "next/link";
import type {
  FoundingLifecycleCustomer,
  FoundingLifecycleWorkspace,
} from "@dg/platform-core";

import { FoundingInviteCardActions } from "@/components/founding/FoundingInviteCardActions";
import { InviteToFounding10Form } from "@/components/founding/InviteToFounding10Form";

function formatShortDate(iso: string | null) {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleDateString("en-AU", { day: "numeric", month: "short" });
}

function healthDot(health: FoundingLifecycleCustomer["health"]) {
  if (health === "green") return "🟢";
  if (health === "amber") return "🟠";
  return "—";
}

export function FoundingLifecycleCockpit({ data }: { data: FoundingLifecycleWorkspace }) {
  const { cohort, attention, phases, cohortTable } = data;

  return (
    <>
      <header className="dg-page-header">
        <Link href="/command" className="text-sm text-sky-400 hover:underline">
          ← Command Centre
        </Link>
        <p className="mt-4 text-xs font-semibold uppercase tracking-[0.22em] text-emerald-300">
          Founding 10
        </p>
        <h1 className="mt-2 text-2xl font-bold text-white sm:text-3xl">
          Founding Customer Programme
        </h1>
        <p className="mt-3 max-w-2xl text-sm text-slate-300">
          Manage the complete journey from first conversation to implementation, go-live and the
          30-day founding customer review.
        </p>
        <p className="mt-2 max-w-2xl text-xs text-slate-500">
          Customers can enter through public application or personal invitation. Both paths enter
          the same Founding 10 qualification pipeline. A seat is counted only after acceptance into
          the programme.
        </p>
      </header>

      <main className="dg-page-main space-y-8">
        <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Metric label="Invited" value={String(cohort.invited)} />
          <Metric label="Accepted" value={`${cohort.accepted} / ${cohort.limit}`} />
          <Metric label="Remaining" value={String(cohort.remaining)} accent />
          <Metric label="In progress" value={String(cohort.inProgress)} />
        </section>

        <section className="rounded-xl border border-amber-500/25 bg-amber-500/5 px-5 py-5">
          <p className="text-xs font-medium uppercase tracking-[0.18em] text-amber-200/90">
            What needs attention
          </p>
          <h2 className="mt-1 text-lg font-semibold text-white">Next actions</h2>
          <ul className="mt-4 space-y-3">
            {attention.map((item, index) => (
              <li
                key={item.id}
                className="flex flex-wrap items-baseline justify-between gap-2 border-b border-amber-500/10 pb-3 last:border-0 last:pb-0"
              >
                <div>
                  <p className="text-sm text-slate-200">
                    <span className="font-semibold text-white">{item.count}</span> {item.label}
                  </p>
                  {item.detail && item.count > 0 ? (
                    <p className="mt-0.5 text-xs text-slate-400">{item.detail}</p>
                  ) : null}
                </div>
                {item.href && item.count > 0 ? (
                  <Link href={item.href} className="text-xs text-sky-400 hover:underline">
                    Open →
                  </Link>
                ) : (
                  <span className="text-[10px] uppercase tracking-wide text-slate-600">
                    {String(index + 1).padStart(2, "0")}
                  </span>
                )}
              </li>
            ))}
          </ul>
        </section>

        <InviteToFounding10Form />

        {phases.map((phase) => (
          <section key={phase.id} className="space-y-4">
            <div className="flex flex-wrap items-end justify-between gap-2 border-b border-slate-800 pb-3">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-sky-400">
                  {phase.number} — {phase.title}
                </p>
                <p className="mt-1 text-xs text-slate-500">
                  {phase.stages.map((s) => s.label).join(" → ")}
                </p>
              </div>
              <p className="text-sm text-slate-400">
                <span className="font-semibold text-white">{phase.count}</span> in this phase
              </p>
            </div>

            <div className="grid gap-4 xl:grid-cols-2">
              {phase.stages.map((bucket) => (
                <article
                  key={bucket.stage}
                  className="rounded-xl border border-slate-700/80 bg-slate-950/50 px-5 py-4"
                >
                  <div className="flex items-center justify-between gap-2">
                    <h3 className="text-sm font-semibold uppercase tracking-wide text-white">
                      {bucket.label}
                      <span className="ml-2 font-normal text-slate-500">· {bucket.customers.length}</span>
                    </h3>
                  </div>

                  <div className="mt-3 rounded-lg border border-slate-800 bg-slate-900/40 px-3 py-2">
                    <p className="text-[10px] font-medium uppercase tracking-wide text-slate-500">
                      Stage rule
                    </p>
                    <p className="mt-1 text-xs text-slate-400">{bucket.rule}</p>
                  </div>

                  {bucket.customers.length === 0 ? (
                    <div className="mt-4 space-y-1">
                      <p className="text-sm text-slate-300">
                        No customers currently at this stage.
                      </p>
                      <p className="text-xs text-slate-500">{bucket.emptyHint}</p>
                    </div>
                  ) : (
                    <ul className="mt-4 space-y-3">
                      {bucket.customers.map((customer) => (
                        <li
                          key={customer.id}
                          className="rounded-lg border border-slate-800 px-3 py-3"
                        >
                          <p className="font-medium text-white">
                            {customer.contactName ?? customer.title}
                            {customer.businessName ? (
                              <span className="font-normal text-slate-400">
                                {" "}
                                — {customer.businessName}
                              </span>
                            ) : null}
                          </p>
                          <p className="mt-1 text-xs text-slate-500">
                            {customer.stageLabel}
                            {customer.invitationSentAt
                              ? ` · ${formatShortDate(customer.invitationSentAt) ?? ""}`
                              : ` · Updated ${formatShortDate(customer.updatedAt) ?? ""}`}
                          </p>
                          <p className="mt-2 text-sm text-slate-300">
                            <span className="text-slate-500">Next action:</span>{" "}
                            {customer.nextAction}
                          </p>
                          <div className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs">
                            <Link
                              href={`/apps/crm/opportunities/${customer.id}`}
                              className="text-sky-400 hover:underline"
                            >
                              Open →
                            </Link>
                            {bucket.stage === "invited" ? (
                              <FoundingInviteCardActions opportunityId={customer.id} />
                            ) : null}
                          </div>
                        </li>
                      ))}
                    </ul>
                  )}
                </article>
              ))}
            </div>
          </section>
        ))}

        <section className="rounded-xl border border-slate-700/80 bg-slate-950/40 px-5 py-5">
          <div className="flex flex-wrap items-end justify-between gap-2">
            <div>
              <p className="text-xs font-medium uppercase tracking-[0.18em] text-slate-500">
                Founding 10
              </p>
              <h2 className="mt-1 text-lg font-semibold text-white">Cohort dashboard</h2>
              <p className="mt-1 text-sm text-slate-400">
                Programme membership at a glance. Click through to the individual lifecycle.
              </p>
            </div>
          </div>
          {cohortTable.length === 0 ? (
            <p className="mt-4 text-sm text-slate-500">
              No active founding customers yet. Send a personal invitation or wait for a public
              application.
            </p>
          ) : (
            <div className="mt-4 overflow-x-auto rounded-lg border border-slate-800">
              <table className="min-w-full text-left text-sm">
                <thead className="bg-slate-900/80 text-[10px] uppercase tracking-wide text-slate-500">
                  <tr>
                    <th className="px-3 py-2">Customer</th>
                    <th className="px-3 py-2">Stage</th>
                    <th className="px-3 py-2">Health</th>
                    <th className="px-3 py-2">Next action</th>
                    <th className="px-3 py-2" />
                  </tr>
                </thead>
                <tbody>
                  {cohortTable.map((row) => (
                    <tr key={row.id} className="border-t border-slate-800/80">
                      <td className="px-3 py-2.5">
                        <p className="font-medium text-white">
                          {row.businessName ?? row.title}
                        </p>
                        {row.contactName ? (
                          <p className="text-xs text-slate-500">{row.contactName}</p>
                        ) : null}
                      </td>
                      <td className="px-3 py-2.5 text-slate-300">{row.stageLabel}</td>
                      <td className="px-3 py-2.5 text-slate-400">{healthDot(row.health)}</td>
                      <td className="px-3 py-2.5 text-slate-400">{row.nextAction}</td>
                      <td className="px-3 py-2.5 text-right">
                        <Link
                          href={`/apps/crm/opportunities/${row.id}`}
                          className="text-xs text-sky-400 hover:underline"
                        >
                          Open →
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <p className="text-xs text-slate-500">
          Architectural rule: the Founding Customer record is the source of truth for cohort
          progression. CRM, Sales, Delivery, Customer Intelligence and Billing link to it — they do
          not each maintain a parallel founding lifecycle.
        </p>
      </main>
    </>
  );
}

function Metric({
  label,
  value,
  accent,
}: {
  label: string;
  value: string;
  accent?: boolean;
}) {
  return (
    <div className="rounded-xl border border-slate-700/80 bg-slate-950/50 px-4 py-4">
      <p className="text-xs uppercase tracking-widest text-slate-500">{label}</p>
      <p
        className={`mt-1 text-2xl font-semibold ${accent ? "text-emerald-300" : "text-white"}`}
      >
        {value}
      </p>
    </div>
  );
}

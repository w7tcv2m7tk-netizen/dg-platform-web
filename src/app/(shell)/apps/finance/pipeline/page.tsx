import Link from "next/link";
import { getFinanceTemplate, listFinanceApplications } from "@dg/platform-core";

import { UpdateFinanceApplicationStageForm } from "@/components/finance/UpdateFinanceApplicationStageForm";
import { canManageFinance } from "@/lib/finance-page-access";
import { formatMoneyFromCents, getOrganisationMoneySettings } from "@/lib/organisation-money";
import { getPlatformPageContext } from "@/lib/platform-page-context";

export default async function FinancePipelinePage() {
  const { session } = await getPlatformPageContext();

  if (!session) {
    return (
      <main className="dg-page-main">
        <p className="text-slate-400">Sign in required.</p>
      </main>
    );
  }

  const template = getFinanceTemplate("mortgage_broking");
  const stages = template.stages.map((s) => s.id);
  const [{ items }, money] = await Promise.all([
    listFinanceApplications({
      organisationId: session.organisationId,
      limit: 100,
    }),
    getOrganisationMoneySettings(session.organisationId),
  ]);
  const canManage = canManageFinance(session);

  const grouped = new Map<string, typeof items>();
  for (const stage of stages) grouped.set(stage, []);
  for (const app of items) {
    const stage = stages.includes(app.stage) ? app.stage : stages[0] ?? "enquiry";
    const list = grouped.get(stage) ?? [];
    list.push(app);
    grouped.set(stage, list);
  }
  for (const app of items) {
    if (!stages.includes(app.stage)) {
      const list = grouped.get(app.stage) ?? [];
      if (!list.includes(app)) {
        list.push(app);
        grouped.set(app.stage, list);
      }
    }
  }

  const stageMeta = new Map(template.stages.map((s) => [s.id, s.label]));

  return (
    <main className="dg-page-main space-y-6">
      <div>
        <p className="text-sm text-slate-400">
          {session.organisationName} · {template.label} stages
        </p>
        {!canManage ? (
          <p className="mt-1 text-xs text-slate-500">
            Read-only pipeline. Stage changes require organisation-wide Finance edit access.
          </p>
        ) : null}
      </div>
      <div className="grid gap-4 lg:grid-cols-3 xl:grid-cols-4">
        {[...grouped.entries()].map(([stage, apps]) => (
          <section key={stage} className="dg-card min-h-[12rem]">
            <div className="flex items-center justify-between gap-2">
              <h2 className="text-sm font-semibold text-white">
                {stageMeta.get(stage) ?? stage.replace(/_/g, " ")}
              </h2>
              <span className="rounded-full bg-slate-800 px-2 py-0.5 text-xs text-slate-300">
                {apps.length}
              </span>
            </div>
            {apps.length === 0 ? (
              <p className="mt-4 text-xs text-slate-600">Empty</p>
            ) : (
              <ul className="mt-3 space-y-2">
                {apps.map((app) => {
                  const amount = formatMoneyFromCents(app.loanAmountCents, money);
                  return (
                    <li
                      key={app.id}
                      className="rounded-lg border border-slate-800 bg-slate-950/50 px-2.5 py-2"
                    >
                      <p className="text-sm font-medium text-white">{app.title}</p>
                      <p className="text-[11px] text-slate-500">
                        {app.status}
                        {app.lenderName ? ` · ${app.lenderName}` : ""}
                        {amount ? ` · ${amount}` : ""}
                      </p>
                      <div className="mt-2">
                        {canManage ? (
                          <UpdateFinanceApplicationStageForm
                            applicationId={app.id}
                            currentStage={app.stage}
                            stages={template.stages}
                          />
                        ) : (
                          <span className="inline-flex min-h-11 items-center text-xs capitalize text-slate-400">
                            {app.stage.replace(/_/g, " ")}
                          </span>
                        )}
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>
        ))}
      </div>
      <p className="text-sm text-slate-500">
        <Link
          href="/apps/finance/applications"
          className="inline-flex min-h-11 items-center text-sky-400 hover:underline"
        >
          {canManage ? "Create / manage applications →" : "View applications →"}
        </Link>
      </p>
    </main>
  );
}

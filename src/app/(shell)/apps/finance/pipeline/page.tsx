import Link from "next/link";
import { currentUser } from "@clerk/nextjs/server";
import {
  getFinanceTemplate,
  listFinanceApplications,
} from "@dg/platform-core";

import { FinanceNav } from "@/components/finance/FinanceNav";
import { UpdateFinanceApplicationStageForm } from "@/components/finance/UpdateFinanceApplicationStageForm";
import { resolveActivePlatformSession } from "@/lib/active-platform-session";

export default async function FinancePipelinePage() {
  const user = await currentUser();
  const email = user?.primaryEmailAddress?.emailAddress ?? "";
  const name =
    user?.fullName ??
    [user?.firstName, user?.lastName].filter(Boolean).join(" ") ??
    email;
  const session = user?.id
    ? await resolveActivePlatformSession({ clerkUserId: user.id, email, name })
    : null;

  if (!session) {
    return (
      <>
        <header className="dg-page-header">
          <h1 className="text-2xl font-bold text-white">Pipeline</h1>
        </header>
        <main className="dg-page-main">
          <p className="text-slate-400">Sign in required.</p>
        </main>
      </>
    );
  }

  const template = getFinanceTemplate("mortgage_broking");
  const stages = template.stages.map((s) => s.id);

  const { items } = await listFinanceApplications({
    organisationId: session.organisationId,
    limit: 100,
  });

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
    <>
      <header className="dg-page-header">
        <h1 className="text-2xl font-bold text-white">Pipeline</h1>
        <p className="text-sm text-slate-400">
          {session.organisationName} · {template.label} stages
        </p>
      </header>
      <main className="dg-page-main space-y-6">
        <FinanceNav active="pipeline" />
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
                  {apps.map((app) => (
                    <li
                      key={app.id}
                      className="rounded-lg border border-slate-800 bg-slate-950/50 px-2.5 py-2"
                    >
                      <p className="text-sm font-medium text-white">{app.title}</p>
                      <p className="text-[11px] text-slate-500">
                        {app.status}
                        {app.lenderName ? ` · ${app.lenderName}` : ""}
                        {app.loanAmountCents != null
                          ? ` · $${(app.loanAmountCents / 100).toLocaleString("en-AU")}`
                          : ""}
                      </p>
                      <div className="mt-2">
                        <UpdateFinanceApplicationStageForm
                          applicationId={app.id}
                          currentStage={app.stage}
                          stages={template.stages}
                        />
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          ))}
        </div>
        <p className="text-sm text-slate-500">
          <Link href="/apps/finance/applications" className="text-sky-400 hover:underline">
            Create / manage applications →
          </Link>
        </p>
      </main>
    </>
  );
}

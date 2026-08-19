import Link from "next/link";
import { connection } from "next/server";
import {
  FOUNDING_INVITATION_STAGES,
  FOUNDING_STAGE_LABELS,
  FOUNDING_STAGE_NEXT_ACTION,
  FOUNDING_STAGES,
  getFoundingCohortSummary,
  listOpportunities,
  normaliseFoundingStage,
} from "@dg/platform-core";

import { CommandCentreNav } from "@/components/command/CommandCentreNav";
import { InviteToFounding10Form } from "@/components/founding/InviteToFounding10Form";
import { getPlatformPageContext } from "@/lib/org-apps";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export default async function CommandFoundingPage() {
  await connection();
  const { session } = await getPlatformPageContext();
  const [{ items }, cohort] = session
    ? await Promise.all([
        listOpportunities({
          organisationId: session.organisationId,
          pipelineId: "founding_10",
          limit: 100,
        }),
        getFoundingCohortSummary(session.organisationId),
      ])
    : [{ items: [] }, { limit: 10, invited: 0, accepted: 0, remaining: 10 }];

  const active = items.filter((item) => {
    const meta = (item.metadata ?? {}) as Record<string, unknown>;
    return item.status !== "lost" && meta.founding_invitation_status !== "withdrawn";
  });

  const invitationGroup = FOUNDING_INVITATION_STAGES.map((stage) => ({
    stage,
    items: active.filter((item) => normaliseFoundingStage(item.stage) === stage),
  }));
  const programmeGroup = FOUNDING_STAGES.filter(
    (stage) => !(FOUNDING_INVITATION_STAGES as readonly string[]).includes(stage),
  ).map((stage) => ({
    stage,
    items: active.filter((item) => normaliseFoundingStage(item.stage) === stage),
  }));

  return (
    <>
      <header className="dg-page-header">
        <Link href="/command" className="text-sm text-sky-400 hover:underline">
          ← Command Centre
        </Link>
        <p className="mt-4 text-xs font-semibold uppercase tracking-[0.22em] text-emerald-300">
          Founding 10
        </p>
        <h1 className="mt-2 text-2xl font-bold text-white">Founding Customer pipeline</h1>
        <p className="mt-1 max-w-2xl text-sm text-slate-400">
          Public application or personal invitation — same cohort. A seat is counted
          only after you accept them into the programme.
        </p>
      </header>
      <main className="dg-page-main space-y-6">
        <CommandCentreNav active="founding" />

        <section className="grid gap-3 sm:grid-cols-3">
          <div className="dg-card">
            <p className="text-xs uppercase tracking-widest text-slate-500">Invited</p>
            <p className="mt-1 text-2xl font-semibold text-white">{cohort.invited}</p>
          </div>
          <div className="dg-card">
            <p className="text-xs uppercase tracking-widest text-slate-500">Accepted</p>
            <p className="mt-1 text-2xl font-semibold text-white">
              {cohort.accepted} / {cohort.limit}
            </p>
          </div>
          <div className="dg-card">
            <p className="text-xs uppercase tracking-widest text-slate-500">Remaining</p>
            <p className="mt-1 text-2xl font-semibold text-emerald-300">{cohort.remaining}</p>
          </div>
        </section>

        <InviteToFounding10Form />

        <section>
          <h2 className="mb-3 text-sm font-semibold text-slate-300">Invitation path</h2>
          <div className="grid gap-4 xl:grid-cols-3">
            {invitationGroup.map(({ stage, items: rows }) => (
              <StageColumn key={stage} stage={stage} rows={rows} />
            ))}
          </div>
        </section>

        <section>
          <h2 className="mb-3 text-sm font-semibold text-slate-300">
            Application, consultation, and programme
          </h2>
          <div className="grid gap-4 xl:grid-cols-3">
            {programmeGroup.map(({ stage, items: rows }) => (
              <StageColumn key={stage} stage={stage} rows={rows} />
            ))}
          </div>
        </section>
      </main>
    </>
  );
}

function StageColumn({
  stage,
  rows,
}: {
  stage: (typeof FOUNDING_STAGES)[number];
  rows: Array<{ id: string; title: string }>;
}) {
  return (
    <section className="dg-card min-h-[10rem]">
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-sm font-semibold text-white">{FOUNDING_STAGE_LABELS[stage]}</h2>
        <span className="text-xs text-slate-500">{rows.length}</span>
      </div>
      <p className="mt-1 text-xs text-slate-500">{FOUNDING_STAGE_NEXT_ACTION[stage]}</p>
      <ul className="mt-3 space-y-2">
        {rows.length === 0 ? (
          <li className="text-xs text-slate-600">None</li>
        ) : (
          rows.map((row) => (
            <li key={row.id}>
              <Link
                href={`/apps/crm/opportunities/${row.id}`}
                className="block rounded-lg border border-slate-800 px-3 py-2 text-sm text-slate-200 hover:border-sky-500/40"
              >
                {row.title}
              </Link>
            </li>
          ))
        )}
      </ul>
    </section>
  );
}

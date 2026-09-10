import Link from "next/link";
import {
  getOrganisationById,
  listConsultationAgenda,
  listTasks,
  sessionHasFeature,
} from "@dg/platform-core";

import { CrmCalendar } from "@/components/crm/CrmCalendar";
import { getAuthorisedPlatformPageSession } from "@/lib/platform-page-feature";

type CalendarItem = {
  id: string;
  kind: "task" | "consultation";
  startsAt: string;
  title: string;
  detail: string;
  href: string;
  overdue: boolean;
};

function safeTimeZone(value: string | null | undefined) {
  const candidate = value?.trim() || "UTC";
  try {
    new Intl.DateTimeFormat("en-AU", { timeZone: candidate }).format(new Date());
    return candidate;
  } catch {
    return "UTC";
  }
}

export default async function CrmCalendarPage() {
  const session = await getAuthorisedPlatformPageSession("crm.calendar.read");
  if (!session) return null;

  const organisation = await getOrganisationById(session.organisationId);
  const displayTimeZone = safeTimeZone(organisation?.timezone);
  const canReadTasks = sessionHasFeature(session, "crm.tasks.read");
  const canReadOpportunities = sessionHasFeature(session, "crm.opportunities.read");

  const [taskResult, consultationAgenda] = await Promise.all([
    canReadTasks
      ? listTasks({ organisationId: session.organisationId, status: "open", limit: 100 })
      : Promise.resolve(null),
    canReadOpportunities
      ? listConsultationAgenda({ organisationId: session.organisationId })
      : Promise.resolve(null),
  ]);

  const now = Date.now();
  const dated: CalendarItem[] = [];

  for (const task of taskResult?.items ?? []) {
    if (!task.dueAt) continue;
    dated.push({
      id: `task:${task.id}`,
      kind: "task",
      startsAt: task.dueAt,
      title: task.title,
      detail:
        [task.priority ? `${task.priority} priority` : null, task.entityType]
          .filter(Boolean)
          .join(" · ") || "CRM task",
      href: `/apps/crm/tasks/${task.id}`,
      overdue: new Date(task.dueAt).getTime() < now,
    });
  }

  for (const consultation of [
    ...(consultationAgenda?.upcoming ?? []),
    ...(consultationAgenda?.past ?? []),
  ]) {
    if (!consultation.startsAt) continue;
    dated.push({
      id: `consultation:${consultation.opportunityId}`,
      kind: "consultation",
      startsAt: consultation.startsAt,
      title: consultation.contactName || consultation.title || "Consultation",
      detail: ["Appointment", consultation.stage?.replace(/_/g, " "), consultation.status]
        .filter(Boolean)
        .join(" · "),
      href: `/apps/crm/opportunities/${consultation.opportunityId}`,
      overdue: false,
    });
  }

  dated.sort((a, b) => new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime());
  const unscheduledTasks = (taskResult?.items ?? []).filter((task) => !task.dueAt);
  const unscheduledConsultations = consultationAgenda?.unscheduled ?? [];

  return (
    <>
      <header className="dg-page-header">
        <Link href="/apps/crm/tasks" className="text-sm text-blue-400 hover:underline">
          ← CRM
        </Link>
        <h1 className="mt-2 text-2xl font-bold text-white">Calendar</h1>
        <p className="text-sm text-slate-400">
          {session.organisationName} · appointments, consultations and tasks in one operational view
        </p>
      </header>

      <main className="dg-page-main space-y-6">
        <div className="dg-card">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="font-semibold text-white">CRM Calendar</h2>
              <p className="mt-1 max-w-3xl text-sm text-slate-400">
                A unified view over canonical CRM records. Calendar never creates duplicate data: update tasks and appointments at their source record.
              </p>
            </div>
            <div className="flex flex-wrap gap-3 text-sm">
              {canReadTasks ? <Link href="/apps/crm/tasks" className="text-sky-400 hover:underline">Tasks →</Link> : null}
              {canReadOpportunities ? <Link href="/apps/crm/consultations" className="text-sky-400 hover:underline">Appointments →</Link> : null}
            </div>
          </div>
        </div>

        {!canReadTasks && !canReadOpportunities ? (
          <div className="dg-card">
            <p className="text-sm text-slate-400">Calendar is available, but your role does not currently have access to Tasks or Opportunities.</p>
          </div>
        ) : (
          <CrmCalendar items={dated} timeZone={displayTimeZone} />
        )}

        {unscheduledTasks.length || unscheduledConsultations.length ? (
          <section className="dg-card">
            <h2 className="font-semibold text-white">Needs scheduling</h2>
            <p className="mt-1 text-sm text-slate-400">Records without a due/start time stay here until they are scheduled at the source.</p>
            <ul className="mt-3 divide-y divide-slate-800">
              {unscheduledTasks.map((task) => (
                <li key={`unscheduled-task:${task.id}`} className="py-3">
                  <Link href={`/apps/crm/tasks/${task.id}`} className="text-sky-400 hover:underline">{task.title}</Link>
                  <p className="text-xs text-slate-500">Task · no due date</p>
                </li>
              ))}
              {unscheduledConsultations.map((consultation) => (
                <li key={`unscheduled-consultation:${consultation.opportunityId}`} className="py-3">
                  <Link href={`/apps/crm/opportunities/${consultation.opportunityId}`} className="text-sky-400 hover:underline">{consultation.contactName || consultation.title || "Consultation"}</Link>
                  <p className="text-xs text-slate-500">Appointment · time TBC</p>
                </li>
              ))}
            </ul>
          </section>
        ) : null}
      </main>
    </>
  );
}

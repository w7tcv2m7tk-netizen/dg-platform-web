import Link from "next/link";
import {
  getOrganisationById,
  listConsultationAgenda,
  listTasks,
  sessionHasFeature,
} from "@dg/platform-core";

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

function dayKey(iso: string, timeZone: string) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(iso));
}

function dayHeading(iso: string, timeZone: string) {
  return new Intl.DateTimeFormat("en-AU", {
    timeZone,
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(new Date(iso));
}

function timeLabel(iso: string, timeZone: string) {
  return new Intl.DateTimeFormat("en-AU", {
    timeZone,
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(iso));
}

function groupByDay(items: CalendarItem[], timeZone: string) {
  const groups: Array<{ key: string; heading: string; items: CalendarItem[] }> = [];
  for (const item of items) {
    const key = dayKey(item.startsAt, timeZone);
    const last = groups[groups.length - 1];
    if (last?.key === key) last.items.push(item);
    else groups.push({ key, heading: dayHeading(item.startsAt, timeZone), items: [item] });
  }
  return groups;
}

export default async function CrmCalendarPage() {
  const session = await getAuthorisedPlatformPageSession("crm.calendar.read");
  if (!session) return null;

  const organisation = await getOrganisationById(session.organisationId);
  const displayTimeZone = safeTimeZone(organisation?.timezone);
  const canReadTasks = sessionHasFeature(session, "crm.tasks.read");
  const canReadOpportunities = sessionHasFeature(session, "crm.opportunities.read");

  const taskResult = canReadTasks
    ? await listTasks({ organisationId: session.organisationId, status: "open", limit: 100 })
    : null;
  const consultationAgenda = canReadOpportunities
    ? await listConsultationAgenda({ organisationId: session.organisationId })
    : null;

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
      detail: ["Consultation", consultation.stage?.replace(/_/g, " "), consultation.status]
        .filter(Boolean)
        .join(" · "),
      href: `/apps/crm/opportunities/${consultation.opportunityId}`,
      overdue: false,
    });
  }

  dated.sort((a, b) => new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime());
  const groups = groupByDay(dated, displayTimeZone);
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
          {session.organisationName} · unified agenda from CRM Tasks and Consultations
        </p>
      </header>

      <main className="dg-page-main space-y-6">
        <div className="dg-card">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="font-semibold text-white">Agenda</h2>
              <p className="mt-1 max-w-3xl text-sm text-slate-400">
                Calendar is a read-only Core view over canonical CRM records. Edit a task or consultation at its source record so there is no duplicate calendar data.
              </p>
              <p className="mt-1 text-xs text-slate-500">Times shown in {displayTimeZone}.</p>
            </div>
            <div className="flex flex-wrap gap-3 text-sm">
              {canReadTasks ? (
                <Link href="/apps/crm/tasks" className="text-sky-400 hover:underline">
                  Tasks →
                </Link>
              ) : null}
              {canReadOpportunities ? (
                <Link href="/apps/crm/consultations" className="text-sky-400 hover:underline">
                  Consultations →
                </Link>
              ) : null}
            </div>
          </div>
        </div>

        {!canReadTasks && !canReadOpportunities ? (
          <div className="dg-card">
            <p className="text-sm text-slate-400">
              Calendar is available, but your role does not currently have access to Tasks or Opportunities.
            </p>
          </div>
        ) : groups.length === 0 ? (
          <div className="dg-card">
            <p className="text-sm text-slate-400">No dated tasks or consultations yet.</p>
          </div>
        ) : (
          groups.map((group) => (
            <section key={group.key} className="dg-card">
              <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-300">
                {group.heading}
              </h2>
              <ul className="mt-2 divide-y divide-slate-800">
                {group.items.map((item) => (
                  <li key={item.id} className="py-3">
                    <Link
                      href={item.href}
                      className="block rounded-lg p-2 transition hover:bg-slate-900/70"
                    >
                      <div className="flex flex-wrap items-baseline justify-between gap-2">
                        <p className="font-medium text-white">
                          <span className="mr-2 tabular-nums text-sky-300">
                            {timeLabel(item.startsAt, displayTimeZone)}
                          </span>
                          {item.title}
                        </p>
                        <div className="flex items-center gap-2 text-xs uppercase tracking-wide">
                          {item.overdue ? (
                            <span className="rounded-full border border-amber-500/40 bg-amber-500/10 px-2 py-0.5 text-amber-200">
                              Overdue
                            </span>
                          ) : null}
                          <span className="text-slate-500">{item.kind}</span>
                        </div>
                      </div>
                      <p className="mt-1 text-sm capitalize text-slate-400">{item.detail}</p>
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          ))
        )}

        {unscheduledTasks.length || unscheduledConsultations.length ? (
          <section className="dg-card">
            <h2 className="font-semibold text-white">No date set</h2>
            <p className="mt-1 text-sm text-slate-400">
              Records without a due/start time stay visible here until they are scheduled at the source.
            </p>
            <ul className="mt-3 divide-y divide-slate-800">
              {unscheduledTasks.map((task) => (
                <li key={`unscheduled-task:${task.id}`} className="py-3">
                  <Link
                    href={`/apps/crm/tasks/${task.id}`}
                    className="text-sky-400 hover:underline"
                  >
                    {task.title}
                  </Link>
                  <p className="text-xs text-slate-500">Task · no due date</p>
                </li>
              ))}
              {unscheduledConsultations.map((consultation) => (
                <li key={`unscheduled-consultation:${consultation.opportunityId}`} className="py-3">
                  <Link
                    href={`/apps/crm/opportunities/${consultation.opportunityId}`}
                    className="text-sky-400 hover:underline"
                  >
                    {consultation.contactName || consultation.title || "Consultation"}
                  </Link>
                  <p className="text-xs text-slate-500">Consultation · time TBC</p>
                </li>
              ))}
            </ul>
          </section>
        ) : null}
      </main>
    </>
  );
}

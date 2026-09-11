import Link from "next/link";
import {
  getOrganisationById,
  listConsultationAgenda,
  sessionHasFeature,
  type ConsultationAgendaItem,
} from "@dg/platform-core";

import { CrmDeleteButton } from "@/components/crm/CrmDeleteButton";
import { safeTimeZone } from "@/lib/organisation-timezone";
import { getAuthorisedPlatformPageSession } from "@/lib/platform-page-feature";

function dayKey(iso: string, timeZone: string): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(iso));
}

function dayHeading(iso: string, timeZone: string): string {
  return new Intl.DateTimeFormat("en-AU", {
    timeZone,
    weekday: "long",
    day: "numeric",
    month: "long",
  }).format(new Date(iso));
}

function timeLabel(item: ConsultationAgendaItem, timeZone: string): string {
  if (!item.startsAt) return item.appointment?.timeLabel || "Time TBC";
  return new Intl.DateTimeFormat("en-AU", {
    timeZone,
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(item.startsAt));
}

function groupByDay(items: ConsultationAgendaItem[], timeZone: string) {
  const groups: { key: string; heading: string; items: ConsultationAgendaItem[] }[] = [];
  for (const item of items) {
    if (!item.startsAt) continue;
    const key = dayKey(item.startsAt, timeZone);
    const last = groups[groups.length - 1];
    if (last && last.key === key) last.items.push(item);
    else groups.push({ key, heading: dayHeading(item.startsAt, timeZone), items: [item] });
  }
  return groups;
}

function ConsultationRow({
  item,
  canWrite,
  timeZone,
}: {
  item: ConsultationAgendaItem;
  canWrite: boolean;
  timeZone: string;
}) {
  return (
    <li className="py-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <Link
            href={`/apps/crm/opportunities/${item.opportunityId}`}
            className="block hover:opacity-90"
          >
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <p className="font-medium text-white">
                <span className="mr-2 tabular-nums text-sky-300">{timeLabel(item, timeZone)}</span>
                {item.contactName}
              </p>
              <p className="text-xs uppercase tracking-wide text-slate-500">
                {item.stage.replace(/_/g, " ")} · {item.status}
              </p>
            </div>
            <p className="mt-1 text-sm text-slate-400">
              {item.contactEmail ? `${item.contactEmail} · ` : ""}
              {timeZone}
              {item.meetingLink ? " · Online meeting" : ""}
            </p>
          </Link>
          {item.meetingLink ? (
            <a
              href={item.meetingLink}
              target="_blank"
              rel="noreferrer"
              className="mt-1 inline-block text-sm text-sky-400 hover:underline"
            >
              Open meeting
            </a>
          ) : null}
        </div>
        {canWrite ? (
          <CrmDeleteButton
            resource="opportunities"
            id={item.opportunityId}
            name={item.contactName || item.title || "this consultation"}
            compact
          />
        ) : null}
      </div>
    </li>
  );
}

export default async function CrmConsultationsPage() {
  const session = await getAuthorisedPlatformPageSession("crm.opportunities.read");
  if (!session) return null;
  const canWrite = sessionHasFeature(session, "crm.opportunities.write");

  const [organisation, agenda] = await Promise.all([
    getOrganisationById(session.organisationId),
    listConsultationAgenda({ organisationId: session.organisationId }),
  ]);
  const displayTimeZone = safeTimeZone(organisation?.timezone);
  const upcomingGroups = groupByDay(agenda.upcoming, displayTimeZone);
  const pastGroups = groupByDay(agenda.past, displayTimeZone);
  const total = agenda.upcoming.length + agenda.past.length + agenda.unscheduled.length;

  return (
    <>
      <header className="dg-page-header">
        <Link href="/apps/crm/opportunities" className="text-sm text-blue-400 hover:underline">
          ← CRM
        </Link>
        <h1 className="mt-2 text-2xl font-bold text-white">Consultations</h1>
        <p className="text-sm text-slate-400">
          {session.organisationName} · {agenda.upcoming.length} upcoming
          {total ? ` · ${total} booked` : ""} · times in {displayTimeZone}
        </p>
      </header>
      <main className="dg-page-main space-y-6">
        {!canWrite ? (
          <div className="dg-card text-sm text-slate-400">You have read-only access to CRM opportunities and consultations.</div>
        ) : null}
        <div className="dg-card">
          <h2 className="font-semibold text-white">Upcoming</h2>
          <p className="mt-1 text-sm text-slate-400">
            Scheduled consultation bookings from your platform forms and appointment flows.
          </p>
          {upcomingGroups.length === 0 ? (
            <p className="mt-4 text-sm text-slate-500">No upcoming consultations.</p>
          ) : (
            <div className="mt-4 space-y-6">
              {upcomingGroups.map((group) => (
                <section key={group.key}>
                  <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-300">{group.heading}</h3>
                  <ul className="mt-1 divide-y divide-slate-800">
                    {group.items.map((item) => (
                      <ConsultationRow
                        key={item.opportunityId}
                        item={item}
                        canWrite={canWrite}
                        timeZone={displayTimeZone}
                      />
                    ))}
                  </ul>
                </section>
              ))}
            </div>
          )}
        </div>

        {agenda.unscheduled.length > 0 ? (
          <div className="dg-card">
            <h2 className="font-semibold text-white">Time TBC</h2>
            <ul className="mt-2 divide-y divide-slate-800">
              {agenda.unscheduled.map((item) => (
                <ConsultationRow
                  key={item.opportunityId}
                  item={item}
                  canWrite={canWrite}
                  timeZone={displayTimeZone}
                />
              ))}
            </ul>
          </div>
        ) : null}

        {pastGroups.length > 0 ? (
          <div className="dg-card">
            <h2 className="font-semibold text-white">Past</h2>
            <div className="mt-4 space-y-6">
              {pastGroups.map((group) => (
                <section key={group.key}>
                  <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-300">{group.heading}</h3>
                  <ul className="mt-1 divide-y divide-slate-800">
                    {group.items.map((item) => (
                      <ConsultationRow
                        key={item.opportunityId}
                        item={item}
                        canWrite={canWrite}
                        timeZone={displayTimeZone}
                      />
                    ))}
                  </ul>
                </section>
              ))}
            </div>
          </div>
        ) : null}
      </main>
    </>
  );
}

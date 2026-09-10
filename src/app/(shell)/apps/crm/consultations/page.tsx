import Link from "next/link";
import {
  listConsultationAgenda,
  sessionHasFeature,
  type ConsultationAgendaItem,
} from "@dg/platform-core";

import { CrmDeleteButton } from "@/components/crm/CrmDeleteButton";
import { getAuthorisedPlatformPageSession } from "@/lib/platform-page-feature";

const BRISBANE = "Australia/Brisbane";

function dayKey(iso: string): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: BRISBANE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(iso));
}

function dayHeading(iso: string): string {
  return new Intl.DateTimeFormat("en-AU", {
    timeZone: BRISBANE,
    weekday: "long",
    day: "numeric",
    month: "long",
  }).format(new Date(iso));
}

function timeLabel(item: ConsultationAgendaItem): string {
  if (item.appointment?.timeLabel) return item.appointment.timeLabel;
  if (!item.startsAt) return "Time TBC";
  return new Intl.DateTimeFormat("en-AU", {
    timeZone: BRISBANE,
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(item.startsAt));
}

function groupByDay(items: ConsultationAgendaItem[]) {
  const groups: { key: string; heading: string; items: ConsultationAgendaItem[] }[] = [];
  for (const item of items) {
    if (!item.startsAt) continue;
    const key = dayKey(item.startsAt);
    const last = groups[groups.length - 1];
    if (last && last.key === key) last.items.push(item);
    else groups.push({ key, heading: dayHeading(item.startsAt), items: [item] });
  }
  return groups;
}

function ConsultationRow({
  item,
  canWrite,
}: {
  item: ConsultationAgendaItem;
  canWrite: boolean;
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
                <span className="mr-2 tabular-nums text-sky-300">{timeLabel(item)}</span>
                {item.contactName}
              </p>
              <p className="text-xs uppercase tracking-wide text-slate-500">
                {item.stage.replace(/_/g, " ")} · {item.status}
              </p>
            </div>
            <p className="mt-1 text-sm text-slate-400">
              {item.contactEmail ? `${item.contactEmail} · ` : ""}
              {item.appointment?.timezone || "AEST"}
              {item.meetingLink ? " · Zoom" : ""}
            </p>
          </Link>
          {item.meetingLink ? (
            <a
              href={item.meetingLink}
              target="_blank"
              rel="noreferrer"
              className="mt-1 inline-block text-sm text-sky-400 hover:underline"
            >
              Open Zoom
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

  const agenda = await listConsultationAgenda({ organisationId: session.organisationId });
  const upcomingGroups = groupByDay(agenda.upcoming);
  const pastGroups = groupByDay(agenda.past);
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
          {total ? ` · ${total} booked` : ""} · times in AEST
        </p>
      </header>
      <main className="dg-page-main space-y-6">
        {!canWrite ? (
          <div className="dg-card text-sm text-slate-400">You have read-only access to CRM opportunities and consultations.</div>
        ) : null}
        <div className="dg-card">
          <h2 className="font-semibold text-white">Upcoming</h2>
          <p className="mt-1 text-sm text-slate-400">
            Platform Consultation bookings. Confirmation emails CC consultations@digitalgate.com.au.
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
                      <ConsultationRow key={item.opportunityId} item={item} canWrite={canWrite} />
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
                <ConsultationRow key={item.opportunityId} item={item} canWrite={canWrite} />
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
                      <ConsultationRow key={item.opportunityId} item={item} canWrite={canWrite} />
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

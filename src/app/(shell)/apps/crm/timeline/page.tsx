import Link from "next/link";
import {
  formatTimelineDateTime,
  listOrganisationActivities,
  sessionHasFeature,
} from "@dg/platform-core";

import { getAuthorisedPlatformPageSession } from "@/lib/platform-page-feature";

function entityHref(
  entityType: string,
  entityId: string,
  access: { contacts: boolean; companies: boolean; opportunities: boolean },
) {
  if (entityType === "Contact" && access.contacts) return `/apps/crm/contacts/${entityId}`;
  if (entityType === "Company" && access.companies) return `/apps/crm/companies/${entityId}`;
  if (entityType === "Opportunity" && access.opportunities) {
    return `/apps/crm/opportunities/${entityId}`;
  }
  return null;
}

export default async function CrmTimelinePage() {
  const session = await getAuthorisedPlatformPageSession("crm.timeline.read");

  if (!session) {
    return (
      <>
        <header className="dg-page-header">
          <h1 className="text-2xl font-bold text-white">Timeline</h1>
        </header>
        <main className="dg-page-main">
          <div className="dg-card">
            <p className="text-slate-300">Sign in to view the activity timeline.</p>
          </div>
        </main>
      </>
    );
  }

  const recordAccess = {
    contacts: sessionHasFeature(session, "crm.contacts.read"),
    companies: sessionHasFeature(session, "crm.companies.read"),
    opportunities: sessionHasFeature(session, "crm.opportunities.read"),
  };

  const { items, meta } = await listOrganisationActivities({
    organisationId: session.organisationId,
    limit: 100,
  });

  return (
    <>
      <header className="dg-page-header">
        <Link href="/apps/crm/contacts" className="text-sm text-blue-400 hover:underline">
          ← CRM
        </Link>
        <h1 className="mt-2 text-2xl font-bold text-white">Timeline</h1>
        <p className="text-sm text-slate-400">
          Cross-app activity feed · {meta.total} event{meta.total === 1 ? "" : "s"}
        </p>
      </header>
      <main className="dg-page-main">
        <div className="dg-card max-w-3xl">
          {items.length === 0 ? (
            <p className="text-sm text-slate-400">
              No activity yet. Create a contact or company to start the timeline.
            </p>
          ) : (
            <ul className="space-y-4">
              {items.map((activity) => {
                const href = entityHref(
                  activity.entityType,
                  activity.entityId,
                  recordAccess,
                );
                return (
                  <li key={activity.id} className="border-l-2 border-slate-700 pl-4">
                    <div className="flex flex-wrap items-baseline gap-2">
                      <span className="font-medium text-white">{activity.title}</span>
                      <span className="text-xs uppercase tracking-wide text-slate-500">
                        {activity.sourceApp ?? "platform"}
                      </span>
                    </div>
                    {activity.body ? (
                      <p className="mt-1 text-sm text-slate-400">{activity.body}</p>
                    ) : null}
                    <p className="mt-2 text-xs text-slate-500">
                      {activity.entityType}
                      {href ? (
                        <>
                          {" · "}
                          <Link href={href} className="text-blue-400 hover:underline">
                            View record
                          </Link>
                        </>
                      ) : null}
                      {" · "}
                      {formatTimelineDateTime(activity.createdAt)}
                    </p>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </main>
    </>
  );
}

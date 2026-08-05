import Link from "next/link";
import { currentUser } from "@clerk/nextjs/server";
import { listOrganisationActivities, resolvePlatformSession } from "@dg/platform-core";

function entityHref(entityType: string, entityId: string) {
  if (entityType === "Contact") return `/apps/crm/contacts/${entityId}`;
  if (entityType === "Company") return `/apps/crm/companies/${entityId}`;
  return null;
}

export default async function CrmTimelinePage() {
  const user = await currentUser();
  const email = user?.primaryEmailAddress?.emailAddress ?? "";
  const name =
    user?.fullName ??
    [user?.firstName, user?.lastName].filter(Boolean).join(" ") ??
    email;

  const session = user?.id
    ? await resolvePlatformSession({ clerkUserId: user.id, email, name })
    : null;

  if (!session) {
    return (
      <>
        <header className="border-b border-slate-800 px-8 py-5">
          <h1 className="text-2xl font-bold text-white">Timeline</h1>
        </header>
        <main className="flex-1 p-8">
          <div className="dg-card">
            <p className="text-slate-300">Configure DATABASE_URL to view the activity timeline.</p>
          </div>
        </main>
      </>
    );
  }

  const { items, meta } = await listOrganisationActivities({
    organisationId: session.organisationId,
    limit: 100,
  });

  return (
    <>
      <header className="border-b border-slate-800 px-8 py-5">
        <Link href="/apps/crm/contacts" className="text-sm text-blue-400 hover:underline">
          ← CRM
        </Link>
        <h1 className="mt-2 text-2xl font-bold text-white">Timeline</h1>
        <p className="text-sm text-slate-400">
          Cross-app activity feed · {meta.total} event{meta.total === 1 ? "" : "s"}
        </p>
      </header>
      <main className="flex-1 p-8">
        <div className="dg-card max-w-3xl">
          {items.length === 0 ? (
            <p className="text-sm text-slate-400">
              No activity yet. Create a contact or company to start the timeline.
            </p>
          ) : (
            <ul className="space-y-4">
              {items.map((activity) => {
                const href = entityHref(activity.entityType, activity.entityId);
                return (
                  <li
                    key={activity.id}
                    className="border-l-2 border-slate-700 pl-4"
                  >
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
                      {new Date(activity.createdAt).toLocaleString("en-AU")}
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

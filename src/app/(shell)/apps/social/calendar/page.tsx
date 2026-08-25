import Link from "next/link";
import { listOrganisationActivities } from "@dg/platform-core";

import { getPlatformPageContext } from "@/lib/org-apps";

export default async function SocialCalendarPage() {
  const { session: platformSession } = await getPlatformPageContext();
  const drafts = platformSession
    ? await listOrganisationActivities({
        organisationId: platformSession.organisationId,
        sourceApp: "social",
        limit: 50,
      })
    : { items: [], meta: { total: 0, limit: 50, offset: 0 } };

  const socialDrafts = drafts.items.filter((a) => a.activityType === "social.draft");

  return (
    <>
      <header className="dg-page-header">
        <Link href="/apps/social" className="text-sm text-blue-400 hover:underline">
          ← Social overview
        </Link>
        <h1 className="mt-2 text-2xl font-bold text-white">Calendar</h1>
        <p className="text-sm text-slate-400">Local drafts (publish later)</p>
      </header>
      <main className="dg-page-main space-y-6">
        <section className="dg-card border-blue-500/20">
          <p className="text-sm text-blue-200/90">
            There is no publish schedule yet — Meta and LinkedIn OAuth are not connected. Drafts
            are stored locally as activities until publishing is available.
          </p>
        </section>

        <section className="dg-card">
          <h2 className="font-semibold text-white">Draft timeline</h2>
          {socialDrafts.length === 0 ? (
            <p className="mt-3 text-sm text-slate-500">
              No drafts.{" "}
              <Link href="/apps/social/compose" className="text-blue-400 hover:underline">
                Compose one →
              </Link>
            </p>
          ) : (
            <ul className="mt-4 space-y-3">
              {socialDrafts.map((draft) => (
                <li
                  key={draft.id}
                  className="flex flex-wrap items-start justify-between gap-3 rounded-xl border border-slate-800 px-4 py-3"
                >
                  <div>
                    <p className="font-medium text-white">{draft.title}</p>
                    {draft.body ? (
                      <p className="mt-1 line-clamp-2 text-sm text-slate-400">{draft.body}</p>
                    ) : null}
                  </div>
                  <time className="shrink-0 text-xs text-slate-500">
                    {new Date(draft.createdAt).toLocaleString("en-AU")}
                  </time>
                </li>
              ))}
            </ul>
          )}
        </section>
      </main>
    </>
  );
}

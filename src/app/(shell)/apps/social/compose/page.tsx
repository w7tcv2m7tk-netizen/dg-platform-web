import Link from "next/link";
import { listOrganisationActivities } from "@dg/platform-core";

import { SocialComposeForm } from "@/components/social/SocialComposeForm";
import { SocialSubnav } from "@/components/social/SocialSubnav";
import { getPlatformPageContext } from "@/lib/org-apps";

export default async function SocialComposePage() {
  const { session: platformSession } = await getPlatformPageContext();
  const drafts = platformSession
    ? await listOrganisationActivities({
        organisationId: platformSession.organisationId,
        sourceApp: "social",
        limit: 10,
      })
    : { items: [], meta: { total: 0, limit: 10, offset: 0 } };

  const socialDrafts = drafts.items.filter((a) => a.activityType === "social.draft");

  return (
    <>
      <header className="dg-page-header">
        <Link href="/apps/social" className="text-sm text-blue-400 hover:underline">
          ← Social overview
        </Link>
        <h1 className="mt-2 text-2xl font-bold text-white">Compose</h1>
        <p className="text-sm text-slate-400">
          Save local drafts — LinkedIn publish from Compose is next
        </p>
        <SocialSubnav active="/apps/social/compose" />
      </header>
      <main className="dg-page-main space-y-6">
        <section className="dg-card">
          <h2 className="font-semibold text-white">New draft</h2>
          {!platformSession ? (
            <p className="mt-3 text-sm text-amber-300">Sign in and connect Neon to save drafts.</p>
          ) : (
            <div className="mt-4">
              <SocialComposeForm />
            </div>
          )}
        </section>

        <section className="dg-card">
          <h2 className="font-semibold text-white">Recent drafts</h2>
          {socialDrafts.length === 0 ? (
            <p className="mt-3 text-sm text-slate-500">No drafts yet.</p>
          ) : (
            <ul className="mt-4 space-y-3">
              {socialDrafts.map((draft) => (
                <li
                  key={draft.id}
                  className="rounded-xl border border-slate-800 bg-slate-950/40 px-4 py-3"
                >
                  <p className="font-medium text-white">{draft.title}</p>
                  {draft.body ? (
                    <p className="mt-1 line-clamp-2 text-sm text-slate-400">{draft.body}</p>
                  ) : null}
                  <p className="mt-2 text-xs text-slate-500">
                    {new Date(draft.createdAt).toLocaleString("en-AU")}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </section>
      </main>
    </>
  );
}

import { currentUser } from "@clerk/nextjs/server";
import Link from "next/link";
import {
  listWebsites,
  organisationHasWebsitesBuilder,
} from "@dg/platform-core";

import { resolveActivePlatformSession } from "@/lib/active-platform-session";
import { fetchPortalMe } from "@/lib/dg-api";
import { CreateWebsiteForm } from "@/components/websites/CreateWebsiteForm";
import { WebsitesSubnav } from "@/components/websites/WebsitesSubnav";

export default async function WebsitesHomePage() {
  const user = await currentUser();
  const email = user?.primaryEmailAddress?.emailAddress ?? "";
  const name =
    user?.fullName ??
    [user?.firstName, user?.lastName].filter(Boolean).join(" ") ??
    email;

  const portal = email ? await fetchPortalMe(email, user?.id) : null;
  const session = user?.id
    ? await resolveActivePlatformSession({
        clerkUserId: user.id,
        email,
        name,
        orgName: portal?.org_name,
      })
    : null;

  const allowed = session
    ? await organisationHasWebsitesBuilder(session.organisationId)
    : false;

  const sites =
    session && allowed ? await listWebsites(session.organisationId) : [];

  return (
    <>
      <header className="dg-page-header">
        <h1 className="text-2xl font-bold text-white">Website Builder</h1>
        <p className="text-sm text-slate-400">
          {session?.organisationName ?? "DigitalGate"} · AI-native sites from
          Business Profile
        </p>
      </header>
      <main className="dg-page-main">
        <WebsitesSubnav active="sites" />

        {!allowed ? (
          <div className="rounded-lg border border-amber-800/60 bg-amber-950/30 p-5 max-w-2xl space-y-3">
            <h2 className="text-lg font-semibold text-amber-100">
              Enable Website Builder
            </h2>
            <p className="text-sm text-amber-100/80">
              Native builder is gated by feature flag{" "}
              <code className="text-amber-50">websites.builder</code>. Turn it on
              in Command Centre → Flags, or set{" "}
              <code className="text-amber-50">DG_WEBSITES_BUILDER=1</code> locally.
            </p>
            <p className="text-sm text-slate-400">
              Health Centre stays available without this flag.{" "}
              <Link href="/apps/websites/health" className="underline text-slate-300">
                Open Health
              </Link>
            </p>
          </div>
        ) : (
          <div className="grid gap-10 lg:grid-cols-2">
            <section className="space-y-4">
              <h2 className="text-lg font-semibold text-white">Your sites</h2>
              {sites.length === 0 ? (
                <p className="text-sm text-slate-400">
                  No sites yet — create one from your Business Profile.
                </p>
              ) : (
                <ul className="space-y-2">
                  {sites.map((site) => (
                    <li
                      key={site.id}
                      className="rounded-md border border-slate-700 bg-slate-900/50 px-4 py-3 flex flex-wrap items-center justify-between gap-3"
                    >
                      <div>
                        <p className="font-medium text-white">{site.name}</p>
                        <p className="text-xs text-slate-500">
                          {site.status} · /sites/{site.slug} · {site.pageCount}{" "}
                          pages
                        </p>
                      </div>
                      <div className="flex gap-2">
                        <Link
                          href={`/apps/websites/studio/${site.id}`}
                          className="text-sm text-slate-200 underline"
                        >
                          Studio
                        </Link>
                        <Link
                          href={`/sites/${site.slug}${site.status === "published" ? "" : "?preview=1"}`}
                          className="text-sm text-slate-400 underline"
                          target="_blank"
                        >
                          View
                        </Link>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
              <p className="text-xs text-slate-500 pt-2">
                WordPress sites can migrate after the native builder is live —
                content via WordPress Connector → structured model → dual-run →
                cut DNS to DG hosting. Full importer is next sprint.
              </p>
            </section>
            <section className="space-y-4">
              <h2 className="text-lg font-semibold text-white">Create website</h2>
              <CreateWebsiteForm />
            </section>
          </div>
        )}
      </main>
    </>
  );
}

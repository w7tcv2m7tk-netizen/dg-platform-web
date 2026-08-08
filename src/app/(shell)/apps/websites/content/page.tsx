import { currentUser } from "@clerk/nextjs/server";
import Link from "next/link";
import {
  listWebsitesWithPages,
  organisationHasWebsitesBuilder,
} from "@dg/platform-core";

import { resolveActivePlatformSession } from "@/lib/active-platform-session";
import { fetchPortalMe } from "@/lib/dg-api";
import { WebsitesSubnav } from "@/components/websites/WebsitesSubnav";

export default async function ContentOverviewPage() {
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
    session && allowed
      ? await listWebsitesWithPages(session.organisationId)
      : [];

  return (
    <>
      <header className="dg-page-header">
        <h1 className="text-2xl font-bold text-white">Content</h1>
        <p className="text-sm text-slate-400">
          Live page map for Gen 2 sites — open Studio to edit components and SEO
        </p>
      </header>
      <main className="dg-page-main space-y-6">
        <WebsitesSubnav active="content" />

        {!allowed ? (
          <div className="rounded-lg border border-amber-800/60 bg-amber-950/30 p-5 max-w-xl">
            <p className="text-sm text-amber-100/90">
              Enable Website Builder to manage structured content.
            </p>
          </div>
        ) : sites.length === 0 ? (
          <div className="rounded-lg border border-dashed border-slate-600 bg-slate-950/40 p-6 max-w-xl space-y-3">
            <p className="text-sm text-slate-300">
              No sites yet — create one from Business Profile, then edit pages
              here via Studio.
            </p>
            <Link
              href="/apps/websites"
              className="inline-block rounded-md bg-[var(--org-primary,#1e3a5f)] px-3 py-1.5 text-sm font-semibold text-white"
            >
              Create a site
            </Link>
          </div>
        ) : (
          <ul className="space-y-5 max-w-3xl">
            {sites.map((site) => {
              const pages = site.pages ?? [];
              const blockCount = pages.reduce(
                (n, p) => n + p.components.length,
                0,
              );
              return (
                <li
                  key={site.id}
                  className="rounded-lg border border-slate-700 bg-slate-900/40 p-4 space-y-3"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="font-medium text-white">{site.name}</p>
                      <p className="text-xs text-slate-500">
                        /sites/{site.slug} · {pages.length} pages · {blockCount}{" "}
                        components · {site.status}
                      </p>
                    </div>
                    <Link
                      href={`/apps/websites/studio/${site.id}`}
                      className="rounded-md bg-[var(--org-primary,#1e3a5f)] px-3 py-1.5 text-sm font-semibold text-white"
                    >
                      Open Studio
                    </Link>
                  </div>
                  <ul className="divide-y divide-slate-800 border border-slate-800 rounded-md overflow-hidden">
                    {pages.map((page) => {
                      const types = [
                        ...new Set(page.components.map((c) => c.type)),
                      ];
                      return (
                        <li
                          key={page.id}
                          className="flex flex-wrap items-center justify-between gap-2 px-3 py-2.5 bg-slate-950/40"
                        >
                          <div className="min-w-0">
                            <p className="text-sm text-slate-200">
                              {page.title}{" "}
                              <span className="text-slate-500">/{page.slug}</span>
                            </p>
                            <p className="text-[11px] text-slate-500 truncate">
                              {page.components.length} blocks
                              {types.length
                                ? ` · ${types.slice(0, 6).join(", ")}`
                                : ""}
                              {page.seo?.title
                                ? ` · SEO: ${page.seo.title}`
                                : " · no page SEO title"}
                            </p>
                          </div>
                          <div className="flex flex-wrap gap-2 shrink-0">
                            <Link
                              href={`/apps/websites/studio/${site.id}?page=${encodeURIComponent(page.slug)}`}
                              className="text-xs text-sky-400 hover:underline"
                            >
                              Edit page →
                            </Link>
                            <Link
                              href={`/apps/websites/studio/${site.id}?tab=seo&page=${encodeURIComponent(page.slug)}`}
                              className="text-xs text-slate-500 hover:text-sky-400"
                            >
                              SEO →
                            </Link>
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                </li>
              );
            })}
          </ul>
        )}
      </main>
    </>
  );
}

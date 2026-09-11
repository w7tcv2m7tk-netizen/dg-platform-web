import Link from "next/link";
import {
  listWebsitesWithPages,
  organisationHasWebsitesBuilder,
} from "@dg/platform-core";

import { getAuthorisedPlatformPageSession } from "@/lib/platform-page-feature";
import { canAccessWebsiteStudio } from "@/lib/website-studio-access";

export default async function ContentOverviewPage() {
  const session = await getAuthorisedPlatformPageSession("websites.read");
  const canCreate = session ? canAccessWebsiteStudio(session, "create") : false;
  const canEdit = session ? canAccessWebsiteStudio(session, "edit") : false;

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
          {canEdit
            ? "Live page map — open a site to edit components and SEO"
            : "Live page map — review your website pages and SEO details"}
        </p>
      </header>
      <main className="dg-page-main space-y-6">
        {!allowed ? (
          <div className="rounded-lg border border-amber-800/60 bg-amber-950/30 p-5 max-w-xl">
            <p className="text-sm text-amber-100/90">
              Design Studio isn&apos;t enabled for this business yet.
            </p>
          </div>
        ) : sites.length === 0 ? (
          <div className="rounded-lg border border-dashed border-slate-600 bg-slate-950/40 p-6 max-w-xl space-y-3">
            <p className="text-sm text-slate-300">
              {canCreate
                ? "No sites yet — create one under Websites to start building content."
                : "No websites are available to review yet."}
            </p>
            {canCreate ? (
              <Link
                href="/apps/websites"
                className="inline-block rounded-md bg-[var(--org-primary,#1e3a5f)] px-3 py-1.5 text-sm font-semibold text-white"
              >
                Create a site
              </Link>
            ) : null}
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
                      {canEdit ? "Open Studio" : "View website"}
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
                              {canEdit ? "Edit page →" : "View page →"}
                            </Link>
                            {canEdit ? (
                              <Link
                                href={`/apps/websites/studio/${site.id}?tab=seo&page=${encodeURIComponent(page.slug)}`}
                                className="text-xs text-slate-500 hover:text-sky-400"
                              >
                                SEO →
                              </Link>
                            ) : null}
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

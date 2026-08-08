import { currentUser } from "@clerk/nextjs/server";
import Link from "next/link";
import {
  getOrganisationBusinessProfile,
  listOrganisationDomains,
  listWebsites,
  organisationHasWebsitesBuilder,
  suggestTemplateFromProfile,
} from "@dg/platform-core";

import { resolveActivePlatformSession } from "@/lib/active-platform-session";
import { fetchPortalMe } from "@/lib/dg-api";
import { CreateWebsiteForm } from "@/components/websites/CreateWebsiteForm";
import { WebsitesSubnav } from "@/components/websites/WebsitesSubnav";

function statusBadge(status: string) {
  if (status === "published") {
    return "bg-emerald-950/50 text-emerald-300 border-emerald-800/60";
  }
  if (status === "archived") {
    return "bg-slate-900 text-slate-400 border-slate-700";
  }
  return "bg-amber-950/40 text-amber-200 border-amber-800/50";
}

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
  const domains =
    session && allowed
      ? await listOrganisationDomains(session.organisationId)
      : [];
  const domainByWebsite = new Map(
    domains.filter((d) => d.websiteId).map((d) => [d.websiteId!, d]),
  );
  const profile =
    session && allowed
      ? await getOrganisationBusinessProfile(session.organisationId)
      : null;
  const suggestedTemplate = suggestTemplateFromProfile(profile);

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
          <div className="space-y-10">
            <div className="flex flex-wrap gap-2 text-xs text-slate-500">
              <span className="rounded-full border border-slate-700 px-2.5 py-1">
                1. Create from profile
              </span>
              <span className="rounded-full border border-slate-700 px-2.5 py-1">
                2. Edit in Studio
              </span>
              <span className="rounded-full border border-slate-700 px-2.5 py-1">
                3. Preview
              </span>
              <span className="rounded-full border border-slate-700 px-2.5 py-1">
                4. Domains → Make it live
              </span>
            </div>

            <div className="grid gap-10 lg:grid-cols-[1.2fr_0.8fr]">
              <section className="space-y-4">
                <div className="flex flex-wrap items-end justify-between gap-2">
                  <h2 className="text-lg font-semibold text-white">Your sites</h2>
                  {sites.length > 0 ? (
                    <p className="text-xs text-slate-500">
                      {sites.length} site{sites.length === 1 ? "" : "s"}
                    </p>
                  ) : null}
                </div>

                {sites.length === 0 ? (
                  <div className="rounded-lg border border-dashed border-slate-600 bg-slate-950/40 p-6 space-y-3">
                    <h3 className="text-base font-medium text-white">
                      No websites yet
                    </h3>
                    <p className="text-sm text-slate-400 max-w-md">
                      Generate a structured site from your Business Profile —
                      pages, brand colours, services, and a contact form that
                      feeds CRM. Then polish in Studio and go live.
                    </p>
                    <p className="text-xs text-slate-500">
                      Tip: fill{" "}
                      <Link
                        href="/dashboard/business"
                        className="text-slate-300 underline"
                      >
                        Business Profile
                      </Link>{" "}
                      first for better AI output.
                    </p>
                  </div>
                ) : (
                  <ul className="space-y-3">
                    {sites.map((site) => {
                      const domain = domainByWebsite.get(site.id);
                      const previewHref = `/sites/${site.slug}${
                        site.status === "published" ? "" : "?preview=1"
                      }`;
                      return (
                        <li
                          key={site.id}
                          className="rounded-lg border border-slate-700 bg-slate-900/50 px-4 py-4 space-y-3"
                        >
                          <div className="flex flex-wrap items-start justify-between gap-3">
                            <div className="min-w-0 space-y-1">
                              <div className="flex flex-wrap items-center gap-2">
                                <p className="font-medium text-white truncate">
                                  {site.name}
                                </p>
                                <span
                                  className={`rounded border px-1.5 py-0.5 text-[11px] capitalize ${statusBadge(site.status)}`}
                                >
                                  {site.status}
                                </span>
                              </div>
                              <p className="text-xs text-slate-500">
                                /sites/{site.slug} · {site.pageCount} pages
                                {domain
                                  ? ` · ${domain.name}`
                                  : " · no custom domain"}
                              </p>
                            </div>
                            <div className="flex flex-wrap gap-2">
                              <Link
                                href={`/apps/websites/studio/${site.id}`}
                                className="rounded-md bg-[var(--org-primary,#1e3a5f)] px-3 py-1.5 text-sm font-semibold text-white"
                              >
                                Studio
                              </Link>
                              <Link
                                href={previewHref}
                                className="rounded-md border border-slate-600 px-3 py-1.5 text-sm text-slate-200 hover:bg-slate-800"
                                target="_blank"
                              >
                                Preview
                              </Link>
                            </div>
                          </div>
                          <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs">
                            <Link
                              href={`/apps/websites/studio/${site.id}`}
                              className="text-slate-400 hover:text-slate-200"
                            >
                              Make it live
                            </Link>
                            <Link
                              href="/apps/websites/domains"
                              className="text-slate-400 hover:text-slate-200"
                            >
                              Domains
                            </Link>
                            <Link
                              href="/apps/websites/hosting"
                              className="text-slate-400 hover:text-slate-200"
                            >
                              Hosting
                            </Link>
                            <Link
                              href={`/apps/websites/studio/${site.id}`}
                              className="text-slate-400 hover:text-slate-200"
                            >
                              Import from WordPress
                            </Link>
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </section>

              <section className="space-y-4">
                <h2 className="text-lg font-semibold text-white">
                  {sites.length === 0 ? "Create your first website" : "Create another"}
                </h2>
                <CreateWebsiteForm suggestedTemplate={suggestedTemplate} />
              </section>
            </div>
          </div>
        )}
      </main>
    </>
  );
}

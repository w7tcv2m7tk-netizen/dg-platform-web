import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import {
  getWebsite,
  listOrganisationDomains,
  organisationHasWebsitesBuilder,
  organisationHasWordPressConnector,
  resolvePrimaryLinkedDomain,
} from "@dg/platform-core";

import { WebsiteStudioClient } from "@/components/websites/WebsiteStudioClient";
import { WebsiteStudioUnsavedChangesGuard } from "@/components/websites/WebsiteStudioUnsavedChangesGuard";
import { getAuthorisedPlatformPageSession } from "@/lib/platform-page-feature";
import { canAccessWebsiteStudio } from "@/lib/website-studio-access";

type Props = { params: Promise<{ id: string }> };

export default async function WebsiteStudioPage({ params }: Props) {
  const { id } = await params;
  const session = await getAuthorisedPlatformPageSession("websites.read");

  if (!session) {
    return (
      <main className="dg-page-main">
        <p className="text-slate-400">Sign in required.</p>
      </main>
    );
  }

  const allowed = await organisationHasWebsitesBuilder(session.organisationId);
  if (!allowed) {
    return (
      <>
        <header className="dg-page-header">
          <h1 className="text-2xl font-bold text-white">Design Studio</h1>
        </header>
        <main className="dg-page-main">
          <p className="text-slate-400">
            Design Studio isn&apos;t enabled for this business yet.{" "}
            <Link href="/apps/websites" className="underline">
              Back to Design Studio
            </Link>
          </p>
        </main>
      </>
    );
  }

  const website = await getWebsite(session.organisationId, id);
  if (!website) notFound();

  const canEdit = canAccessWebsiteStudio(session, "edit");
  const [domains, showWordPressImport] = await Promise.all([
    listOrganisationDomains(session.organisationId),
    canEdit
      ? organisationHasWordPressConnector(session.organisationId)
      : Promise.resolve(false),
  ]);
  const linkedDomain =
    resolvePrimaryLinkedDomain(website, domains)?.name ?? null;
  const previewHref = `/sites/${website.slug}${website.status === "published" ? "" : "?preview=1"}`;

  return (
    <>
      <header className="dg-page-header">
        <h1 className="text-2xl font-bold text-white">{website.name}</h1>
        <p className="text-sm text-slate-400">
          Design Studio · Websites · {session.organisationName}
          {linkedDomain ? ` · ${linkedDomain}` : ""}
        </p>
      </header>
      <main className="dg-page-main">
        {!canEdit ? (
          <div className="max-w-xl space-y-4 rounded-lg border border-slate-700 bg-slate-900/40 p-5">
            <div>
              <h2 className="font-semibold text-white">Read-only website access</h2>
              <p className="mt-1 text-sm text-slate-400">
                You can view this website, but editing and publishing controls are not available with your current access.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Link
                href={previewHref}
                target="_blank"
                className="rounded-md border border-slate-600 px-3 py-1.5 text-sm text-slate-200 hover:bg-slate-800"
              >
                {website.status === "published" ? "Open live" : "Preview"}
              </Link>
              <Link
                href="/apps/websites"
                className="rounded-md border border-slate-700 px-3 py-1.5 text-sm text-slate-400 hover:text-slate-200"
              >
                Back to Websites
              </Link>
            </div>
          </div>
        ) : (
          <Suspense
            fallback={
              <p className="text-sm text-slate-500">Loading studio…</p>
            }
          >
            <WebsiteStudioUnsavedChangesGuard>
              <WebsiteStudioClient
                initial={website}
                linkedDomain={linkedDomain}
                showWordPressImport={showWordPressImport}
              />
            </WebsiteStudioUnsavedChangesGuard>
          </Suspense>
        )}
      </main>
    </>
  );
}

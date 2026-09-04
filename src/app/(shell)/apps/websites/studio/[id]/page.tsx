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
import { getPlatformPageContext } from "@/lib/platform-page-context";

type Props = { params: Promise<{ id: string }> };

export default async function WebsiteStudioPage({ params }: Props) {
  const { id } = await params;
  const { session } = await getPlatformPageContext();

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
            Enable <code>websites.builder</code> to edit a site.{" "}
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

  const [domains, showWordPressImport] = await Promise.all([
    listOrganisationDomains(session.organisationId),
    organisationHasWordPressConnector(session.organisationId),
  ]);
  const linkedDomain =
    resolvePrimaryLinkedDomain(website, domains)?.name ?? null;

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
        <Suspense
          fallback={
            <p className="text-sm text-slate-500">Loading studio…</p>
          }
        >
          <WebsiteStudioClient
            initial={website}
            linkedDomain={linkedDomain}
            showWordPressImport={showWordPressImport}
          />
        </Suspense>
      </main>
    </>
  );
}

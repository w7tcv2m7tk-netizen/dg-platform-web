import Link from "next/link";
import {
  listFunnelBuilderItems,
  organisationHasWebsitesBuilder,
} from "@dg/platform-core";

import { FunnelBuilderClient } from "@/components/websites/FunnelBuilderClient";
import { getAuthorisedPlatformPageSession } from "@/lib/platform-page-feature";
import { canAccessWebsiteStudio } from "@/lib/website-studio-access";

export default async function FunnelsPage() {
  const session = await getAuthorisedPlatformPageSession("websites.read");
  const canCreate = session ? canAccessWebsiteStudio(session, "create") : false;
  const canDelete = session ? canAccessWebsiteStudio(session, "delete") : false;

  const allowed = session
    ? await organisationHasWebsitesBuilder(session.organisationId)
    : false;

  const funnels =
    session && allowed
      ? await listFunnelBuilderItems(session.organisationId)
      : [];

  return (
    <>
      <header className="dg-page-header">
        <h1 className="text-2xl font-bold text-white">Funnels</h1>
        <p className="text-sm text-slate-400">
          Landing page → form → CRM
        </p>
      </header>
      <main className="dg-page-main space-y-4">
        {!allowed ? (
          <div className="rounded-lg border border-amber-800/60 bg-amber-950/30 p-5 max-w-xl">
            <p className="text-sm text-amber-100/90">
              Design Studio isn&apos;t enabled for this business yet.{" "}
              <Link href="/apps/websites" className="underline">
                Back to Design Studio
              </Link>
            </p>
          </div>
        ) : (
          <FunnelBuilderClient
            funnels={funnels}
            canCreate={canCreate}
            canDelete={canDelete}
          />
        )}
      </main>
    </>
  );
}

import { currentUser } from "@clerk/nextjs/server";
import Link from "next/link";
import {
  listFunnelBuilderItems,
  organisationHasWebsitesBuilder,
} from "@dg/platform-core";

import { resolveActivePlatformSession } from "@/lib/active-platform-session";
import { fetchPortalMe } from "@/lib/dg-api";
import { FunnelBuilderClient } from "@/components/websites/FunnelBuilderClient";
import { WebsitesSubnav } from "@/components/websites/WebsitesSubnav";

export default async function FunnelsPage() {
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

  const funnels =
    session && allowed
      ? await listFunnelBuilderItems(session.organisationId)
      : [];

  return (
    <>
      <header className="dg-page-header">
        <h1 className="text-2xl font-bold text-white">Funnels</h1>
        <p className="text-sm text-slate-400">
          Landing page → form → CRM · Gen 2 structured sites
        </p>
      </header>
      <main className="dg-page-main space-y-4">
        <WebsitesSubnav active="funnels" />

        {!allowed ? (
          <div className="rounded-lg border border-amber-800/60 bg-amber-950/30 p-5 max-w-xl">
            <p className="text-sm text-amber-100/90">
              Enable Design Studio to create funnels.{" "}
              <Link href="/apps/websites" className="underline">
                Websites
              </Link>
            </p>
          </div>
        ) : (
          <FunnelBuilderClient funnels={funnels} />
        )}
      </main>
    </>
  );
}

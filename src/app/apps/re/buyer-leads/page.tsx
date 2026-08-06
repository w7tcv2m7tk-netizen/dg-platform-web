import { currentUser } from "@clerk/nextjs/server";
import { resolveActivePlatformSession } from "@/lib/active-platform-session";
import { listLeads,} from "@dg/platform-core";

import { BuyerLeadPipeline } from "@/components/re/BuyerLeadPipeline";
import { fetchPortalMe } from "@/lib/dg-api";
import {
  autoSyncWordPressBuyerLeadsIfNeeded,
  getLastWordPressSync,
} from "@/lib/wordpress-sync";

export default async function BuyerLeadsPage() {
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

  if (!session) {
    return (
      <>
        <header className="dg-page-header">
          <h1 className="text-2xl font-bold text-white">Buyer Leads</h1>
        </header>
        <main className="dg-page-main">
          <div className="dg-card">
            <p className="text-slate-300">Database not configured.</p>
          </div>
        </main>
      </>
    );
  }

  const lastSync = await getLastWordPressSync(session.organisationId);
  const autoSync = await autoSyncWordPressBuyerLeadsIfNeeded(session);
  const { items } = await listLeads({
    organisationId: session.organisationId,
    leadType: "buyer",
  });

  return (
    <>
      <header className="dg-page-header">
        <h1 className="text-2xl font-bold text-white">Buyer Leads</h1>
        <p className="text-sm text-slate-400">
          {session.organisationName} · Property enquiry pipeline synced from Roe WordPress
        </p>
        {autoSync.ran && autoSync.result ? (
          <p className="mt-1 text-xs text-emerald-400/90">
            Auto-synced buyers from WordPress
            {autoSync.result.created ? ` · ${autoSync.result.created} new` : ""}
            {autoSync.result.updated ? ` · ${autoSync.result.updated} updated` : ""}
          </p>
        ) : null}
        {lastSync?.lastBuyerLeadSyncAt ? (
          <p className="mt-1 text-xs text-slate-500">
            Last sync: {new Date(lastSync.lastBuyerLeadSyncAt).toLocaleString("en-AU")}
            {lastSync.lastBuyerLeadSync
              ? ` · ${lastSync.lastBuyerLeadSync.created} imported${
                  lastSync.lastBuyerLeadSync.updated
                    ? `, ${lastSync.lastBuyerLeadSync.updated} updated`
                    : ""
                }`
              : ""}
          </p>
        ) : null}
      </header>
      <main className="dg-page-main">
        <BuyerLeadPipeline leads={items} />
      </main>
    </>
  );
}

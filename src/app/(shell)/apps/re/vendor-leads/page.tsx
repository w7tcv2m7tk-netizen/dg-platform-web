import { currentUser } from "@clerk/nextjs/server";
import { resolveActivePlatformSession } from "@/lib/active-platform-session";
import { listLeads,} from "@dg/platform-core";

import { VendorLeadPipeline } from "@/components/re/VendorLeadPipeline";
import { fetchPortalMe } from "@/lib/dg-api";
import {
  autoSyncWordPressVendorLeadsIfNeeded,
  getLastWordPressSync,
} from "@/lib/wordpress-sync";

export default async function VendorLeadsPage() {
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
      <main className="dg-page-main">
        <p className="text-slate-400">Sign in required.</p>
      </main>
    );
  }

  const autoSync = await autoSyncWordPressVendorLeadsIfNeeded(session);
  const lastSync = await getLastWordPressSync(session.organisationId);
  const { items } = await listLeads({
    organisationId: session.organisationId,
    leadType: "vendor",
  });

  let autoSyncNote: string | undefined;
  if (autoSync.ran && autoSync.result) {
    const parts: string[] = [];
    if (autoSync.result.created) {
      parts.push(`${autoSync.result.created} new`);
    }
    if (autoSync.result.updated) {
      parts.push(`${autoSync.result.updated} updated`);
    }
    autoSyncNote =
      parts.length > 0
        ? `Auto-synced ${parts.join(", ")} lead(s) from WordPress`
        : "Auto-sync checked WordPress — no changes";
  }

  return (
    <main className="dg-page-main space-y-6">
      <div>
        <p className="text-sm text-slate-400">
          {session.organisationName} · Vendor pipeline on Platform
        </p>
        {autoSyncNote ? (
          <p className="mt-1 text-xs text-emerald-400/90">{autoSyncNote}</p>
        ) : null}
        {lastSync?.lastVendorLeadSyncAt ? (
          <p className="mt-1 text-xs text-slate-500">
            Last sync:{" "}
            {new Date(lastSync.lastVendorLeadSyncAt).toLocaleString("en-AU")}
            {lastSync.lastVendorLeadSync
              ? ` · ${lastSync.lastVendorLeadSync.created} imported${
                  lastSync.lastVendorLeadSync.updated
                    ? `, ${lastSync.lastVendorLeadSync.updated} updated`
                    : ""
                }`
              : ""}
          </p>
        ) : null}
      </div>
      <VendorLeadPipeline leads={items} />
    </main>
  );
}

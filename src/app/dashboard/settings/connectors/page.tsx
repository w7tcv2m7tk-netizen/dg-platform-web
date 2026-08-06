import Link from "next/link";
import { resolveActivePlatformSession } from "@/lib/active-platform-session";
import { currentUser } from "@clerk/nextjs/server";
import {} from "@dg/platform-core";

import { fetchPortalMe } from "@/lib/dg-api";
import { getLastWordPressSync } from "@/lib/wordpress-sync";

function EnvStatus({ name, configured }: { name: string; configured: boolean }) {
  return (
    <li className="flex items-center justify-between gap-3 py-2 text-sm">
      <span className="font-mono text-slate-400">{name}</span>
      <span className={configured ? "text-emerald-400" : "text-amber-400"}>
        {configured ? "Set" : "Missing"}
      </span>
    </li>
  );
}

export default async function ConnectorsSettingsPage() {
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

  const lastSync = session ? await getLastWordPressSync(session.organisationId) : null;

  const envFlags = {
    database: Boolean(process.env.DATABASE_URL),
    wpConnectorKey: Boolean(process.env.DG_WP_CONNECTOR_API_KEY?.trim()),
    wpConnectorBase: Boolean(process.env.DG_WP_CONNECTOR_BASE_URL?.trim()),
    wpHealthSites: Boolean(process.env.DG_WP_HEALTH_SITES?.trim()),
    wpAccommodationSites: Boolean(process.env.DG_WP_ACCOMMODATION_SITES?.trim()),
    stripe: Boolean(process.env.STRIPE_SECRET_KEY?.trim()),
  };

  return (
    <>
      <header className="dg-page-header">
        <Link href="/dashboard/settings" className="text-sm text-blue-400 hover:underline">
          ← Settings
        </Link>
        <h1 className="mt-2 text-2xl font-bold text-white">Connectors</h1>
        <p className="text-sm text-slate-400">
          WordPress sync, site health, and payment provider configuration
        </p>
      </header>
      <main className="flex-1 space-y-6 p-8">
        <div className="grid gap-4 lg:grid-cols-2">
          <div className="dg-card">
            <h2 className="font-semibold text-white">WordPress sync</h2>
            {lastSync?.lastVendorLeadSyncAt ? (
              <p className="mt-2 text-sm text-slate-400">
                Last vendor sync:{" "}
                {new Date(lastSync.lastVendorLeadSyncAt).toLocaleString("en-AU")}
                {lastSync.lastVendorLeadSync
                  ? ` · ${lastSync.lastVendorLeadSync.created} imported`
                  : ""}
              </p>
            ) : (
              <p className="mt-2 text-sm text-slate-400">No vendor lead sync recorded yet.</p>
            )}
            {lastSync?.lastBuyerLeadSyncAt ? (
              <p className="mt-1 text-sm text-slate-400">
                Last buyer sync:{" "}
                {new Date(lastSync.lastBuyerLeadSyncAt).toLocaleString("en-AU")}
              </p>
            ) : null}
            <Link
              href="/apps/re/vendor-leads"
              className="mt-4 inline-block text-sm text-blue-400 hover:underline"
            >
              Open vendor leads →
            </Link>
          </div>

          <div className="dg-card">
            <h2 className="font-semibold text-white">Environment (Vercel)</h2>
            <p className="mt-1 text-sm text-slate-500">
              Status only — values are never shown here.
            </p>
            <ul className="mt-3 divide-y divide-slate-800">
              <EnvStatus name="DATABASE_URL" configured={envFlags.database} />
              <EnvStatus name="DG_WP_CONNECTOR_API_KEY" configured={envFlags.wpConnectorKey} />
              <EnvStatus name="DG_WP_CONNECTOR_BASE_URL" configured={envFlags.wpConnectorBase} />
              <EnvStatus name="DG_WP_HEALTH_SITES" configured={envFlags.wpHealthSites} />
              <EnvStatus
                name="DG_WP_ACCOMMODATION_SITES"
                configured={envFlags.wpAccommodationSites}
              />
              <EnvStatus name="STRIPE_SECRET_KEY" configured={envFlags.stripe} />
            </ul>
          </div>
        </div>

        <div className="dg-card">
          <h2 className="font-semibold text-white">Setup guides</h2>
          <p className="mt-2 text-sm text-slate-400">
            Per-app connector walkthroughs with env vars and verification steps.
          </p>
          <div className="mt-4 flex flex-wrap gap-4 text-sm">
            <Link href="/dashboard/apps/real-estate/setup" className="text-blue-400 hover:underline">
              Real Estate →
            </Link>
            <Link href="/dashboard/apps/accommodation/setup" className="text-blue-400 hover:underline">
              Accommodation →
            </Link>
            <Link href="/dashboard/apps/websites/setup" className="text-blue-400 hover:underline">
              Websites →
            </Link>
            <Link href="/dashboard/apps/commerce/setup" className="text-blue-400 hover:underline">
              Commerce →
            </Link>
          </div>
        </div>
      </main>
    </>
  );
}

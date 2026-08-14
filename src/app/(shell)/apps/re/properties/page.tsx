import { currentUser } from "@clerk/nextjs/server";
import { resolveActivePlatformSession } from "@/lib/active-platform-session";
import { listProperties,} from "@dg/platform-core";

import { PropertyList } from "@/components/re/PropertyList";
import { CreatePropertyForm } from "@/components/re/CreatePropertyForm";
import { SyncListingsButton } from "@/components/re/SyncListingsButton";
import { fetchPortalMe } from "@/lib/dg-api";
import { autoSyncWordPressPropertiesIfNeeded } from "@/lib/wordpress-sync";

export default async function PropertiesPage() {
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
          <h1 className="text-2xl font-bold text-white">Properties</h1>
        </header>
        <main className="dg-page-main">
          <div className="dg-card">
            <p className="text-slate-300">Database not configured.</p>
          </div>
        </main>
      </>
    );
  }

  await autoSyncWordPressPropertiesIfNeeded(session);

  const { items } = await listProperties({ organisationId: session.organisationId });

  const appraisalCount = items.filter((p) => p.status === "appraisal").length;
  const listedCount = items.filter((p) => p.status === "listed").length;

  return (
    <>
      <header className="dg-page-header">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-white">Properties</h1>
            <p className="text-sm text-slate-400">
              {session.organisationName} · Appraisals & listings
            </p>
            <p className="mt-1 text-xs text-slate-500">
              {appraisalCount} in appraisal · {listedCount} listed · {items.length} total
            </p>
            <p className="mt-2 max-w-xl text-xs text-emerald-400/90">
              Neon is the source of truth for properties. WordPress is a public mirror —
              use Publish to website. Auto-pull from WP is off unless{" "}
              <code className="text-slate-400">re.wp_auto_sync</code> is enabled.
            </p>
          </div>
          <SyncListingsButton />
        </div>
      </header>
      <main className="dg-page-main space-y-6">
        <CreatePropertyForm />
        <PropertyList properties={items} />
      </main>
    </>
  );
}

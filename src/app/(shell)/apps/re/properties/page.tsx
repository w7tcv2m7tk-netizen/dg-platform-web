import { currentUser } from "@clerk/nextjs/server";
import { resolveActivePlatformSession } from "@/lib/active-platform-session";
import { listProperties } from "@dg/platform-core";

import { PropertyList } from "@/components/re/PropertyList";
import { CreatePropertyForm } from "@/components/re/CreatePropertyForm";
import { SyncListingsButton } from "@/components/re/SyncListingsButton";
import { fetchPortalMe } from "@/lib/dg-api";

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
      <main className="dg-page-main">
        <p className="text-slate-400">Sign in required.</p>
      </main>
    );
  }

  const { items } = await listProperties({ organisationId: session.organisationId });

  const appraisalCount = items.filter((p) => p.status === "appraisal").length;
  const listedCount = items.filter((p) => p.status === "listed").length;

  return (
    <main className="dg-page-main space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-sm text-slate-400">
            {session.organisationName} · Appraisals & listings · Platform Core / Neon
          </p>
          <p className="mt-1 text-xs text-slate-500">
            {appraisalCount} in appraisal · {listedCount} listed · {items.length} total
          </p>
          <p className="mt-2 max-w-xl text-xs text-emerald-400/90">
            DigitalGate is the source of truth for properties. Legacy website import is an explicit
            migration action only.
          </p>
        </div>
        <SyncListingsButton />
      </div>
      <CreatePropertyForm />
      <PropertyList properties={items} />
    </main>
  );
}

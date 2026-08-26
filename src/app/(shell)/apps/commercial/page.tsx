import Link from "next/link";
import { currentUser } from "@clerk/nextjs/server";
import { getCommercialOverviewCounts } from "@dg/platform-core";

import { resolveActivePlatformSession } from "@/lib/active-platform-session";

export default async function CommercialOverviewPage() {
  const user = await currentUser();
  const email = user?.primaryEmailAddress?.emailAddress ?? "";
  const name =
    user?.fullName ??
    [user?.firstName, user?.lastName].filter(Boolean).join(" ") ??
    email;
  const session = user?.id
    ? await resolveActivePlatformSession({ clerkUserId: user.id, email, name })
    : null;

  if (!session) {
    return (
      <main className="dg-page-main">
        <p className="text-slate-400">Sign in required.</p>
      </main>
    );
  }

  const counts = await getCommercialOverviewCounts(session.organisationId);

  return (
    <main className="dg-page-main space-y-6">
      <p className="text-sm text-slate-400">
        {session.organisationName} · Commercial assets &amp; tenancies (not residential RE
        sales or PM)
      </p>
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="dg-card">
          <p className="text-xs uppercase tracking-wide text-slate-500">Properties</p>
          <p className="mt-1 text-2xl font-semibold text-white">{counts.properties}</p>
        </div>
        <div className="dg-card">
          <p className="text-xs uppercase tracking-wide text-slate-500">Leases</p>
          <p className="mt-1 text-2xl font-semibold text-white">{counts.leases}</p>
        </div>
        <div className="dg-card">
          <p className="text-xs uppercase tracking-wide text-slate-500">Active leases</p>
          <p className="mt-1 text-2xl font-semibold text-white">{counts.activeLeases}</p>
        </div>
      </div>
      <p className="text-sm text-slate-500">
        Tenants are Core CRM Contacts linked from leases.{" "}
        <Link href="/apps/commercial/properties" className="text-sky-400 hover:underline">
          Add a property →
        </Link>
      </p>
    </main>
  );
}

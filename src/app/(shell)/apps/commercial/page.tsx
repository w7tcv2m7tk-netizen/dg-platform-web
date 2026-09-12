import Link from "next/link";
import { getCommercialOverviewCounts } from "@dg/platform-core";

import { canManageCommercial } from "@/lib/commercial-page-access";
import { getPlatformPageContext } from "@/lib/platform-page-context";

export default async function CommercialOverviewPage() {
  const { session } = await getPlatformPageContext();

  if (!session) {
    return (
      <main className="dg-page-main">
        <p className="text-slate-400">Sign in required.</p>
      </main>
    );
  }

  const [counts, canManage] = await Promise.all([
    getCommercialOverviewCounts(session.organisationId),
    Promise.resolve(canManageCommercial(session)),
  ]);

  return (
    <main className="dg-page-main space-y-6">
      <div>
        <p className="text-sm text-slate-400">
          {session.organisationName} · Commercial assets &amp; tenancies (not residential RE sales or PM)
        </p>
        {!canManage ? (
          <p className="mt-1 text-xs text-slate-500">
            Read-only access. Organisation-wide Commercial edit access is required to create properties or leases.
          </p>
        ) : null}
      </div>
      <div className="grid gap-4 sm:grid-cols-3">
        <Link href="/apps/commercial/properties" className="dg-card block hover:border-sky-500/40">
          <p className="text-xs uppercase tracking-wide text-slate-500">Properties</p>
          <p className="mt-1 text-2xl font-semibold text-white">{counts.properties}</p>
        </Link>
        <Link href="/apps/commercial/leases" className="dg-card block hover:border-sky-500/40">
          <p className="text-xs uppercase tracking-wide text-slate-500">Leases</p>
          <p className="mt-1 text-2xl font-semibold text-white">{counts.leases}</p>
        </Link>
        <Link href="/apps/commercial/leases" className="dg-card block hover:border-sky-500/40">
          <p className="text-xs uppercase tracking-wide text-slate-500">Active leases</p>
          <p className="mt-1 text-2xl font-semibold text-white">{counts.activeLeases}</p>
        </Link>
      </div>
      <p className="text-sm text-slate-500">
        Tenants are Core CRM Contacts linked from leases.{" "}
        <Link
          href="/apps/commercial/properties"
          className="inline-flex min-h-11 items-center text-sky-400 hover:underline"
        >
          {canManage ? "Open properties →" : "View properties →"}
        </Link>
      </p>
    </main>
  );
}

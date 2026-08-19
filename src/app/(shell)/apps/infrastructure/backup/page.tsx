import { currentUser } from "@clerk/nextjs/server";
import Link from "next/link";
import { getInfrastructureBackupOverview } from "@dg/platform-core";

import { InfrastructureNav } from "@/components/infrastructure/InfrastructureNav";
import { WebsiteBackupExportButton } from "@/components/infrastructure/WebsiteBackupExportButton";
import { resolveActivePlatformSession } from "@/lib/active-platform-session";
import { fetchPortalMe } from "@/lib/dg-api";

function statusClass(status: string) {
  if (status === "covered") return "text-emerald-400";
  if (status === "partial") return "text-amber-300";
  return "text-rose-300";
}

export default async function InfrastructureBackupPage() {
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

  const overview = session
    ? await getInfrastructureBackupOverview(session.organisationId)
    : null;

  return (
    <>
      <header className="dg-page-header">
        <h1 className="text-2xl font-bold text-white">Backup</h1>
        <p className="text-sm text-slate-400">
          Platform data, Design Studio websites, and connected WordPress sites — what is
          actually covered, and what still needs a host backup.
        </p>
      </header>
      <main className="dg-page-main max-w-3xl space-y-6">
        <InfrastructureNav active="backup" />

        {!session || !overview ? (
          <p className="text-sm text-slate-400">Sign in to see backup status for this organisation.</p>
        ) : (
          <>
            <ul className="space-y-3">
              {overview.layers.map((layer) => (
                <li
                  key={layer.id}
                  className="rounded-xl border border-slate-800 bg-slate-950/40 px-4 py-3"
                >
                  <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <h2 className="font-semibold text-white">{layer.label}</h2>
                    <span className={`text-xs font-semibold uppercase tracking-wide ${statusClass(layer.status)}`}>
                      {layer.status}
                    </span>
                  </div>
                  <p className="mt-1 text-sm text-slate-400">{layer.detail}</p>
                </li>
              ))}
            </ul>

            <section className="rounded-xl border border-slate-800 bg-slate-950/40 px-4 py-4 space-y-3">
              <h2 className="font-semibold text-white">Design Studio sites</h2>
              {overview.websites.length ? (
                <ul className="space-y-2 text-sm text-slate-300">
                  {overview.websites.map((site) => (
                    <li key={site.id} className="flex flex-wrap justify-between gap-2">
                      <Link href={`/apps/websites/studio/${site.id}`} className="text-sky-400 hover:underline">
                        {site.name}
                      </Link>
                      <span className="text-slate-500">
                        {site.status} · {site.pageCount} page{site.pageCount === 1 ? "" : "s"} ·{" "}
                        {new Date(site.updatedAt).toLocaleDateString("en-AU")}
                      </span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-slate-400">No sites in this organisation yet.</p>
              )}
              <WebsiteBackupExportButton />
            </section>

            {overview.wordpressSites.length ? (
              <section className="rounded-xl border border-slate-800 bg-slate-950/40 px-4 py-4 space-y-2">
                <h2 className="font-semibold text-white">WordPress sites</h2>
                <p className="text-sm text-slate-400">
                  These are not stored as Design Studio pages. Keep a host or Cloudflare backup
                  until they are migrated.
                </p>
                <ul className="text-sm text-slate-300 space-y-1">
                  {overview.wordpressSites.map((site) => (
                    <li key={site.id}>
                      {site.label}{" "}
                      <span className="text-slate-500">({site.baseUrl})</span>
                    </li>
                  ))}
                </ul>
              </section>
            ) : null}
          </>
        )}
      </main>
    </>
  );
}

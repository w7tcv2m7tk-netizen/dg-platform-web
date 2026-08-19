import { currentUser } from "@clerk/nextjs/server";
import Link from "next/link";
import {
  listOrganisationDomains,
  listWebsites,
  resolvePrimaryLinkedDomain,
} from "@dg/platform-core";

import { InfrastructureNav } from "@/components/infrastructure/InfrastructureNav";
import { resolveActivePlatformSession } from "@/lib/active-platform-session";
import { fetchPortalMe } from "@/lib/dg-api";

export default async function HostingStatusPage() {
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

  const sites = session ? await listWebsites(session.organisationId) : [];
  const domains = session
    ? await listOrganisationDomains(session.organisationId)
    : [];

  const published = sites.filter((s) => s.status === "published");
  const linkedDomains = domains.filter((d) => d.websiteId);
  const dnsReady = domains.filter((d) => d.dnsConfiguredAt);
  const sslActive = domains.filter((d) => d.sslState === "active");

  return (
    <>
      <header className="dg-page-header">
        <h1 className="text-2xl font-bold text-white">Hosting</h1>
        <p className="text-sm text-slate-400">
          Infrastructure service · platform hosting · auto SSL · custom domains
        </p>
      </header>
      <main className="dg-page-main space-y-6">
        <InfrastructureNav active="hosting" />
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 max-w-4xl">
          <Stat label="Published sites" value={String(published.length)} />
          <Stat label="Linked domains" value={String(linkedDomains.length)} />
          <Stat label="DNS configured" value={String(dnsReady.length)} />
          <Stat label="SSL active" value={String(sslActive.length)} />
        </div>

        <section className="rounded-lg border border-slate-700 bg-slate-900/40 p-5 max-w-2xl space-y-3">
          <h2 className="text-base font-semibold text-white">How hosting works now</h2>
          <ul className="space-y-2 text-sm text-slate-300">
            <li>
              Sites render on DigitalGate Next.js at{" "}
              <code className="text-slate-200">/sites/[slug]</code> (and custom
              host when DNS is attached).
            </li>
            <li>
              SSL provisions automatically after DNS points at the Vercel hosting
              target.
            </li>
            <li>
              Dedicated DG hosting productization (CDN controls, staging slots)
              comes later — go-live path is live today.
            </li>
          </ul>
          <div className="flex flex-wrap gap-3 pt-1">
            <Link
              href="/apps/websites"
              className="text-sm text-sky-400 hover:underline"
            >
              Design Studio
            </Link>
            <Link
              href="/apps/infrastructure/domains"
              className="text-sm text-sky-400 hover:underline"
            >
              Domains
            </Link>
            <Link
              href="/apps/infrastructure/dns"
              className="text-sm text-sky-400 hover:underline"
            >
              DNS
            </Link>
          </div>
        </section>

        {sites.length > 0 ? (
          <section className="space-y-3 max-w-2xl">
            <h2 className="text-sm font-semibold text-white">Site hosting status</h2>
            <ul className="space-y-2">
              {sites.map((site) => {
                const domain = resolvePrimaryLinkedDomain(site, domains);
                return (
                  <li
                    key={site.id}
                    className="rounded-md border border-slate-700 bg-slate-950/40 px-4 py-3 flex flex-wrap items-center justify-between gap-3"
                  >
                    <div>
                      <p className="font-medium text-white">{site.name}</p>
                      <p className="text-xs text-slate-500">
                        {site.status}
                        {domain
                          ? ` · ${domain.name} · DNS ${domain.dnsConfiguredAt ? "ok" : "pending"} · SSL ${domain.sslState || "—"}`
                          : " · no custom domain yet"}
                      </p>
                    </div>
                    <Link
                      href={`/apps/websites/studio/${site.id}`}
                      className="text-sm text-sky-400 hover:underline"
                    >
                      Make it live →
                    </Link>
                  </li>
                );
              })}
            </ul>
          </section>
        ) : null}
      </main>
    </>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-slate-800 bg-slate-950/50 px-4 py-3">
      <p className="text-2xl font-semibold text-white">{value}</p>
      <p className="text-xs text-slate-500 mt-0.5">{label}</p>
    </div>
  );
}

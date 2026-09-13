import Link from "next/link";
import { notFound } from "next/navigation";
import {
  listOrganisationDomains,
  listWebsites,
  publicHttpsUrlForDomain,
  resolvePrimaryLinkedDomain,
} from "@dg/platform-core";

import { ResolutionAction } from "@/components/ui/ResolutionAction";
import { getAuthorisedPlatformPageSession } from "@/lib/platform-page-feature";
import { canAccessWebsiteStudio } from "@/lib/website-studio-access";

export default async function HostingStatusPage() {
  const session = await getAuthorisedPlatformPageSession("infrastructure.read");
  if (!session) notFound();

  const canEditWebsites = canAccessWebsiteStudio(session, "edit");
  const [sites, domains] = await Promise.all([
    listWebsites(session.organisationId),
    listOrganisationDomains(session.organisationId),
  ]);

  const published = sites.filter((s) => s.status === "published");
  const linkedDomains = domains.filter((d) => d.websiteId);
  const dnsReady = domains.filter((d) => d.dnsConfiguredAt);
  const sslActive = domains.filter((d) => d.sslState === "active");
  const dnsNeedsAttention = linkedDomains.filter((d) => !d.dnsConfiguredAt);
  const sslNeedsAttention = linkedDomains.filter(
    (d) => d.dnsConfiguredAt && d.sslState !== "active",
  );

  return (
    <>
      <header className="dg-page-header">
        <h1 className="text-2xl font-bold text-white">Hosting</h1>
        <p className="text-sm text-slate-400">
          Website hosting · custom domains · DNS · automatic SSL
        </p>
      </header>
      <main className="dg-page-main space-y-6">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 max-w-4xl">
          <Stat label="Published sites" value={String(published.length)} />
          <Stat label="Linked domains" value={String(linkedDomains.length)} />
          <Stat label="DNS configured" value={String(dnsReady.length)} />
          <Stat label="SSL active" value={String(sslActive.length)} />
        </div>

        {dnsNeedsAttention.length || sslNeedsAttention.length ? (
          <section className="rounded-xl border border-amber-500/25 bg-amber-500/5 p-5 max-w-2xl">
            <h2 className="font-semibold text-amber-100">Hosting needs attention</h2>
            <p className="mt-1 text-sm text-slate-400">
              {dnsNeedsAttention.length
                ? `${dnsNeedsAttention.length} linked domain${dnsNeedsAttention.length === 1 ? "" : "s"} still need DNS configuration. `
                : ""}
              {sslNeedsAttention.length
                ? `${sslNeedsAttention.length} domain${sslNeedsAttention.length === 1 ? "" : "s"} are waiting for active SSL.`
                : ""}
            </p>
            <div className="mt-4 flex flex-wrap gap-3">
              {dnsNeedsAttention.length ? (
                <ResolutionAction href="/apps/infrastructure/dns" mode="guided" label="Fix DNS" />
              ) : null}
              {sslNeedsAttention.length ? (
                <ResolutionAction href="/apps/infrastructure/domains" mode="guided" label="Check SSL status" />
              ) : null}
              <ResolutionAction href="/dashboard/advisor" mode="guided" label="Help me fix hosting" />
            </div>
          </section>
        ) : null}

        <section className="rounded-lg border border-slate-700 bg-slate-900/40 p-5 max-w-2xl space-y-3">
          <h2 className="text-base font-semibold text-white">Hosting status</h2>
          <ul className="space-y-2 text-sm text-slate-300">
            <li>Published sites are hosted automatically by DigitalGate.</li>
            <li>Custom domains go live after their DNS records are configured.</li>
            <li>SSL is issued automatically after the domain is connected and DNS has propagated.</li>
          </ul>
          <div className="flex flex-wrap gap-3 pt-1">
            <Link href="/apps/websites" className="text-sm text-sky-400 hover:underline">
              Design Studio
            </Link>
            <Link href="/apps/infrastructure/domains" className="text-sm text-sky-400 hover:underline">
              Domains
            </Link>
            <Link href="/apps/infrastructure/dns" className="text-sm text-sky-400 hover:underline">
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
                const liveUrl = publicHttpsUrlForDomain(domain?.name) ?? `/sites/${site.slug}`;
                const action = !domain
                  ? { href: "/apps/infrastructure/domains", label: "Connect a domain" }
                  : !domain.dnsConfiguredAt
                    ? { href: "/apps/infrastructure/dns", label: "Fix DNS" }
                    : domain.sslState !== "active"
                      ? { href: "/apps/infrastructure/domains", label: "Check SSL" }
                      : canEditWebsites
                        ? { href: `/apps/websites/studio/${site.id}`, label: "Open Studio" }
                        : { href: liveUrl, label: "View website" };

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
                    <Link href={action.href} className="text-sm font-medium text-sky-400 hover:underline">
                      {action.label} →
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

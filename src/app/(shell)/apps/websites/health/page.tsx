import { currentUser } from "@clerk/nextjs/server";
import Link from "next/link";
import { Suspense } from "react";
import {
  buildNativeWebsiteHealth,
  listOrganisationDomains,
  listWebsitesWithPages,
  normalizeSiteHealthSnapshot,
  organisationHasWebsitesBuilder,
  resolvePrimaryLinkedDomain,
} from "@dg/platform-core";

import { resolveActivePlatformSession } from "@/lib/active-platform-session";
import {
  fetchPortalMe,
  fetchWpSiteHealth,
  getWpHealthSite,
  listWpHealthSites,
} from "@/lib/dg-api";
import {
  HealthCentreDashboard,
  HealthCentreError,
} from "@/components/websites/HealthCentreDashboard";
import { HealthSitePicker } from "@/components/websites/HealthSitePicker";
import { WebsitesSubnav } from "@/components/websites/WebsitesSubnav";

interface PageProps {
  searchParams: Promise<{ site?: string; view?: string }>;
}

function statusBadge(status: "pass" | "warn" | "fail") {
  const styles = {
    pass: "bg-emerald-500/15 text-emerald-300 ring-emerald-500/30",
    warn: "bg-amber-500/15 text-amber-300 ring-amber-500/30",
    fail: "bg-red-500/15 text-red-300 ring-red-500/30",
  };
  return (
    <span
      className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset ${styles[status]}`}
    >
      {status}
    </span>
  );
}

function healthActionHref(
  siteId: string,
  checkId: string,
): { href: string; label: string } | null {
  switch (checkId) {
    case "published":
      return {
        href: `/apps/websites/studio/${siteId}?live=1`,
        label: "Publish in Studio",
      };
    case "custom_domain":
      return {
        href: `/apps/websites/studio/${siteId}?live=1`,
        label: "Make it live",
      };
    case "dns":
    case "ssl":
      return {
        href: "/apps/infrastructure/hosting",
        label: "Fix go-live checklist",
      };
    case "form_crm":
      return {
        href: `/apps/websites/studio/${siteId}?tab=edit`,
        label: "Add form in Studio",
      };
    case "seo_title":
    case "seo_description":
      return {
        href: `/apps/websites/studio/${siteId}?tab=seo`,
        label: "Fix SEO gaps",
      };
    default:
      return {
        href: `/apps/websites/studio/${siteId}`,
        label: "Open Studio",
      };
  }
}

export default async function WebsiteHealthPage({ searchParams }: PageProps) {
  const { site: siteId, view } = await searchParams;
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

  const allowed = session
    ? await organisationHasWebsitesBuilder(session.organisationId)
    : false;

  const sites =
    session && allowed
      ? await listWebsitesWithPages(session.organisationId)
      : [];
  const domains = session
    ? await listOrganisationDomains(session.organisationId)
    : [];

  const showWp = view === "wordpress";
  const wpSites = listWpHealthSites();
  const wpSite = getWpHealthSite(siteId);
  const healthResult = showWp ? await fetchWpSiteHealth(wpSite.id) : null;

  return (
    <>
      <header className="dg-page-header">
        <h1 className="text-2xl font-bold text-white">Health Centre</h1>
        <p className="text-sm text-slate-400">
          {session?.organisationName ?? "DigitalGate"} ·{" "}
          {showWp
            ? "WordPress connector health"
            : "Live Gen 2 checklist (publish, domain, DNS, SSL, forms, SEO)"}
        </p>
      </header>
      <main className="dg-page-main space-y-8">
        <WebsitesSubnav active="health" />

        {showWp ? (
          <p className="text-sm text-slate-500">
            <Link href="/apps/websites/health" className="text-sky-400 hover:underline">
              ← Gen 2 Health Centre
            </Link>
          </p>
        ) : (
          <p className="text-xs text-slate-500">
            Still running a WordPress site?{" "}
            <Link
              href="/apps/websites/health?view=wordpress"
              className="text-slate-400 hover:text-slate-200 underline"
            >
              Connector health
            </Link>
          </p>
        )}

        {!showWp ? (
          !allowed ? (
            <div className="rounded-lg border border-amber-800/60 bg-amber-950/30 p-5 max-w-xl">
              <p className="text-sm text-amber-100/90">
                Design Studio isn&apos;t enabled for this business yet.{" "}
                <Link
                  href="/apps/websites"
                  className="underline"
                >
                  Back to Design Studio
                </Link>
              </p>
            </div>
          ) : sites.length === 0 ? (
            <div className="rounded-lg border border-dashed border-slate-600 p-6 max-w-xl space-y-2">
              <p className="text-sm text-slate-300">
                No Gen 2 sites yet — create one to see publish, domain, DNS,
                SSL, form→CRM, and SEO checks.
              </p>
              <Link
                href="/apps/websites"
                className="text-sm text-sky-400 hover:underline"
              >
                Create a site →
              </Link>
            </div>
          ) : (
            <ul className="space-y-6 max-w-4xl">
              {sites.map((site) => {
                const linked = domains.filter((d) => d.websiteId === site.id);
                const domain = resolvePrimaryLinkedDomain(site, linked);
                const snapshot = buildNativeWebsiteHealth({
                  website: site,
                  domain: domain
                    ? {
                        name: domain.name,
                        status: domain.status,
                        dnsConfiguredAt: domain.dnsConfiguredAt,
                        sslState: domain.sslState,
                        aliases: linked.map((d) => d.name),
                      }
                    : null,
                });
                return (
                  <li
                    key={site.id}
                    className="rounded-lg border border-slate-700 bg-slate-900/40 p-5 space-y-4"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <p className="font-semibold text-white">{site.name}</p>
                        <p className="text-xs text-slate-500">
                          /sites/{site.slug} · updated{" "}
                          {new Date(site.updatedAt).toLocaleString("en-AU")}
                        </p>
                      </div>
                      <div className="flex items-center gap-3">
                        <p className="text-2xl font-bold text-white">
                          {snapshot.score}
                        </p>
                        <Link
                          href={`/apps/websites/studio/${site.id}?live=1`}
                          className="text-sm text-sky-400 hover:underline"
                        >
                          Studio / Make it live →
                        </Link>
                      </div>
                    </div>
                    <div className="grid gap-2 sm:grid-cols-3 text-xs text-slate-500">
                      <span>Pass {snapshot.pass}</span>
                      <span>Warn {snapshot.warn}</span>
                      <span>Fail {snapshot.fail}</span>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-sm">
                        <thead>
                          <tr className="border-b border-slate-800 text-slate-500">
                            <th className="py-2 pr-4 font-medium">Check</th>
                            <th className="py-2 pr-4 font-medium">Status</th>
                            <th className="py-2 font-medium">Detail</th>
                          </tr>
                        </thead>
                        <tbody>
                          {snapshot.checks.map((check) => {
                            const action = healthActionHref(site.id, check.id);
                            return (
                              <tr
                                key={check.id}
                                className="border-b border-slate-800/60"
                              >
                                <td className="py-2.5 pr-4 text-slate-200">
                                  {check.label}
                                </td>
                                <td className="py-2.5 pr-4">
                                  {statusBadge(check.status)}
                                </td>
                                <td className="py-2.5 text-slate-400">
                                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                                    <span>{check.detail}</span>
                                    {action && check.status !== "pass" ? (
                                      <Link
                                        href={action.href}
                                        className="text-sky-400 hover:underline shrink-0"
                                      >
                                        {action.label} →
                                      </Link>
                                    ) : null}
                                  </div>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </li>
                );
              })}
            </ul>
          )
        ) : (
          <>
            <Suspense fallback={null}>
              <HealthSitePicker sites={wpSites} />
            </Suspense>
            {healthResult?.ok ? (
              <HealthCentreDashboard
                snapshot={normalizeSiteHealthSnapshot(healthResult.payload)}
                connectorBaseUrl={wpSite.baseUrl}
              />
            ) : (
              <HealthCentreError
                code={healthResult?.code ?? "network_error"}
                message={
                  healthResult?.message ?? "Could not load WordPress health"
                }
                connectorBaseUrl={wpSite.baseUrl}
              />
            )}
          </>
        )}
      </main>
    </>
  );
}

import Link from "next/link";
import { resolveActivePlatformSession } from "@/lib/active-platform-session";
import { currentUser } from "@clerk/nextjs/server";
import {
  bootConnectorEngine,
  getOrgWordPressConnectorSettings,
  isCloudflareConfigured,
  isConnectorPlatformConfigured,
  llmConfiguredTransports,
  resolveOrgWordPressConnector,
} from "@dg/platform-core";

import { ConnectorEngineCatalog } from "@/components/settings/ConnectorEngineCatalog";
import { DomainConnectorPanel } from "@/components/settings/DomainConnectorPanel";
import { GoogleGbpConnectorPanel } from "@/components/settings/GoogleGbpConnectorPanel";
import { LinkedInConnectorPanel } from "@/components/settings/LinkedInConnectorPanel";
import { ReaConnectorPanel } from "@/components/settings/ReaConnectorPanel";
import { WordPressConnectorPanel } from "@/components/settings/WordPressConnectorPanel";
import { fetchPortalMe } from "@/lib/dg-api";
import { getLastWordPressSync } from "@/lib/wordpress-sync";

bootConnectorEngine();

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

interface PageProps {
  searchParams: Promise<{
    domain?: string;
    google?: string;
    linkedin?: string;
    rea?: string;
    message?: string;
  }>;
}

export default async function ConnectorsSettingsPage({ searchParams }: PageProps) {
  const {
    domain: domainFlash,
    google: googleFlash,
    linkedin: linkedinFlash,
    rea: reaFlash,
    message: flashMessage,
  } = await searchParams;
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
  const [wpSettings, wpResolved] = session
    ? await Promise.all([
        getOrgWordPressConnectorSettings(session.organisationId),
        resolveOrgWordPressConnector(session.organisationId),
      ])
    : [null, null];

  const llmTransports = llmConfiguredTransports();
  const envFlags = {
    database: Boolean(process.env.DATABASE_URL),
    wpConnectorKey: Boolean(process.env.DG_WP_CONNECTOR_API_KEY?.trim()),
    wpConnectorBase: Boolean(process.env.DG_WP_CONNECTOR_BASE_URL?.trim()),
    wpHealthSites: Boolean(process.env.DG_WP_HEALTH_SITES?.trim()),
    wpAccommodationSites: Boolean(process.env.DG_WP_ACCOMMODATION_SITES?.trim()),
    stripe: Boolean(process.env.STRIPE_SECRET_KEY?.trim()),
    resend: Boolean(process.env.RESEND_API_KEY?.trim()),
    openai: llmTransports.includes("openai"),
    anthropic: llmTransports.includes("anthropic"),
    gateway: llmTransports.includes("gateway"),
    domainClient: Boolean(process.env.DOMAIN_CLIENT_ID?.trim()),
    domainSecret: Boolean(process.env.DOMAIN_CLIENT_SECRET?.trim()),
    reaClient: Boolean(process.env.REA_CLIENT_ID?.trim()),
    reaSecret: Boolean(process.env.REA_CLIENT_SECRET?.trim()),
    googleClient: Boolean(process.env.GOOGLE_CLIENT_ID?.trim()),
    googleSecret: Boolean(process.env.GOOGLE_CLIENT_SECRET?.trim()),
    linkedinClient: Boolean(process.env.LINKEDIN_CLIENT_ID?.trim()),
    linkedinSecret: Boolean(process.env.LINKEDIN_CLIENT_SECRET?.trim()),
    cloudflare: isCloudflareConfigured(),
    elevenlabs: isConnectorPlatformConfigured("elevenlabs"),
  };

  return (
    <>
      <header className="dg-page-header">
        <Link href="/dashboard/settings" className="text-sm text-blue-400 hover:underline">
          ← Settings
        </Link>
        <h1 className="mt-2 text-2xl font-bold text-white">Connectors</h1>
        <p className="text-sm text-slate-400">
          Connector Engine · Domain · REA · Google Business Profile · WordPress · payments
        </p>
      </header>
      <main className="dg-page-main space-y-6">
        <ConnectorEngineCatalog />

        <DomainConnectorPanel
          flash={
            domainFlash === "connected"
              ? "connected"
              : domainFlash === "error"
                ? "error"
                : null
          }
          flashMessage={domainFlash ? flashMessage ?? null : null}
        />

        <ReaConnectorPanel
          flash={
            reaFlash === "connected" ? "connected" : reaFlash === "error" ? "error" : null
          }
          flashMessage={reaFlash ? flashMessage ?? null : null}
        />

        <GoogleGbpConnectorPanel
          flash={
            googleFlash === "connected"
              ? "connected"
              : googleFlash === "error"
                ? "error"
                : null
          }
          flashMessage={googleFlash ? flashMessage ?? null : null}
        />

        <LinkedInConnectorPanel
          flash={
            linkedinFlash === "connected"
              ? "connected"
              : linkedinFlash === "error"
                ? "error"
                : null
          }
          flashMessage={linkedinFlash ? flashMessage ?? null : null}
        />

        {session && wpResolved ? (
          <WordPressConnectorPanel
            initial={{
              baseUrl: wpSettings?.baseUrl ?? "",
              label: wpSettings?.label ?? "",
              hasApiKey: Boolean(wpSettings?.apiKey?.trim()),
              resolvedLabel: wpResolved.label,
              resolvedBaseUrl: wpResolved.baseUrl,
              source: wpResolved.source,
            }}
          />
        ) : null}

        <div className="dg-card">
          <h2 className="font-semibold text-white">Multi-site WordPress</h2>
          <p className="mt-2 text-sm text-slate-400">
            Each organisation stores <strong className="text-slate-200">one</strong>{" "}
            primary WordPress host + site API key (above). Env keys are only reused when
            the host matches — never send Roe/DigitalGate keys to CVH. Website Health and
            Accommodation multi-site lists use{" "}
            <code className="text-slate-300">DG_WP_HEALTH_SITES</code> /{" "}
            <code className="text-slate-300">DG_WP_ACCOMMODATION_SITES</code> on Vercel for
            portfolio probes; per-tenant sync still uses the org connector.
          </p>
        </div>

        <div className="grid gap-4 lg:grid-cols-2">
          <div className="dg-card">
            <h2 className="font-semibold text-white">WordPress sync status</h2>
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
            {lastSync?.lastBookingSyncAt ? (
              <p className="mt-1 text-sm text-slate-400">
                Last RE appraisal booking sync:{" "}
                {new Date(lastSync.lastBookingSyncAt).toLocaleString("en-AU")}
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
              <EnvStatus name="DOMAIN_CLIENT_ID" configured={envFlags.domainClient} />
              <EnvStatus name="DOMAIN_CLIENT_SECRET" configured={envFlags.domainSecret} />
              <EnvStatus name="REA_CLIENT_ID" configured={envFlags.reaClient} />
              <EnvStatus name="REA_CLIENT_SECRET" configured={envFlags.reaSecret} />
              <EnvStatus name="GOOGLE_CLIENT_ID" configured={envFlags.googleClient} />
              <EnvStatus name="GOOGLE_CLIENT_SECRET" configured={envFlags.googleSecret} />
              <EnvStatus name="LINKEDIN_CLIENT_ID" configured={envFlags.linkedinClient} />
              <EnvStatus name="LINKEDIN_CLIENT_SECRET" configured={envFlags.linkedinSecret} />
              <EnvStatus name="CLOUDFLARE_API_TOKEN + ZONE_ID" configured={envFlags.cloudflare} />
              <EnvStatus name="ELEVENLABS_API_KEY" configured={envFlags.elevenlabs} />
              <EnvStatus name="RESEND_API_KEY" configured={envFlags.resend} />
              <EnvStatus
                name="AI_GATEWAY_API_KEY / VERCEL_OIDC_TOKEN"
                configured={envFlags.gateway}
              />
              <EnvStatus name="OPENAI_API_KEY" configured={envFlags.openai} />
              <EnvStatus name="ANTHROPIC_API_KEY" configured={envFlags.anthropic} />
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

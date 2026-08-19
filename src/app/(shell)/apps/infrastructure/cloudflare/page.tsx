import { InfrastructureNav } from "@/components/infrastructure/InfrastructureNav";

function cloudflareConfigured() {
  return Boolean(
    process.env.CLOUDFLARE_API_TOKEN?.trim() ||
      process.env.CF_API_TOKEN?.trim() ||
      process.env.CLOUDFLARE_ZONE_ID?.trim(),
  );
}

export default function InfrastructureCloudflarePage() {
  const configured = cloudflareConfigured();

  return (
    <>
      <header className="dg-page-header">
        <h1 className="text-2xl font-bold text-white">Cloudflare</h1>
        <p className="text-sm text-slate-400">
          CDN, WAF, and edge DNS adapter (connector seat 15). Dreamscape remains V1 for domain
          registration; Cloudflare sits in front of live sites and caches.
        </p>
      </header>
      <main className="dg-page-main max-w-3xl space-y-6">
        <InfrastructureNav active="cloudflare" />

        <section className="rounded-xl border border-slate-800 bg-slate-950/40 px-4 py-4 space-y-3 text-sm text-slate-300">
          <p>
            API token:{" "}
            {configured ? (
              <span className="text-emerald-400">present on this deployment</span>
            ) : (
              <span className="text-amber-300">
                not set — add CLOUDFLARE_API_TOKEN (and zone/account ids) in Vercel when you
                connect the adapter. Until then, manage cache purge in the Cloudflare dashboard.
              </span>
            )}
          </p>
          <ul className="list-disc space-y-2 pl-5 text-slate-400">
            <li>Purge cache after Design Studio publish or WordPress deploys.</li>
            <li>DNS for some DigitalGate funnels already CNAMEs at Cloudflare/registrar — not Dreamscape SOAP.</li>
            <li>WordPress site backups at the edge are Cloudflare / host backups, not Neon.</li>
          </ul>
        </section>
      </main>
    </>
  );
}

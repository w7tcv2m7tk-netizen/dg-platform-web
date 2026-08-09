import Link from "next/link";

/**
 * DNS is not a standalone console yet — records are managed per domain
 * under Domains (Apply website DNS) and Website Builder → Make it live.
 */
export default function Page() {
  return (
    <section className="mt-2 max-w-xl space-y-4 text-sm text-slate-300">
      <div>
        <h1 className="text-xl font-semibold text-white">DNS</h1>
        <p className="mt-1 text-slate-400">
          Not a full DNS console yet. Manage hosting records from Domains or
          Website Builder go-live.
        </p>
      </div>

      <div className="rounded-lg border border-slate-800 bg-slate-950/60 p-5 space-y-3">
        <p>
          Open a domain under{" "}
          <Link
            href="/apps/infrastructure/domains"
            className="text-sky-400 hover:underline"
          >
            Domains
          </Link>{" "}
          and use <strong className="text-slate-200">Apply website DNS</strong>{" "}
          to set apex <strong className="text-slate-200">A</strong> +{" "}
          <strong className="text-slate-200">www CNAME</strong> at Vercel (Dreamscape
          rejects CNAME on the root zone). Or use{" "}
          <Link
            href="/apps/websites/hosting"
            className="text-sky-400 hover:underline"
          >
            Websites → Hosting
          </Link>{" "}
          / Make it live.
        </p>
        <p className="text-slate-500 text-xs">
          SSL is automatic via Vercel once the custom hostname is attached and
          DNS propagates. Set{" "}
          <code className="text-slate-400">VERCEL_TOKEN</code> +{" "}
          <code className="text-slate-400">VERCEL_PROJECT_ID</code> so Apply
          pulls project-specific recommended A/CNAME (and attaches apex + www).
          Without that, Apply falls back to legacy anycast targets.
        </p>
        <ul className="list-disc pl-5 text-xs text-slate-500 space-y-1">
          <li>
            Preferred: Vercel{" "}
            <code>/v6/domains/…/config</code> recommended records (when token
            set)
          </li>
          <li>
            Override: <code>DG_WEBSITE_DNS_A_TARGET</code> /{" "}
            <code>DG_WEBSITE_DNS_CNAME_TARGET</code>
          </li>
          <li>
            Legacy fallback: <code>76.76.21.21</code> +{" "}
            <code>cname.vercel-dns.com</code>
          </li>
        </ul>
      </div>
    </section>
  );
}

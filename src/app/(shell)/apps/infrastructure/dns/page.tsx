import Link from "next/link";

import { AppFeaturePlaceholder } from "@/components/platform/AppFeaturePlaceholder";

/** DigitalGate DNS — manage via Domains inventory + hosting presets. */
export default function Page() {
  return (
    <>
      <AppFeaturePlaceholder itemId="infra.dns" />
      <section className="mt-6 max-w-xl rounded-lg border border-slate-800 bg-slate-950/60 p-5 text-sm text-slate-300 space-y-3">
        <p>
          DNS records are managed per domain under{" "}
          <Link
            href="/apps/infrastructure/domains"
            className="text-sky-400 hover:underline"
          >
            Domains
          </Link>
          . Use <strong className="text-slate-200">Apply website DNS</strong> to
          point CNAME/A at the DigitalGate / Vercel hosting target.
        </p>
        <p className="text-slate-500 text-xs">
          SSL is automatic via Vercel once the custom hostname is attached and
          DNS propagates. Optional: set{" "}
          <code className="text-slate-400">VERCEL_TOKEN</code> +{" "}
          <code className="text-slate-400">VERCEL_PROJECT_ID</code> for API
          attach, or add the domain manually in Vercel.
        </p>
        <ul className="list-disc pl-5 text-xs text-slate-500 space-y-1">
          <li>
            <code>DG_WEBSITE_DNS_CNAME_TARGET</code> (default{" "}
            <code>cname.vercel-dns.com</code>)
          </li>
          <li>
            <code>DG_WEBSITE_DNS_A_TARGET</code> — optional apex A record
          </li>
        </ul>
      </section>
    </>
  );
}

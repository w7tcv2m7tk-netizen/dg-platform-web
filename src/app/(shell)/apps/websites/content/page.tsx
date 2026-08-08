import Link from "next/link";

import { WebsitesSubnav } from "@/components/websites/WebsitesSubnav";

export default function ContentAliasPage() {
  return (
    <>
      <header className="dg-page-header">
        <h1 className="text-2xl font-bold text-white">Content</h1>
        <p className="text-sm text-slate-400">
          Edit copy and components in AI Website Studio
        </p>
      </header>
      <main className="dg-page-main space-y-4">
        <WebsitesSubnav active="content" />
        <div className="rounded-lg border border-slate-700 bg-slate-900/40 p-5 max-w-xl space-y-3">
          <p className="text-sm text-slate-300">
            Structured content (pages, hero, services, about, CTAs, forms) lives
            on each website model. Open a site in Studio to edit props or apply
            natural-language prompts.
          </p>
          <div className="flex flex-wrap gap-3">
            <Link
              href="/apps/websites"
              className="rounded-md bg-[var(--org-primary,#1e3a5f)] px-3 py-1.5 text-sm font-semibold text-white"
            >
              Open Sites
            </Link>
            <Link
              href="/dashboard/business"
              className="text-sm text-slate-400 underline self-center"
            >
              Business Profile
            </Link>
          </div>
        </div>
      </main>
    </>
  );
}

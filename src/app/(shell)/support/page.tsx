import Link from "next/link";
import { currentUser } from "@clerk/nextjs/server";
import {
  HELP_CATEGORY_LABELS,
  HELP_CATEGORY_ORDER,
  listHelpArticlesByCategory,
} from "@dg/platform-core";

import { SupportActions } from "@/components/SupportActions";
import { SupportChatPanel } from "@/components/support/SupportChatPanel";
import { SUPPORT_EMAIL } from "@/lib/support";

export default async function SupportPage() {
  const user = await currentUser();
  const userName =
    user?.firstName ??
    user?.fullName ??
    user?.primaryEmailAddress?.emailAddress?.split("@")[0];

  const kbCategories = HELP_CATEGORY_ORDER.map((category) => ({
    category,
    label: HELP_CATEGORY_LABELS[category],
    count: listHelpArticlesByCategory(category).length,
  })).filter((row) => row.count > 0);

  return (
    <>
      <header className="dg-page-header">
        <Link href="/dashboard" className="text-sm text-blue-400 hover:underline">
          ← Dashboard
        </Link>
        <h1 className="mt-2 text-2xl font-bold text-white">Support</h1>
        <p className="text-sm text-slate-400">
          Knowledge base stubs, then escalate via chat or email on business days
        </p>
      </header>
      <main className="dg-page-main space-y-6">
        <div className="dg-card max-w-2xl">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="font-semibold text-white">Knowledge base</h2>
              <p className="mt-2 text-sm text-slate-400">
                Short articles for signup, billing, connectors, CRM, and honest scope notes.
              </p>
            </div>
            <Link
              href="/support/help"
              className="rounded-full bg-sky-600 px-4 py-2 text-sm font-medium text-white hover:bg-sky-500"
            >
              Browse all →
            </Link>
          </div>
          <ul className="mt-4 flex flex-wrap gap-2">
            {kbCategories.map((row) => (
              <li key={row.category}>
                <Link
                  href={`/support/help#${row.category}`}
                  className="inline-flex items-center gap-1.5 rounded-full border border-slate-700 px-3 py-1 text-xs font-medium text-slate-300 hover:border-sky-500/50 hover:text-sky-300"
                >
                  {row.label}
                  <span className="text-slate-500">{row.count}</span>
                </Link>
              </li>
            ))}
          </ul>
        </div>

        <SupportChatPanel embedded userName={userName ?? undefined} />

        <div className="dg-card max-w-xl">
          <h2 className="font-semibold text-white">Email escalate</h2>
          <p className="mt-2 text-sm text-slate-400">
            Prefer email? Write to {SUPPORT_EMAIL} — the team replies on business days
            (Australia). Chat above is the same escalate path; this is not a separate
            self-serve ticket inbox.
          </p>
          <SupportActions />
        </div>
      </main>
    </>
  );
}

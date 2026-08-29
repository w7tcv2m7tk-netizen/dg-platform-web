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
        <h1 className="mt-2 text-2xl font-bold text-white">Support Centre</h1>
        <p className="mt-1 max-w-2xl text-sm text-slate-400">
          Simple customer support — browse the knowledge base, chat with DigitalGate Assist, or
          email the team on business days. No SLA dashboard; humans follow up when Assist needs
          them.
        </p>
      </header>
      <main className="dg-page-main space-y-6">
        <div className="flex flex-wrap gap-2">
          <a
            href="#assist"
            className="rounded-lg bg-sky-600 px-4 py-2 text-sm font-medium text-white hover:bg-sky-500"
          >
            Chat with Assist
          </a>
          <Link
            href="/support/help"
            className="rounded-lg border border-slate-600 px-4 py-2 text-sm font-medium text-slate-200 hover:border-slate-500"
          >
            Knowledge base
          </Link>
          <a
            href="#email"
            className="rounded-lg border border-slate-600 px-4 py-2 text-sm font-medium text-slate-200 hover:border-slate-500"
          >
            Email the team
          </a>
        </div>

        <div className="dg-card max-w-2xl">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="font-semibold text-white">Knowledge base</h2>
              <p className="mt-2 text-sm text-slate-400">
                Short stubs for customers and Assist — signup, billing, connectors, CRM, and honest
                scope notes. Not a full help centre yet.
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

        <div id="assist" className="max-w-2xl scroll-mt-6">
          <div className="mb-2">
            <h2 className="font-semibold text-white">DigitalGate Assist</h2>
            <p className="mt-1 text-sm text-slate-400">
              Instant AI replies for common questions. When Assist cannot help, it pauses and a
              human picks up here or by email — business days (Australia). Your conversation below
              is real for your account; empty means no messages yet.
            </p>
          </div>
          <SupportChatPanel embedded userName={userName ?? undefined} />
        </div>

        <div id="email" className="dg-card max-w-xl scroll-mt-6">
          <h2 className="font-semibold text-white">Email the team</h2>
          <p className="mt-2 text-sm text-slate-400">
            Prefer email? Write to {SUPPORT_EMAIL}. Replies are on business days (Australia) —
            same human path as escalated chat, not a separate self-serve ticket inbox or SLA
            queue.
          </p>
          <SupportActions />
        </div>
      </main>
    </>
  );
}

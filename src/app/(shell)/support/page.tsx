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
        <Link
          href="/dashboard"
          className="inline-flex min-h-11 items-center text-sm text-blue-400 hover:underline"
        >
          ← Dashboard
        </Link>
        <h1 className="mt-2 text-2xl font-bold text-white">Support Centre</h1>
        <p className="mt-1 max-w-2xl text-sm text-slate-400">
          Find practical guidance, chat with DigitalGate Assist, or contact the team when you need
          a person.
        </p>
      </header>
      <main className="dg-page-main space-y-6">
        <div className="flex flex-wrap gap-2">
          <a
            href="#assist"
            className="inline-flex min-h-11 items-center rounded-lg bg-sky-600 px-4 text-sm font-medium text-white hover:bg-sky-500"
          >
            Chat with Assist
          </a>
          <Link
            href="/support/help"
            className="inline-flex min-h-11 items-center rounded-lg border border-slate-600 px-4 text-sm font-medium text-slate-200 hover:border-slate-500"
          >
            Knowledge base
          </Link>
          <a
            href="#email"
            className="inline-flex min-h-11 items-center rounded-lg border border-slate-600 px-4 text-sm font-medium text-slate-200 hover:border-slate-500"
          >
            Email the team
          </a>
        </div>

        <div className="dg-card max-w-2xl">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="font-semibold text-white">Knowledge base</h2>
              <p className="mt-2 text-sm text-slate-400">
                Step-by-step guidance for setup, CRM, industry workflows, billing, connections and
                understanding DigitalGate scores.
              </p>
            </div>
            <Link
              href="/support/help"
              className="inline-flex min-h-11 items-center rounded-full bg-sky-600 px-4 text-sm font-medium text-white hover:bg-sky-500"
            >
              Browse all →
            </Link>
          </div>
          <ul className="mt-4 flex flex-wrap gap-2">
            {kbCategories.map((row) => (
              <li key={row.category}>
                <Link
                  href={`/support/help#${row.category}`}
                  className="inline-flex min-h-11 items-center gap-1.5 rounded-full border border-slate-700 px-3 text-xs font-medium text-slate-300 hover:border-sky-500/50 hover:text-sky-300"
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
              Get instant help with common questions. When Assist cannot resolve something, you can
              continue with the DigitalGate team. Your conversation below is tied to your account;
              an empty conversation simply means there are no messages yet.
            </p>
          </div>
          <SupportChatPanel embedded userName={userName ?? undefined} />
        </div>

        <div id="email" className="dg-card max-w-xl scroll-mt-6">
          <h2 className="font-semibold text-white">Email the team</h2>
          <p className="mt-2 text-sm text-slate-400">
            Prefer email? Write to {SUPPORT_EMAIL}. Include your organisation name, the page you
            were working on and what happened so the team can pick up the context quickly.
          </p>
          <SupportActions />
        </div>
      </main>
    </>
  );
}

import Link from "next/link";
import { currentUser } from "@clerk/nextjs/server";
import {
  HELP_ARTICLES,
  HELP_CATEGORY_LABELS,
  HELP_CATEGORY_ORDER,
  listHelpArticlesByCategory,
} from "@dg/platform-core";

import { SupportActions } from "@/components/SupportActions";
import { SupportChatPanel } from "@/components/support/SupportChatPanel";
import { SUPPORT_EMAIL } from "@/lib/support";

const QUICK_ARTICLE_SLUGS = [
  "signup-and-organisation",
  "business-profile",
  "billing-checkout-and-portal",
  "connections-and-imports",
];

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

  const quickArticles = QUICK_ARTICLE_SLUGS
    .map((slug) => HELP_ARTICLES.find((article) => article.slug === slug))
    .filter((article): article is (typeof HELP_ARTICLES)[number] => Boolean(article));

  return (
    <>
      <header className="dg-page-header">
        <Link
          href="/dashboard"
          className="inline-flex min-h-11 items-center text-sm text-sky-400 hover:underline"
        >
          ← Dashboard
        </Link>
        <h1 className="mt-2 text-2xl font-bold text-white">Support Centre</h1>
        <p className="mt-1 max-w-3xl text-sm text-slate-400">
          Get an answer quickly, find step-by-step guidance, or continue with the DigitalGate team.
        </p>
      </header>

      <main className="dg-page-main space-y-8">
        <section className="rounded-2xl border border-slate-700/80 bg-gradient-to-br from-slate-900 to-slate-950 p-5 sm:p-6">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-sky-300">DigitalGate support</p>
          <h2 className="mt-2 text-xl font-semibold text-white">How can we help?</h2>
          <p className="mt-2 max-w-2xl text-sm text-slate-400">
            Start with Aida for an immediate answer, search the Knowledge Base, or contact our team when you need a person.
          </p>
          <div className="mt-5 grid gap-3 md:grid-cols-3">
            <a href="#assist" className="rounded-xl border border-sky-500/30 bg-sky-500/10 p-4 transition hover:border-sky-400/60 hover:bg-sky-500/15">
              <span className="text-sm font-semibold text-white">Ask Aida</span>
              <p className="mt-1 text-xs leading-5 text-slate-400">Get immediate platform help and practical guidance in your account context.</p>
              <span className="mt-3 inline-block text-xs font-medium text-sky-300">Start a conversation →</span>
            </a>
            <Link href="/support/help" className="rounded-xl border border-slate-700 bg-slate-900/60 p-4 transition hover:border-sky-500/40">
              <span className="text-sm font-semibold text-white">Browse help</span>
              <p className="mt-1 text-xs leading-5 text-slate-400">Find step-by-step articles for setup, apps, billing, CRM and connections.</p>
              <span className="mt-3 inline-block text-xs font-medium text-sky-300">{HELP_ARTICLES.length} help articles →</span>
            </Link>
            <a href="#contact" className="rounded-xl border border-slate-700 bg-slate-900/60 p-4 transition hover:border-sky-500/40">
              <span className="text-sm font-semibold text-white">Contact support</span>
              <p className="mt-1 text-xs leading-5 text-slate-400">Need a person? Send the DigitalGate team the issue and useful context.</p>
              <span className="mt-3 inline-block text-xs font-medium text-sky-300">Contact the team →</span>
            </a>
          </div>
        </section>

        <section className="grid gap-6 xl:grid-cols-[minmax(0,1.4fr)_minmax(300px,0.6fr)]">
          <div id="assist" className="scroll-mt-6">
            <div className="mb-3">
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Instant help</p>
              <h2 className="mt-1 text-lg font-semibold text-white">Ask Aida</h2>
              <p className="mt-1 text-sm text-slate-400">
                Ask about DigitalGate, a workflow, or something that is not working. Your conversation stays tied to your account and a person can take over when needed.
              </p>
            </div>
            <SupportChatPanel embedded userName={userName ?? undefined} surfacePath="/support" />
          </div>

          <div className="space-y-4">
            <div className="dg-card">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Self-service</p>
                  <h2 className="mt-1 font-semibold text-white">Knowledge Base</h2>
                </div>
                <Link href="/support/help" className="text-xs font-medium text-sky-300 hover:text-sky-200">Browse all →</Link>
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                {kbCategories.map((row) => (
                  <Link
                    key={row.category}
                    href={`/support/help#${row.category}`}
                    className="inline-flex min-h-9 items-center gap-1.5 rounded-full border border-slate-700 px-3 text-xs font-medium text-slate-300 hover:border-sky-500/50 hover:text-sky-300"
                  >
                    {row.label}<span className="text-slate-500">{row.count}</span>
                  </Link>
                ))}
              </div>
            </div>

            <div className="dg-card">
              <h2 className="font-semibold text-white">Popular help</h2>
              <ul className="mt-3 divide-y divide-slate-800">
                {quickArticles.map((article) => (
                  <li key={article.id}>
                    <Link href={`/support/help/${article.slug}`} className="block py-3 first:pt-0 last:pb-0">
                      <span className="text-sm font-medium text-slate-200 hover:text-sky-300">{article.title}</span>
                      <p className="mt-1 line-clamp-2 text-xs leading-5 text-slate-500">{article.summary}</p>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            <div className="dg-card">
              <h2 className="font-semibold text-white">Your support conversation</h2>
              <p className="mt-2 text-sm leading-6 text-slate-400">
                Your Aida conversation above is your account-linked support thread. Previous messages remain in the same conversation so you can continue where you left off.
              </p>
              <a href="#assist" className="mt-3 inline-flex text-xs font-medium text-sky-300 hover:text-sky-200">
                Continue conversation ↑
              </a>
            </div>
          </div>
        </section>

        <section id="contact" className="dg-card max-w-3xl scroll-mt-6">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Human support</p>
          <h2 className="mt-1 text-lg font-semibold text-white">Get help from our team</h2>
          <p className="mt-2 text-sm leading-6 text-slate-400">
            If Aida cannot resolve the issue, continue in the conversation above so the support context stays together, or email {SUPPORT_EMAIL}. For faster diagnosis, include your organisation, the page you were using, what you expected and what happened.
          </p>
          <div className="mt-4 flex flex-wrap gap-3">
            <a href="#assist" className="inline-flex min-h-11 items-center rounded-lg bg-sky-600 px-4 text-sm font-medium text-white hover:bg-sky-500">
              Continue with support
            </a>
            <SupportActions />
          </div>
          <p className="mt-3 text-xs text-slate-500">
            Never send passwords, API secrets or payment card details in a support message.
          </p>
        </section>
      </main>
    </>
  );
}

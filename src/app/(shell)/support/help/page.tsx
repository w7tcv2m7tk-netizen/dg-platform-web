import Link from "next/link";
import {
  HELP_ARTICLES,
  listHelpCategoriesWithArticles,
} from "@dg/platform-core";

import { SUPPORT_EMAIL, SUPPORT_MAILTO } from "@/lib/support";

export default function SupportHelpIndexPage() {
  const groups = listHelpCategoriesWithArticles();

  return (
    <>
      <header className="dg-page-header">
        <Link href="/support" className="text-sm text-sky-400 hover:underline">
          ← Support centre
        </Link>
        <h1 className="mt-2 text-2xl font-bold text-white">Knowledge base</h1>
        <p className="mt-1 max-w-2xl text-sm text-slate-400">
          Short stubs for customers and DigitalGate Assist — Gate 1 dogfood scope. Deepen from
          real pilot questions; this is not a full help centre or CMS.
        </p>
      </header>
      <main className="dg-page-main space-y-8">
        <div className="dg-card max-w-2xl border-slate-700/80">
          <h2 className="font-semibold text-white">Need a person?</h2>
          <p className="mt-2 text-sm text-slate-400">
            Chat with Assist on{" "}
            <Link href="/support" className="text-sky-400 hover:underline">
              Support centre
            </Link>{" "}
            or email{" "}
            <a href={SUPPORT_MAILTO} className="text-sky-400 hover:underline">
              {SUPPORT_EMAIL}
            </a>
            . Team replies on <span className="text-slate-300">business days</span> (Australia) —
            not a 24/7 ticket portal.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          {groups.map((group) => (
            <a
              key={group.category}
              href={`#${group.category}`}
              className="rounded-full border border-slate-700 px-3 py-1 text-xs font-medium text-slate-300 hover:border-sky-500/50 hover:text-sky-300"
            >
              {group.label}
            </a>
          ))}
        </div>

        {groups.map((group) => (
          <section key={group.category} id={group.category} className="space-y-3">
            <h2 className="text-lg font-semibold text-white">{group.label}</h2>
            <ul className="grid gap-3 sm:grid-cols-2">
              {group.articles.map((article) => (
                <li key={article.id}>
                  <Link
                    href={`/support/help/${article.slug}`}
                    className="dg-card block h-full transition hover:border-sky-500/40"
                  >
                    <h3 className="font-medium text-white">{article.title}</h3>
                    <p className="mt-2 text-sm text-slate-400">{article.summary}</p>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        ))}

        <p className="text-xs text-slate-500">
          {HELP_ARTICLES.length} stub articles · shared by customers and Assist · expand from real
          questions, not invented coverage.
        </p>
      </main>
    </>
  );
}

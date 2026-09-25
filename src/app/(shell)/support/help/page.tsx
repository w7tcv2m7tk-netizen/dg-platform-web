"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import {
  HELP_ARTICLES,
  listHelpCategoriesWithArticles,
} from "@dg/platform-core";

import { SUPPORT_EMAIL, SUPPORT_MAILTO } from "@/lib/support";

export default function SupportHelpIndexPage() {
  const [query, setQuery] = useState("");
  const groups = listHelpCategoriesWithArticles();
  const normalized = query.trim().toLowerCase();

  const filteredGroups = useMemo(
    () =>
      groups
        .map((group) => ({
          ...group,
          articles: normalized
            ? group.articles.filter((article) =>
                [article.title, article.summary, article.body]
                  .join(" ")
                  .toLowerCase()
                  .includes(normalized),
              )
            : group.articles,
        }))
        .filter((group) => group.articles.length > 0),
    [groups, normalized],
  );

  const resultCount = filteredGroups.reduce((sum, group) => sum + group.articles.length, 0);

  return (
    <>
      <header className="dg-page-header">
        <Link href="/support" className="inline-flex min-h-11 items-center text-sm text-sky-400 hover:underline">
          ← Support Centre
        </Link>
        <h1 className="mt-2 text-2xl font-bold text-white">Knowledge Base</h1>
        <p className="mt-1 max-w-2xl text-sm text-slate-400">
          Search practical guidance for setting up DigitalGate, using your apps and resolving common questions.
        </p>
      </header>
      <main className="dg-page-main space-y-7">
        <section className="max-w-3xl">
          <label htmlFor="help-search" className="sr-only">Search the Knowledge Base</label>
          <div className="rounded-xl border border-slate-700 bg-slate-950/70 p-2 focus-within:border-sky-500/60">
            <input
              id="help-search"
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search setup, billing, CRM, connections, apps…"
              className="min-h-11 w-full bg-transparent px-3 text-sm text-white outline-none placeholder:text-slate-500"
            />
          </div>
          <p className="mt-2 text-xs text-slate-500">
            {normalized ? `${resultCount} matching article${resultCount === 1 ? "" : "s"}` : `${HELP_ARTICLES.length} help articles`}
          </p>
        </section>

        {!normalized ? (
          <nav className="flex flex-wrap gap-2" aria-label="Knowledge Base categories">
            {groups.map((group) => (
              <a key={group.category} href={`#${group.category}`} className="inline-flex min-h-10 items-center rounded-full border border-slate-700 px-4 text-xs font-medium text-slate-300 hover:border-sky-500/50 hover:text-sky-300">
                {group.label}
              </a>
            ))}
          </nav>
        ) : null}

        {filteredGroups.length === 0 ? (
          <section className="dg-card max-w-2xl">
            <h2 className="font-semibold text-white">No matching help articles</h2>
            <p className="mt-2 text-sm text-slate-400">
              Try a broader search, ask Aida, or contact the DigitalGate team.
            </p>
            <Link href="/support#assist" className="mt-4 inline-flex min-h-11 items-center rounded-lg bg-sky-600 px-4 text-sm font-medium text-white hover:bg-sky-500">
              Ask Aida
            </Link>
          </section>
        ) : (
          filteredGroups.map((group) => (
            <section key={group.category} id={group.category} className="space-y-3 scroll-mt-24">
              <div className="flex items-baseline gap-2">
                <h2 className="text-lg font-semibold text-white">{group.label}</h2>
                <span className="text-xs text-slate-500">{group.articles.length}</span>
              </div>
              <ul className="grid gap-3 sm:grid-cols-2">
                {group.articles.map((article) => (
                  <li key={article.id}>
                    <Link href={`/support/help/${article.slug}`} className="dg-card block h-full min-h-28 transition hover:border-sky-500/40">
                      <h3 className="font-medium text-white">{article.title}</h3>
                      <p className="mt-2 text-sm leading-6 text-slate-400">{article.summary}</p>
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          ))
        )}

        <section className="dg-card max-w-2xl border-slate-700/80">
          <h2 className="font-semibold text-white">Still need help?</h2>
          <p className="mt-2 text-sm text-slate-400">
            Ask Aida in the <Link href="/support#assist" className="text-sky-400 hover:underline">Support Centre</Link> or email{" "}
            <a href={SUPPORT_MAILTO} className="text-sky-400 hover:underline">{SUPPORT_EMAIL}</a>.
          </p>
        </section>
      </main>
    </>
  );
}

import Link from "next/link";
import { notFound } from "next/navigation";
import {
  HELP_ARTICLES,
  HELP_CATEGORY_LABELS,
  getHelpArticleBySlug,
} from "@dg/platform-core";

import { SafeMarkdown } from "@/components/command/SafeMarkdown";
import { SUPPORT_EMAIL, SUPPORT_MAILTO } from "@/lib/support";

interface PageProps {
  params: Promise<{ slug: string }>;
}

export function generateStaticParams() {
  return HELP_ARTICLES.map((article) => ({ slug: article.slug }));
}

export default async function SupportHelpArticlePage({ params }: PageProps) {
  const { slug } = await params;
  const article = getHelpArticleBySlug(slug);
  if (!article) {
    notFound();
  }

  return (
    <>
      <header className="dg-page-header">
        <Link
          href="/support/help"
          className="inline-flex min-h-11 items-center text-sm text-sky-400 hover:underline"
        >
          ← Knowledge base
        </Link>
        <p className="mt-4 text-xs font-semibold uppercase tracking-[0.22em] text-sky-400">
          {HELP_CATEGORY_LABELS[article.category]}
        </p>
        <h1 className="mt-2 text-2xl font-bold text-white">{article.title}</h1>
        <p className="mt-1 text-sm text-slate-400">{article.summary}</p>
      </header>
      <main className="dg-page-main space-y-6">
        <article className="dg-card max-w-3xl">
          <SafeMarkdown source={article.body} />
        </article>

        <div className="dg-card max-w-3xl border-slate-700/80">
          <h2 className="font-semibold text-white">Still need help?</h2>
          <p className="mt-2 text-sm text-slate-400">
            Continue in the{" "}
            <Link
              href="/support"
              className="inline-flex min-h-11 items-center text-sky-400 hover:underline"
            >
              Support centre
            </Link>{" "}
            or email{" "}
            <a
              href={SUPPORT_MAILTO}
              className="inline-flex min-h-11 items-center text-sky-400 hover:underline"
            >
              {SUPPORT_EMAIL}
            </a>
            . Include your organisation name and the page URL so the team can reproduce the issue.
          </p>
        </div>
      </main>
    </>
  );
}

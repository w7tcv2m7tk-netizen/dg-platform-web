import Link from "next/link";
import { redirect } from "next/navigation";
import { PLATFORM_DOCS_CATALOG } from "@dg/platform-core";

import { OperatorCategoryHeader } from "@/components/command/OperatorCategoryHeader";
import { ProductOverviewDashboard } from "@/components/command/ProductOverviewDashboard";
import { PlatformRoadmapPanel } from "@/components/platform/PlatformRoadmapPanel";
import { getPlatformPageContext } from "@/lib/platform-page-context";

const RELEASE_SLUGS = new Set([
  "commercially-ready-v1",
  "platform-releases",
  "gate-1-dogfood",
  "founding-10-release-gate",
  "acc-beta-launch",
  "re-beta-launch",
  "websites-beta-launch",
  "commerce-beta-launch",
  "infrastructure-beta-launch",
  "services-beta-launch",
]);

export default async function ProductSectionPage({
  params,
}: {
  params: Promise<{ section: string }>;
}) {
  const { clerkUserId } = await getPlatformPageContext();
  if (!clerkUserId) redirect("/login");

  const { section } = await params;

  if (section === "overview") {
    return (
      <>
        <header className="dg-page-header">
          <OperatorCategoryHeader
            eyebrow="Product"
            title="Overview"
            question="What exists, what is being built, what is planned, what has changed, and what feedback needs a decision?"
            backHref="/command"
            backLabel="Command Centre"
          />
        </header>
        <main className="dg-page-main space-y-6">
          <ProductOverviewDashboard />
        </main>
      </>
    );
  }

  if (section === "roadmap") {
    return (
      <>
        <header className="dg-page-header">
          <OperatorCategoryHeader
            eyebrow="Product"
            title="Roadmap"
            question="Commercial readiness first (Now / Next), then Later Gen 2 backlog — not a Jira clone."
            backHref="/command/product/overview"
            backLabel="Product"
          />
        </header>
        <main className="dg-page-main">
          <PlatformRoadmapPanel />
        </main>
      </>
    );
  }

  if (section === "feedback") {
    return (
      <>
        <header className="dg-page-header">
          <OperatorCategoryHeader
            eyebrow="Product"
            title="Feedback"
            question="Product feedback that needs a decision — Support is the intake surface today."
            backHref="/command/product/overview"
            backLabel="Product"
          />
        </header>
        <main className="dg-page-main space-y-4">
          <p className="max-w-2xl text-sm text-slate-400">
            There is no separate feedback database yet. Capture product requests via Support
            conversations so they stay actionable and attributed. This page is the Product lens;
            Support owns intake.
          </p>
          <div className="flex flex-wrap gap-3">
            <Link
              href="/support"
              className="inline-flex rounded-lg bg-sky-600 px-4 py-2 text-sm font-medium text-white hover:bg-sky-500"
            >
              Open Support centre
            </Link>
            <Link
              href="/support/tickets"
              className="inline-flex rounded-lg border border-slate-600 px-4 py-2 text-sm font-medium text-slate-200 hover:border-slate-500"
            >
              Support conversations
            </Link>
          </div>
        </main>
      </>
    );
  }

  if (section === "releases") {
    const docs = PLATFORM_DOCS_CATALOG.filter(
      (d) =>
        RELEASE_SLUGS.has(d.slug) ||
        /release|launch|gate|ready|founding/i.test(d.slug) ||
        /release|launch|gate|dogfood/i.test(d.title),
    ).slice(0, 24);

    return (
      <>
        <header className="dg-page-header">
          <OperatorCategoryHeader
            eyebrow="Product"
            title="Releases"
            question="Curated Platform Docs for rollout and launch — not a separate changelog database."
            backHref="/command/product/overview"
            backLabel="Product"
          />
        </header>
        <main className="dg-page-main space-y-6">
          <p className="max-w-2xl text-sm text-slate-400">
            No dedicated release CMS yet. This list is curated from Platform Docs (launch gates,
            dogfood, beta checklists). Rollout switches live under Feature Flags.
          </p>
          {docs.length === 0 ? (
            <p className="text-sm text-slate-500">
              No release-adjacent docs in the allowlist — browse{" "}
              <Link href="/command/docs" className="text-sky-400 hover:underline">
                Platform Docs
              </Link>
              .
            </p>
          ) : (
            <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {docs.map((doc) => (
                <li key={doc.slug}>
                  <Link
                    href={`/command/docs/${doc.slug}`}
                    className="block h-full rounded-xl border border-slate-700/80 bg-slate-950/50 px-5 py-4 transition hover:border-sky-500/30"
                  >
                    <p className="font-medium text-white">{doc.title}</p>
                    <p className="mt-1 text-sm text-slate-400">{doc.summary}</p>
                  </Link>
                </li>
              ))}
            </ul>
          )}
          <p className="text-sm text-slate-500">
            Rollout controls:{" "}
            <Link href="/command/flags" className="text-sky-400 hover:underline">
              Feature flags
            </Link>
            {" · "}
            <Link href="/command/docs" className="text-sky-400 hover:underline">
              All Platform Docs
            </Link>
          </p>
        </main>
      </>
    );
  }

  redirect("/command/product/overview");
}

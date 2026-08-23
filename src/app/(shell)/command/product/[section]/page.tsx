import Link from "next/link";
import { redirect } from "next/navigation";
import { PLATFORM_DOCS_CATALOG } from "@dg/platform-core";

import { OperatorCategoryHeader } from "@/components/command/OperatorCategoryHeader";
import { ProductOverviewDashboard } from "@/components/command/ProductOverviewDashboard";
import { getPlatformPageContext } from "@/lib/platform-page-context";

const REDIRECTS: Record<string, string> = {
  roadmap: "/dashboard/settings/roadmap",
  feedback: "/support",
};

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
  const redirectTo = REDIRECTS[section];
  if (redirectTo) redirect(redirectTo);

  if (section === "overview") {
    return (
      <div className="space-y-6">
        <OperatorCategoryHeader
          eyebrow="Product"
          title="Overview"
          question="Flags, roadmap, releases and feedback across the DigitalGate product surface."
        />
        <ProductOverviewDashboard />
      </div>
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
      <div className="space-y-6">
        <OperatorCategoryHeader
          eyebrow="Product"
          title="Releases"
          question="Curated Platform Docs for rollout and launch — not a separate changelog database."
        />
        <p className="max-w-2xl text-sm text-slate-400">
          Release communication lives in Platform Docs and feature flags until a dedicated
          changelog exists. Prefer honesty over inventing a release CMS.
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
          <ul className="grid gap-3 sm:grid-cols-2">
            {docs.map((doc) => (
              <li key={doc.slug}>
                <Link
                  href={`/command/docs/${doc.slug}`}
                  className="block rounded-xl border border-slate-700/80 bg-slate-950/50 px-5 py-4 transition hover:border-sky-500/30"
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
      </div>
    );
  }

  redirect("/command/product/overview");
}

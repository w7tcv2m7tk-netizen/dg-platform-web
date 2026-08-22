import { redirect } from "next/navigation";

import { OperatorSectionPlaceholder } from "@/components/command/OperatorSectionPlaceholder";
import { ProductOverviewDashboard } from "@/components/command/ProductOverviewDashboard";
import { getPlatformPageContext } from "@/lib/platform-page-context";

const REDIRECTS: Record<string, string> = {
  roadmap: "/dashboard/settings/roadmap",
  feedback: "/support",
};

const PAGES: Record<string, { title: string; description: string }> = {
  releases: {
    title: "Releases",
    description: "Platform release notes, rollout status and customer communication for product changes.",
  },
};

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
        <header>
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-sky-400/90">Product</p>
          <h1 className="mt-2 text-2xl font-bold text-white">Overview</h1>
        </header>
        <ProductOverviewDashboard />
      </div>
    );
  }

  const page = PAGES[section];
  if (!page) redirect("/command/product/overview");

  return (
    <div className="space-y-6">
      <header>
        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-sky-400/90">Product</p>
        <h1 className="mt-2 text-2xl font-bold text-white">{page.title}</h1>
      </header>
      <OperatorSectionPlaceholder title={page.title} description={page.description} />
    </div>
  );
}

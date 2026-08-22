import { redirect } from "next/navigation";

import { OperatorSectionPlaceholder } from "@/components/command/OperatorSectionPlaceholder";
import { getPlatformPageContext } from "@/lib/platform-page-context";

const REDIRECTS: Record<string, string> = {
  overview: "/command/clients",
  expansion: "/command/opportunities/expansion",
};

const PAGES: Record<string, { title: string; description: string }> = {
  health: {
    title: "Customer health",
    description:
      "Organisation health scores, adoption signals and intervention queue across the customer ecosystem.",
  },
  adoption: {
    title: "Adoption",
    description: "App activation, feature uptake and onboarding completion across customer organisations.",
  },
  engagement: {
    title: "Engagement",
    description: "Usage depth, login activity and product engagement across the customer base.",
  },
  "at-risk": {
    title: "Organisations at risk",
    description: "Customers flagged for churn risk, stalled onboarding or declining health scores.",
  },
};

export default async function CustomerIntelligenceSectionPage({
  params,
}: {
  params: Promise<{ section: string }>;
}) {
  const { clerkUserId } = await getPlatformPageContext();
  if (!clerkUserId) redirect("/login");

  const { section } = await params;
  const redirectTo = REDIRECTS[section];
  if (redirectTo) redirect(redirectTo);

  const page = PAGES[section];
  if (!page) redirect("/command/clients");

  return (
    <div className="space-y-6">
      <header>
        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-sky-400/90">
          Customer Intelligence
        </p>
        <h1 className="mt-2 text-2xl font-bold text-white">{page.title}</h1>
      </header>
      <OperatorSectionPlaceholder title={page.title} description={page.description} />
    </div>
  );
}

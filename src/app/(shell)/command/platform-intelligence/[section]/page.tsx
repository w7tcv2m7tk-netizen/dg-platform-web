import { redirect } from "next/navigation";

import { OperatorSectionPlaceholder } from "@/components/command/OperatorSectionPlaceholder";
import { getPlatformPageContext } from "@/lib/platform-page-context";

const REDIRECTS: Record<string, string> = {
  overview: "/command/intelligence",
  health: "/command/platform-health",
  connectors: "/command/clients",
  automation: "/command/flags",
  diagnostics: "/command/platform-health/diagnostics",
};

const PAGES: Record<string, { title: string; description: string }> = {
  "ai-usage": {
    title: "AI usage",
    description: "Platform-wide AI actions, model usage and cost signals across customer organisations.",
  },
  activity: {
    title: "System activity",
    description: "API volume, webhook throughput, background jobs and platform event activity.",
  },
  "service-status": {
    title: "Service status",
    description: "Operator-facing service health and incident communication — distinct from customer support tickets.",
  },
};

export default async function PlatformIntelligenceSectionPage({
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
  if (!page) redirect("/command/intelligence");

  return (
    <div className="space-y-6">
      <header>
        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-sky-400/90">
          Platform Intelligence
        </p>
        <h1 className="mt-2 text-2xl font-bold text-white">{page.title}</h1>
      </header>
      <OperatorSectionPlaceholder title={page.title} description={page.description} />
    </div>
  );
}

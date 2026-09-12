import { redirect } from "next/navigation";

import { requirePlatformOperatorContext } from "@/lib/platform-operator";

interface PageProps {
  searchParams: Promise<{ org?: string }>;
}

/** Compatibility route: AI Advisor now lives inside the unified Command cockpit. */
export default async function CommandAdvisorPage({ searchParams }: PageProps) {
  await requirePlatformOperatorContext();
  const { org } = await searchParams;
  redirect(org ? `/command?org=${encodeURIComponent(org)}#command-advisor` : "/command#command-advisor");
}

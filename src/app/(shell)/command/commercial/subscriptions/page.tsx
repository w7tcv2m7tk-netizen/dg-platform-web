import { redirect } from "next/navigation";

import { OperatorSectionPlaceholder } from "@/components/command/OperatorSectionPlaceholder";
import { getPlatformPageContext } from "@/lib/platform-page-context";

export default async function CommercialSubscriptionsPage() {
  const { clerkUserId } = await getPlatformPageContext();
  if (!clerkUserId) redirect("/login");

  return (
    <div className="space-y-6">
      <header>
        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-sky-400/90">Commercial</p>
        <h1 className="mt-2 text-2xl font-bold text-white">Subscriptions</h1>
      </header>
      <OperatorSectionPlaceholder
        title="Subscriptions"
        description="Active subscriptions, trials, plan mix and billing status across the customer ecosystem."
      />
    </div>
  );
}

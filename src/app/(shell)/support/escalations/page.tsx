import { redirect } from "next/navigation";

import { OperatorSectionPlaceholder } from "@/components/command/OperatorSectionPlaceholder";
import { getPlatformPageContext } from "@/lib/platform-page-context";

export default async function SupportEscalationsPage() {
  const { clerkUserId } = await getPlatformPageContext();
  if (!clerkUserId) redirect("/login");

  return (
    <div className="space-y-6">
      <header>
        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-sky-400/90">Support</p>
        <h1 className="mt-2 text-2xl font-bold text-white">Escalations</h1>
      </header>
      <OperatorSectionPlaceholder
        title="Escalations"
        description="High-priority customer issues requiring DigitalGate operator intervention."
      />
    </div>
  );
}

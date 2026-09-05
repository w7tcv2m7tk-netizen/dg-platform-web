import { sessionHasFeature } from "@dg/platform-core";

import { getPlatformPageContext } from "@/lib/platform-page-context";

export async function PlatformFeaturePageGate({
  children,
  featureId,
  label,
}: {
  children: React.ReactNode;
  featureId: string;
  label: string;
}) {
  const { session } = await getPlatformPageContext();

  if (!session || sessionHasFeature(session, featureId)) {
    return children;
  }

  return (
    <main className="dg-page-main">
      <div className="dg-card max-w-2xl">
        <h1 className="text-xl font-semibold text-white">Access restricted</h1>
        <p className="mt-2 text-sm text-slate-400">
          Your role does not have permission to view {label} for this business.
        </p>
      </div>
    </main>
  );
}

import { getOperatorCommandFeatureFlagsOverview } from "@dg/platform-core";

import { FeatureFlagsAdmin } from "@/components/command/FeatureFlagsAdmin";
import { requirePlatformOperatorContext } from "@/lib/platform-operator";

export default async function CommandFlagsPage() {
  const operator = await requirePlatformOperatorContext();
  const data = process.env.DATABASE_URL
    ? await getOperatorCommandFeatureFlagsOverview(operator)
    : null;

  return (
    <>
      <header className="dg-page-header">
        <p className="dg-page-eyebrow">Product</p>
        <h1 className="dg-app-page-title">Feature Flags</h1>
        <p className="dg-page-description">
          Cross-tenant rollout controls stored on organisation settings.
        </p>
      </header>
      <main className="dg-page-main space-y-8">
        {!data ? (
          <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 px-4 py-4 text-sm text-amber-100">
            Database not configured — flags unavailable.
          </div>
        ) : (
          <FeatureFlagsAdmin known={data.known} initialOrgs={data.orgs} />
        )}
      </main>
    </>
  );
}

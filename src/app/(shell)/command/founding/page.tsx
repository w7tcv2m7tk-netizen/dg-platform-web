import { connection } from "next/server";
import { buildFoundingLifecycleWorkspace } from "@dg/platform-core";

import { FoundingLifecycleCockpit } from "@/components/founding/FoundingLifecycleCockpit";
import { requirePlatformOperatorContext } from "@/lib/platform-operator";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export default async function CommandFoundingPage() {
  await connection();
  const operator = await requirePlatformOperatorContext();

  if (!process.env.DATABASE_URL) {
    return (
      <main className="dg-page-main">
        <p className="text-sm text-amber-200">DATABASE_URL required for Founding 10.</p>
      </main>
    );
  }

  const data = await buildFoundingLifecycleWorkspace(operator.operatorOrganisationId);
  return <FoundingLifecycleCockpit data={data} />;
}

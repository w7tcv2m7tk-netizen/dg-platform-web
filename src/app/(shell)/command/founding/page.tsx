import { connection } from "next/server";
import { buildFoundingLifecycleWorkspace } from "@dg/platform-core";

import { FoundingLifecycleCockpit } from "@/components/founding/FoundingLifecycleCockpit";
import { getPlatformPageContext } from "@/lib/org-apps";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export default async function CommandFoundingPage() {
  await connection();
  const { session } = await getPlatformPageContext();

  if (!session?.organisationId) {
    return (
      <main className="dg-page-main">
        <p className="text-sm text-slate-500">Sign in to manage the Founding Customer Programme.</p>
      </main>
    );
  }

  if (!process.env.DATABASE_URL) {
    return (
      <main className="dg-page-main">
        <p className="text-sm text-amber-200">DATABASE_URL required for Founding 10.</p>
      </main>
    );
  }

  const data = await buildFoundingLifecycleWorkspace(session.organisationId);
  return <FoundingLifecycleCockpit data={data} />;
}

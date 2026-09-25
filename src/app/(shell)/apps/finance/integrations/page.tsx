import Link from "next/link";

import { LendConnectorPanel } from "@/components/finance/LendConnectorPanel";
import { getPlatformPageContext } from "@/lib/platform-page-context";

export default async function FinanceIntegrationsPage() {
  const { session } = await getPlatformPageContext();
  if (!session) return <main className="dg-page-main"><p className="text-slate-400">Sign in required.</p></main>;
  return (
    <main className="dg-page-main space-y-6">
      <div>
        <Link href="/apps/finance" className="text-sm text-sky-400 hover:underline">← Finance</Link>
        <h1 className="mt-2 text-xl font-semibold text-white">Mortgage & finance broking integrations</h1>
        <p className="mt-1 max-w-3xl text-sm text-slate-400">Specialist connections are scoped to this Industry Template and require Scale or Enterprise specialist Industry API access.</p>
      </div>
      <LendConnectorPanel />
    </main>
  );
}

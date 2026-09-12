import { listSettlementProperties } from "@dg/platform-core";

import { SettlementList } from "@/components/re/SettlementList";
import { getPlatformPageContext } from "@/lib/platform-page-context";

export default async function SettlementsPage() {
  const { session } = await getPlatformPageContext();

  if (!session) {
    return (
      <main className="dg-page-main">
        <p className="text-slate-400">Sign in required.</p>
      </main>
    );
  }

  const items = await listSettlementProperties(session.organisationId);

  return (
    <main className="dg-page-main space-y-6">
      <div>
        <p className="text-sm text-slate-400">
          {session.organisationName} · Conveyancing checklist for under-offer and sold properties
        </p>
        <p className="mt-1 text-xs text-slate-500">{items.length} in settlement workflow</p>
      </div>
      <SettlementList items={items} />
    </main>
  );
}

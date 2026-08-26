import { listAllCommissions } from "@dg/platform-core";
import { CommissionAdminTable } from "@/components/partner/CommissionAdminTable";

export default async function ApprovedCommissionsPage() {
  const { commissions, total } = await listAllCommissions({ limit: 200 });
  const filtered = commissions.filter((c) => c.status === "APPROVED");

  return (
    <>
      <header className="dg-page-header">
        <h1 className="text-2xl font-bold text-white">Approved Commissions</h1>
        <p className="mt-1 text-sm text-slate-400">{filtered.length} of {total} entries</p>
      </header>
      <main className="dg-page-main">
        <div className="max-w-5xl space-y-8">
          <CommissionAdminTable commissions={filtered} />
        </div>
      </main>
    </>
  );
}

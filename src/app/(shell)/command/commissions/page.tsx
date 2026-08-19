import { listAllCommissions } from "@dg/platform-core";
import { CommissionAdminTable } from "@/components/partner/CommissionAdminTable";

function centsToDisplay(cents: number): string {
  return (cents / 100).toLocaleString("en-AU", {
    style: "currency",
    currency: "AUD",
    maximumFractionDigits: 2,
  });
}

export default async function AdminCommissionsPage() {
  const { commissions, total } = await listAllCommissions({ limit: 100 });

  const totalEarned = commissions.reduce((s, c) => s + c.commissionAmountCents, 0);
  const totalPending = commissions
    .filter((c) => ["CALCULATED", "PENDING", "APPROVED"].includes(c.status))
    .reduce((s, c) => s + c.commissionAmountCents, 0);
  const totalPaid = commissions
    .filter((c) => c.status === "PAID")
    .reduce((s, c) => s + c.commissionAmountCents, 0);

  return (
    <>
      <header className="dg-page-header">
        <h1 className="text-2xl font-bold text-white">Commissions</h1>
        <p className="mt-1 text-sm text-slate-400">
          Partner commission ledger — {total} entries
        </p>
      </header>

      <main className="dg-page-main">
        <div className="max-w-5xl space-y-8">
          {/* Summary */}
          <div className="grid grid-cols-3 gap-4">
            {[
              { label: "Total Earned", value: centsToDisplay(totalEarned) },
              { label: "Pending / Approved", value: centsToDisplay(totalPending) },
              { label: "Paid", value: centsToDisplay(totalPaid) },
            ].map(({ label, value }) => (
              <div
                key={label}
                className="rounded-xl border border-slate-700/60 bg-slate-800/40 px-5 py-4"
              >
                <p className="text-xs text-slate-400">{label}</p>
                <p className="mt-1 text-2xl font-bold text-white">{value}</p>
              </div>
            ))}
          </div>

          <CommissionAdminTable commissions={commissions} />
        </div>
      </main>
    </>
  );
}

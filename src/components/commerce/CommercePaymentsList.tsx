function formatMoney(cents: number, currency = "AUD") {
  return new Intl.NumberFormat("en-AU", {
    style: "currency",
    currency,
  }).format(cents / 100);
}

function statusClass(status: string) {
  if (status === "paid") return "text-emerald-400";
  if (status === "failed" || status === "expired") return "text-amber-400";
  return "text-slate-300";
}

export function CommercePaymentsList({
  items,
}: {
  items: Array<{
    id: string;
    status: string;
    totalCents: number;
    currency: string;
    description: string | null;
    sourceApp: string | null;
    sourceEntityType: string | null;
    sourceEntityId: string | null;
    checkoutUrl: string | null;
    paymentLinkUrl: string | null;
    paidAt: string | null;
    createdAt: string;
  }>;
}) {
  if (!items.length) {
    return (
      <div className="dg-card border-dashed border-slate-700">
        <p className="text-slate-300">No payment requests yet.</p>
        <p className="mt-2 text-sm text-slate-500">
          Create one from a vendor lead or via the payment requests API.
        </p>
      </div>
    );
  }

  return (
    <ul className="space-y-3">
      {items.map((item) => {
        const payUrl = item.checkoutUrl ?? item.paymentLinkUrl;
        return (
          <li key={item.id} className="dg-card">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="font-medium text-white">
                  {item.description ?? "Payment request"}
                </p>
                <p className="mt-1 text-sm capitalize text-slate-400">
                  <span className={statusClass(item.status)}>{item.status.replace(/_/g, " ")}</span>
                  {item.sourceApp ? ` · ${item.sourceApp}` : ""}
                </p>
                {item.sourceEntityType && item.sourceEntityId ? (
                  <p className="mt-1 font-mono text-xs text-slate-500">
                    {item.sourceEntityType}:{item.sourceEntityId.slice(0, 8)}…
                  </p>
                ) : null}
              </div>
              <div className="text-right">
                <p className="text-lg font-semibold text-white">
                  {formatMoney(item.totalCents, item.currency)}
                </p>
                <p className="text-xs text-slate-500">
                  {new Date(item.createdAt).toLocaleString("en-AU")}
                </p>
              </div>
            </div>
            {payUrl && item.status !== "paid" ? (
              <a
                href={payUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-3 inline-block text-sm text-blue-400 hover:underline"
              >
                Open checkout link →
              </a>
            ) : null}
          </li>
        );
      })}
    </ul>
  );
}

"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

export function BillingCheckoutBanner({ checkout }: { checkout?: string }) {
  const [visible, setVisible] = useState(Boolean(checkout));

  useEffect(() => {
    setVisible(Boolean(checkout));
  }, [checkout]);

  if (!visible || !checkout) return null;

  if (checkout === "cancelled") {
    return (
      <div className="rounded-xl border border-amber-500/30 bg-amber-950/20 px-4 py-3 text-sm text-amber-100">
        Checkout was cancelled — no Stripe customer was created. You can try again when ready, or{" "}
        <Link href="/dashboard/apps" className="text-amber-50 underline hover:no-underline">
          review plans
        </Link>
        .
      </div>
    );
  }

  if (checkout === "success") {
    return (
      <div className="rounded-xl border border-emerald-500/30 bg-emerald-950/20 px-4 py-3 text-sm text-emerald-100">
        Checkout completed. If your plan looks stale,{" "}
        <Link href="/dashboard/apps?sync=1" className="underline hover:no-underline">
          sync purchase
        </Link>
        .
      </div>
    );
  }

  return null;
}

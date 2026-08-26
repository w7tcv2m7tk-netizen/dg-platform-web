import Link from "next/link";
import {
  billingStatusDetail,
  billingStatusHeadline,
  getOrganisationBillingStatus,
} from "@dg/platform-core";

import { BillingActions } from "@/components/settings/BillingActions";

export async function AppsBillingStatusCard({
  organisationId,
}: {
  organisationId: string;
}) {
  let status: Awaited<ReturnType<typeof getOrganisationBillingStatus>> = null;
  try {
    status = await getOrganisationBillingStatus(organisationId);
  } catch {
    return null;
  }
  if (!status) return null;

  return (
    <section className="mb-8 rounded-xl border border-slate-800 bg-slate-900/50 px-4 py-4 sm:px-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="max-w-2xl space-y-2">
          <p className="text-xs font-semibold uppercase tracking-widest text-slate-500">
            Billing status
          </p>
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-base font-semibold text-white">
              {billingStatusHeadline(status)}
            </h2>
            {status.foundingCustomer ? (
              <span className="rounded-full bg-blue-500/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-blue-300">
                Founding Customer
              </span>
            ) : null}
          </div>
          <p className="text-sm text-slate-400">{billingStatusDetail(status)}</p>
          <p className="text-xs text-slate-500">
            Tier buttons below are <span className="text-slate-400">preview-only</span> (sidebar /
            apply_plan). They do not create a Stripe customer or paid entitlements. Use{" "}
            <span className="text-slate-400">Subscribe in app</span> for the real checkout path.
          </p>
        </div>
        <div className="flex flex-col items-stretch gap-2 sm:items-end">
          <Link
            href="/dashboard/settings/billing"
            className="rounded-full border border-slate-600 px-4 py-2 text-center text-sm text-slate-200 hover:border-blue-500"
          >
            Billing settings →
          </Link>
          <BillingActions
            platformTier={status.platformTier}
            hasBillingCustomer={status.hasStripeCustomer}
            expectsPlatformBilling={status.expectsPlatformBilling}
            foundingCustomer={status.foundingCustomer}
          />
        </div>
      </div>
    </section>
  );
}

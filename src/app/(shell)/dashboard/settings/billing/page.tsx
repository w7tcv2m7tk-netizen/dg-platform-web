import Link from "next/link";
import { notFound } from "next/navigation";
import {
  getOrganisationBillingStatus,
  getOrganisationBusinessProfile,
  sessionCan,
} from "@dg/platform-core";

import { BillingActions } from "@/components/settings/BillingActions";
import { BillingStatusPanel } from "@/components/settings/BillingStatusPanel";
import { BillingCheckoutBanner } from "@/components/settings/BillingCheckoutBanner";
import { getOrgEnabledAppIds, getPlatformPageContext } from "@/lib/org-apps";
import { PRICING_PAGE_URL } from "@/lib/pricing-catalog";

export default async function BillingSettingsPage({
  searchParams,
}: {
  searchParams?: Promise<{ checkout?: string }>;
}) {
  const params = searchParams ? await searchParams : {};
  const { portal, session } = await getPlatformPageContext();
  if (!session) notFound();

  const canViewBilling = sessionCan(session, {
    module: "billing",
    action: "view",
    scope: "organisation",
  });
  if (!canViewBilling) notFound();

  const canManageBilling = sessionCan(session, {
    module: "billing",
    action: "manage",
    scope: "organisation",
  });

  const enabledIds = await getOrgEnabledAppIds();
  const [profile, billingStatus] = await Promise.all([
    getOrganisationBusinessProfile(session.organisationId),
    getOrganisationBillingStatus(session.organisationId),
  ]);

  return (
    <>
      <header className="dg-page-header">
        <Link href="/dashboard/settings" className="text-sm text-blue-400 hover:underline">
          ← Settings
        </Link>
        <h1 className="mt-2 text-2xl font-bold text-white">Billing & plan</h1>
        <p className="text-sm text-slate-400">
          Subscription status, Stripe Customer Portal, and enabled apps — no invented MRR
        </p>
      </header>
      <main className="dg-page-main space-y-6">
        {canManageBilling ? <BillingCheckoutBanner checkout={params.checkout} /> : null}

        <div className="grid gap-4 lg:grid-cols-2">
          <div className="dg-card">
            <h2 className="font-semibold text-white">Current plan</h2>
            <div className="mt-4">
              <BillingStatusPanel
                status={billingStatus}
                purchaseFallback={portal?.purchase_label ?? profile?.purchaseLabel}
              />
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              {canManageBilling ? (
                <Link
                  href="/dashboard/apps?sync=1"
                  className="rounded-full border border-slate-600 px-4 py-1.5 text-xs font-medium text-slate-200 hover:border-blue-500"
                >
                  Sync purchase →
                </Link>
              ) : null}
              <a
                href={PRICING_PAGE_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="rounded-full border border-slate-600 px-4 py-1.5 text-xs font-medium text-slate-200 hover:border-blue-500"
              >
                View pricing ↗
              </a>
            </div>
            {!canManageBilling ? (
              <p className="mt-3 text-xs text-slate-500">
                Billing is read-only for your role. An organisation owner can change the plan or open the Stripe Customer Portal.
              </p>
            ) : null}
          </div>

          <div className="dg-card">
            <h2 className="font-semibold text-white">Enabled apps</h2>
            <p className="mt-2 text-sm text-slate-400">
              {enabledIds.length} app{enabledIds.length === 1 ? "" : "s"} on your sidebar
            </p>
            {enabledIds.length === 0 ? (
              <p className="mt-3 text-sm text-slate-500">
                No apps enabled yet.
              </p>
            ) : (
              <ul className="mt-3 space-y-1 text-sm text-slate-300">
                {enabledIds.map((id) => (
                  <li key={id} className="capitalize">
                    {id.replace(/-/g, " ")}
                  </li>
                ))}
              </ul>
            )}
            {canManageBilling ? (
              <Link
                href="/dashboard/apps"
                className="mt-4 inline-block text-sm text-blue-400 hover:underline"
              >
                Manage apps & plan →
              </Link>
            ) : null}
          </div>
        </div>

        <div className="dg-card border-dashed border-slate-700">
          <h2 className="font-semibold text-white">Invoices & payment method</h2>
          <p className="mt-2 text-sm text-slate-400">
            {canManageBilling
              ? "Download invoices and update your payment method in the Stripe Customer Portal. Portal access requires a linked Stripe customer — not only a sidebar plan preview."
              : "Invoice and payment-method changes are restricted to an organisation owner."}
          </p>
          {canManageBilling ? (
            <BillingActions
              platformTier={billingStatus.platformTier}
              hasBillingCustomer={billingStatus.hasStripeCustomer}
              expectsPlatformBilling={billingStatus.expectsPlatformBilling}
              foundingCustomer={billingStatus.foundingCustomer}
              compact
            />
          ) : null}
        </div>
      </main>
    </>
  );
}

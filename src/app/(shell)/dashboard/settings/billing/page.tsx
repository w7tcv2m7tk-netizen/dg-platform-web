import Link from "next/link";
import { resolveActivePlatformSession } from "@/lib/active-platform-session";
import { currentUser } from "@clerk/nextjs/server";
import {
  getOrganisationBillingStatus,
  getOrganisationBusinessProfile,
} from "@dg/platform-core";

import { BillingActions } from "@/components/settings/BillingActions";
import { BillingStatusPanel } from "@/components/settings/BillingStatusPanel";
import { BillingCheckoutBanner } from "@/components/settings/BillingCheckoutBanner";
import { fetchPortalMe } from "@/lib/dg-api";
import { getOrgEnabledAppIds } from "@/lib/org-apps";
import { PRICING_PAGE_URL } from "@/lib/pricing-catalog";

export default async function BillingSettingsPage({
  searchParams,
}: {
  searchParams?: Promise<{ checkout?: string }>;
}) {
  const params = searchParams ? await searchParams : {};
  const user = await currentUser();
  const email = user?.primaryEmailAddress?.emailAddress ?? "";
  const name =
    user?.fullName ??
    [user?.firstName, user?.lastName].filter(Boolean).join(" ") ??
    email;

  const portal = email ? await fetchPortalMe(email, user?.id) : null;
  const session = user?.id
    ? await resolveActivePlatformSession({
        clerkUserId: user.id,
        email,
        name,
        orgName: portal?.org_name,
      })
    : null;

  const enabledIds = await getOrgEnabledAppIds();
  const [profile, billingStatus] = session
    ? await Promise.all([
        getOrganisationBusinessProfile(session.organisationId),
        getOrganisationBillingStatus(session.organisationId),
      ])
    : [null, null];

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
        <BillingCheckoutBanner checkout={params.checkout} />

        <div className="grid gap-4 lg:grid-cols-2">
          <div className="dg-card">
            <h2 className="font-semibold text-white">Current plan</h2>
            {billingStatus ? (
              <div className="mt-4">
                <BillingStatusPanel
                  status={billingStatus}
                  purchaseFallback={portal?.purchase_label ?? profile?.purchaseLabel}
                />
              </div>
            ) : (
              <p className="mt-4 text-sm text-slate-400">
                Sign in with a configured organisation to see billing status.
              </p>
            )}
            <div className="mt-4 flex flex-wrap gap-2">
              <Link
                href="/dashboard/apps?sync=1"
                className="rounded-full border border-slate-600 px-4 py-1.5 text-xs font-medium text-slate-200 hover:border-blue-500"
              >
                Sync purchase →
              </Link>
              <a
                href={PRICING_PAGE_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="rounded-full border border-slate-600 px-4 py-1.5 text-xs font-medium text-slate-200 hover:border-blue-500"
              >
                View pricing ↗
              </a>
            </div>
          </div>

          <div className="dg-card">
            <h2 className="font-semibold text-white">Enabled apps</h2>
            <p className="mt-2 text-sm text-slate-400">
              {enabledIds.length} app{enabledIds.length === 1 ? "" : "s"} on your sidebar
            </p>
            {enabledIds.length === 0 ? (
              <p className="mt-3 text-sm text-slate-500">
                No apps enabled yet — open Apps & Platform to apply a tier preview.
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
            <Link
              href="/dashboard/apps"
              className="mt-4 inline-block text-sm text-blue-400 hover:underline"
            >
              Manage apps & plan →
            </Link>
          </div>
        </div>

        <div className="dg-card border-dashed border-slate-700">
          <h2 className="font-semibold text-white">Invoices & payment method</h2>
          <p className="mt-2 text-sm text-slate-400">
            Download invoices and update your payment method in the Stripe Customer Portal.
            Portal access requires a linked Stripe customer — not only a sidebar plan preview.
          </p>
          {billingStatus ? (
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

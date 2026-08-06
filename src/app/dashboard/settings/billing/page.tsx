import Link from "next/link";
import { currentUser } from "@clerk/nextjs/server";
import {
  getOrganisationBusinessProfile,
  resolvePlatformSession,
} from "@dg/platform-core";

import { fetchPortalMe } from "@/lib/dg-api";
import { getOrgEnabledAppIds } from "@/lib/org-apps";
import { ensureOrganisationOnboardingSync } from "@/lib/org-onboarding-sync";
import { PRICING_PAGE_URL } from "@/lib/pricing-catalog";

export default async function BillingSettingsPage() {
  const user = await currentUser();
  const email = user?.primaryEmailAddress?.emailAddress ?? "";
  const name =
    user?.fullName ??
    [user?.firstName, user?.lastName].filter(Boolean).join(" ") ??
    email;

  const portal = email ? await fetchPortalMe(email, user?.id) : null;
  await ensureOrganisationOnboardingSync();
  const session = user?.id
    ? await resolvePlatformSession({
        clerkUserId: user.id,
        email,
        name,
        orgName: portal?.org_name,
      })
    : null;

  const enabledIds = await getOrgEnabledAppIds();
  const profile = session
    ? await getOrganisationBusinessProfile(session.organisationId)
    : null;

  return (
    <>
      <header className="dg-page-header">
        <Link href="/dashboard/settings" className="text-sm text-blue-400 hover:underline">
          ← Settings
        </Link>
        <h1 className="mt-2 text-2xl font-bold text-white">Billing & plan</h1>
        <p className="text-sm text-slate-400">
          Your subscription, purchase history, and enabled apps
        </p>
      </header>
      <main className="flex-1 space-y-6 p-8">
        <div className="grid gap-4 lg:grid-cols-2">
          <div className="dg-card">
            <h2 className="font-semibold text-white">Current plan</h2>
            <dl className="mt-4 space-y-3 text-sm">
              <div>
                <dt className="text-slate-500">Platform tier</dt>
                <dd className="text-white capitalize">
                  {profile?.platformTier?.replace(/_/g, " ") ?? "Not synced yet"}
                </dd>
              </div>
              <div>
                <dt className="text-slate-500">Purchase</dt>
                <dd className="text-white">
                  {portal?.purchase_label ?? profile?.purchaseLabel ?? "—"}
                </dd>
              </div>
              <div>
                <dt className="text-slate-500">Portal linked</dt>
                <dd className="text-white">{portal?.linked ? "Yes" : "No"}</dd>
              </div>
            </dl>
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
                Change plan ↗
              </a>
            </div>
          </div>

          <div className="dg-card">
            <h2 className="font-semibold text-white">Enabled apps</h2>
            <p className="mt-2 text-sm text-slate-400">
              {enabledIds.length} app{enabledIds.length === 1 ? "" : "s"} on your sidebar
            </p>
            <ul className="mt-3 space-y-1 text-sm text-slate-300">
              {enabledIds.map((id) => (
                <li key={id} className="capitalize">
                  {id.replace(/-/g, " ")}
                </li>
              ))}
            </ul>
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
            Subscription billing is managed through DigitalGate checkout. Stripe Customer Portal
            for invoices ships next — contact support for billing changes in the meantime.
          </p>
          <a
            href="https://digitalgate.com.au/contact/"
            target="_blank"
            rel="noopener noreferrer"
            className="mt-4 inline-block text-sm text-blue-400 hover:underline"
          >
            Contact billing support →
          </a>
        </div>
      </main>
    </>
  );
}

import Link from "next/link";
import { currentUser } from "@clerk/nextjs/server";
import { resolvePlatformSession } from "@dg/platform-core";
import { SetupChecklist } from "@/components/SetupChecklist";
import { SupportActions } from "@/components/SupportActions";
import { fetchPortalMe, getOnboardingUrl } from "@/lib/dg-api";

export default async function DashboardPage() {
  const user = await currentUser();
  const email = user?.primaryEmailAddress?.emailAddress ?? "";
  const clerkUserId = user?.id;
  const name =
    user?.fullName ??
    [user?.firstName, user?.lastName].filter(Boolean).join(" ") ??
    email;

  const portal = email ? await fetchPortalMe(email, clerkUserId) : null;

  const platformSession =
    clerkUserId && email
      ? await resolvePlatformSession({
          clerkUserId,
          email,
          name,
          orgName: portal?.org_name,
        })
      : null;
  const onboardingUrl = getOnboardingUrl();

  const displayName =
    portal?.name ||
    user?.firstName ||
    user?.fullName ||
    email.split("@")[0] ||
    "there";

  const orgLine = platformSession
    ? ` · ${platformSession.organisationName}`
    : portal?.org_name
      ? ` · ${portal.org_name}`
      : "";
  const planLine = portal?.purchase_label ? ` · ${portal.purchase_label}` : "";

  return (
    <>
      <header className="border-b border-slate-800 px-8 py-5">
        <h1 className="text-2xl font-bold text-white">Overview</h1>
        <p className="text-sm text-slate-400">
          Welcome back, {displayName}
          {email ? ` · ${email}` : ""}
          {orgLine}
          {planLine}
        </p>
        {platformSession ? (
          <p className="mt-1 text-xs text-emerald-400/90">
            Platform org: {platformSession.organisationSlug} (Postgres)
          </p>
        ) : null}
        {portal?.linked ? (
          <p className="mt-1 text-xs text-emerald-400/90">
            Linked to CRM contact #{portal.contact_id} (WordPress bridge)
          </p>
        ) : null}
      </header>
      <main className="flex-1 p-8">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {platformSession ? (
            <div className="dg-card">
              <h2 className="font-semibold text-white">CRM</h2>
              <p className="mt-1 text-sm text-slate-400">
                Contacts live in Platform Postgres for{" "}
                {platformSession.organisationName}.
              </p>
              <Link
                href="/apps/crm/contacts"
                className="mt-4 inline-block text-sm font-medium text-blue-400 hover:underline"
              >
                Open contacts →
              </Link>
            </div>
          ) : null}
          {platformSession ? (
            <div className="dg-card">
              <h2 className="font-semibold text-white">Real Estate</h2>
              <p className="mt-1 text-sm text-slate-400">
                Vendor pipeline — sync from WordPress Roe CRM.
              </p>
              <Link
                href="/apps/re/vendor-leads"
                className="mt-4 inline-block text-sm font-medium text-blue-400 hover:underline"
              >
                Open vendor leads →
              </Link>
            </div>
          ) : null}
          <div className="dg-card">
            <h2 className="font-semibold text-white">Onboarding</h2>
            <p className="mt-1 text-sm text-slate-400">
              Complete your setup form so we can configure your platform.
            </p>
            <Link
              href="/onboarding"
              className="mt-4 inline-block text-sm font-medium text-blue-400 hover:underline"
            >
              Continue onboarding →
            </Link>
          </div>
          <div className="dg-card">
            <h2 className="font-semibold text-white">Plan & apps</h2>
            <p className="mt-1 text-sm text-slate-400">
              {portal?.purchase_label
                ? `Current plan: ${portal.purchase_label}`
                : "Review or change your platform tier and add-ons."}
            </p>
            <Link
              href="/signup"
              className="mt-4 inline-block text-sm font-medium text-blue-400 hover:underline"
            >
              Manage selection →
            </Link>
          </div>
          <div className="dg-card">
            <h2 className="font-semibold text-white">Support</h2>
            <p className="mt-1 text-sm text-slate-400">
              Questions during setup? Reach the DigitalGate team.
            </p>
            <SupportActions />
          </div>
        </div>

        <div className="dg-card mt-8">
          <h2 className="font-semibold text-white">Setup checklist</h2>
          {portal ? (
            <SetupChecklist setup={portal.setup} linked={portal.linked} />
          ) : (
            <p className="mt-3 text-sm text-slate-400">Sign in to view progress.</p>
          )}
          <a
            href={onboardingUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-4 inline-block rounded-full bg-blue-600 px-5 py-2 text-sm font-semibold text-white hover:bg-blue-500"
          >
            Open full onboarding (WordPress)
          </a>
        </div>
      </main>
    </>
  );
}

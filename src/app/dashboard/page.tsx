import Link from "next/link";
import { currentUser } from "@clerk/nextjs/server";
import { getOnboardingUrl } from "@/lib/dg-api";

export default async function DashboardPage() {
  const user = await currentUser();
  const onboardingUrl = getOnboardingUrl();
  const displayName =
    user?.firstName ||
    user?.fullName ||
    user?.primaryEmailAddress?.emailAddress?.split("@")[0] ||
    "there";

  return (
    <>
      <header className="border-b border-slate-800 px-8 py-5">
        <h1 className="text-2xl font-bold text-white">Overview</h1>
        <p className="text-sm text-slate-400">
          Welcome back, {displayName}
          {user?.primaryEmailAddress?.emailAddress
            ? ` · ${user.primaryEmailAddress.emailAddress}`
            : ""}
        </p>
      </header>
      <main className="flex-1 p-8">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
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
              Review or change your platform tier and add-ons.
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
            <a
              href="mailto:support@digitalgate.com.au"
              className="mt-4 inline-block text-sm font-medium text-blue-400 hover:underline"
            >
              Email support →
            </a>
          </div>
        </div>

        <div className="dg-card mt-8">
          <h2 className="font-semibold text-white">Setup checklist</h2>
          <ul className="mt-3 space-y-2 text-sm text-slate-300">
            <li className="flex items-center gap-2">
              <span className="text-emerald-400">✓</span> Account created
            </li>
            <li className="flex items-center gap-2">
              <span className="text-slate-500">○</span> Complete onboarding form
            </li>
            <li className="flex items-center gap-2">
              <span className="text-slate-500">○</span> Platform provisioned on
              your site
            </li>
            <li className="flex items-center gap-2">
              <span className="text-slate-500">○</span> Industry app configured
            </li>
          </ul>
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

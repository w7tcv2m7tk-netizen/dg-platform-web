import Link from "next/link";
import { getOnboardingUrl } from "@/lib/dg-api";

export default function OnboardingPage() {
  const wpOnboarding = getOnboardingUrl();

  return (
    <>
      <header className="border-b border-slate-800 px-8 py-5">
        <h1 className="text-2xl font-bold text-white">Onboarding</h1>
        <p className="text-sm text-slate-400">
          Full business details form — hosted on DigitalGate today
        </p>
      </header>
      <main className="flex-1 p-8">
        <div className="dg-card max-w-2xl">
          <p className="text-slate-300">
            The detailed onboarding form (13 sections, file uploads, Google
            assets, etc.) still lives on WordPress at{" "}
            <code className="text-blue-300">/onboarding/</code>. This Next.js app
            is the shell for signup, login, and dashboard — migrate the form here
            when you&apos;re ready.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <a
              href={wpOnboarding}
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-full bg-blue-600 px-5 py-2 text-sm font-semibold text-white hover:bg-blue-500"
            >
              Open onboarding form →
            </a>
            <Link
              href="/dashboard"
              className="rounded-full border border-slate-600 px-5 py-2 text-sm text-slate-300 hover:border-slate-500"
            >
              Back to dashboard
            </Link>
          </div>
        </div>
      </main>
    </>
  );
}

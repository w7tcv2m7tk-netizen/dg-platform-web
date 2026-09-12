import Link from "next/link";

import { SignupForm } from "@/components/SignupForm";

export default function SignupPage() {
  return (
    <>
      <header className="dg-page-header">
        <h1 className="text-2xl font-bold text-white">Signup</h1>
        <p className="mt-1 text-sm text-slate-300">
          New customer signup — select your DigitalGate plan, industry apps and add-ons.
        </p>
        <nav className="mt-3 flex flex-wrap gap-2" aria-label="Signup options">
          <Link
            href="/dashboard/apps#plan"
            className="inline-flex min-h-11 items-center rounded-full border border-slate-700 px-4 text-sm text-blue-400 hover:border-slate-600 hover:text-blue-300"
          >
            Already signed in? Open Apps &amp; Plan
          </Link>
          <Link
            href="/signup/account"
            className="inline-flex min-h-11 items-center rounded-full border border-slate-700 px-4 text-sm text-blue-400 hover:border-slate-600 hover:text-blue-300"
          >
            Create account
          </Link>
          <Link
            href="/login"
            className="inline-flex min-h-11 items-center rounded-full border border-slate-700 px-4 text-sm text-blue-400 hover:border-slate-600 hover:text-blue-300"
          >
            Log in
          </Link>
        </nav>
      </header>
      <main className="dg-page-main">
        <div className="max-w-3xl">
          <SignupForm />
        </div>
      </main>
    </>
  );
}

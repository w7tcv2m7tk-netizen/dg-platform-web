import Link from "next/link";

import { SignupForm } from "@/components/SignupForm";

export default function SignupPage() {
  return (
    <>
      <header className="border-b border-slate-800 px-8 py-5">
        <h1 className="text-2xl font-bold text-white">Plan & apps</h1>
        <p className="text-sm text-slate-400">
          Select your tier, industry app, and premium add-ons.{" "}
          <Link href="/signup/account" className="text-blue-400 hover:underline">
            Create an account
          </Link>{" "}
          or{" "}
          <Link href="/login" className="text-blue-400 hover:underline">
            log in
          </Link>{" "}
          to save progress in your dashboard.
        </p>
      </header>
      <main className="flex-1 p-8">
        <div className="max-w-3xl">
          <SignupForm />
        </div>
      </main>
    </>
  );
}

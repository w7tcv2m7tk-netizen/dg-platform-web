import Link from "next/link";

import { SignupForm } from "@/components/SignupForm";

export default function SignupPage() {
  return (
    <>
      <header className="border-b border-slate-800 px-8 py-5">
        <h1 className="text-2xl font-bold text-white">Signup</h1>
        <p className="text-sm text-slate-400">
          New customer signup — select tier, industry apps, and add-ons.{" "}
          <Link href="/dashboard/apps#plan" className="text-blue-400 hover:underline">
            Already signed in? Open Apps & plan
          </Link>
          {" · "}
          <Link href="/signup/account" className="text-blue-400 hover:underline">
            Create account
          </Link>
          {" · "}
          <Link href="/login" className="text-blue-400 hover:underline">
            Log in
          </Link>
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

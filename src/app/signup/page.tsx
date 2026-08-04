import Link from "next/link";
import { SignupForm } from "@/components/SignupForm";

export default function SignupPage() {
  return (
    <div className="min-h-full px-4 py-10">
      <div className="mx-auto max-w-3xl">
        <Link href="/" className="text-sm text-slate-500 hover:text-slate-300">
          ← DigitalGate
        </Link>
        <h1 className="mt-4 text-3xl font-bold text-white">
          Build your platform
        </h1>
        <p className="mt-2 text-slate-400">
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
        <div className="mt-8">
          <SignupForm />
        </div>
      </div>
    </div>
  );
}

import Link from "next/link";
import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";

import { DigitalGateLogo } from "@/components/brand/DigitalGateLogo";
import { AUTH_AFTER_SIGN_IN_URL, AUTH_SIGN_IN_URL, AUTH_SIGN_UP_URL } from "@/lib/auth-routes";

export default async function HomePage() {
  const { userId } = await auth();
  if (userId) {
    redirect(AUTH_AFTER_SIGN_IN_URL);
  }

  return (
    <div className="flex min-h-full flex-col">
      <header className="border-b border-slate-800 px-6 py-4">
        <div className="mx-auto flex max-w-5xl items-center justify-between">
          <DigitalGateLogo variant="logo" href="/" logoWidth={120} showTagline={false} />
          <div className="flex gap-3 text-sm">
            {userId ? (
              <Link
                href="/dashboard"
                className="rounded-full bg-blue-600 px-4 py-1.5 font-medium text-white hover:bg-blue-500"
              >
                Open dashboard
              </Link>
            ) : (
              <>
                <Link href={AUTH_SIGN_IN_URL} className="text-slate-300 hover:text-white">
                  Log in
                </Link>
                <Link
                  href={AUTH_SIGN_UP_URL}
                  className="rounded-full bg-blue-600 px-4 py-1.5 font-medium text-white hover:bg-blue-500"
                >
                  Start Free Trial
                </Link>
              </>
            )}
          </div>
        </div>
      </header>

      <main className="mx-auto flex max-w-5xl flex-1 flex-col justify-center px-6 py-20">
        <p className="text-sm font-semibold uppercase tracking-widest text-blue-300">
          DigitalGate Business Platform
        </p>
        <h1 className="mt-4 max-w-2xl text-4xl font-bold leading-tight text-white sm:text-5xl">
          Build your business on DigitalGate.
        </h1>
        <p className="mt-4 max-w-xl text-lg text-slate-300">
          AI-powered Business Operating Platform connecting CRM, website, AI,
          automation, intelligence and infrastructure — one login, one platform.
        </p>
        <div className="mt-8 flex flex-wrap gap-4">
          {userId ? (
            <Link
              href="/dashboard"
              className="rounded-full bg-blue-600 px-6 py-3 font-semibold text-white hover:bg-blue-500"
            >
              Go to dashboard
            </Link>
          ) : (
            <>
              <Link
                href={AUTH_SIGN_UP_URL}
                className="rounded-full bg-blue-600 px-6 py-3 font-semibold text-white hover:bg-blue-500"
              >
                Start Free Trial
              </Link>
              <a
                href="https://digitalgate.com.au/beta/"
                className="rounded-full border border-slate-600 px-6 py-3 font-semibold text-slate-200 hover:border-slate-500"
              >
                Become a Founding Customer
              </a>
              <Link
                href={AUTH_SIGN_IN_URL}
                className="rounded-full border border-slate-600 px-6 py-3 font-semibold text-slate-200 hover:border-slate-500"
              >
                Log in
              </Link>
            </>
          )}
          <Link
            href="/signup"
            className="rounded-full border border-slate-600 px-6 py-3 font-semibold text-slate-200 hover:border-slate-500"
          >
            Choose plan & apps
          </Link>
        </div>
      </main>
    </div>
  );
}

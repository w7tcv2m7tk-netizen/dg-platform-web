import Link from "next/link";
import { currentUser } from "@clerk/nextjs/server";
import { resolvePlatformSession } from "@dg/platform-core";

import { fetchPortalMe } from "@/lib/dg-api";

export default async function CommercePaymentsPage() {
  const user = await currentUser();
  const email = user?.primaryEmailAddress?.emailAddress ?? "";
  const name =
    user?.fullName ??
    [user?.firstName, user?.lastName].filter(Boolean).join(" ") ??
    email;

  const portal = email ? await fetchPortalMe(email, user?.id) : null;
  const session = user?.id
    ? await resolvePlatformSession({
        clerkUserId: user.id,
        email,
        name,
        orgName: portal?.org_name,
      })
    : null;

  return (
    <>
      <header className="border-b border-slate-800 px-8 py-5">
        <Link
          href="/apps/commerce"
          className="text-sm text-blue-400 hover:underline"
        >
          ← Commerce
        </Link>
        <h1 className="mt-2 text-2xl font-bold text-white">Payments</h1>
        <p className="text-sm text-slate-400">
          Payment requests are created from app workflows (e.g. vendor leads)
        </p>
      </header>
      <main className="flex-1 p-8">
        <div className="dg-card max-w-2xl">
          <p className="text-slate-300">
            Stripe checkout links are issued per lead or invoice. Open a vendor
            lead to request marketing contribution, or use the payment requests
            API for custom flows.
          </p>
          {session ? (
            <Link
              href="/apps/re/vendor-leads"
              className="mt-4 inline-block rounded-full bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-500"
            >
              Vendor leads →
            </Link>
          ) : (
            <p className="mt-4 text-sm text-slate-500">Sign in to manage payments.</p>
          )}
        </div>
      </main>
    </>
  );
}

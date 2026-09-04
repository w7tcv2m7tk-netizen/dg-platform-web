import Link from "next/link";

import { getPlatformOperatorContext } from "@/lib/platform-operator";

export default async function CommandLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const operator = await getPlatformOperatorContext();

  if (!operator) {
    return (
      <>
        <header className="dg-page-header">
          <h1 className="text-2xl font-bold text-white">Command Centre</h1>
          <p className="mt-1 text-sm text-slate-400">
            Internal to authorised DigitalGate platform operators only.
          </p>
        </header>
        <main className="dg-page-main">
          <div className="max-w-lg rounded-xl border border-amber-500/30 bg-amber-500/5 px-5 py-5 text-sm text-amber-50">
            <p className="font-medium text-white">Platform operator access required</p>
            <p className="mt-2 text-amber-100/90">
              Command Centre is the DigitalGate operator control plane. Switch to an authorised
              DigitalGate operator context, then reopen Command Centre from the sidebar.
            </p>
            <Link href="/dashboard" className="mt-4 inline-block text-sky-400 hover:underline">
              ← Back to dashboard
            </Link>
          </div>
        </main>
      </>
    );
  }

  return children;
}

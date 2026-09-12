import Link from "next/link";

import { ConnectedServicesCatalog } from "@/components/settings/ConnectedServicesCatalog";
import { getPlatformPageContext } from "@/lib/platform-page-context";

export default async function ConnectedServicesPage({
  searchParams,
}: {
  searchParams: Promise<{ google?: string; message?: string }>;
}) {
  const { google: googleFlash, message: flashMessage } = await searchParams;
  const { session } = await getPlatformPageContext();

  if (!session?.organisationId) {
    return (
      <>
        <header className="dg-page-header">
          <h1 className="text-2xl font-bold text-white">Connected Services</h1>
        </header>
        <main className="dg-page-main">
          <p className="text-sm text-slate-500">Sign in to continue.</p>
        </main>
      </>
    );
  }

  return (
    <>
      <header className="dg-page-header">
        <Link href="/dashboard/settings" className="text-sm text-sky-400 hover:underline">
          ← Settings
        </Link>
        <h1 className="mt-2 text-2xl font-bold text-white">Connect your business</h1>
        <p className="mt-1 text-sm text-slate-400">
          Connect the systems you already use. DigitalGate brings them together so{" "}
          {session.organisationName} can operate as one connected system.
        </p>
      </header>
      <main className="dg-page-main max-w-2xl space-y-6">
        {googleFlash === "connected" ? (
          <p className="rounded-xl border border-emerald-800/50 bg-emerald-950/20 px-4 py-3 text-sm text-emerald-100">
            Google Business Profile connected. Sync locations from advanced Connectors if
            reviews or listings look empty.
          </p>
        ) : null}
        {googleFlash === "error" ? (
          <p className="rounded-xl border border-amber-800/50 bg-amber-950/20 px-4 py-3 text-sm text-amber-100">
            Google connect failed{flashMessage ? `: ${flashMessage}` : " — try again."}
          </p>
        ) : null}
        <ConnectedServicesCatalog />
        <p className="text-xs text-slate-500">
          Platform diagnostics and OAuth scopes stay under{" "}
          <Link href="/dashboard/settings/connectors" className="text-sky-400 hover:underline">
            advanced Connectors
          </Link>{" "}
          (operator view) — customers connect the business here, not APIs.
        </p>
      </main>
    </>
  );
}

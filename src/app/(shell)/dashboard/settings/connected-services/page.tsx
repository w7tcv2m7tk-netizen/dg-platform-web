import Link from "next/link";

import { ConnectedServicesCatalog } from "@/components/settings/ConnectedServicesCatalog";
import { getPlatformPageContext } from "@/lib/platform-page-context";

export default async function ConnectedServicesPage() {
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

import Link from "next/link";
import { currentUser } from "@clerk/nextjs/server";
import { getPlatformApiCatalog, resolvePlatformSession } from "@dg/platform-core";

import { PlatformApiKeysPanel } from "@/components/platform/PlatformApiKeysPanel";
import { fetchPortalMe } from "@/lib/dg-api";

export default async function PlatformApiSettingsPage() {
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

  const catalog = getPlatformApiCatalog();
  const baseUrl = catalog.baseUrl;

  return (
    <>
      <header className="border-b border-slate-800 px-8 py-5">
        <Link href="/dashboard/settings" className="text-sm text-blue-400 hover:underline">
          ← Settings
        </Link>
        <h1 className="mt-2 text-2xl font-bold text-white">Platform API</h1>
        <p className="text-sm text-slate-400">
          REST API for integrations, automations, and connectors
        </p>
      </header>
      <main className="flex-1 space-y-8 p-8">
        <div className="dg-card">
          <h2 className="font-semibold text-white">Base URL</h2>
          <p className="mt-2 font-mono text-sm text-blue-300">{baseUrl}/api/v1</p>
          <p className="mt-3 text-sm text-slate-400">
            Authenticate with{" "}
            <code className="text-slate-300">X-API-Key: dg_live_…</code> or{" "}
            <code className="text-slate-300">Authorization: Bearer dg_live_…</code>
          </p>
        </div>

        <div className="dg-card">
          <h2 className="font-semibold text-white">API keys</h2>
          <p className="mt-2 text-sm text-slate-400">
            Create keys for server-to-server access scoped to{" "}
            {session?.organisationName ?? "your organisation"}.
          </p>
          <div className="mt-4">
            {session ? (
              <PlatformApiKeysPanel />
            ) : (
              <p className="text-sm text-amber-300">Database session required to manage keys.</p>
            )}
          </div>
        </div>

        <div className="dg-card">
          <h2 className="font-semibold text-white">Quick start</h2>
          <pre className="mt-4 overflow-x-auto rounded-lg bg-slate-950 p-4 text-xs text-slate-300">
{`curl -s "${baseUrl}/api/v1/contacts?limit=5" \\
  -H "X-API-Key: dg_live_YOUR_KEY"`}
          </pre>
          <p className="mt-4 text-sm text-slate-400">
            Discover endpoints:{" "}
            <code className="text-slate-300">GET {baseUrl}/api/v1/platform</code>
          </p>
        </div>

        <div className="dg-card">
          <h2 className="font-semibold text-white">Available endpoints</h2>
          <ul className="mt-4 max-h-96 space-y-2 overflow-y-auto text-sm">
            {catalog.endpoints.map((ep) => (
              <li key={`${ep.method}-${ep.path}`} className="flex gap-3 border-b border-slate-800/50 pb-2">
                <span className="w-14 shrink-0 font-mono text-xs text-blue-400">{ep.method}</span>
                <span className="min-w-0 flex-1 font-mono text-xs text-slate-300">{ep.path}</span>
                <span className="hidden text-slate-500 sm:inline">{ep.description}</span>
              </li>
            ))}
          </ul>
        </div>
      </main>
    </>
  );
}

import Link from "next/link";
import { currentUser } from "@clerk/nextjs/server";
import { listAuditLogs, resolvePlatformSession } from "@dg/platform-core";

export default async function AuditLogPage() {
  const user = await currentUser();
  const email = user?.primaryEmailAddress?.emailAddress ?? "";
  const name =
    user?.fullName ??
    [user?.firstName, user?.lastName].filter(Boolean).join(" ") ??
    email;

  const session = user?.id
    ? await resolvePlatformSession({ clerkUserId: user.id, email, name })
    : null;

  const logs = session
    ? await listAuditLogs({ organisationId: session.organisationId, limit: 100 })
    : null;

  return (
    <>
      <header className="dg-page-header">
        <Link href="/dashboard/settings" className="text-sm text-blue-400 hover:underline">
          ← Settings
        </Link>
        <h1 className="mt-2 text-2xl font-bold text-white">Audit log</h1>
        <p className="text-sm text-slate-400">
          Immutable record of creates, updates, and exports in your organisation
        </p>
      </header>
      <main className="dg-page-main">
        <div className="dg-card overflow-x-auto">
          {!session || !logs ? (
            <p className="text-sm text-slate-400">Sign in with DATABASE_URL configured to view audit logs.</p>
          ) : logs.items.length === 0 ? (
            <p className="text-sm text-slate-400">No audit entries yet.</p>
          ) : (
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-slate-800 text-slate-500">
                  <th className="py-2 pr-4 font-medium">When</th>
                  <th className="py-2 pr-4 font-medium">Action</th>
                  <th className="py-2 pr-4 font-medium">Entity</th>
                  <th className="py-2 font-medium">Actor</th>
                </tr>
              </thead>
              <tbody>
                {logs.items.map((log) => (
                  <tr key={log.id} className="border-b border-slate-800/60">
                    <td className="py-3 pr-4 text-slate-400">
                      {new Date(log.occurredAt).toLocaleString("en-AU")}
                    </td>
                    <td className="py-3 pr-4 capitalize text-slate-300">{log.action}</td>
                    <td className="py-3 pr-4 text-white">
                      {log.entityType}
                      <span className="ml-1 font-mono text-xs text-slate-500">
                        {log.entityId.slice(0, 8)}…
                      </span>
                    </td>
                    <td className="py-3 text-slate-400">{log.actorId ?? "system"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </main>
    </>
  );
}

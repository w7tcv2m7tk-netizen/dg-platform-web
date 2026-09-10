import Link from "next/link";
import { notFound } from "next/navigation";
import {
  buildAccessContext,
  hasPermission,
  listAuditLogs,
  type PlatformSession,
} from "@dg/platform-core";

import { getPlatformPageContext } from "@/lib/platform-page-context";

function sessionCanViewOrgAudit(session: PlatformSession): boolean {
  if (session.clerkUserId.startsWith("api_key:")) return false;
  if (["owner", "admin"].includes(session.role)) return true;
  const ctx = buildAccessContext({
    role: session.role,
    organisationId: session.organisationId,
    principalId: session.clerkUserId,
    enabledAppIds: [],
    grants: session.permissionGrants,
  });
  return hasPermission(ctx, {
    module: "team",
    action: "manage",
    scope: "organisation",
  });
}

export default async function AuditLogPage() {
  const { session } = await getPlatformPageContext();
  if (!session || !sessionCanViewOrgAudit(session)) notFound();

  const logs = await listAuditLogs({
    organisationId: session.organisationId,
    limit: 100,
  });

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
          {logs.items.length === 0 ? (
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

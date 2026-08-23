import Link from "next/link";
import { redirect } from "next/navigation";
import {
  canAccessCommandCentre,
  getPlatformAlertsCentre,
  isDigitalGateStaffEmail,
  listOpenSupportConversations,
} from "@dg/platform-core";

import { OperatorCategoryHeader } from "@/components/command/OperatorCategoryHeader";
import { OperatorMetricStrip } from "@/components/command/OperatorMetricStrip";
import { getPlatformPageContext } from "@/lib/platform-page-context";

function isStaffAccess(
  session: {
    organisationId: string;
    organisationName?: string;
    organisationSlug?: string;
    role?: string;
  } | null,
  email: string,
): boolean {
  if (isDigitalGateStaffEmail(email)) return true;
  if (!session) return false;
  return canAccessCommandCentre({
    organisationId: session.organisationId,
    organisationName: session.organisationName,
    organisationSlug: session.organisationSlug,
    role: session.role,
  });
}

export default async function SupportTicketsPage() {
  const { clerkUserId, session, email } = await getPlatformPageContext();
  if (!clerkUserId) redirect("/login");
  if (!isStaffAccess(session, email)) redirect("/support");

  const conversations = process.env.DATABASE_URL
    ? await listOpenSupportConversations({ limit: 50 })
    : [];

  return (
    <div className="space-y-6">
      <OperatorCategoryHeader
        eyebrow="Support"
        title="Tickets"
        question="Open support conversations across organisations — conversation queue, not a full ITSM."
        backHref="/support"
        backLabel="Support centre"
      />
      <OperatorMetricStrip
        metrics={[
          { label: "Open conversations", value: conversations.length, tone: "sky" },
        ]}
      />
      <p className="text-xs text-slate-500">
        Staff inbox over SupportConversation rows. Customers use chat at Support centre; this list
        is operator-only.
      </p>
      {conversations.length === 0 ? (
        <p className="text-sm text-slate-500">No open support conversations.</p>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-slate-700/80">
          <table className="min-w-full text-left text-sm">
            <thead className="border-b border-slate-800 text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-4 py-3 font-medium">Organisation</th>
                <th className="px-4 py-3 font-medium">User</th>
                <th className="px-4 py-3 font-medium">Messages</th>
                <th className="px-4 py-3 font-medium">Last message</th>
                <th className="px-4 py-3 font-medium">Flags</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {conversations.map((c) => (
                <tr key={c.id} className="hover:bg-slate-900/40">
                  <td className="px-4 py-3">
                    {c.organisationId ? (
                      <Link
                        href={`/command/clients/${c.organisationId}`}
                        className="font-medium text-white hover:text-sky-300"
                      >
                        {c.organisationName ?? c.organisationId}
                      </Link>
                    ) : (
                      <span className="text-slate-500">No org linked</span>
                    )}
                  </td>
                  <td className="px-4 py-3 font-mono text-xs text-slate-400">
                    {c.clerkUserId.slice(0, 12)}…
                  </td>
                  <td className="px-4 py-3 tabular-nums text-slate-300">{c.messageCount}</td>
                  <td className="px-4 py-3 text-slate-400">
                    {new Date(c.lastMessageAt).toLocaleString()}
                  </td>
                  <td className="px-4 py-3 text-slate-400">
                    {c.aiPaused ? <span className="text-amber-300">AI paused</span> : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <p className="text-sm text-slate-500">
        Customer chat UI:{" "}
        <Link href="/support" className="text-sky-400 hover:underline">
          Support centre
        </Link>
      </p>
    </div>
  );
}

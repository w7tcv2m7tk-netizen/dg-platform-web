import Link from "next/link";
import { redirect } from "next/navigation";
import {
  canAccessCommandCentre,
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
): boolean {
  // Email domain is not a platform-authority source: it is not the
  // server-controlled signal the authority model is built on, and this gate
  // exposes cross-tenant support conversations. Route through the same check
  // the Command Centre APIs use.
  if (!session) return false;
  return canAccessCommandCentre({
    organisationId: session.organisationId,
    organisationName: session.organisationName,
    organisationSlug: session.organisationSlug,
    role: session.role,
  });
}

export default async function SupportTicketsPage({
  searchParams,
}: {
  searchParams?: Promise<{
    org?: string;
    status?: string;
    q?: string;
    ai?: string;
  }>;
}) {
  const { clerkUserId, session } = await getPlatformPageContext();
  if (!clerkUserId) redirect("/login");
  if (!isStaffAccess(session)) redirect("/support");

  const params = searchParams ? await searchParams : {};
  const statusRaw = params.status ?? "open";
  const status =
    statusRaw === "all" || statusRaw === "resolved" || statusRaw === "open"
      ? statusRaw
      : "open";
  const organisationId = params.org?.trim() || undefined;
  const q = params.q?.trim() || undefined;
  const aiPausedOnly = params.ai === "paused";

  const db = Boolean(process.env.DATABASE_URL);
  const conversations = db
    ? await listOpenSupportConversations({
        limit: 100,
        status,
        organisationId,
        q,
        aiPausedOnly,
      })
    : null;

  const orgOptions =
    conversations?.reduce<{ id: string; name: string; slug: string | null }[]>(
      (acc, c) => {
        if (!acc.some((o) => o.id === c.organisationId)) {
          acc.push({
            id: c.organisationId,
            name: c.organisationName ?? c.organisationId,
            slug: c.organisationSlug,
          });
        }
        return acc;
      },
      [],
    ) ?? [];

  return (
    <>
      <header className="dg-page-header">
        <OperatorCategoryHeader
          eyebrow="Support"
          title="Support Conversations"
          question="Operator inbox across customer organisations — every thread is permanently owned by its originating org."
          backHref="/support"
          backLabel="Support centre"
        />
      </header>
      <main className="dg-page-main space-y-6">
        {conversations !== null ? (
          <OperatorMetricStrip
            metrics={[
              {
                label: status === "all" ? "Conversations" : `${status} conversations`,
                value: conversations.length,
                tone: "sky",
              },
            ]}
          />
        ) : (
          <p className="text-sm text-slate-500">
            Queue metrics unavailable without a database connection.
          </p>
        )}

        <form className="flex flex-wrap items-end gap-3 rounded-xl border border-slate-700/80 bg-slate-900/40 p-4">
          <label className="text-xs text-slate-400">
            Status
            <select
              name="status"
              defaultValue={status}
              className="mt-1 block rounded-lg border border-slate-600 bg-slate-950 px-3 py-2 text-sm text-white"
            >
              <option value="open">Open</option>
              <option value="resolved">Resolved</option>
              <option value="all">All</option>
            </select>
          </label>
          <label className="text-xs text-slate-400">
            Organisation
            <select
              name="org"
              defaultValue={organisationId ?? ""}
              className="mt-1 block min-w-[14rem] rounded-lg border border-slate-600 bg-slate-950 px-3 py-2 text-sm text-white"
            >
              <option value="">All organisations</option>
              {orgOptions.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.name}
                  {o.slug ? ` (${o.slug})` : ""}
                </option>
              ))}
            </select>
          </label>
          <label className="text-xs text-slate-400">
            Search
            <input
              name="q"
              defaultValue={q ?? ""}
              placeholder="Org, contact, message…"
              className="mt-1 block min-w-[14rem] rounded-lg border border-slate-600 bg-slate-950 px-3 py-2 text-sm text-white"
            />
          </label>
          <label className="flex items-center gap-2 text-xs text-slate-300">
            <input
              type="checkbox"
              name="ai"
              value="paused"
              defaultChecked={aiPausedOnly}
              className="rounded border-slate-600"
            />
            AI paused / needs human
          </label>
          <button
            type="submit"
            className="rounded-lg bg-sky-600 px-4 py-2 text-sm font-medium text-white hover:bg-sky-500"
          >
            Filter
          </button>
        </form>

        <p className="text-xs text-slate-500">
          Customer chat is tenant-isolated by organisation. This list is DigitalGate operator-only —
          never infer org from the active operator tenant.
        </p>

        {conversations === null ? null : conversations.length === 0 ? (
          <p className="text-sm text-slate-500">No matching support conversations.</p>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-slate-700/80">
            <table className="min-w-full text-left text-sm">
              <thead className="border-b border-slate-800 text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-4 py-3 font-medium">Organisation</th>
                  <th className="px-4 py-3 font-medium">Contact</th>
                  <th className="px-4 py-3 font-medium">Last message</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium">Updated</th>
                  <th className="px-4 py-3 font-medium">Flags</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {conversations.map((c) => (
                  <tr key={c.id} className="hover:bg-slate-900/40">
                    <td className="px-4 py-3 align-top">
                      <Link
                        href={`/command/clients/${c.organisationId}`}
                        className="font-medium text-white hover:text-sky-300"
                      >
                        {c.organisationName ?? c.organisationId}
                      </Link>
                      {c.organisationSlug ? (
                        <p className="font-mono text-xs text-slate-500">{c.organisationSlug}</p>
                      ) : null}
                    </td>
                    <td className="px-4 py-3 align-top">
                      <p className="text-slate-200">{c.contactName ?? "—"}</p>
                      {c.contactEmail ? (
                        <p className="text-xs text-slate-500">{c.contactEmail}</p>
                      ) : (
                        <p className="font-mono text-xs text-slate-500">
                          {c.clerkUserId.slice(0, 14)}…
                        </p>
                      )}
                    </td>
                    <td className="px-4 py-3 align-top text-slate-300">
                      {c.lastMessagePreview ? (
                        <>
                          <p className="line-clamp-2">{c.lastMessagePreview}</p>
                          <p className="mt-1 text-xs uppercase tracking-wide text-slate-500">
                            {c.lastMessageRole ?? "—"} · {c.messageCount} msgs
                          </p>
                        </>
                      ) : (
                        <span className="text-slate-500">{c.messageCount} messages</span>
                      )}
                    </td>
                    <td className="px-4 py-3 align-top capitalize text-slate-300">{c.status}</td>
                    <td className="px-4 py-3 align-top text-slate-400">
                      {new Date(c.lastMessageAt).toLocaleString()}
                    </td>
                    <td className="px-4 py-3 align-top text-slate-400">
                      {c.aiPaused ? <span className="text-amber-300">AI paused</span> : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <p className="text-sm text-slate-500">
          Customer chat:{" "}
          <Link href="/support" className="text-sky-400 hover:underline">
            Support centre
          </Link>
          {" · "}
          <Link href="/support/escalations" className="text-sky-400 hover:underline">
            Escalations
          </Link>
        </p>
      </main>
    </>
  );
}

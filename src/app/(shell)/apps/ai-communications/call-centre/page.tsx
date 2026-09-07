import Link from "next/link";
import { notFound } from "next/navigation";
import { listCommunicationAgents, listCommunicationSessions } from "@dg/platform-core";

import { getAuthorisedPlatformPageSession } from "@/lib/platform-page-feature";

function formatDate(iso: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });
}

function formatDuration(seconds: number | null) {
  if (!seconds) return "—";
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

export default async function CallCentrePage({
  searchParams,
}: {
  searchParams: Promise<{
    agentId?: string;
    status?: string;
    direction?: string;
    outcome?: string;
    from?: string;
  }>;
}) {
  const session = await getAuthorisedPlatformPageSession("comms.call_centre.read");
  if (!session) notFound();

  const filters = await searchParams;
  const [agents, result] = await Promise.all([
    listCommunicationAgents(session.organisationId),
    listCommunicationSessions({
      organisationId: session.organisationId,
      agentId: filters.agentId,
      status: filters.status,
      direction: filters.direction,
      outcome: filters.outcome,
      from: filters.from ? new Date(filters.from) : undefined,
      limit: 50,
    }),
  ]);

  return (
    <>
      <header className="dg-page-header">
        <h1 className="text-2xl font-bold text-white">Call Centre</h1>
        <p className="text-sm text-slate-400">
          {session.organisationName} · operational control for AI communications
        </p>
      </header>
      <main className="dg-page-main space-y-6">
        <form className="dg-card grid gap-3 sm:grid-cols-2 lg:grid-cols-5" method="get">
          <label className="text-sm text-slate-400">
            Agent
            <select name="agentId" defaultValue={filters.agentId ?? ""} className="dg-input mt-1">
              <option value="">All</option>
              {agents.map((agent) => (
                <option key={agent.id} value={agent.id}>
                  {agent.name}
                </option>
              ))}
            </select>
          </label>
          <label className="text-sm text-slate-400">
            Status
            <select name="status" defaultValue={filters.status ?? ""} className="dg-input mt-1">
              <option value="">All</option>
              {["in_progress", "completed", "missed", "failed", "transferred"].map((value) => (
                <option key={value} value={value}>
                  {value}
                </option>
              ))}
            </select>
          </label>
          <label className="text-sm text-slate-400">
            Direction
            <select name="direction" defaultValue={filters.direction ?? ""} className="dg-input mt-1">
              <option value="">All</option>
              <option value="inbound">Inbound</option>
              <option value="outbound">Outbound</option>
            </select>
          </label>
          <label className="text-sm text-slate-400">
            Outcome
            <select name="outcome" defaultValue={filters.outcome ?? ""} className="dg-input mt-1">
              <option value="">All</option>
              {[
                "information_request",
                "lead",
                "appointment_booked",
                "follow_up_required",
                "transferred",
                "not_interested",
                "existing_customer",
                "support_issue",
              ].map((value) => (
                <option key={value} value={value}>
                  {value.replace(/_/g, " ")}
                </option>
              ))}
            </select>
          </label>
          <div className="flex items-end">
            <button type="submit" className="rounded-lg bg-slate-800 px-4 py-2 text-sm text-white">
              Filter
            </button>
          </div>
        </form>

        <div className="dg-card overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-800 text-left text-slate-500">
                <th className="pb-2 pr-3">When</th>
                <th className="pb-2 pr-3">Agent</th>
                <th className="pb-2 pr-3">Direction</th>
                <th className="pb-2 pr-3">Status</th>
                <th className="pb-2 pr-3">Outcome</th>
                <th className="pb-2">Duration</th>
              </tr>
            </thead>
            <tbody>
              {!result.items.length ? (
                <tr>
                  <td colSpan={6} className="py-6 text-slate-500">
                    No calls yet. Publish an agent and complete a conversation to populate this list.
                  </td>
                </tr>
              ) : (
                result.items.map((row) => (
                  <tr key={row.id} className="border-b border-slate-800/60">
                    <td className="py-3 pr-3">
                      <Link
                        href={`/apps/ai-communications/call-centre/${row.id}`}
                        className="text-sky-400 hover:underline"
                      >
                        {formatDate(row.startedAt ?? row.createdAt)}
                      </Link>
                    </td>
                    <td className="py-3 pr-3 text-white">{row.agentName ?? "—"}</td>
                    <td className="py-3 pr-3 text-slate-300">{row.direction}</td>
                    <td className="py-3 pr-3 text-slate-300">{row.status}</td>
                    <td className="py-3 pr-3 text-slate-300">
                      {(row.outcome ?? "—").replace(/_/g, " ")}
                    </td>
                    <td className="py-3 text-slate-300">{formatDuration(row.durationSeconds)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </main>
    </>
  );
}

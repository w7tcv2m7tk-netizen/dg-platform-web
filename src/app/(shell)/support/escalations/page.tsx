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

export default async function SupportEscalationsPage() {
  const { clerkUserId, session, email } = await getPlatformPageContext();
  if (!clerkUserId) redirect("/login");
  if (!isStaffAccess(session, email)) redirect("/support");

  const db = Boolean(process.env.DATABASE_URL);
  const [paused, alerts] = db
    ? await Promise.all([
        listOpenSupportConversations({ limit: 50, aiPausedOnly: true }),
        getPlatformAlertsCentre(),
      ])
    : [[], null];

  const customerAlerts = [
    ...(alerts?.critical ?? []),
    ...(alerts?.attention ?? []),
  ].filter((a) => a.category === "customer");

  return (
    <div className="space-y-6">
      <OperatorCategoryHeader
        eyebrow="Support"
        title="Escalations"
        question="AI-paused conversations and customer-category platform alerts — no invented SLA queue."
        backHref="/support"
        backLabel="Support centre"
      />
      <OperatorMetricStrip
        metrics={[
          { label: "AI paused chats", value: paused.length, tone: "amber" },
          {
            label: "Customer alerts",
            value: customerAlerts.length,
            tone: customerAlerts.length ? "amber" : "default",
          },
        ]}
      />

      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-white">AI paused conversations</h2>
        {paused.length === 0 ? (
          <p className="text-sm text-slate-500">No AI-paused conversations.</p>
        ) : (
          <ul className="divide-y divide-slate-800 rounded-xl border border-slate-700/80">
            {paused.map((c) => (
              <li key={c.id} className="flex flex-wrap justify-between gap-2 px-4 py-3">
                <div>
                  {c.organisationId ? (
                    <Link
                      href={`/command/clients/${c.organisationId}`}
                      className="font-medium text-white hover:text-sky-300"
                    >
                      {c.organisationName ?? c.organisationId}
                    </Link>
                  ) : (
                    <span className="text-slate-400">No org linked</span>
                  )}
                  <p className="text-xs text-slate-500">
                    {c.messageCount} messages · last{" "}
                    {new Date(c.lastMessageAt).toLocaleString()}
                  </p>
                </div>
                <span className="text-xs text-amber-300">Needs human</span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-white">Customer platform alerts</h2>
        {customerAlerts.length === 0 ? (
          <p className="text-sm text-slate-500">No customer-category alerts right now.</p>
        ) : (
          <ul className="divide-y divide-slate-800 rounded-xl border border-slate-700/80">
            {customerAlerts.map((a) => (
              <li key={a.id} className="px-4 py-3">
                <Link href={a.href} className="font-medium text-white hover:text-sky-300">
                  {a.title}
                </Link>
                <p className="mt-0.5 text-sm text-slate-400">{a.message}</p>
                {a.organisationName ? (
                  <p className="mt-1 text-xs text-slate-500">{a.organisationName}</p>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </section>

      <p className="text-sm text-slate-500">
        Full alert centre:{" "}
        <Link href="/command/platform-health" className="text-sky-400 hover:underline">
          Platform health
        </Link>
        {" · "}
        <Link href="/support/tickets" className="text-sky-400 hover:underline">
          All open tickets
        </Link>
      </p>
    </div>
  );
}

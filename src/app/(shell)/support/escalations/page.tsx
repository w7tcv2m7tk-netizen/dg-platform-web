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
  // Support access is a protected server-side boundary — authority comes only
  // from the platform allowlist / dg:staff (canAccessCommandCentre), never from
  // an email domain (C-2: tenant-controlled identity cannot grant authority).
  if (!session) return false;
  return canAccessCommandCentre({
    organisationId: session.organisationId,
    organisationName: session.organisationName,
    organisationSlug: session.organisationSlug,
    role: session.role,
  });
}

export default async function SupportEscalationsPage() {
  const { clerkUserId, session } = await getPlatformPageContext();
  if (!clerkUserId) redirect("/login");
  if (!isStaffAccess(session)) redirect("/support");

  const db = Boolean(process.env.DATABASE_URL);
  const paused = db
    ? await listOpenSupportConversations({ limit: 50, aiPausedOnly: true })
    : null;

  return (
    <>
      <header className="dg-page-header">
        <OperatorCategoryHeader
          eyebrow="Support"
          title="Escalations"
          question="Customer support escalations — Assist paused and needs a human. Not Customer Intelligence or Platform Intelligence."
          backHref="/support"
          backLabel="Support centre"
        />
      </header>
      <main className="dg-page-main space-y-6">
        {paused !== null ? (
          <OperatorMetricStrip
            metrics={[
              {
                label: "Needs human",
                value: paused.length,
                tone: paused.length ? "amber" : "default",
              },
            ]}
          />
        ) : (
          <p className="text-sm text-slate-500">
            Escalation metrics unavailable without a database connection.
          </p>
        )}

        <section className="space-y-3">
          <h2 className="text-lg font-semibold text-white">Assist requires human</h2>
          <p className="text-sm text-slate-400">
            Conversations where DigitalGate Assist paused itself. Pick these up in chat or by
            email — no invented SLA timers.
          </p>
          {paused === null ? null : paused.length === 0 ? (
            <p className="text-sm text-slate-500">No AI-paused conversations right now.</p>
          ) : (
            <ul className="divide-y divide-slate-800 rounded-xl border border-slate-700/80">
              {paused.map((c) => (
                <li key={c.id} className="flex flex-wrap justify-between gap-2 px-4 py-3">
                  <div>
                    <Link
                      href={`/command/clients/${c.organisationId}`}
                      className="font-medium text-white hover:text-sky-300"
                    >
                      {c.organisationName ?? c.organisationId}
                    </Link>
                    {c.organisationSlug ? (
                      <p className="font-mono text-xs text-slate-500">{c.organisationSlug}</p>
                    ) : null}
                    {c.contactName || c.contactEmail ? (
                      <p className="text-xs text-slate-400">
                        {[c.contactName, c.contactEmail].filter(Boolean).join(" · ")}
                      </p>
                    ) : null}
                    {c.lastMessagePreview ? (
                      <p className="mt-1 line-clamp-2 text-sm text-slate-300">
                        {c.lastMessagePreview}
                      </p>
                    ) : null}
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

        <p className="text-sm text-slate-500">
          Platform / customer signal alerts live under{" "}
          <Link href="/command/platform-intelligence/overview" className="text-sky-400 hover:underline">
            Platform Intelligence
          </Link>
          {" · "}
          <Link href="/support/tickets" className="text-sky-400 hover:underline">
            All support conversations
          </Link>
        </p>
      </main>
    </>
  );
}

import Link from "next/link";
import {
  getOrgGoogleGmailConnectorTokens,
  hourInTimeZone,
  listOrgCommunications,
  summarizeOrgCommunications,
} from "@dg/platform-core";

import { CommunicationsSubnav } from "@/components/communications/CommunicationsList";
import { getPlatformPageContext } from "@/lib/platform-page-context";

function greeting(hour: number, name: string) {
  const first = name.trim().split(/\s+/)[0] || "there";
  if (hour < 12) return `Good morning, ${first}`;
  if (hour < 17) return `Good afternoon, ${first}`;
  return `Good evening, ${first}`;
}

function sourceLabel(source: string) {
  if (source === "mailbox") return "mailbox";
  if (source === "automation") return "automation";
  if (source === "system") return "system";
  if (source === "ai_assist") return "AI assist";
  if (source === "manual") return "manual";
  return source;
}

export default async function CommunicationsOverviewPage() {
  const { session } = await getPlatformPageContext();

  if (!session?.organisationId) {
    return (
      <>
        <header className="dg-page-header">
          <h1 className="text-2xl font-bold text-white">Communications</h1>
        </header>
        <main className="dg-page-main">
          <p className="text-sm text-slate-500">Sign in to continue.</p>
        </main>
      </>
    );
  }

  const hour = hourInTimeZone(new Date(), "Australia/Brisbane");
  const displayName = session.name || session.email || "there";

  const [summary, inbound, recent, gmailTokens] = process.env.DATABASE_URL
    ? await Promise.all([
        summarizeOrgCommunications(session.organisationId),
        listOrgCommunications({
          organisationId: session.organisationId,
          channel: "email",
          direction: "inbound",
          limit: 5,
        }),
        listOrgCommunications({
          organisationId: session.organisationId,
          limit: 8,
        }),
        getOrgGoogleGmailConnectorTokens(session.organisationId),
      ])
    : [
        {
          total: 0,
          byChannel: {} as Record<string, number>,
          byStatus: {} as Record<string, number>,
          bySource: {} as Record<string, number>,
        },
        [],
        [],
        null,
      ];

  const gmailConnected = Boolean(gmailTokens?.accessToken || gmailTokens?.refreshToken);
  const failed = summary.byStatus.failed ?? 0;
  const scheduled = summary.byStatus.scheduled ?? 0;
  const inboundCount = inbound.length;
  const automatedToday = summary.bySource.automation ?? 0;
  const systemCount = summary.bySource.system ?? 0;

  const attention: Array<{ label: string; href: string }> = [];
  if (!gmailConnected) {
    attention.push({
      label: "Mailbox not connected — connect Google Workspace to sync inbox",
      href: "/dashboard/settings/connected-services",
    });
  }
  if (failed > 0) {
    attention.push({
      label: `${failed} failed email deliver${failed === 1 ? "y" : "ies"}`,
      href: "/apps/communications/history?filter=email",
    });
  }
  if (scheduled > 0) {
    attention.push({
      label: `${scheduled} email${scheduled === 1 ? "" : "s"} scheduled`,
      href: "/apps/communications/scheduled",
    });
  }
  if (inboundCount > 0) {
    attention.push({
      label: `${inboundCount} recent inbound message${inboundCount === 1 ? "" : "s"}`,
      href: "/apps/communications/inbox",
    });
  }
  if (automatedToday + systemCount > 0) {
    attention.push({
      label: `${automatedToday + systemCount} automated / system communication${automatedToday + systemCount === 1 ? "" : "s"} recorded`,
      href: "/apps/communications/history?filter=system",
    });
  }

  return (
    <>
      <header className="dg-page-header">
        <h1 className="text-2xl font-bold text-white">Communications</h1>
        <p className="mt-1 text-lg text-slate-200">{greeting(hour, displayName)}</p>
        <p className="mt-1 text-sm text-slate-400">
          Who you contacted, what was said, why it was sent, and what happens next — for{" "}
          {session.organisationName}.
        </p>
      </header>
      <main className="dg-page-main space-y-8">
        <CommunicationsSubnav active="" />

        <section className="max-w-2xl">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
            Needs attention
          </h2>
          {attention.length === 0 ? (
            <p className="mt-3 text-sm text-slate-400">Nothing needs attention right now.</p>
          ) : (
            <ul className="mt-3 space-y-2">
              {attention.map((item) => (
                <li key={item.label}>
                  <Link
                    href={item.href}
                    className="block rounded-lg border border-slate-700/70 bg-slate-950/40 px-4 py-3 text-sm text-slate-200 hover:border-sky-500/40"
                  >
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="max-w-2xl">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
              Inbox
            </h2>
            <Link href="/apps/communications/inbox" className="text-xs text-sky-400 hover:underline">
              View all →
            </Link>
          </div>
          {inbound.length === 0 ? (
            <p className="mt-3 text-sm text-slate-500">
              {gmailConnected
                ? "No inbound messages synced yet — run Sync on Mailboxes."
                : "Connect Google Workspace to sync inbound mail."}
            </p>
          ) : (
            <ul className="mt-3 divide-y divide-slate-800 border-t border-slate-800">
              {inbound.map((row) => (
                <li key={row.id} className="py-3">
                  <p className="text-sm font-medium text-white">
                    {row.fromAddress || "Unknown sender"}
                  </p>
                  <p className="mt-0.5 text-sm text-slate-400">
                    {row.subject || "(no subject)"}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="max-w-2xl">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
            Quick actions
          </h2>
          <div className="mt-3 flex flex-wrap gap-2">
            <Link
              href="/apps/communications/email"
              className="rounded-full bg-sky-600 px-4 py-2 text-xs font-semibold text-white hover:bg-sky-500"
            >
              + Email
            </Link>
            <Link
              href="/apps/communications/compose"
              className="rounded-full border border-slate-600 px-4 py-2 text-xs font-semibold text-slate-200 hover:border-slate-400"
              title="AI Assist drafts come next — open Compose with context for now"
            >
              ✦ Write with AI
            </Link>
            <Link
              href="/apps/communications/scheduled"
              className="rounded-full border border-slate-600 px-4 py-2 text-xs font-semibold text-slate-200 hover:border-slate-400"
            >
              Schedule
            </Link>
            <Link
              href="/apps/communications/calls"
              className="rounded-full border border-slate-600 px-4 py-2 text-xs font-semibold text-slate-200 hover:border-slate-400"
            >
              Calls
            </Link>
            <Link
              href="/apps/crm/timeline"
              className="rounded-full border border-slate-600 px-4 py-2 text-xs font-semibold text-slate-200 hover:border-slate-400"
            >
              Timeline
            </Link>
          </div>
        </section>

        <section className="max-w-2xl">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
              Recent activity
            </h2>
            <Link
              href="/apps/crm/timeline"
              className="text-xs text-sky-400 hover:underline"
            >
              CRM Timeline →
            </Link>
          </div>
          {recent.length === 0 ? (
            <p className="mt-3 text-sm text-slate-500">
              No communications yet.{" "}
              <Link href="/apps/communications/compose" className="text-sky-400 hover:underline">
                Compose an email
              </Link>
              .
            </p>
          ) : (
            <ul className="mt-3 space-y-2">
              {recent.map((row) => (
                <li
                  key={row.id}
                  className="rounded-lg border border-slate-800/80 px-3 py-2 text-sm text-slate-300"
                >
                  <span className="text-white">
                    {row.channel === "email" ? "Email" : row.channel}{" "}
                    {row.direction === "outbound" ? "sent" : "received"}
                  </span>
                  <span className="text-slate-500">
                    {" "}
                    — {sourceLabel(row.source)}
                    {row.status ? ` · ${row.status}` : ""}
                  </span>
                  <p className="mt-0.5 text-xs text-slate-500">
                    {row.subject || "(no subject)"}
                    {row.sentAt
                      ? ` · ${new Date(row.sentAt).toLocaleString("en-AU")}`
                      : ""}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </section>

        <p className="max-w-2xl text-xs text-slate-500">
          Write with AI lives under Communications (shared AI Service) — not a separate Growth
          product. Cross-business history stays on CRM → Timeline. Documents remain a separate Core
          capability.
        </p>
      </main>
    </>
  );
}

import Link from "next/link";

import { CommunicationsSubnav } from "@/components/communications/CommunicationsList";

/**
 * Email channel hub — send/manage email (not the Inbox attention surface).
 * Compose / Sent / Scheduled / Mailboxes remain deep routes under this channel.
 */
export default function CommunicationsEmailPage() {
  return (
    <>
      <header className="dg-page-header">
        <Link href="/apps/communications" className="text-sm text-sky-400 hover:underline">
          ← Communications
        </Link>
        <h1 className="mt-2 text-2xl font-bold text-white">Email</h1>
        <p className="mt-1 text-sm text-slate-400">
          Send and manage email. Inbox is for conversations that need attention — this is the email
          channel.
        </p>
      </header>
      <main className="dg-page-main space-y-6">
        <CommunicationsSubnav active="email" />
        <div className="flex flex-wrap gap-2">
          <Link
            href="/apps/communications/compose"
            className="rounded-full bg-sky-600 px-4 py-2 text-xs font-semibold text-white hover:bg-sky-500"
          >
            Compose
          </Link>
          <Link
            href="/apps/communications/compose"
            className="rounded-full border border-slate-600 px-4 py-2 text-xs font-semibold text-slate-200 hover:border-slate-400"
            title="AI Assist drafts come next"
          >
            ✦ Write with AI
          </Link>
          <Link
            href="/apps/communications/sent"
            className="rounded-full border border-slate-600 px-4 py-2 text-xs font-semibold text-slate-200 hover:border-slate-400"
          >
            Sent
          </Link>
          <Link
            href="/apps/communications/scheduled"
            className="rounded-full border border-slate-600 px-4 py-2 text-xs font-semibold text-slate-200 hover:border-slate-400"
          >
            Scheduled
          </Link>
          <Link
            href="/apps/communications/mailboxes"
            className="rounded-full border border-slate-600 px-4 py-2 text-xs font-semibold text-slate-200 hover:border-slate-400"
          >
            Mailboxes
          </Link>
          <Link
            href="/dashboard/settings/connected-services"
            className="rounded-full border border-slate-600 px-4 py-2 text-xs font-semibold text-slate-200 hover:border-slate-400"
          >
            Connected Services
          </Link>
        </div>
        <p className="max-w-xl text-xs text-slate-500">
          Google / Microsoft remain the authoritative mailboxes. DigitalGate records association,
          provenance, and next actions. Cross-business history lives on CRM → Timeline.
        </p>
      </main>
    </>
  );
}

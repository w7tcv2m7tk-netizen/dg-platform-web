import Link from "next/link";

import { CommunicationsSubnav } from "@/components/communications/CommunicationsList";
import { getPlatformPageContext } from "@/lib/platform-page-context";

export default async function CommunicationsMailboxesPage() {
  const { session } = await getPlatformPageContext();

  if (!session?.organisationId) {
    return (
      <>
        <header className="dg-page-header">
          <h1 className="text-2xl font-bold text-white">Mailboxes</h1>
        </header>
        <main className="dg-page-main">
          <p className="text-sm text-slate-500">Sign in to continue.</p>
        </main>
      </>
    );
  }

  return (
    <>
      <header className="dg-page-header">
        <Link href="/apps/communications" className="text-sm text-sky-400 hover:underline">
          ← Communications
        </Link>
        <h1 className="mt-2 text-2xl font-bold text-white">Mailboxes</h1>
        <p className="mt-1 text-sm text-slate-400">
          Connect Google Workspace / Microsoft 365 so DigitalGate can sync and send as your
          identity — without becoming the mailbox provider.
        </p>
      </header>
      <main className="dg-page-main space-y-6">
        <CommunicationsSubnav active="mailboxes" />
        <section className="max-w-lg space-y-3 rounded-lg border border-slate-800 p-4">
          <h2 className="text-sm font-medium text-white">Google Workspace / Gmail</h2>
          <p className="text-sm text-slate-400">
            OAuth connect for read inbox, send, sync sent, and associate with Contacts.
          </p>
          <p className="text-xs text-amber-400/90">Coming next — use Compose (Resend) for now.</p>
        </section>
        <section className="max-w-lg space-y-3 rounded-lg border border-slate-800 p-4">
          <h2 className="text-sm font-medium text-white">Microsoft 365 / Outlook</h2>
          <p className="text-sm text-slate-400">
            Same pattern via Microsoft Graph. Prioritised after Google.
          </p>
          <p className="text-xs text-amber-400/90">Coming next</p>
        </section>
        <p className="max-w-lg text-xs text-slate-500">
          Infrastructure → Email remains domain / DNS / mailbox provisioning. This screen is Core
          Communications — business mail orchestration. Until OAuth is live,{" "}
          <Link href="/apps/communications/inbox" className="text-sky-400 hover:underline">
            Inbox
          </Link>{" "}
          stays empty by design.
        </p>
      </main>
    </>
  );
}

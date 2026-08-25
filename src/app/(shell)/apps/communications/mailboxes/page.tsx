import Link from "next/link";

import { CommunicationsSubnav } from "@/components/communications/CommunicationsList";
import { GmailMailboxPanel } from "@/components/communications/GmailMailboxPanel";
import { IcloudMailboxPanel } from "@/components/communications/IcloudMailboxPanel";
import { MicrosoftMailboxPanel } from "@/components/communications/MicrosoftMailboxPanel";
import { getPlatformPageContext } from "@/lib/platform-page-context";

export default async function CommunicationsMailboxesPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { session } = await getPlatformPageContext();
  const params = (await searchParams) ?? {};
  const gmailRaw = typeof params.gmail === "string" ? params.gmail : null;
  const microsoftRaw = typeof params.microsoft === "string" ? params.microsoft : null;
  const gmailFlash =
    gmailRaw === "connected" ? "connected" : gmailRaw === "error" ? "error" : null;
  const microsoftFlash =
    microsoftRaw === "connected"
      ? "connected"
      : microsoftRaw === "error"
        ? "error"
        : null;
  const flashMessage =
    typeof params.message === "string" ? params.message : null;

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
          Connect Google Workspace, Microsoft 365, then Apple iCloud so DigitalGate can sync and
          associate mail — without becoming the mailbox provider.
        </p>
      </header>
      <main className="dg-page-main space-y-6">
        <CommunicationsSubnav active="email" />
        <GmailMailboxPanel flash={gmailFlash} flashMessage={gmailFlash ? flashMessage : null} />
        <MicrosoftMailboxPanel
          flash={microsoftFlash}
          flashMessage={microsoftFlash ? flashMessage : null}
        />
        <IcloudMailboxPanel />
        <p className="max-w-lg text-xs text-slate-500">
          Sequence: Google · Microsoft 365 · Apple iCloud. After connect, open{" "}
          <Link href="/apps/communications" className="text-sky-400 hover:underline">
            Inbox
          </Link>{" "}
          for synced messages.
        </p>
      </main>
    </>
  );
}

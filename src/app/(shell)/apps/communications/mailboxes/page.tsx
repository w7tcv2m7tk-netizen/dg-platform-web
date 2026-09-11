import Link from "next/link";
import { notFound } from "next/navigation";
import { buildAccessContext, hasPermission } from "@dg/platform-core";

import { GmailMailboxPanel } from "@/components/communications/GmailMailboxPanel";
import { IcloudMailboxPanel } from "@/components/communications/IcloudMailboxPanel";
import { MicrosoftMailboxPanel } from "@/components/communications/MicrosoftMailboxPanel";
import { getAuthorisedPlatformPageSession } from "@/lib/platform-page-feature";

export default async function CommunicationsMailboxesPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const session = await getAuthorisedPlatformPageSession("communications.read");
  if (!session) notFound();

  const accessContext = buildAccessContext({
    role: session.role,
    organisationId: session.organisationId,
    principalId: session.clerkUserId,
    enabledAppIds: [],
    grants: session.permissionGrants,
  });
  const canManageMailboxes = hasPermission(accessContext, {
    module: "settings",
    action: "manage",
    scope: "organisation",
  });

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

  return (
    <>
      <header className="dg-page-header">
        <Link href="/apps/communications" className="text-sm text-sky-400 hover:underline">
          ← Communications
        </Link>
        <h1 className="mt-2 text-2xl font-bold text-white">Mailboxes</h1>
        <p className="mt-1 text-sm text-slate-400">
          Connect Google Workspace, Microsoft 365 or Apple iCloud so DigitalGate can sync and
          associate mail without becoming the mailbox provider.
        </p>
      </header>
      <main className="dg-page-main space-y-6">
        {!canManageMailboxes ? (
          <p className="max-w-lg text-sm text-slate-400">
            You can view mailbox connection and sync status. An organisation administrator manages
            mailbox connections.
          </p>
        ) : null}
        <GmailMailboxPanel flash={gmailFlash} canManage={canManageMailboxes} />
        <MicrosoftMailboxPanel flash={microsoftFlash} canManage={canManageMailboxes} />
        <IcloudMailboxPanel canManage={canManageMailboxes} />
        <p className="max-w-lg text-xs text-slate-500">
          After a mailbox is connected, open{" "}
          <Link href="/apps/communications/inbox" className="text-sky-400 hover:underline">
            Inbox
          </Link>{" "}
          for synced messages.
        </p>
      </main>
    </>
  );
}

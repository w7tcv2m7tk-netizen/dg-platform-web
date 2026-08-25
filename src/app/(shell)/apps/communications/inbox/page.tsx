import Link from "next/link";
import {
  getOrgGoogleGmailConnectorTokens,
  listOrgCommunications,
} from "@dg/platform-core";

import {
  CommunicationsList,
  CommunicationsSubnav,
} from "@/components/communications/CommunicationsList";
import { getPlatformPageContext } from "@/lib/platform-page-context";

export default async function CommunicationsInboxPage() {
  const { session } = await getPlatformPageContext();

  if (!session?.organisationId) {
    return (
      <>
        <header className="dg-page-header">
          <h1 className="text-2xl font-bold text-white">Inbox</h1>
        </header>
        <main className="dg-page-main">
          <p className="text-sm text-slate-500">Sign in to continue.</p>
        </main>
      </>
    );
  }

  const tokens = process.env.DATABASE_URL
    ? await getOrgGoogleGmailConnectorTokens(session.organisationId)
    : null;
  const connected = Boolean(tokens?.accessToken || tokens?.refreshToken);

  const rows =
    process.env.DATABASE_URL && connected
      ? await listOrgCommunications({
          organisationId: session.organisationId,
          channel: "email",
          direction: "inbound",
          limit: 100,
        })
      : [];

  return (
    <>
      <header className="dg-page-header">
        <Link href="/apps/communications" className="text-sm text-sky-400 hover:underline">
          ← Communications
        </Link>
        <h1 className="mt-2 text-2xl font-bold text-white">Inbox</h1>
        <p className="mt-1 text-sm text-slate-400">
          Inbound mail synced from connected Google Workspace / Gmail (and Microsoft later).
        </p>
      </header>
      <main className="dg-page-main space-y-6">
        <CommunicationsSubnav active="inbox" />
        {!connected ? (
          <div className="max-w-xl rounded-xl border border-dashed border-slate-700 px-6 py-10 text-sm text-slate-400">
            <p className="font-medium text-slate-200">Mailbox not connected</p>
            <p className="mt-2">
              DigitalGate does not host your inbox. Connect Google on Mailboxes so we can sync
              inbound messages and associate them with Contacts.
            </p>
            <Link
              href="/apps/communications/mailboxes"
              className="mt-6 inline-block rounded-md bg-sky-600 px-4 py-2 text-sm font-medium text-white hover:bg-sky-500"
            >
              Connect a mailbox
            </Link>
          </div>
        ) : (
          <CommunicationsList
            rows={rows}
            empty={
              <>
                Gmail is connected
                {tokens?.label ? ` (${tokens.label})` : ""}, but no inbound messages are synced
                yet. Run{" "}
                <Link
                  href="/apps/communications/mailboxes"
                  className="text-sky-400 hover:underline"
                >
                  Sync now
                </Link>{" "}
                on Mailboxes.
              </>
            }
          />
        )}
      </main>
    </>
  );
}

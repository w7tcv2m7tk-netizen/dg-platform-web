import Link from "next/link";
import { listOrganisationActivities } from "@dg/platform-core";

import { CommsSubnav } from "@/components/ai-communications/CommsSubnav";
import { getPlatformPageContext } from "@/lib/org-apps";

function isCommsActivity(item: { sourceApp: string | null; activityType: string }) {
  return (
    item.sourceApp === "communications" ||
    item.activityType.startsWith("email_") ||
    item.activityType.startsWith("message")
  );
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

export default async function CommsInboxPage() {
  const { session } = await getPlatformPageContext();

  let items: Awaited<ReturnType<typeof listOrganisationActivities>>["items"] = [];

  if (session) {
    const [general, commsSource] = await Promise.all([
      listOrganisationActivities({
        organisationId: session.organisationId,
        limit: 100,
      }),
      listOrganisationActivities({
        organisationId: session.organisationId,
        sourceApp: "communications",
        limit: 50,
      }),
    ]);

    const seen = new Set<string>();
    for (const item of [...commsSource.items, ...general.items]) {
      if (isCommsActivity(item) && !seen.has(item.id)) {
        seen.add(item.id);
        items.push(item);
      }
    }
    items.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    items = items.slice(0, 50);
  }

  return (
    <>
      <header className="dg-page-header">
        <h1 className="text-2xl font-bold text-white">Communications inbox</h1>
        <p className="text-sm text-slate-400">
          {session?.organisationName ?? "DigitalGate"} · outbound message activity
        </p>
        <CommsSubnav active="/apps/ai-communications/inbox" />
      </header>
      <main className="dg-page-main space-y-6">
        {!session ? (
          <div className="dg-card">
            <p className="text-sm text-slate-400">Sign in to view communications activity.</p>
          </div>
        ) : (
          <>
            <div className="dg-card">
              <h2 className="font-semibold text-white">Activity feed</h2>
              {!items.length ? (
                <p className="mt-3 text-sm text-slate-500">
                  Outbound email activity will appear here when messages are sent.
                </p>
              ) : (
                <ul className="mt-4 space-y-2">
                  {items.map((item) => (
                    <li
                      key={item.id}
                      className="rounded-lg border border-slate-800 px-3 py-2 text-sm"
                    >
                      <div className="flex flex-wrap items-baseline justify-between gap-2">
                        <p className="font-medium text-white">{item.title}</p>
                        <time className="text-xs text-slate-500">{formatDate(item.createdAt)}</time>
                      </div>
                      {item.body ? <p className="mt-1 text-slate-400">{item.body}</p> : null}
                      <p className="mt-1 text-xs text-slate-600">
                        {item.sourceApp ?? "platform"} · {item.activityType}
                      </p>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div className="dg-card border-blue-500/20">
              <h2 className="font-semibold text-white">Compose</h2>
              <p className="mt-2 text-sm text-slate-400">
                Compose UI is planned. Send outbound email via the Platform API{" "}
                <code className="text-slate-300">POST /api/v1/communications/messages</code> when
                wired, or trigger sends from automations.
              </p>
              <Link
                href="/dashboard/settings/api"
                className="mt-3 inline-block text-sm text-blue-400 hover:underline"
              >
                View API settings →
              </Link>
            </div>
          </>
        )}
      </main>
    </>
  );
}

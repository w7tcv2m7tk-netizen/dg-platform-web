import Link from "next/link";
import { listReviewRequestCandidates } from "@dg/platform-core";

import { QueueReviewRequestButton } from "@/components/reviews/QueueReviewRequestButton";
import { ReviewsSubnav } from "@/components/reviews/ReviewsSubnav";
import { loadReviewsSessionAndFeed } from "@/lib/reviews-feed";

export default async function ReviewsRequestsPage() {
  const { session } = await loadReviewsSessionAndFeed();
  const candidates = session
    ? await listReviewRequestCandidates(session.organisationId)
    : [];

  return (
    <>
      <header className="dg-page-header">
        <h1 className="text-2xl font-bold text-white">Review requests</h1>
        <p className="text-sm text-slate-400">
          After completed stays, RE settlements, or Services jobs — queue Activity on the Contact
          timeline (email/SMS delivery later)
        </p>
        <ReviewsSubnav active="/apps/reviews/requests" />
      </header>
      <main className="dg-page-main space-y-6">
        {!session ? (
          <div className="dg-card">
            <p className="text-sm text-slate-400">Sign in to see request candidates.</p>
          </div>
        ) : !candidates.length ? (
          <div className="rounded-xl border border-dashed border-slate-700 bg-slate-900/30 px-6 py-10 text-center">
            <p className="text-lg font-medium text-white">No completed jobs, stays, or settlements yet</p>
            <p className="mx-auto mt-3 max-w-lg text-sm text-slate-400">
              When Services jobs complete, Accommodation bookings check out, or RE settlements
              finish, they appear here so you can queue a review request (delivery via Communications
              later — this step only writes timeline Activity).
            </p>
            <p className="mt-6 text-sm text-slate-500">
              <Link href="/apps/services/jobs" className="text-sky-400 hover:underline">
                Services jobs
              </Link>
              {" · "}
              <Link href="/apps/accommodation/bookings" className="text-sky-400 hover:underline">
                Acc bookings
              </Link>
              {" · "}
              <Link href="/apps/re/settlements" className="text-sky-400 hover:underline">
                RE settlements
              </Link>
              {" · "}
              <Link href="/apps/crm/timeline" className="text-sky-400 hover:underline">
                CRM timeline
              </Link>
            </p>
          </div>
        ) : (
          <ul className="space-y-3">
            {candidates.map((c) => (
              <li
                key={c.id}
                className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-slate-800 bg-slate-900/40 px-4 py-4"
              >
                <div>
                  <p className="font-medium text-white">{c.label}</p>
                  <p className="text-xs text-slate-500">
                    {c.kind} · {c.detail}
                    {c.completedAt
                      ? ` · ${new Date(c.completedAt).toLocaleDateString("en-AU")}`
                      : ""}
                  </p>
                  {c.contactId ? (
                    <Link
                      href={`/apps/crm/contacts/${c.contactId}`}
                      className="mt-1 inline-block text-xs text-blue-400 hover:underline"
                    >
                      Open Contact →
                    </Link>
                  ) : (
                    <p className="mt-1 text-xs text-slate-600">
                      No Contact linked — request queues on Organisation
                    </p>
                  )}
                </div>
                <QueueReviewRequestButton candidateId={c.id} contactId={c.contactId} />
              </li>
            ))}
          </ul>
        )}
      </main>
    </>
  );
}

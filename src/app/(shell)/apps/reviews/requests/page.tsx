import {
  buildAccessContext,
  hasPermission,
  listReviewRequestCandidates,
} from "@dg/platform-core";

import { QueueReviewRequestButton } from "@/components/reviews/QueueReviewRequestButton";
import { ReviewsEmptyState } from "@/components/reviews/ReviewsEmptyState";
import { loadReviewsSessionAndFeed } from "@/lib/reviews-feed";

function formatDate(value?: string | null): string | null {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleDateString("en-AU", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export default async function ReviewRequestsPage() {
  const { session } = await loadReviewsSessionAndFeed();
  const candidates = session
    ? await listReviewRequestCandidates(session.organisationId)
    : [];
  const access = session
    ? buildAccessContext({
        role: session.role,
        organisationId: session.organisationId,
        principalId: session.clerkUserId,
        enabledAppIds: [],
        grants: session.permissionGrants,
      })
    : null;
  const canCreate =
    access != null &&
    hasPermission(access, {
      module: "growth",
      action: "create",
      scope: "organisation",
    });

  return (
    <>
      <header className="dg-page-header">
        <h1 className="text-2xl font-bold text-white">Review requests</h1>
        <p className="text-sm text-slate-400">
          {session?.organisationName ?? "DigitalGate"} · turn completed work into timely review
          follow-ups
        </p>
      </header>
      <main className="dg-page-main space-y-6">
        {!session ? (
          <div className="dg-card">
            <p className="text-sm text-slate-400">Sign in to view review follow-up candidates.</p>
          </div>
        ) : candidates.length === 0 ? (
          <ReviewsEmptyState
            title="No completed work awaiting a review follow-up"
            description="Completed stays, property settlements and service jobs will appear here when they become eligible."
            actions={[{ href: "/apps/reviews/inbox", label: "Open review inbox →" }]}
          />
        ) : (
          <>
            <div className="dg-card border-sky-500/20">
              <h2 className="font-semibold text-white">What happens next</h2>
              <p className="mt-2 text-sm text-slate-400">
                Creating a follow-up records it on the customer timeline. It does not send an email
                or SMS automatically; delivery remains manual until an authorised channel is connected.
              </p>
            </div>
            <ul className="space-y-3">
              {candidates.map((candidate) => (
                <li
                  key={candidate.id}
                  className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-slate-800 bg-slate-900/40 px-4 py-4"
                >
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-medium text-white">{candidate.label}</p>
                      <span className="rounded-full border border-slate-700 px-2 py-1 text-xs uppercase text-slate-500">
                        {candidate.kind}
                      </span>
                    </div>
                    {candidate.detail ? (
                      <p className="mt-1 text-sm text-slate-400">{candidate.detail}</p>
                    ) : null}
                    {formatDate(candidate.completedAt) ? (
                      <p className="mt-1 text-xs text-slate-500">
                        Completed {formatDate(candidate.completedAt)}
                      </p>
                    ) : null}
                  </div>
                  {canCreate ? (
                    <QueueReviewRequestButton
                      candidateId={candidate.id}
                      contactId={candidate.contactId}
                    />
                  ) : (
                    <p className="text-xs text-slate-500">Ask an owner or manager to create this follow-up.</p>
                  )}
                </li>
              ))}
            </ul>
          </>
        )}
      </main>
    </>
  );
}

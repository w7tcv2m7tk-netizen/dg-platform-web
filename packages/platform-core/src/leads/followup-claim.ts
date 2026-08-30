/**
 * Per-lead follow-up step claim.
 *
 * The four follow-up processors (property report, free audit, hideaway circle,
 * consultation reminders) all select a batch of leads, decide which sequence
 * steps are due from JSON metadata, send, and then write an `email_N_sent`
 * flag. Selection and the flag write are separate statements with an external
 * email send in between, so two concurrent cron invocations can both decide the
 * same step is due and both send it.
 *
 * This claims one (lead, step) pair atomically before the send, using the same
 * conditional-update pattern already used for Stripe receipts and scheduled
 * emails. It deliberately does NOT take a global lock: claims are per lead and
 * per step, so independent leads still process concurrently.
 *
 * A crash after claiming leaves a claim timestamp rather than a sent flag. The
 * claim expires after STALE_FOLLOWUP_CLAIM_MS so the step is retried rather
 * than lost — the send is not idempotent, so the window is deliberately wide
 * enough that it can only elapse after a genuine crash.
 */

/**
 * Must comfortably exceed the longest possible follow-up run. The
 * lead-followups cron declares no maxDuration override, so this is generous.
 */
export const STALE_FOLLOWUP_CLAIM_MS = 15 * 60 * 1000;

/** JSON key holding the claim timestamp for a given sequence + step. */
export function followupClaimKey(sequenceKey: string, step: number | string): string {
  return `${sequenceKey}_email_${step}_claimed_at`;
}

/**
 * Attempt to take ownership of one follow-up step for one lead.
 *
 * Returns true only for the caller that won. The whole decision is a single
 * conditional UPDATE, so concurrent workers cannot both win.
 *
 * @param sentPath  JSON path (as a Postgres text[] literal body) to the
 *                  `sent` flag this step writes on success, e.g.
 *                  `property_report_sequence,email_2_sent`.
 */
export async function claimLeadFollowupStep(input: {
  leadId: string;
  organisationId: string;
  /** Distinguishes the four sequences so their claims cannot collide. */
  sequenceKey: string;
  step: number | string;
  /** Dotted path within lead.metadata to the boolean "already sent" flag. */
  sentPath: string[];
  now?: Date;
}): Promise<boolean> {
  if (!process.env.DATABASE_URL) return false;

  const { prisma } = await import("@dg/database");
  const now = input.now ?? new Date();
  const staleBefore = new Date(now.getTime() - STALE_FOLLOWUP_CLAIM_MS);

  const claimKey = followupClaimKey(input.sequenceKey, input.step);

  // Postgres path literals for jsonb operators.
  const sentPathLiteral = `{${input.sentPath.join(",")}}`;
  const claimPathLiteral = `{${claimKey}}`;

  const affected = await prisma.$executeRaw`
    UPDATE "leads"
       SET "metadata" = jsonb_set(
             COALESCE("metadata", '{}'::jsonb),
             ${claimPathLiteral}::text[],
             to_jsonb(${now.toISOString()}::text),
             true
           )
     WHERE "id" = ${input.leadId}
       AND "organisation_id" = ${input.organisationId}
       -- Never re-send a step that already completed.
       AND COALESCE(("metadata" #>> ${sentPathLiteral}::text[])::boolean, false) = false
       -- Unclaimed, or the previous claim is old enough to be a crash.
       AND (
         ("metadata" #>> ${claimPathLiteral}::text[]) IS NULL
         OR ("metadata" #>> ${claimPathLiteral}::text[])::timestamptz < ${staleBefore}
       )
  `;

  return affected === 1;
}

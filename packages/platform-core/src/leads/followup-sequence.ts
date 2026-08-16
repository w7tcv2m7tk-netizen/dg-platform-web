/**
 * Shared Gen 2 lead follow-up sequence runner.
 * Dispatches to property_report, free_audit, and hideaway_circle processors.
 */

import { processHideawayCircleFollowups } from "../accommodation/public-hideaway-circle";
import { processPropertyReportFollowups } from "../real-estate/public-property-report";
import { processFreeAuditFollowups } from "../marketing/public-business-audit";

export type FollowupProcessResult = {
  processed: number;
  sent: number;
  failed: number;
  byFunnel: {
    property_report: { processed: number; sent: number; failed: number };
    free_audit: { processed: number; sent: number; failed: number };
    hideaway_circle: { processed: number; sent: number; failed: number };
  };
};

/** Process due nurture emails for all public lead-magnet funnels. */
export async function processDueFollowupEmails(options?: {
  limit?: number;
}): Promise<FollowupProcessResult> {
  const limit = options?.limit ?? 60;
  const third = Math.max(1, Math.floor(limit / 3));

  const property_report = await processPropertyReportFollowups({ limit: third });
  const free_audit = await processFreeAuditFollowups({ limit: third });
  const remaining = Math.max(
    1,
    limit - property_report.processed - free_audit.processed,
  );
  const hideaway_circle = await processHideawayCircleFollowups({
    limit: remaining,
  });

  return {
    processed:
      property_report.processed +
      free_audit.processed +
      hideaway_circle.processed,
    sent: property_report.sent + free_audit.sent + hideaway_circle.sent,
    failed: property_report.failed + free_audit.failed + hideaway_circle.failed,
    byFunnel: { property_report, free_audit, hideaway_circle },
  };
}

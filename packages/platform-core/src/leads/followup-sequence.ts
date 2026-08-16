/**
 * Shared Gen 2 lead follow-up sequence runner.
 * Dispatches to property_report and free_audit processors.
 */

import { processPropertyReportFollowups } from "../real-estate/public-property-report";
import { processFreeAuditFollowups } from "../marketing/public-business-audit";

export type FollowupProcessResult = {
  processed: number;
  sent: number;
  failed: number;
  byFunnel: {
    property_report: { processed: number; sent: number; failed: number };
    free_audit: { processed: number; sent: number; failed: number };
  };
};

/** Process due nurture emails for all public lead-magnet funnels. */
export async function processDueFollowupEmails(options?: {
  limit?: number;
}): Promise<FollowupProcessResult> {
  const limit = options?.limit ?? 50;
  const half = Math.max(1, Math.floor(limit / 2));

  const property_report = await processPropertyReportFollowups({ limit: half });
  const remaining = Math.max(1, limit - property_report.processed);
  const free_audit = await processFreeAuditFollowups({ limit: remaining });

  return {
    processed: property_report.processed + free_audit.processed,
    sent: property_report.sent + free_audit.sent,
    failed: property_report.failed + free_audit.failed,
    byFunnel: { property_report, free_audit },
  };
}

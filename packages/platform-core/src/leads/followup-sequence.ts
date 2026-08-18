/**
 * Shared Gen 2 lead follow-up sequence runner.
 * Dispatches to property_report, free_audit, and hideaway_circle processors.
 */

import { processHideawayCircleFollowups } from "../accommodation/public-hideaway-circle";
import { processConsultationReminders } from "../marketing/consultation-automation";
import { processFreeAuditFollowups } from "../marketing/public-business-audit";
import { processPropertyReportFollowups } from "../real-estate/public-property-report";

export type FollowupProcessResult = {
  processed: number;
  sent: number;
  failed: number;
  byFunnel: {
    property_report: { processed: number; sent: number; failed: number };
    free_audit: { processed: number; sent: number; failed: number };
    hideaway_circle: { processed: number; sent: number; failed: number };
    consultation: { processed: number; sent: number; failed: number };
  };
};

/** Process due nurture emails for all public lead-magnet funnels. */
export async function processDueFollowupEmails(options?: {
  limit?: number;
}): Promise<FollowupProcessResult> {
  const limit = options?.limit ?? 80;
  const quarter = Math.max(1, Math.floor(limit / 4));

  const property_report = await processPropertyReportFollowups({ limit: quarter });
  const free_audit = await processFreeAuditFollowups({ limit: quarter });
  const hideaway_circle = await processHideawayCircleFollowups({ limit: quarter });
  const consultation = await processConsultationReminders({ limit: quarter });

  return {
    processed:
      property_report.processed +
      free_audit.processed +
      hideaway_circle.processed +
      consultation.processed,
    sent:
      property_report.sent +
      free_audit.sent +
      hideaway_circle.sent +
      consultation.sent,
    failed:
      property_report.failed +
      free_audit.failed +
      hideaway_circle.failed +
      consultation.failed,
    byFunnel: { property_report, free_audit, hideaway_circle, consultation },
  };
}

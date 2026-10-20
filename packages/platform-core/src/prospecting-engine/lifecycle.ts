/** Presentation over existing stages; commercial state is read-only and never inferred from org.status. */
export function acquisitionLifecycle(stage: string, commercial?: { status: string; stripeStatus: string | null; stripeSubscriptionId: string | null } | null): string {
  if (commercial?.stripeSubscriptionId) {
    if (commercial.status.toUpperCase() === "TRIALING" && commercial.stripeStatus === "trialing") return "Trial";
    if (commercial.status.toUpperCase() === "ACTIVE" || commercial.stripeStatus === "active") return "Customer";
  }
  const labels: Record<string, string> = { prospect: "Discover", audit_created: "Research", qualified: "Opportunity", report_sent: "Contact", email_opened: "Contact", report_viewed: "Contact", follow_up_due: "Follow-up", meeting_booked: "Consultation", proposal_sent: "Opportunity", won: "Won — commercial state pending", onboarding: "Commercial state pending", lost: "Closed" };
  return labels[stage] ?? "Research";
}
export const ACQUISITION_CAPABILITIES = ["Qualify", "Score", "Call Brief", "Next Action"] as const;

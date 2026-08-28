import type {
  CommandClientRow,
  CommandRecentActivity,
  CommandTodayItem,
} from "./types";
import {
  isOperationalAttentionTier,
  isOperationalHealthyTier,
  scoreBandFromScore,
  tierLabel,
} from "./success-score";
import type { EnrichedCommandClient } from "./client-intelligence";

/** Map audit-style activity records to operator-readable summaries. */
export function humanizePlatformActivity(item: CommandRecentActivity): {
  humanTitle: string;
  technicalTitle: string;
} {
  const type = item.activityType?.toLowerCase() ?? "";
  const title = item.title?.trim() || "Platform activity recorded";

  if (type.includes("opportunity") && type.includes("deleted")) {
    return { humanTitle: "Opportunity deleted", technicalTitle: title };
  }
  if (type.includes("opportunity") && type.includes("updated")) {
    return { humanTitle: "Opportunity updated", technicalTitle: title };
  }
  if (type.includes("opportunity") && type.includes("created")) {
    return { humanTitle: "New opportunity created", technicalTitle: title };
  }
  if (type.includes("company") && type.includes("created")) {
    return { humanTitle: "Company created", technicalTitle: title };
  }
  if (type.includes("contact") && type.includes("updated")) {
    return { humanTitle: "Contact updated", technicalTitle: title };
  }
  if (type.includes("converted")) {
    return { humanTitle: "Lead converted to opportunity", technicalTitle: title };
  }
  if (type.includes("contact") && type.includes("created")) {
    return { humanTitle: "New contact added", technicalTitle: title };
  }
  if (type.includes("task")) {
    return { humanTitle: "Follow-up task created", technicalTitle: title };
  }
  if (type.includes("email_sent") || type.includes("email_queued")) {
    return { humanTitle: "Customer email sent", technicalTitle: title };
  }
  if (type.includes("founding")) {
    return { humanTitle: "Founding programme activity", technicalTitle: title };
  }
  if (type.includes("automation")) {
    return { humanTitle: "Automation workflow executed", technicalTitle: title };
  }
  if (type.includes("seo") || type.includes("audit")) {
    return { humanTitle: "SEO audit completed", technicalTitle: title };
  }
  if (type.includes("ai_call") || type.includes("voice")) {
    return { humanTitle: "AI communications activity", technicalTitle: title };
  }

  const cleaned = title.replace(/\([^)]*\)/g, "").trim();
  return {
    humanTitle: cleaned.length > 80 ? `${cleaned.slice(0, 77)}…` : cleaned,
    technicalTitle: title,
  };
}

export function clientIntelligencePresentation(client: CommandClientRow): {
  statusEmoji: string;
  statusLabel: string;
  category: string;
  summary: string;
} {
  if (client.scoreProvisional) {
    return {
      statusEmoji: "⚪",
      statusLabel: "Insufficient data",
      category: "Onboarding",
      summary: "Connectors and profile data still landing — don't invent a health score yet.",
    };
  }

  if (!client.needsAttention && !isOperationalAttentionTier(client.healthTier ?? "healthy")) {
    return {
      statusEmoji: "🟢",
      statusLabel: "Healthy",
      category: "Operations",
      summary: "No immediate intervention required.",
    };
  }

  const tier = client.healthTier ?? "needs_attention";
  const reasons = client.attentionReasons.join(" ").toLowerCase();
  let category = "Growth";
  if (reasons.includes("billing") || reasons.includes("stripe")) category = "Revenue";
  else if (reasons.includes("connector") || reasons.includes("wordpress")) category = "Platform";
  else if (reasons.includes("overdue") || reasons.includes("lead")) category = "Sales";
  else if (reasons.includes("onboard") || reasons.includes("implementation")) category = "Delivery";

  const summary =
    client.attentionReasons.slice(0, 2).join(". ") ||
    "Review this organisation in Customer Intelligence.";

  const statusEmoji =
    tier === "critical" || tier === "at_risk"
      ? "🔴"
      : tier === "needs_attention"
        ? "🟠"
        : "🟡";

  return {
    statusEmoji,
    statusLabel:
      tier === "critical" || tier === "at_risk"
        ? tierLabel(tier)
        : "Needs attention",
    category,
    summary,
  };
}

function formatStatusLabel(status: string): string {
  return status.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

/** First line under organisation name — status, leads, opportunities. */
export function formatClientOrgSubtitle(client: EnrichedCommandClient): string {
  const parts: string[] = [formatStatusLabel(client.status)];
  if (client.leadCount > 0) {
    parts.push(`${client.leadCount} lead${client.leadCount === 1 ? "" : "s"}`);
  }
  if (client.openOpportunities > 0) {
    parts.push(
      `${client.openOpportunities} opportunit${client.openOpportunities === 1 ? "y" : "ies"}`,
    );
  }
  return parts.join(" · ");
}

/** Second line — adoption and blocker summary. */
export function formatClientSignalLine(client: EnrichedCommandClient): string {
  const parts: string[] = [];

  if (isOperationalHealthyTier(client.healthTier) && client.attentionReasons.length === 0) {
    parts.push("Strong adoption");
    parts.push("No blockers");
  } else if (client.attentionReasons.length > 0) {
    parts.push(client.attentionReasons.slice(0, 2).join(" · "));
  } else if (client.leadsThisMonth === 0 && client.activitiesThisMonth === 0) {
    parts.push("Low CRM activity");
    if (client.openOpportunities === 0) parts.push("No opportunities recorded");
  } else if (client.status === "trial") {
    parts.push("Trial conversion risk");
  } else {
    parts.push("Review adoption signals");
  }

  return parts.join(" · ");
}

export type ClientSignalsLabel = "Strong" | "Attention";

export function clientSignalsLabel(client: EnrichedCommandClient): ClientSignalsLabel {
  if (client.needsAttention || isOperationalAttentionTier(client.healthTier)) {
    return "Attention";
  }
  return "Strong";
}

/** When operational health diverges from score band — e.g. high score + CRM concern. */
export function healthExplanation(client: EnrichedCommandClient): string | null {
  const band = scoreBandFromScore(client.successScore);
  const tier = client.healthTier;

  if (
    isOperationalAttentionTier(tier) &&
    (band === "excellent" || band === "healthy")
  ) {
    const reason =
      client.attentionReasons[0] ??
      "operational signals require review";
    return `Success Score™ ${client.successScore} — overall strong, but ${reason.charAt(0).toLowerCase()}${reason.slice(1)}.`;
  }

  if (isOperationalHealthyTier(tier) && band === "needs_attention") {
    return `Score ${client.successScore} is maturing — early data, no blockers observed yet.`;
  }

  return null;
}

export function attentionSummary(client: EnrichedCommandClient): string {
  if (client.attentionReasons.length > 0) {
    return client.attentionReasons.slice(0, 2).join(". ");
  }
  if (client.leadsThisMonth === 0 && client.activitiesThisMonth === 0) {
    return "Low CRM activity and limited opportunity activity.";
  }
  if (client.status === "trial" && client.openOpportunities === 0) {
    return "Trial in progress with limited commercial workflow recorded.";
  }
  if (client.healthTier === "at_risk" || client.healthTier === "critical") {
    return "Customer health is below acceptable thresholds.";
  }
  return "Operational signals suggest a platform review.";
}

export function recommendIntervention(client: EnrichedCommandClient): string {
  const reasons = client.attentionReasons.join(" ").toLowerCase();

  if (reasons.includes("stripe") || reasons.includes("billing")) {
    return "Review billing setup and subscription status with the customer.";
  }
  if (reasons.includes("overdue")) {
    return "Clear overdue lead responses and confirm CRM follow-up workflows.";
  }
  if (reasons.includes("quiet")) {
    return "Re-engage the customer — platform activity has stalled after prior lead activity.";
  }
  if (
    client.leadsThisMonth === 0 &&
    client.activitiesThisMonth === 0 &&
    client.leadCount === 0
  ) {
    return "Review CRM adoption and identify first commercial workflow.";
  }
  if (client.status === "trial") {
    return "Review trial progress and schedule platform review before conversion.";
  }
  if (client.healthTier === "critical" || client.healthTier === "at_risk") {
    return "Urgent intervention — contact customer and stabilise platform usage.";
  }
  if (client.openOpportunities === 0 && client.leadCount > 0) {
    return "Move qualified leads into opportunities and confirm pipeline workflow.";
  }
  return "Schedule platform review and identify priority adoption workflows.";
}

export function buildTodaySummary(input: {
  openTasksDue: number;
  prospectFollowUps: number;
  organisationsNeedingAttention: number;
}): CommandTodayItem[] {
  const items: CommandTodayItem[] = [];

  if (input.openTasksDue > 0) {
    items.push({
      id: "tasks-due",
      label: `${input.openTasksDue} DigitalGate CRM task${input.openTasksDue === 1 ? "" : "s"} due`,
      href: "/command/tasks",
    });
  }

  if (input.prospectFollowUps > 0) {
    items.push({
      id: "prospect-followups",
      label: `${input.prospectFollowUps} prospect follow-up${input.prospectFollowUps === 1 ? "" : "s"}`,
      href: "/command/growth-engine/pipeline",
    });
  }

  if (input.organisationsNeedingAttention > 0) {
    items.push({
      id: "orgs-attention",
      label: `${input.organisationsNeedingAttention} organisation${input.organisationsNeedingAttention === 1 ? "" : "s"} need attention`,
      href: "/command/clients",
    });
  }

  return items;
}

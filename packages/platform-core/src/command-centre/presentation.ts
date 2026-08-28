import type {
  AgencyHealthTier,
  CommandClientRow,
  CommandRecentActivity,
  CommandTodayItem,
} from "./types";
import {
  scoreBandEmoji,
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

  if (!client.needsAttention && !client.operationalHealth) {
    return {
      statusEmoji: "🟢",
      statusLabel: "Healthy",
      category: "Operations",
      summary: "No immediate intervention required.",
    };
  }

  const tier = client.operationalHealth ?? client.healthTier ?? "needs_attention";
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

export type ClientScoreTierDisplay = AgencyHealthTier | "provisional";

/** Score tier for display — provisional scores are never classified Healthy/Needs attention. */
export function clientScoreTierDisplay(
  client: EnrichedCommandClient,
): ClientScoreTierDisplay {
  if (client.scoreProvisional) return "provisional";
  return client.healthTier;
}

export function clientScoreTierLabel(client: EnrichedCommandClient): string {
  const tier = clientScoreTierDisplay(client);
  if (tier === "provisional") return "Provisional";
  return tierLabel(tier);
}

export function clientScoreTierEmoji(client: EnrichedCommandClient): string {
  if (client.scoreProvisional) return "⚪";
  return scoreBandEmoji(client.scoreBand);
}

/** Client Activity — score band tier (behaviour page, not health interpretation). */
export function clientActivityScoreTierDisplay(
  client: EnrichedCommandClient,
): AgencyHealthTier {
  return client.healthTier;
}

export function clientActivityScoreTierEmoji(client: EnrichedCommandClient): string {
  return scoreBandEmoji(client.scoreBand);
}

/** Raw month activity — no interpretation. */
export function formatClientActivityMonthLine(client: EnrichedCommandClient): string {
  return `${client.leadsThisMonth} leads · ${client.activitiesThisMonth} activities · ${client.openOpportunities} opps`;
}

export function formatClientOrganisationMeta(client: EnrichedCommandClient): string | null {
  if (client.isInternalOrg) return "Internal";
  return client.organisationSlug ?? null;
}

/** Customer Intelligence / Opportunities — app footprint and open opps, no interpretation. */
export function formatClientExpansionSignal(client: EnrichedCommandClient): string {
  const appCount = client.installedApps.length;
  const appsLabel = appCount === 1 ? "App" : "Apps";
  if (client.openOpportunities > 0) {
    return `${client.openOpportunities} open · ${appCount} ${appsLabel}`;
  }
  return `No open opps · ${appCount} ${appsLabel}`;
}

/** Observed operational signals — separate from score tier classification. */
export function formatClientObservedSignal(client: EnrichedCommandClient): string {
  if (client.scoreProvisional) {
    const parts = ["Partial data · score still maturing"];
    if (client.status === "trial") parts.push("On trial");
    return parts.join(" · ");
  }

  const parts: string[] = [];
  const scoreTierHealthy =
    client.healthTier === "top_performer" || client.healthTier === "healthy";

  if (client.attentionReasons.length > 0 && scoreTierHealthy) {
    parts.push(`🟠 ${client.attentionReasons[0]}`);
  } else if (client.attentionReasons.length > 0) {
    parts.push(client.attentionReasons.slice(0, 2).join(" · "));
  } else if (
    scoreTierHealthy &&
    (client.scoreBreakdown.crm >= 80 || client.leadsThisMonth > 0)
  ) {
    if (client.scoreBreakdown.crm >= 80) parts.push("Strong CRM activity");
    if (client.leadsThisMonth > 0) {
      parts.push(
        `${client.leadsThisMonth} lead${client.leadsThisMonth === 1 ? "" : "s"} this month`,
      );
    }
  } else if (
    scoreTierHealthy &&
    client.scoreBreakdown.crm < 70 &&
    client.activitiesThisMonth < 5
  ) {
    parts.push("🟠 Review CRM adoption");
    if (client.leadsThisMonth > 0) {
      parts.push(
        `${client.leadsThisMonth} lead${client.leadsThisMonth === 1 ? "" : "s"} this month`,
      );
    }
  } else if (client.leadsThisMonth === 0 && client.activitiesThisMonth === 0) {
    parts.push("Limited activity");
    if (client.status === "trial") parts.push("On trial · limited CRM activity");
  } else if (client.highlights.length > 0) {
    parts.push(
      client.highlights
        .filter(
          (h) =>
            !h.toLowerCase().includes("provisional") &&
            !h.toLowerCase().includes("partial data"),
        )
        .slice(0, 2)
        .join(" · "),
    );
  } else {
    parts.push("Monitoring");
  }

  return parts.join(" · ");
}

export function clientInterventionTierLabel(client: EnrichedCommandClient): string {
  return tierLabel(client.healthTier);
}

export function interventionWhy(client: EnrichedCommandClient): string {
  const reasons = client.interventionReasons ?? client.attentionReasons;
  if (reasons.length > 0) return reasons[0] ?? "";
  return attentionSummary(client);
}

export function attentionSummary(client: EnrichedCommandClient): string {
  const reasons = client.interventionReasons ?? client.attentionReasons;
  if (reasons.length > 0) {
    return reasons.slice(0, 2).join(". ");
  }
  if (client.leadsThisMonth === 0 && client.activitiesThisMonth === 0) {
    return "Low CRM activity and limited opportunity activity.";
  }
  if (client.status === "trial" && client.openOpportunities === 0) {
    return "Trial in progress with limited commercial workflow recorded.";
  }
  if (client.operationalHealth === "at_risk" || client.operationalHealth === "critical") {
    return "Customer health is below acceptable thresholds.";
  }
  if (!client.scoreProvisional && client.scoreBand === "at_risk") {
    return "Success Score™ is in the at-risk band.";
  }
  return "Operational signals suggest a platform review.";
}

export function recommendIntervention(client: EnrichedCommandClient): string {
  const reasons = (client.interventionReasons ?? client.attentionReasons)
    .join(" ")
    .toLowerCase();

  if (reasons.includes("despite high crm activity")) {
    return "Review CRM usage and identify whether activity is translating into commercial outcomes.";
  }
  if (reasons.includes("very low activity")) {
    return "Review adoption and identify the first meaningful workflow to activate.";
  }
  if (reasons.includes("adoption signal requires review")) {
    return "Review CRM activity and platform utilisation.";
  }
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
  if (
    client.operationalHealth === "critical" ||
    client.operationalHealth === "at_risk" ||
    client.scoreBand === "critical" ||
    client.scoreBand === "at_risk"
  ) {
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

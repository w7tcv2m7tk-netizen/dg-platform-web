import type {
  CommandClientRow,
  CommandRecentActivity,
  CommandTodayItem,
} from "./types";

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

  if (!client.needsAttention && client.healthTier !== "needs_attention") {
    return {
      statusEmoji: "🟢",
      statusLabel: "Healthy",
      category: "Operations",
      summary: "No immediate intervention required.",
    };
  }

  const reasons = client.attentionReasons.join(" ").toLowerCase();
  let category = "Growth";
  if (reasons.includes("billing") || reasons.includes("stripe")) category = "Revenue";
  else if (reasons.includes("connector") || reasons.includes("wordpress")) category = "Platform";
  else if (reasons.includes("overdue") || reasons.includes("lead")) category = "Sales";
  else if (reasons.includes("onboard") || reasons.includes("implementation")) category = "Delivery";

  const summary =
    client.attentionReasons.slice(0, 2).join(". ") ||
    "Review this organisation in Client Intelligence.";

  return {
    statusEmoji: client.healthTier === "needs_attention" ? "🟠" : "🟡",
    statusLabel: "Needs attention",
    category,
    summary,
  };
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

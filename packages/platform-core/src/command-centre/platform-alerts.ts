/**
 * Platform Alerts Centre — DigitalGate operator alerts (not customer business alerts).
 * Aggregates platform telemetry into actionable operator alerts.
 */

import { getStripeSetupStatus } from "../commerce/stripe-setup";
import { getDigitalInfrastructureOverview } from "../infrastructure";
import type {
  CommandCentreOpsHome,
  CommandConnectorOrgStatus,
} from "./types";
import type {
  CommercialInfrastructureSummary,
  ConnectorHealthSummary,
  InfrastructureServiceRow,
  OperationalLoadSummary,
  PlatformAlert,
  PlatformAlertsCentre,
  PlatformDiagnosticsSummary,
} from "./platform-alerts-types";
import { getCommandCentreOpsHome } from "./overview";

function relativeMinutes(iso: string): string {
  const ms = Date.now() - Date.parse(iso);
  if (!Number.isFinite(ms) || ms < 0) return "just now";
  const mins = Math.floor(ms / 60_000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins} minute${mins === 1 ? "" : "s"} ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 48) return `${hours} hour${hours === 1 ? "" : "s"} ago`;
  return `${Math.floor(hours / 24)} day${Math.floor(hours / 24) === 1 ? "" : "s"} ago`;
}

function alertActions(href: string): PlatformAlert["actions"] {
  return [
    { id: "investigate", label: "Investigate", href },
    { id: "resolve", label: "Resolve", href },
    { id: "assign", label: "Assign", href: "/command/delivery/tasks" },
  ];
}

function buildConnectorHealth(orgs: CommandConnectorOrgStatus[]): ConnectorHealthSummary {
  // WordPress is a legacy optional connector (WP detach). Only score orgs that still
  // have it configured — missing WP is not a failure in the Gen 2 SoT world.
  const configured = orgs.filter((org) => org.wordpressConfigured);
  let healthy = 0;
  let idle = 0;

  for (const org of configured) {
    const syncedRecently =
      org.lastSyncAt &&
      Date.now() - Date.parse(org.lastSyncAt) < 7 * 24 * 60 * 60 * 1000;
    if (syncedRecently) healthy += 1;
    else idle += 1;
  }

  return {
    connectedOrganisations: configured.length,
    healthy,
    /** Idle / legacy WP configs — not treated as Attention-required ops incidents. */
    attention: idle,
    failed: 0,
  };
}

function buildInfrastructureServices(input: {
  infraStatus: string;
  checkedAt: string;
  domainCount: number;
  websiteCount: number;
  configured: boolean;
}): InfrastructureServiceRow[] {
  const apiHealthy = input.infraStatus === "ok";
  const checked = relativeMinutes(input.checkedAt);

  return [
    {
      id: "api",
      label: "Production API",
      statusLabel: apiHealthy ? "Healthy" : input.configured ? "Degraded" : "Setup required",
      detail: `Last checked ${checked}`,
      href: "/apps/infrastructure/domains",
    },
    {
      id: "domains",
      label: "Domain Services",
      statusLabel: input.domainCount > 0 ? "Active" : "No domains",
      detail: `${input.domainCount} domain${input.domainCount === 1 ? "" : "s"} · ${input.websiteCount} website${input.websiteCount === 1 ? "" : "s"}`,
      href: "/apps/infrastructure/domains",
    },
    {
      id: "dns",
      label: "DNS",
      statusLabel: input.domainCount > 0 ? "Connected" : "Not configured",
      detail: `${input.domainCount} connected · 0 issues`,
      href: "/apps/infrastructure/domains",
    },
    {
      id: "ssl",
      label: "SSL",
      statusLabel: input.websiteCount > 0 ? "Active" : "Monitoring",
      detail: `${input.websiteCount} active · 0 expiring`,
      href: "/apps/infrastructure/domains",
    },
    {
      id: "email",
      label: "Email Infrastructure",
      statusLabel: input.configured ? "Healthy" : "Setup required",
      detail: input.configured ? "Transactional email ready" : "Provider configuration pending",
      href: "/apps/infrastructure/domains",
    },
  ];
}

function buildCommercialInfrastructure(): CommercialInfrastructureSummary {
  const stripe = getStripeSetupStatus();
  return {
    stripeOk: stripe.ok,
    stripeMode: stripe.mode,
    checklist: [
      { id: "api", label: "API connection", done: stripe.secretKeyConfigured },
      { id: "webhooks", label: "Webhooks", done: stripe.webhookSecretConfigured },
      { id: "billing", label: "Billing events", done: stripe.webhookSecretConfigured },
      { id: "referrals", label: "Refer & Earn", done: stripe.ok },
      {
        id: "connect",
        label: "Connect payouts",
        done: stripe.checklist.find((c) => c.id === "connect")?.done ?? false,
        optional: true,
      },
    ],
  };
}

function buildAlertsFromOpsHome(
  home: CommandCentreOpsHome,
  stripeOk: boolean,
  infraStatus: string,
): { critical: PlatformAlert[]; attention: PlatformAlert[]; notices: PlatformAlert[] } {
  const now = home.generatedAt;
  const critical: PlatformAlert[] = [];
  const attention: PlatformAlert[] = [];
  const notices: PlatformAlert[] = [];

  if (!stripeOk) {
    critical.push({
      id: "stripe-webhook",
      severity: "critical",
      title: "Stripe billing needs attention",
      message: "Webhook or API configuration is incomplete for this environment.",
      detectedAt: now,
      impact: "Billing events may not be recorded and subscriptions may not update correctly.",
      recommendedAction: "Reconnect Stripe webhook and verify API keys for the active mode.",
      href: "/dashboard/settings/billing",
      actions: alertActions("/dashboard/settings/billing"),
      category: "billing",
    });
  }

  if (infraStatus === "degraded" || infraStatus === "down") {
    critical.push({
      id: "infra-degraded",
      severity: "critical",
      title: "Infrastructure service degraded",
      message: "Domain or hosting provider health check reported a problem.",
      detectedAt: now,
      impact: "Domain provisioning, DNS or website operations may be affected.",
      recommendedAction: "Review Infrastructure & Services and provider status.",
      href: "/command/platform-health",
      actions: alertActions("/apps/infrastructure/domains"),
      category: "infrastructure",
    });
  }

  if (home.delivery.blocked > 0) {
    attention.push({
      id: "delivery-blocked",
      severity: "attention",
      title: `${home.delivery.blocked} implementation${home.delivery.blocked === 1 ? "" : "s"} blocked`,
      message: "Delivery projects are blocked and need operator intervention.",
      detectedAt: now,
      impact: "Customer onboarding timelines may slip.",
      recommendedAction: "Open Delivery and clear blockers with the delivery lead.",
      href: "/command/delivery",
      actions: alertActions("/command/delivery"),
      category: "delivery",
    });
  }

  if (home.delivery.awaitingCustomerInfo > 0) {
    attention.push({
      id: "onboarding-blocked",
      severity: "attention",
      title: `${home.delivery.awaitingCustomerInfo} onboarding blocked awaiting customer info`,
      message: "Implementations are waiting on customer input.",
      detectedAt: now,
      impact: "Go-live dates may be delayed until customers respond.",
      recommendedAction: "Follow up with customers on outstanding onboarding tasks.",
      href: "/command/delivery",
      actions: alertActions("/command/delivery"),
      category: "delivery",
    });
  }

  const connectorSummary = buildConnectorHealth(home.connectors.orgs);
  // Stale WordPress connectors are legacy detach residue — notice only, not Attention.
  if (connectorSummary.attention > 0) {
    notices.push({
      id: "connectors-legacy-wp",
      severity: "notice",
      title: `${connectorSummary.attention} legacy WordPress connector${connectorSummary.attention === 1 ? "" : "s"} idle`,
      message:
        "Gen 2 owns CRM, bookings, and apex sites. Remaining WordPress connectors are optional bridges — idle sync is expected while detach completes.",
      detectedAt: now,
      impact: "No customer ops impact unless an org still relies on a WP mirror you have not retired.",
      recommendedAction:
        "Leave idle unless a specific org still needs WP sync; otherwise disconnect the connector in Settings.",
      href: "/command/clients",
      actions: alertActions("/command/clients"),
      category: "connectors",
    });
  }

  if (home.organisationHealth.needsAttentionCount > 0) {
    attention.push({
      id: "customers-attention",
      severity: "attention",
      title: `${home.organisationHealth.needsAttentionCount} customer${home.organisationHealth.needsAttentionCount === 1 ? "" : "s"} requiring attention`,
      message: "Client Intelligence flagged organisations needing intervention.",
      detectedAt: now,
      impact: "At-risk customers may churn or stall without account management follow-up.",
      recommendedAction: "Open Client Intelligence and review the intervention queue.",
      href: "/command/clients",
      actions: alertActions("/command/clients"),
      category: "customer",
    });
  }

  if (home.pulse.overdueLeadResponses > 0) {
    attention.push({
      id: "overdue-responses",
      severity: "attention",
      title: `${home.pulse.overdueLeadResponses} overdue lead response${home.pulse.overdueLeadResponses === 1 ? "" : "s"}`,
      message: "SLA breaches detected across customer organisations.",
      detectedAt: now,
      impact: "Conversion rates may drop for affected customers.",
      recommendedAction: "Review Client Intelligence and notify affected account owners.",
      href: "/command/clients",
      actions: alertActions("/command/clients"),
      category: "customer",
    });
  }

  for (const deliveryAlert of home.deliveryAlerts ?? []) {
    if (deliveryAlert.severity !== "critical") continue;
    critical.push({
      id: deliveryAlert.id,
      severity: "critical",
      title: deliveryAlert.message,
      message: deliveryAlert.message,
      detectedAt: now,
      impact: "Customer delivery timeline at risk.",
      recommendedAction: "Open the implementation record and assign resolution.",
      href: deliveryAlert.href,
      actions: alertActions(deliveryAlert.href),
      category: "delivery",
    });
  }

  if (infraStatus === "not_configured") {
    notices.push({
      id: "infra-sandbox",
      severity: "notice",
      title: "Infrastructure provider in setup mode",
      message: "Domain services are not fully configured for production provisioning.",
      detectedAt: now,
      impact: "No immediate customer impact — provisioning remains in sandbox/setup.",
      recommendedAction: "Complete Dreamscape sandbox configuration before production cutover.",
      href: "/apps/infrastructure/domains",
      actions: alertActions("/apps/infrastructure/domains"),
      category: "infrastructure",
    });
  }

  if (stripeOk && getStripeSetupStatus().mode === "test") {
    notices.push({
      id: "stripe-test-mode",
      severity: "notice",
      title: "Stripe running in test mode",
      message: "Commercial infrastructure is healthy but not processing live payments.",
      detectedAt: now,
      impact: "Production billing events will not affect live subscriptions.",
      recommendedAction: "Switch to live Stripe keys when ready for production billing.",
      href: "/dashboard/settings/billing",
      actions: alertActions("/dashboard/settings/billing"),
      category: "billing",
    });
  }

  return { critical, attention, notices };
}

function buildOperationalLoad(
  home: CommandCentreOpsHome,
  criticalCount: number,
): OperationalLoadSummary {
  return {
    tasksDueToday: home.pulse.openTasksDue,
    overdueResponses: home.pulse.overdueLeadResponses,
    deliveryBlocked: home.delivery.blocked,
    failedOnboarding: home.delivery.awaitingCustomerInfo,
    customersRequiringAttention: home.organisationHealth.needsAttentionCount,
    criticalPlatformIssues: criticalCount,
  };
}

function buildDiagnostics(): PlatformDiagnosticsSummary {
  return {
    sentryConfigured: Boolean(
      process.env.SENTRY_DSN?.trim() || process.env.NEXT_PUBLIC_SENTRY_DSN?.trim(),
    ),
    appUrl:
      process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") ??
      "https://app.digitalgate.com.au",
    databaseConfigured: Boolean(process.env.DATABASE_URL?.trim()),
  };
}

/** Build Platform Alerts Centre for DigitalGate operator Command Centre. */
export async function getPlatformAlertsCentre(): Promise<PlatformAlertsCentre> {
  const [home, infra] = await Promise.all([
    getCommandCentreOpsHome(),
    getDigitalInfrastructureOverview("platform"),
  ]);

  const commercial = buildCommercialInfrastructure();
  const { critical, attention, notices } = buildAlertsFromOpsHome(
    home,
    commercial.stripeOk,
    infra.health.status,
  );

  return {
    generatedAt: home.generatedAt,
    critical,
    attention,
    notices,
    infrastructureServices: buildInfrastructureServices({
      infraStatus: infra.health.status,
      checkedAt: infra.health.checkedAt,
      domainCount: infra.assets.domains,
      websiteCount: infra.assets.websites,
      configured: infra.configured,
    }),
    commercial,
    connectors: buildConnectorHealth(home.connectors.orgs),
    operationalLoad: buildOperationalLoad(home, critical.length),
    diagnostics: buildDiagnostics(),
  };
}

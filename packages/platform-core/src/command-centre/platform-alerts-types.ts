/**
 * DigitalGate Platform Alerts — operator-only (not customer business alerts).
 * @see docs/foundations/PLATFORM-ALERTS.md
 */

export type PlatformAlertSeverity = "critical" | "attention" | "notice";

/** Action ids are category-aware — not every alert gets Resolve. */
export type PlatformAlertAction = {
  id:
    | "investigate"
    | "resolve"
    | "assign"
    | "client-intelligence"
    | "view-organisations"
    | "settings"
    | "open-delivery"
    | "billing"
    | "open-infrastructure";
  label: string;
  href: string;
};

export type PlatformAlert = {
  id: string;
  severity: PlatformAlertSeverity;
  title: string;
  message: string;
  organisationName?: string;
  detectedAt: string;
  impact: string;
  recommendedAction: string;
  href: string;
  actions: PlatformAlertAction[];
  category:
    | "billing"
    | "connectors"
    | "delivery"
    | "customer"
    | "infrastructure"
    | "security"
    | "platform";
};

export type InfrastructureServiceRow = {
  id: string;
  label: string;
  statusLabel: string;
  detail: string;
  href?: string;
  /** Compact grid tone — healthy | degraded | idle */
  tone?: "healthy" | "degraded" | "idle";
};

export type ConnectorHealthSummary = {
  connectedOrganisations: number;
  healthy: number;
  attention: number;
  failed: number;
};

export type OperationalLoadSummary = {
  tasksDueToday: number;
  overdueResponses: number;
  deliveryBlocked: number;
  failedOnboarding: number;
  customersRequiringAttention: number;
  criticalPlatformIssues: number;
};

export type CommercialInfrastructureSummary = {
  stripeOk: boolean;
  stripeMode: "test" | "live" | "unset";
  checklist: Array<{ id: string; label: string; done: boolean; optional?: boolean }>;
};

export type PlatformDiagnosticsSummary = {
  sentryConfigured: boolean;
  appUrl: string;
  databaseConfigured: boolean;
};

export type PlatformAlertsCentre = {
  generatedAt: string;
  critical: PlatformAlert[];
  attention: PlatformAlert[];
  notices: PlatformAlert[];
  infrastructureServices: InfrastructureServiceRow[];
  commercial: CommercialInfrastructureSummary;
  connectors: ConnectorHealthSummary;
  operationalLoad: OperationalLoadSummary;
  diagnostics: PlatformDiagnosticsSummary;
};

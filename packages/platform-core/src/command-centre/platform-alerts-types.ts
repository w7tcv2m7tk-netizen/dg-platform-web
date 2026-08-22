/**
 * DigitalGate Platform Alerts — operator-only (not customer business alerts).
 * @see docs/foundations/PLATFORM-ALERTS.md
 */

export type PlatformAlertSeverity = "critical" | "attention" | "notice";

export type PlatformAlertAction = {
  id: "investigate" | "resolve" | "assign";
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

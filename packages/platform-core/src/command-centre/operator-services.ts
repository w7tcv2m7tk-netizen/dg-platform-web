import {
  isPlatformOperatorContext,
  type PlatformOperatorContext,
} from "../access/platform-operator-context";
import {
  getDeliveryDashboardMetrics,
  getDeliveryProject,
  listDeliveryProjects,
  listDeliveryTasks,
} from "../delivery";
import { updateOrganisationFeatureFlags } from "../features/flags";
import { listPlatformOpportunities } from "../opportunity-engine";
import { buildCommissionsWorkspace } from "../partners/commissions-workspace";
import { generateClientAdvisorInsight } from "./advisor";
import { getCommandBenchmarks } from "./benchmarks";
import { getClientIntelligence } from "./client-intelligence";
import { getCommandFeatureFlagsOverview } from "./flags-admin";
import { getGrowthReports, type GrowthReportPeriod } from "./growth-reports";
import { getClientExpansionOpportunities } from "./opportunities";
import { getCommandCentreOpsHome } from "./overview";
import { getPlatformAlertsBadgeCount, getPlatformAlertsCentre } from "./platform-alerts";
import { getCommandMrrAttribution } from "./revenue";

function requireOperator(operator: PlatformOperatorContext): void {
  if (!isPlatformOperatorContext(operator)) {
    throw new Error("Platform operator capability required");
  }
}

/** Capability-gated Command Centre home aggregate. */
export async function getOperatorCommandCentreOpsHome(
  operator: PlatformOperatorContext,
) {
  requireOperator(operator);
  return getCommandCentreOpsHome();
}

/** Capability-gated cross-tenant customer intelligence. */
export async function getOperatorClientIntelligence(
  operator: PlatformOperatorContext,
) {
  requireOperator(operator);
  return getClientIntelligence();
}

/** Capability-gated customer-specific Advisor insight. */
export async function generateOperatorClientAdvisorInsight(
  operator: PlatformOperatorContext,
  input: { organisationId: string; question?: string },
) {
  requireOperator(operator);
  return generateClientAdvisorInsight(input);
}

/** Capability-gated cohort benchmarks. */
export async function getOperatorCommandBenchmarks(
  operator: PlatformOperatorContext,
  input?: { organisationId?: string },
) {
  requireOperator(operator);
  return getCommandBenchmarks(input);
}

/** Capability-gated period Growth Reports across customer organisations. */
export async function getOperatorGrowthReports(
  operator: PlatformOperatorContext,
  input?: { period?: GrowthReportPeriod; organisationId?: string },
) {
  requireOperator(operator);
  return getGrowthReports(input);
}

/** Capability-gated client expansion opportunities. */
export async function getOperatorClientExpansionOpportunities(
  operator: PlatformOperatorContext,
) {
  requireOperator(operator);
  return getClientExpansionOpportunities();
}

/** Capability-gated ranked Opportunity Engine feed across organisations. */
export async function listOperatorPlatformOpportunities(
  operator: PlatformOperatorContext,
  input?: { limit?: number },
) {
  requireOperator(operator);
  return listPlatformOpportunities({
    scope: "staff",
    limit: input?.limit,
  });
}

/** Capability-gated platform-wide alerts centre. */
export async function getOperatorPlatformAlertsCentre(
  operator: PlatformOperatorContext,
) {
  requireOperator(operator);
  return getPlatformAlertsCentre();
}

/** Capability-gated lightweight platform alert badge. */
export async function getOperatorPlatformAlertsBadgeCount(
  operator: PlatformOperatorContext,
) {
  requireOperator(operator);
  return getPlatformAlertsBadgeCount();
}

/** Capability-gated cross-tenant feature flag overview. */
export async function getOperatorCommandFeatureFlagsOverview(
  operator: PlatformOperatorContext,
) {
  requireOperator(operator);
  return getCommandFeatureFlagsOverview();
}

/** Capability-gated cross-tenant feature flag mutation. */
export async function updateOperatorOrganisationFeatureFlags(
  operator: PlatformOperatorContext,
  input: {
    organisationId: string;
    flags: Record<string, boolean>;
  },
) {
  requireOperator(operator);
  return updateOrganisationFeatureFlags({
    ...input,
    actorId: operator.actorId,
  });
}

/** Capability-gated subscription attribution across organisations. */
export async function getOperatorCommandMrrAttribution(
  operator: PlatformOperatorContext,
) {
  requireOperator(operator);
  return getCommandMrrAttribution();
}

/** Capability-gated Partner Network commission ledger across organisations. */
export async function getOperatorCommissionsWorkspace(
  operator: PlatformOperatorContext,
) {
  requireOperator(operator);
  return buildCommissionsWorkspace();
}

/** Capability-gated staff Delivery dashboard across customer implementations. */
export async function getOperatorDeliveryDashboard(
  operator: PlatformOperatorContext,
) {
  requireOperator(operator);
  const [metrics, projects, tasks] = await Promise.all([
    getDeliveryDashboardMetrics({ managerView: true }),
    listDeliveryProjects({ managerView: true }),
    listDeliveryTasks({ managerView: true }),
  ]);
  return { metrics, projects, tasks };
}

/** Capability-gated Delivery project list across customer implementations. */
export async function listOperatorDeliveryProjects(
  operator: PlatformOperatorContext,
  input?: { limit?: number },
) {
  requireOperator(operator);
  return listDeliveryProjects({ managerView: true, limit: input?.limit });
}

/** Capability-gated Delivery task list across customer implementations. */
export async function listOperatorDeliveryTasks(
  operator: PlatformOperatorContext,
) {
  requireOperator(operator);
  return listDeliveryTasks({ managerView: true });
}

/** Capability-gated Delivery project detail across customer organisations. */
export async function getOperatorDeliveryProject(
  operator: PlatformOperatorContext,
  projectId: string,
) {
  requireOperator(operator);
  return getDeliveryProject(projectId);
}

import {
  isPlatformOperatorContext,
  type PlatformOperatorContext,
} from "../access/platform-operator-context";
import {
  getCommandCentreDeliveryAlerts,
  getDeliveryDashboardMetrics,
  getDeliveryProject,
  listDeliveryProjects,
  listDeliveryTasks,
} from "../delivery";
import { updateOrganisationFeatureFlags } from "../features/flags";
import { listPlatformOpportunities } from "../opportunity-engine";
import { buildCommissionsWorkspace } from "../partners/commissions-workspace";
import { listAllCommissions, listPartners } from "../partners/crud";
import { buildPartnerDashboardWorkspace } from "../partners/dashboard-workspace";
import { buildReferralsWorkspace } from "../partners/referrals-workspace";
import { completeTask, resolveDigitalGateOperatorOrganisationId } from "../tasks";
import { generateClientAdvisorInsight } from "./advisor";
import { getCommandBenchmarks } from "./benchmarks";
import { getClientIntelligence } from "./client-intelligence";
import { getCommandFeatureFlagsOverview } from "./flags-admin";
import { getGrowthConversionSnapshot, getGrowthFollowUpQueue } from "./growth-engine";
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

export async function getOperatorCommandCentreOpsHome(operator: PlatformOperatorContext) {
  requireOperator(operator);
  return getCommandCentreOpsHome();
}

export async function getOperatorClientIntelligence(operator: PlatformOperatorContext) {
  requireOperator(operator);
  return getClientIntelligence();
}

export async function generateOperatorClientAdvisorInsight(
  operator: PlatformOperatorContext,
  input: { organisationId: string; question?: string },
) {
  requireOperator(operator);
  return generateClientAdvisorInsight(input);
}

export async function getOperatorCommandBenchmarks(
  operator: PlatformOperatorContext,
  input?: { organisationId?: string },
) {
  requireOperator(operator);
  return getCommandBenchmarks(input);
}

export async function getOperatorGrowthReports(
  operator: PlatformOperatorContext,
  input?: { period?: GrowthReportPeriod; organisationId?: string },
) {
  requireOperator(operator);
  return getGrowthReports(input);
}

export async function getOperatorClientExpansionOpportunities(operator: PlatformOperatorContext) {
  requireOperator(operator);
  return getClientExpansionOpportunities();
}

/**
 * Cross-organisation Growth Engine aggregates. These read the idle-prospect
 * queue / conversion funnel across ALL organisations, so they are operator-only
 * platform views and must be reached through the branded operator capability —
 * never directly from a route relying on layout gating alone.
 */
export async function getOperatorGrowthFollowUpQueue(
  operator: PlatformOperatorContext,
  input?: { idleDays?: number; limit?: number },
) {
  requireOperator(operator);
  return getGrowthFollowUpQueue(input);
}

export async function getOperatorGrowthConversionSnapshot(
  operator: PlatformOperatorContext,
  input?: { days?: number },
) {
  requireOperator(operator);
  return getGrowthConversionSnapshot(input);
}

export async function listOperatorPlatformOpportunities(
  operator: PlatformOperatorContext,
  input?: { limit?: number },
) {
  requireOperator(operator);
  return listPlatformOpportunities({ scope: "staff", limit: input?.limit });
}

export async function getOperatorPlatformAlertsCentre(operator: PlatformOperatorContext) {
  requireOperator(operator);
  return getPlatformAlertsCentre();
}

export async function getOperatorPlatformAlertsBadgeCount(operator: PlatformOperatorContext) {
  requireOperator(operator);
  return getPlatformAlertsBadgeCount();
}

export async function getOperatorCommandFeatureFlagsOverview(operator: PlatformOperatorContext) {
  requireOperator(operator);
  return getCommandFeatureFlagsOverview();
}

export async function updateOperatorOrganisationFeatureFlags(
  operator: PlatformOperatorContext,
  input: { organisationId: string; flags: Record<string, boolean> },
) {
  requireOperator(operator);
  return updateOrganisationFeatureFlags({ ...input, actorId: operator.actorId });
}

export async function getOperatorCommandMrrAttribution(operator: PlatformOperatorContext) {
  requireOperator(operator);
  return getCommandMrrAttribution();
}

export async function getOperatorCommissionsWorkspace(operator: PlatformOperatorContext) {
  requireOperator(operator);
  return buildCommissionsWorkspace();
}

export async function getOperatorPartnerDashboardWorkspace(operator: PlatformOperatorContext) {
  requireOperator(operator);
  return buildPartnerDashboardWorkspace();
}

export async function getOperatorPartnerReferralsWorkspace(operator: PlatformOperatorContext) {
  requireOperator(operator);
  return buildReferralsWorkspace();
}

export async function listOperatorPaidCommissions(
  operator: PlatformOperatorContext,
  input?: { limit?: number },
) {
  requireOperator(operator);
  return listAllCommissions({ status: "PAID", limit: input?.limit ?? 100 });
}

/**
 * Complete a DigitalGate operator-organisation CRM task from Command Centre.
 * The target organisation is resolved server-side so the mutation cannot drift
 * to whichever customer organisation happens to be active in the shell.
 */
export async function completeOperatorCommandTask(
  operator: PlatformOperatorContext,
  taskId: string,
) {
  requireOperator(operator);
  const organisationId = await resolveDigitalGateOperatorOrganisationId();
  if (!organisationId) return null;
  return completeTask(organisationId, taskId, operator.actorId);
}

export async function getOperatorDeliveryDashboard(operator: PlatformOperatorContext) {
  requireOperator(operator);
  const [metrics, projects, tasks] = await Promise.all([
    getDeliveryDashboardMetrics({ managerView: true }),
    listDeliveryProjects({ managerView: true }),
    listDeliveryTasks({ managerView: true }),
  ]);
  return { metrics, projects, tasks };
}

export async function getOperatorDeliverySectionWorkspace(operator: PlatformOperatorContext) {
  requireOperator(operator);
  const [projects, metrics, alerts, tasks] = await Promise.all([
    listDeliveryProjects({ managerView: true, limit: 100 }),
    getDeliveryDashboardMetrics({ managerView: true }),
    getCommandCentreDeliveryAlerts(),
    listDeliveryTasks({ managerView: true }),
  ]);
  return { projects, metrics, alerts, tasks };
}

export async function listOperatorDeliveryProjects(
  operator: PlatformOperatorContext,
  input?: { limit?: number },
) {
  requireOperator(operator);
  return listDeliveryProjects({ managerView: true, limit: input?.limit });
}

export async function listOperatorDeliveryTasks(operator: PlatformOperatorContext) {
  requireOperator(operator);
  return listDeliveryTasks({ managerView: true });
}

export async function getOperatorDeliveryProject(
  operator: PlatformOperatorContext,
  projectId: string,
) {
  requireOperator(operator);
  return getDeliveryProject(projectId);
}

export async function listOperatorDeliveryPartners(
  operator: PlatformOperatorContext,
  input?: { limit?: number },
) {
  requireOperator(operator);
  return listPartners({ partnerType: "IMPLEMENTATION_PARTNER", limit: input?.limit ?? 100 });
}

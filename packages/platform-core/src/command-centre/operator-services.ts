import {
  isPlatformOperatorContext,
  type PlatformOperatorContext,
} from "../access/platform-operator-context";
import { updateOrganisationFeatureFlags } from "../features/flags";
import { getCommandBenchmarks } from "./benchmarks";
import { getClientIntelligence } from "./client-intelligence";
import { getCommandFeatureFlagsOverview } from "./flags-admin";
import { getClientExpansionOpportunities } from "./opportunities";
import { getCommandCentreOpsHome } from "./overview";
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

/** Capability-gated cohort benchmarks. */
export async function getOperatorCommandBenchmarks(
  operator: PlatformOperatorContext,
  input?: { organisationId?: string },
) {
  requireOperator(operator);
  return getCommandBenchmarks(input);
}

/** Capability-gated client expansion opportunities. */
export async function getOperatorClientExpansionOpportunities(
  operator: PlatformOperatorContext,
) {
  requireOperator(operator);
  return getClientExpansionOpportunities();
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

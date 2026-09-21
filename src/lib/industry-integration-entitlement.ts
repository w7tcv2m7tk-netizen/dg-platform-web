import { checkOrgIndustryIntegrationEntitlement } from "@dg/platform-core";

export type IndustryIntegrationAccess =
  | { ok: true; tier: "business" | "enterprise" }
  | { ok: false; status: 403; code: "industry_integration_plan_required" | "industry_app_required"; message: string };

export async function checkIndustryIntegrationAccess(
  organisationId: string,
  relevantAppIds: string[],
): Promise<IndustryIntegrationAccess> {
  const result = await checkOrgIndustryIntegrationEntitlement(organisationId, relevantAppIds);
  if (result.ok) return result;
  return {
    ok: false,
    status: 403,
    code: result.reason,
    message: result.message,
  };
}

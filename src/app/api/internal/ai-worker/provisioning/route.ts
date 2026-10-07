import { executeProvision, productionDatabaseConfigured, provisioningConfig, readProvisionBody, verifyProvisionRequest } from "@dg/platform-core/ai/local-worker-provisioning";
import { provisioningAudit } from "@dg/platform-core/ai/local-worker-provisioning-audit";
import { prisma } from "@dg/database";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const response = (body: unknown, status: number) => Response.json(body, { status, headers: { "Cache-Control": "no-store", "Pragma": "no-cache", "X-Content-Type-Options": "nosniff" } });

export async function POST(req: Request) {
  const config = provisioningConfig(process.env);
  if (!config || !productionDatabaseConfigured(process.env)) { provisioningAudit("outcome", "disabled"); return response({ code: "provisioning_disabled" }, 403); }
  const bytes = await readProvisionBody(req);
  const verified = bytes && verifyProvisionRequest(req, bytes, config);
  if (!verified) { provisioningAudit("outcome", "unauthorized"); return response({ code: "provisioning_unauthorized" }, 401); }
  const audit = { fingerprint: verified.fingerprint, requestId: verified.nonce, operation: verified.operation };
  provisioningAudit("attempt", "verified", audit);
  try {
    const result = await executeProvision(verified, config, prisma);
    if ("code" in result) { provisioningAudit("outcome", "rejected", audit); return response({ code: result.code }, result.code === "rate_limited" ? 429 : 409); }
    provisioningAudit("outcome", "succeeded", { ...audit, workerId: result.workerId, deploymentId: result.deploymentId });
    // Only successful response contains plaintext. No logger/telemetry receives it.
    return response(result, 200);
  } catch { provisioningAudit("outcome", "unavailable", audit); return response({ code: "provisioning_unavailable" }, 503); }
}
export const GET = () => response({ code: "method_not_allowed" }, 405);
export const PUT = GET;
export const PATCH = GET;
export const DELETE = GET;
export const OPTIONS = GET;
export const HEAD = GET;
export const maxDuration = 15;

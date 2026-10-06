import { approveAiLocalRecipient } from "@dg/platform-core";
import { NextResponse } from "next/server";
import { isNextResponse, requirePlatformAuth, sessionIsOrgAdmin } from "@/lib/platform-api";

export async function POST(req: Request) {
  const session = await requirePlatformAuth(req);
  if (isNextResponse(session)) return session;
  if (!sessionIsOrgAdmin(session)) return NextResponse.json({ error: { code: "forbidden" } }, { status: 403 });
  let body: { deploymentId?: unknown; classificationCeiling?: unknown };
  try { body = await req.json(); } catch { return NextResponse.json({ error: { code: "invalid_json" } }, { status: 400 }); }
  if (typeof body.deploymentId !== "string" || !/^[A-Za-z0-9_-]{1,120}$/.test(body.deploymentId) ||
      !["public", "platform_internal", "tenant_confidential", "restricted"].includes(String(body.classificationCeiling))) {
    return NextResponse.json({ error: { code: "invalid_request" } }, { status: 400 });
  }
  try {
    const approval = await approveAiLocalRecipient({ organisationId: session.organisationId,
      deploymentId: body.deploymentId, actorType: "user", actorId: session.clerkUserId,
      classificationCeiling: String(body.classificationCeiling) });
    return NextResponse.json({ data: { id: approval.id, deploymentId: approval.deploymentId,
      classificationCeiling: approval.classificationCeiling, policyVersion: approval.policyVersion } }, { status: 201 });
  } catch (error) {
    const code = error && typeof error === "object" && "code" in error ? String((error as { code: unknown }).code) : "deployment_unavailable";
    return NextResponse.json({ error: { code: ["invalid_classification", "deployment_unavailable"].includes(code) ? code : "approval_unavailable" } }, { status: 409 });
  }
}

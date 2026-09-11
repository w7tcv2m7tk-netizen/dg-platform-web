import {
  applyEmailAuthDns,
  buildEmailDomainAuthPlan,
  getEmailInfrastructureOverview,
  getOrganisationDomain,
  listOrganisationDomains,
  triggerEmailDomainVerify,
  upsertInfrastructureDomain,
} from "@dg/platform-core";
import { NextResponse } from "next/server";

import { isNextResponse, requireFeature, requirePlatformAuth } from "@/lib/platform-api";

export const runtime = "nodejs";

export async function GET(req: Request) {
  const session = await requirePlatformAuth(req);
  if (isNextResponse(session)) return session;
  const denied = requireFeature(session, "infrastructure.read");
  if (denied) return denied;

  const url = new URL(req.url);
  const domain = url.searchParams.get("domain")?.trim();
  const overview = await getEmailInfrastructureOverview(session.organisationId);
  const domains = await listOrganisationDomains(session.organisationId);

  let authPlan = null;
  if (domain) {
    const owned = await getOrganisationDomain(session.organisationId, domain);
    if (!owned) {
      return NextResponse.json(
        { error: { code: "not_found", message: "Domain not found in this organisation." } },
        { status: 404 },
      );
    }
    authPlan = await buildEmailDomainAuthPlan({
      domain: owned.name,
      organisationId: session.organisationId,
      ensure: false,
    });
  }

  return NextResponse.json({ data: { overview, domains, authPlan } });
}

export async function POST(req: Request) {
  const session = await requirePlatformAuth(req);
  if (isNextResponse(session)) return session;
  const denied = requireFeature(session, "infrastructure.write");
  if (denied) return denied;

  const body = (await req.json().catch(() => null)) as { action?: string; domain?: string } | null;
  const action = body?.action?.trim();
  const domainRaw = body?.domain?.trim();
  if (!action || !domainRaw || !["prepare", "apply", "verify"].includes(action)) {
    return NextResponse.json(
      { error: { code: "validation_error", message: "Choose a valid email action and domain." } },
      { status: 400 },
    );
  }

  const owned = await getOrganisationDomain(session.organisationId, domainRaw);
  if (!owned) {
    return NextResponse.json(
      { error: { code: "not_found", message: "Domain not found in this organisation." } },
      { status: 404 },
    );
  }

  try {
    if (action === "prepare") {
      const authPlan = await buildEmailDomainAuthPlan({
        domain: owned.name,
        organisationId: session.organisationId,
        ensure: true,
      });
      if (authPlan.resendDomainId) {
        await upsertInfrastructureDomain({
          organisationId: session.organisationId,
          name: owned.name,
          metadata: {
            ...(owned.metadata ?? {}),
            resendDomainId: authPlan.resendDomainId,
            resendStatus: authPlan.resendStatus,
          },
        });
      }
      return NextResponse.json({ data: { action, authPlan, message: "Sending domain prepared." } });
    }

    if (action === "apply") {
      const result = await applyEmailAuthDns({
        domain: owned.name,
        organisationId: session.organisationId,
        verifyAfter: true,
      });
      await upsertInfrastructureDomain({
        organisationId: session.organisationId,
        name: owned.name,
        dnsConfiguredAt: new Date().toISOString(),
        metadata: {
          ...(owned.metadata ?? {}),
          resendDomainId: result.plan.resendDomainId,
          resendStatus: result.plan.resendStatus,
          emailAuthAppliedAt: new Date().toISOString(),
        },
      });
      return NextResponse.json({
        data: {
          action,
          authPlan: result.plan,
          verify: { ok: result.verify?.ok, status: result.plan.resendStatus },
          message: "Email authentication DNS applied.",
        },
      });
    }

    const verified = await triggerEmailDomainVerify({
      domain: owned.name,
      organisationId: session.organisationId,
    });
    if (verified.plan.resendDomainId) {
      await upsertInfrastructureDomain({
        organisationId: session.organisationId,
        name: owned.name,
        metadata: {
          ...(owned.metadata ?? {}),
          resendDomainId: verified.plan.resendDomainId,
          resendStatus: verified.plan.resendStatus,
        },
      });
    }
    return NextResponse.json({
      data: {
        action,
        authPlan: verified.plan,
        ok: verified.ok,
        message: verified.ok ? "Email domain verified." : "Email domain verification is still pending.",
      },
    });
  } catch {
    return NextResponse.json(
      { error: { code: "email_action_failed", message: "Email infrastructure action could not be completed." } },
      { status: 502 },
    );
  }
}

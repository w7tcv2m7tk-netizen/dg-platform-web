import {
  DreamscapeApiError,
  InfrastructureNotConfiguredError,
  applyEmailAuthDns,
  buildEmailDomainAuthPlan,
  getEmailInfrastructureOverview,
  getOrganisationDomain,
  listOrganisationDomains,
  triggerEmailDomainVerify,
  upsertInfrastructureDomain,
} from "@dg/platform-core";
import { NextResponse } from "next/server";

import { isNextResponse, requirePlatformAuth } from "@/lib/platform-api";

export const runtime = "nodejs";

/** GET /api/v1/infrastructure/email — overview (+ optional ?domain= auth plan) */
export async function GET(req: Request) {
  const session = await requirePlatformAuth(req);
  if (isNextResponse(session)) return session;

  const url = new URL(req.url);
  const domain = url.searchParams.get("domain")?.trim();
  const ensure = url.searchParams.get("ensure") === "1";

  const overview = await getEmailInfrastructureOverview(
    session.organisationId,
  );
  const domains = await listOrganisationDomains(session.organisationId);

  let authPlan = null;
  if (domain) {
    const owned = await getOrganisationDomain(
      session.organisationId,
      domain,
    );
    if (!owned) {
      return NextResponse.json(
        {
          error: {
            code: "not_found",
            message:
              "Domain not in inventory — connect it under Domains first",
          },
        },
        { status: 404 },
      );
    }
    authPlan = await buildEmailDomainAuthPlan({
      domain: owned.name,
      organisationId: session.organisationId,
      ensure,
    });
  }

  return NextResponse.json({
    data: {
      overview,
      domains,
      authPlan,
    },
  });
}

/**
 * POST /api/v1/infrastructure/email
 * Body: { action: "prepare" | "apply" | "verify", domain: string }
 */
export async function POST(req: Request) {
  const session = await requirePlatformAuth(req);
  if (isNextResponse(session)) return session;

  const body = (await req.json().catch(() => null)) as {
    action?: string;
    domain?: string;
  } | null;

  const action = body?.action?.trim();
  const domainRaw = body?.domain?.trim();
  if (!action || !domainRaw) {
    return NextResponse.json(
      {
        error: {
          code: "validation_error",
          message: "action and domain are required",
        },
      },
      { status: 400 },
    );
  }
  if (!["prepare", "apply", "verify"].includes(action)) {
    return NextResponse.json(
      {
        error: {
          code: "validation_error",
          message: "action must be prepare | apply | verify",
        },
      },
      { status: 400 },
    );
  }

  const owned = await getOrganisationDomain(
    session.organisationId,
    domainRaw,
  );
  if (!owned) {
    return NextResponse.json(
      {
        error: {
          code: "not_found",
          message:
            "Domain not in inventory — connect it under Domains first",
        },
      },
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
      return NextResponse.json({
        data: {
          action,
          authPlan,
          message: authPlan.note || "Sending domain ready",
        },
      });
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
          records: result.records,
          authPlan: result.plan,
          verify: result.verify,
          message: result.verify?.ok
            ? "Auth DNS applied — verification requested"
            : "Auth DNS applied",
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
        message: verified.ok
          ? `Verification status: ${verified.plan.resendStatus ?? "pending"}`
          : verified.error || "Verification failed",
      },
    });
  } catch (err) {
    if (err instanceof InfrastructureNotConfiguredError) {
      return NextResponse.json(
        { error: { code: err.code, message: err.message } },
        { status: 503 },
      );
    }
    if (err instanceof DreamscapeApiError) {
      return NextResponse.json(
        {
          error: {
            code: err.code ?? "provider_error",
            message: err.message,
            hint: err.hint,
            providerBodySnippet: err.providerBodySnippet,
          },
        },
        { status: err.status === 422 ? 422 : 502 },
      );
    }
    return NextResponse.json(
      {
        error: {
          code: "provider_error",
          message: err instanceof Error ? err.message : "Email action failed",
        },
      },
      { status: 502 },
    );
  }
}

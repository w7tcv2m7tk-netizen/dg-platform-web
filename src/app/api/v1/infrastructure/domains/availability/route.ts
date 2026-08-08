import {
  DreamscapeApiError,
  InfrastructureNotConfiguredError,
  InfrastructureNotImplementedError,
  getDomainProvider,
  isDreamscapeConfigured,
  resolveDreamscapeConfig,
  type DomainAvailability,
} from "@dg/platform-core";
import { NextResponse } from "next/server";

import { isNextResponse, requirePlatformAuth } from "@/lib/platform-api";

/**
 * GET /api/v1/infrastructure/domains/availability?q=example.com.au
 *
 * Browser → DigitalGate API → Dreamscape (server-side key only).
 * Sandbox-first: defaults to reseller-api.sandbox.ds.network.
 */
export async function GET(req: Request) {
  const session = await requirePlatformAuth(req);
  if (isNextResponse(session)) return session;

  const url = new URL(req.url);
  const q = url.searchParams.get("q")?.trim() ?? "";
  const fromArray = url.searchParams.getAll("domain_names[]");
  const query = [q, ...fromArray].filter(Boolean).join(",");

  if (!query) {
    return NextResponse.json(
      {
        error: {
          code: "validation_error",
          message: "Query parameter q (or domain_names[]) is required",
        },
      },
      { status: 400 },
    );
  }

  const { baseUrl, isSandbox } = resolveDreamscapeConfig();
  const configured = isDreamscapeConfigured();

  if (!configured) {
    return NextResponse.json({
      configured: false,
      provider: null,
      baseUrl,
      isSandbox,
      data: [] as DomainAvailability[],
      error: {
        code: "provider_not_configured",
        message:
          "Domain provider is not configured. Set DREAMSCAPE_API_KEY against the sandbox API first.",
        hint: "Reseller Console (sandbox) → Account Settings → API & WHMCS → API Setup",
      },
    });
  }

  const provider = getDomainProvider();
  if (!provider) {
    return NextResponse.json({
      configured: false,
      provider: null,
      baseUrl,
      isSandbox,
      data: [] as DomainAvailability[],
      error: {
        code: "provider_not_configured",
        message: "No domain provider available",
      },
    });
  }

  try {
    const data = await provider.search(query);
    return NextResponse.json({
      configured: true,
      provider: provider.id,
      baseUrl,
      isSandbox,
      data,
    });
  } catch (err) {
    if (err instanceof InfrastructureNotConfiguredError) {
      return NextResponse.json({
        configured: false,
        provider: provider.id,
        baseUrl,
        isSandbox,
        data: [] as DomainAvailability[],
        error: { code: err.code, message: err.message },
      });
    }

    if (err instanceof DreamscapeApiError) {
      return NextResponse.json(
        {
          configured: true,
          provider: provider.id,
          baseUrl,
          isSandbox,
          data: [] as DomainAvailability[],
          error: {
            code: "provider_error",
            message: err.message,
            status: err.status,
          },
        },
        {
          status:
            err.status === 401
              ? 502
              : err.status >= 400 && err.status < 500
                ? 400
                : 502,
        },
      );
    }

    if (err instanceof InfrastructureNotImplementedError) {
      return NextResponse.json(
        { error: { code: "not_implemented", message: err.message } },
        { status: 501 },
      );
    }

    const message =
      err instanceof Error ? err.message : "Domain availability check failed";
    return NextResponse.json(
      {
        configured: true,
        provider: provider.id,
        baseUrl,
        isSandbox,
        data: [] as DomainAvailability[],
        error: { code: "provider_error", message },
      },
      { status: 502 },
    );
  }
}

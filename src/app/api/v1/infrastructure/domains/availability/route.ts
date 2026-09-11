import {
  DreamscapeApiError,
  InfrastructureNotConfiguredError,
  InfrastructureNotImplementedError,
  getDomainProvider,
  isDreamscapeConfigured,
  type DomainAvailability,
} from "@dg/platform-core";
import { NextResponse } from "next/server";

import { isNextResponse, requireFeature, requirePlatformAuth } from "@/lib/platform-api";

export const runtime = "nodejs";

/** GET /api/v1/infrastructure/domains/availability?q=example.com.au */
export async function GET(req: Request) {
  const session = await requirePlatformAuth(req);
  if (isNextResponse(session)) return session;
  const denied = requireFeature(session, "infrastructure.read");
  if (denied) return denied;

  const url = new URL(req.url);
  const q = url.searchParams.get("q")?.trim() ?? "";
  const fromArray = url.searchParams.getAll("domain_names[]");
  const query = [q, ...fromArray].filter(Boolean).join(",");

  if (!query) {
    return NextResponse.json(
      {
        error: {
          code: "validation_error",
          message: "Enter a domain name to check.",
        },
      },
      { status: 400 },
    );
  }

  if (!isDreamscapeConfigured()) {
    return NextResponse.json(
      {
        configured: false,
        data: [] as DomainAvailability[],
        error: {
          code: "provider_not_configured",
          message: "Domain search is temporarily unavailable.",
        },
      },
      { status: 503 },
    );
  }

  const provider = getDomainProvider();
  if (!provider) {
    return NextResponse.json(
      {
        configured: false,
        data: [] as DomainAvailability[],
        error: {
          code: "provider_not_configured",
          message: "Domain search is temporarily unavailable.",
        },
      },
      { status: 503 },
    );
  }

  try {
    const data = await provider.search(query);
    return NextResponse.json({ configured: true, data });
  } catch (err) {
    if (err instanceof InfrastructureNotConfiguredError) {
      return NextResponse.json(
        {
          configured: false,
          data: [] as DomainAvailability[],
          error: {
            code: "provider_not_configured",
            message: "Domain search is temporarily unavailable.",
          },
        },
        { status: 503 },
      );
    }

    if (err instanceof DreamscapeApiError) {
      return NextResponse.json(
        {
          configured: true,
          data: [] as DomainAvailability[],
          error: {
            code: "provider_error",
            message: "We couldn't check domain availability right now. Please try again.",
          },
        },
        { status: err.status >= 400 && err.status < 500 ? 400 : 502 },
      );
    }

    if (err instanceof InfrastructureNotImplementedError) {
      return NextResponse.json(
        {
          configured: true,
          data: [] as DomainAvailability[],
          error: {
            code: "unavailable",
            message: "Domain search is temporarily unavailable.",
          },
        },
        { status: 503 },
      );
    }

    return NextResponse.json(
      {
        configured: true,
        data: [] as DomainAvailability[],
        error: {
          code: "provider_error",
          message: "We couldn't check domain availability right now. Please try again.",
        },
      },
      { status: 502 },
    );
  }
}

import { processDueFollowupEmails } from "@dg/platform-core";
import { NextResponse } from "next/server";

import { authorizeCronRequest } from "@/lib/cron-auth";

const TRANSIENT_DATABASE_CODES = new Set(["P1001", "P1002", "P1017"]);

function prismaCode(error: unknown): string | null {
  if (!error || typeof error !== "object" || !("code" in error)) return null;
  const code = (error as { code?: unknown }).code;
  return typeof code === "string" ? code : null;
}

/**
 * Hourly cron — property-report, free-audit, hideaway-circle, and
 * Platform Consultation reminder emails when due.
 * Secure with CRON_SECRET (Authorization: Bearer …).
 */
export async function GET(req: Request) {
  const auth = authorizeCronRequest(req);
  if (!auth.ok) {
    return NextResponse.json(
      { error: { code: auth.code, message: auth.message } },
      { status: auth.code === "cron_not_configured" ? 503 : 401 },
    );
  }

  if (!process.env.DATABASE_URL) {
    return NextResponse.json(
      {
        error: {
          code: "database_not_configured",
          message: "DATABASE_URL not set",
        },
      },
      { status: 503 },
    );
  }

  try {
    const result = await processDueFollowupEmails({ limit: 50 });
    return NextResponse.json({ data: result });
  } catch (error) {
    const code = prismaCode(error);
    if (code && TRANSIENT_DATABASE_CODES.has(code)) {
      console.warn("[lead-followups] transient database failure; safe to retry", { code });
      return NextResponse.json(
        {
          error: {
            code: "database_temporarily_unavailable",
            message: "Database temporarily unavailable; follow-ups were not processed.",
          },
          retryable: true,
        },
        { status: 503, headers: { "Retry-After": "60" } },
      );
    }
    throw error;
  }
}

export async function POST(req: Request) {
  return GET(req);
}

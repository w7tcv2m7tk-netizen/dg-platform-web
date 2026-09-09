import { submitPublicPlatformDiscovery } from "@dg/platform-core";
import { NextResponse } from "next/server";

import { spamGuardResponse } from "@/lib/public-form-spam-response";

function escapeHtmlText(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function safeReportUrl(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) return "";
  if (trimmed.startsWith("/") && !trimmed.startsWith("//")) {
    return escapeHtmlText(trimmed);
  }
  try {
    const parsed = new URL(trimmed);
    return parsed.protocol === "https:" ? escapeHtmlText(parsed.toString()) : "";
  } catch {
    return "";
  }
}

/**
 * The public discovery UI renders recommendation fields into a controlled HTML
 * results template after hydration. Treat every string returned by the AI/core
 * workflow as untrusted before it crosses that browser HTML sink.
 */
function neutraliseDiscoveryHtmlSink(value: unknown, key?: string): unknown {
  if (typeof value === "string") {
    return key === "audit_report_url" ? safeReportUrl(value) : escapeHtmlText(value);
  }
  if (Array.isArray(value)) {
    return value.map((item) => neutraliseDiscoveryHtmlSink(item));
  }
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>).map(([entryKey, entryValue]) => [
        entryKey,
        neutraliseDiscoveryHtmlSink(entryValue, entryKey),
      ]),
    );
  }
  return value;
}

/**
 * Public AI Platform Discovery form on digitalgate.com.au/discover/
 * Replaces WP `/wp-json/digitalgate/v1/discovery`.
 */
export async function POST(req: Request) {
  const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
  if (!body) {
    return NextResponse.json(
      { success: false, message: "JSON body required" },
      { status: 422 },
    );
  }

  const blocked = spamGuardResponse(req, body, "discovery");
  if (blocked) return blocked;

  const result = await submitPublicPlatformDiscovery({
    ...body,
    siteSlug: typeof body.siteSlug === "string" ? body.siteSlug : "digitalgate",
  });

  if (!result.ok) {
    return NextResponse.json(
      { success: false, message: result.message, code: result.code },
      { status: result.code === "validation_error" ? 422 : 500 },
    );
  }

  const { ok: _ok, ...payload } = result;
  return NextResponse.json(neutraliseDiscoveryHtmlSink(payload));
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204 });
}

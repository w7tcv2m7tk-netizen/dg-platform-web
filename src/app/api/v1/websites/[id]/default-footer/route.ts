import { readFile } from "node:fs/promises";
import path from "node:path";
import { NextResponse } from "next/server";

import { organisationHasWebsitesBuilder } from "@dg/platform-core";
import { isNextResponse, requirePlatformAuth } from "@/lib/platform-api";
import { canAccessWebsiteStudio } from "@/lib/website-studio-access";

type Ctx = { params: Promise<{ id: string }> };

/**
 * Canonical default site footer (marketing/pages/footer.html) for the Studio
 * "Reset footer to default" action. Read-only; the file is bundled into this
 * function via `outputFileTracingIncludes` in next.config.ts.
 */
export async function GET(req: Request, ctx: Ctx) {
  const session = await requirePlatformAuth(req);
  if (isNextResponse(session)) return session;
  await ctx.params;

  if (!canAccessWebsiteStudio(session, "view")) {
    return NextResponse.json(
      { error: { code: "forbidden", message: "Insufficient permissions for websites.view" } },
      { status: 403 },
    );
  }

  const allowed = await organisationHasWebsitesBuilder(session.organisationId);
  if (!allowed) {
    return NextResponse.json(
      { error: { code: "feature_disabled", message: "Website Builder disabled" } },
      { status: 403 },
    );
  }

  try {
    const filePath = path.join(process.cwd(), "marketing/pages/footer.html");
    const footerHtml = await readFile(filePath, "utf8");
    return NextResponse.json({ data: { footerHtml } });
  } catch {
    return NextResponse.json(
      { error: { code: "not_found", message: "Default footer unavailable" } },
      { status: 404 },
    );
  }
}

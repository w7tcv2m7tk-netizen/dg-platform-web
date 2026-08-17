import {
  lookupHideawayCircleRewardForSite,
  submitHideawayCircleJoin,
} from "@dg/platform-core";
import { NextResponse } from "next/server";

function siteSlugFrom(req: Request, bodySite?: string | null) {
  if (bodySite?.trim()) return bodySite.trim();
  try {
    const url = new URL(req.url);
    const q = url.searchParams.get("site");
    if (q?.trim()) return q.trim();
  } catch {
    /* ignore */
  }
  return "currumbin-valley-hideaway";
}

function hostnameFrom(req: Request) {
  return (
    req.headers.get("x-forwarded-host")?.split(",")[0]?.trim() ||
    req.headers.get("host")?.split(":")[0]?.trim() ||
    ""
  ).toLowerCase();
}

/**
 * Public Hideaway Circle join (CVH Gen 2).
 * Actions: submit | lookup
 */
export async function POST(req: Request) {
  const body = (await req.json().catch(() => null)) as {
    action?: string;
    siteSlug?: string;
    firstName?: string;
    lastName?: string;
    email?: string;
    phone?: string;
    birthdayMonth?: number | null;
    anniversaryDate?: string | null;
    interests?: string[];
    topics?: string[];
    joinSource?: string;
    stage?: "email" | "complete";
    /** honeypot */
    website?: string;
    websiteHp?: string;
  } | null;

  if (!body) {
    return NextResponse.json(
      { error: { code: "validation_error", message: "JSON body required" } },
      { status: 422 },
    );
  }

  const siteSlug = siteSlugFrom(req, body.siteSlug);
  const hostname = hostnameFrom(req);
  const action = (body.action || "submit").trim().toLowerCase();

  if (action === "lookup") {
    const result = await lookupHideawayCircleRewardForSite({
      siteSlug,
      hostname,
      email: body.email ?? "",
    });
    if (!result.ok) {
      return NextResponse.json(
        { error: { code: result.code, message: result.message } },
        { status: 400 },
      );
    }
    return NextResponse.json({ data: result });
  }

  if (action === "submit") {
    const result = await submitHideawayCircleJoin({
      siteSlug,
      hostname,
      firstName: body.firstName ?? "",
      lastName: body.lastName ?? "",
      email: body.email ?? "",
      phone: body.phone ?? "",
      birthdayMonth: body.birthdayMonth,
      anniversaryDate: body.anniversaryDate,
      interests: body.interests,
      topics: body.topics,
      joinSource: body.joinSource,
      stage: body.stage,
      website: body.websiteHp ?? body.website,
    });
    if (!result.ok) {
      return NextResponse.json(
        { error: { code: result.code, message: result.message } },
        { status: result.code === "validation_error" ? 422 : 400 },
      );
    }
    return NextResponse.json({ data: result });
  }

  return NextResponse.json(
    {
      error: {
        code: "unknown_action",
        message: "Supported: submit, lookup",
      },
    },
    { status: 400 },
  );
}

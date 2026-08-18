import { captureDgEnquiry, type DgEnquiryType } from "@dg/platform-core";
import { NextResponse } from "next/server";

type EnquiryBody = {
  type?: string;
  name?: string;
  full_name?: string;
  email?: string;
  phone?: string;
  businessName?: string;
  business_name?: string;
  website?: string;
  business_website?: string;
  industry?: string;
  teamSize?: string;
  team_size?: string;
  currentSystems?: string;
  current_software?: string;
  wantToSolve?: string;
  want_to_solve?: string;
  appsInterest?: string[];
  apps_interest?: string[];
  agreedFoundingTerms?: boolean;
  agree_founding_terms?: string;
  interestedIn?: string[];
  interested_in?: string[];
  achieve?: string[];
  heardAbout?: string;
  heard_about?: string;
  message?: string;
  date?: string;
  time?: string;
  notes?: string;
  form_type?: string;
  honeypot?: string;
  website_hp?: string;
  websiteHp?: string;
  siteSlug?: string;
};

function asList(value: unknown): string[] | undefined {
  if (Array.isArray(value)) {
    const items = value.map(String).map((v) => v.trim()).filter(Boolean);
    return items.length ? items : undefined;
  }
  if (typeof value === "string" && value.trim()) return [value.trim()];
  return undefined;
}

function inferType(body: EnquiryBody): DgEnquiryType {
  const raw = body.type?.trim();
  if (raw === "contact" || raw === "founding_10" || raw === "consultation") {
    return raw;
  }
  if (
    body.form_type === "founding_customer_application" ||
    body.agree_founding_terms === "yes" ||
    Boolean(body.want_to_solve || body.wantToSolve)
  ) {
    return "founding_10";
  }
  if (body.date?.trim() || body.time?.trim() || body.notes?.trim()) {
    return "consultation";
  }
  return "contact";
}

async function readBody(req: Request): Promise<EnquiryBody | null> {
  const contentType = req.headers.get("content-type") || "";
  if (contentType.includes("application/json")) {
    return (await req.json().catch(() => null)) as EnquiryBody | null;
  }
  if (
    contentType.includes("application/x-www-form-urlencoded") ||
    contentType.includes("multipart/form-data")
  ) {
    const form = await req.formData().catch(() => null);
    if (!form) return null;
    const body: EnquiryBody = {};
    const arrays = new Set(["interested_in", "achieve", "apps_interest"]);
    for (const key of new Set(form.keys())) {
      if (arrays.has(key)) {
        (body as Record<string, unknown>)[key] = form
          .getAll(key)
          .map(String)
          .filter(Boolean);
      } else {
        const value = form.get(key);
        if (value != null) (body as Record<string, unknown>)[key] = String(value);
      }
    }
    return body;
  }
  return (await req.json().catch(() => null)) as EnquiryBody | null;
}

/**
 * Public Gen 2 enquiry handler — replaces three dead WordPress endpoints:
 *   POST /inc/send-dg-enquiry.php   (Contact, Founding 10)
 *   POST /wp-admin/admin-ajax.php   (Platform Consultation booking)
 */
export async function POST(req: Request) {
  const body = await readBody(req);

  if (!body) {
    return NextResponse.json(
      { error: { code: "validation_error", message: "JSON or form body required" } },
      { status: 422 },
    );
  }

  const type = inferType(body);
  const result = await captureDgEnquiry({
    type,
    name: body.name?.trim() || body.full_name?.trim() || "",
    email: body.email?.trim() || "",
    phone: body.phone?.trim() || undefined,
    businessName: body.businessName?.trim() || body.business_name?.trim() || undefined,
    website: body.website?.trim() || body.business_website?.trim() || undefined,
    industry: body.industry?.trim() || undefined,
    teamSize: body.teamSize?.trim() || body.team_size?.trim() || undefined,
    currentSystems: body.currentSystems?.trim() || body.current_software?.trim() || undefined,
    wantToSolve: body.wantToSolve?.trim() || body.want_to_solve?.trim() || undefined,
    appsInterest: asList(body.appsInterest) ?? asList(body.apps_interest),
    agreedFoundingTerms:
      body.agreedFoundingTerms ??
      (body.agree_founding_terms === "yes" ? true : undefined),
    interestedIn: asList(body.interestedIn) ?? asList(body.interested_in),
    achieve: asList(body.achieve),
    heardAbout: body.heardAbout?.trim() || body.heard_about?.trim() || undefined,
    message: body.message?.trim() || undefined,
    date: body.date?.trim() || undefined,
    time: body.time?.trim() || undefined,
    notes: body.notes?.trim() || undefined,
    honeypot:
      body.honeypot?.trim() ||
      body.website_hp?.trim() ||
      body.websiteHp?.trim() ||
      undefined,
    siteSlug: body.siteSlug?.trim() || undefined,
  });

  if (!result.ok) {
    const status =
      result.code === "not_found"
        ? 404
        : result.code === "validation_error"
          ? 422
          : result.code === "slot_unavailable"
            ? 409
            : 500;
    return NextResponse.json(
      { error: { code: result.code, message: result.message } },
      { status },
    );
  }

  const wantsHtml =
    (req.headers.get("accept") || "").includes("text/html") ||
    (req.headers.get("content-type") || "").includes("form");
  if (wantsHtml) {
    const next = new URL("/contact", req.url);
    if (type === "founding_10") next.pathname = "/founding-customers";
    if (type === "consultation") next.pathname = "/strategy-session";
    next.searchParams.set("sent", "1");
    return NextResponse.redirect(next, 303);
  }

  return NextResponse.json({ data: result }, { status: 201 });
}

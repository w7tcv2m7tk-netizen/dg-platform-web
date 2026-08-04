import { NextResponse } from "next/server";
import { submitOnboarding, type OnboardingPayload } from "@/lib/dg-api";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as OnboardingPayload;

    if (!body.business_name || !body.contact_name || !body.contact_email) {
      return NextResponse.json(
        { error: "business_name, contact_name, and contact_email are required" },
        { status: 400 },
      );
    }

    const result = await submitOnboarding(body);
    return NextResponse.json({ success: true, data: result });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Onboarding failed";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}

export async function GET() {
  return NextResponse.json({
    endpoint: "/api/onboarding",
    method: "POST",
    forwardsTo: `${process.env.DG_API_BASE_URL ?? "https://digitalgate.com.au/wp-json/digitalgate/v1"}/onboarding`,
  });
}

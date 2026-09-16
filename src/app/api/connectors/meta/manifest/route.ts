import { NextResponse } from "next/server";
export async function GET() { return NextResponse.json({ provider: "Meta", capabilities: ["facebook_pages", "instagram_professional", "meta_ads"], callback: "https://app.digitalgate.com.au/api/connectors/meta/callback", enabled: false }); }

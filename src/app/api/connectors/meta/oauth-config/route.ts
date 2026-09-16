import { NextResponse } from "next/server";
export async function GET() { return NextResponse.json({ callback: process.env.META_REDIRECT_URI?.trim() || "https://app.digitalgate.com.au/api/connectors/meta/callback" }); }

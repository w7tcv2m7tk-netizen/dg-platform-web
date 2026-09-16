import { NextResponse } from "next/server";
export async function GET() { const credentials = Boolean(process.env.META_APP_ID?.trim() && process.env.META_APP_SECRET?.trim()); return NextResponse.json({ credentials, callback: true, tokenStore: false, oauth: false, resourceDiscovery: false, evidence: false }); }

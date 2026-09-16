import { NextResponse } from "next/server";
export async function GET() { return NextResponse.json({ appIdConfigured: Boolean(process.env.META_APP_ID?.trim()), appSecretConfigured: Boolean(process.env.META_APP_SECRET?.trim()), redirectUriConfigured: Boolean(process.env.META_REDIRECT_URI?.trim()) }); }

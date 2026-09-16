import { NextResponse } from "next/server";
export async function GET() { return NextResponse.json({ appConfigured: Boolean(process.env.META_APP_ID?.trim() && process.env.META_APP_SECRET?.trim()) }); }

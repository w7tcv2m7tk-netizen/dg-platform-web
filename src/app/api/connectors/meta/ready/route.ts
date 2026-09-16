import { NextResponse } from "next/server";
export async function GET() { const configured = Boolean(process.env.META_APP_ID?.trim() && process.env.META_APP_SECRET?.trim()); return NextResponse.json({ configured }); }

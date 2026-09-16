import { NextResponse } from "next/server";
export async function GET() { return NextResponse.json({ sources: [{ id: "meta-organic", label: "Facebook & Instagram", ready: false }, { id: "meta-ads", label: "Meta Ads", ready: false }] }); }

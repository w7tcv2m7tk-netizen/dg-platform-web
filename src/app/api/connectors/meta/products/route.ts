import { NextResponse } from "next/server";
export async function GET() { return NextResponse.json({ products: ["Facebook Pages", "Instagram Professional", "Meta Ads"] }); }

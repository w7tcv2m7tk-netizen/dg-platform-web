import { NextResponse } from "next/server";
export async function GET() { return NextResponse.json({ appReviewMayBeRequired: true, businessVerificationMayBeRequired: true, advancedAccessMayBeRequired: true }); }

import { NextResponse } from "next/server";
import { requirePlatformOperator } from "@/lib/command-api";
import { isNextResponse } from "@/lib/platform-api";

function retired() {
  return NextResponse.json(
    {
      error: {
        code: "retired_endpoint",
        message: "Founding 10 no longer owns custom pricing. Use /api/v1/billing/custom-offer from the CRM opportunity.",
      },
    },
    { status: 410 },
  );
}

export async function GET(req: Request) {
  const auth = await requirePlatformOperator(req);
  if (isNextResponse(auth)) return auth;
  return retired();
}

export async function POST(req: Request) {
  const auth = await requirePlatformOperator(req);
  if (isNextResponse(auth)) return auth;
  return retired();
}

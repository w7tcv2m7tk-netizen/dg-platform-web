import { NextResponse } from "next/server";
import { suspendPartner } from "@dg/platform-core";

import { requirePlatformOperator } from "@/lib/command-api";
import { isNextResponse } from "@/lib/platform-api";

type Ctx = { params: Promise<{ id: string }> };

export async function POST(req: Request, ctx: Ctx) {
  const auth = await requirePlatformOperator(req);
  if (isNextResponse(auth)) return auth;

  const { id } = await ctx.params;
  const partner = await suspendPartner(id);
  return NextResponse.json({ data: partner });
}

import { NextResponse } from "next/server";
import { isNextResponse, requirePlatformAuth } from "@/lib/platform-api";
export async function GET(req: Request) {
  const session = await requirePlatformAuth(req);
  if (isNextResponse(session)) return session;
  if (!process.env.DATABASE_URL) return NextResponse.json({ data: { count: 0 } });
  const { prisma } = await import("@dg/database");
  const count = await prisma.lead.count({ where: { organisationId: session.organisationId, status: "new", firstResponseAt: null } });
  return NextResponse.json({ data: { count } });
}

import { NextResponse } from "next/server";
import { isNextResponse, requirePlatformAuth } from "@/lib/platform-api";
export async function POST(req: Request) {
  const session = await requirePlatformAuth(req);
  if (isNextResponse(session)) return session;
  if (!process.env.DATABASE_URL) return NextResponse.json({ data: { updated: 0 } });
  const { prisma } = await import("@dg/database");
  const result = await prisma.orgCommunication.updateMany({ where: { organisationId: session.organisationId, deletedAt: null, direction: "inbound", status: { not: "replied" } }, data: { status: "replied" } });
  return NextResponse.json({ data: { updated: result.count } });
}

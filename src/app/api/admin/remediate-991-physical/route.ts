import "server-only";
import { auth } from "@clerk/nextjs/server";
import { PrismaClient } from "@prisma/client";
import { handleRemediate991Physical } from "@/lib/remediate-991-physical";
import { auditPhysical991, refusePhysical991 } from "@/lib/remediate-991-request";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 30;

export async function POST(request: Request): Promise<Response> {
  // Reuses existing server database configuration without reading/returning its URL.
  // No global connector boot, tenant/session provisioning or query/error logging.
  let database: PrismaClient | undefined;
  try {
    return await handleRemediate991Physical(request, {
      userId: async () => (await auth({ acceptsToken: "session_token" })).userId,
      database: () => (database ??= new PrismaClient({ log: [], errorFormat: "minimal" })),
      audit: auditPhysical991,
    });
  } finally {
    if (database) await database.$disconnect().catch(() => undefined);
  }
}
export const GET = refusePhysical991;
export const HEAD = refusePhysical991;
export const OPTIONS = refusePhysical991;
export const PUT = refusePhysical991;
export const PATCH = refusePhysical991;
export const DELETE = refusePhysical991;

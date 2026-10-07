import "server-only";
import { auth } from "@clerk/nextjs/server";
import { PrismaClient } from "@prisma/client";
import { handleReconcile991 } from "@/lib/reconcile-991";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 30;

export async function POST(request: Request): Promise<Response> {
  // Dedicated client: no Prisma query/error logging, no global connector boot,
  // session provisioning, tenant mutation, subprocess or migration execution.
  let database: PrismaClient | undefined;
  try {
    return await handleReconcile991(request, {
      userId: async () => (await auth()).userId,
      database: () => (database ??= new PrismaClient({ log: [], errorFormat: "minimal" })),
    });
  } finally {
    if (database) await database.$disconnect().catch(() => undefined);
  }
}

function refused(): Response {
  return Response.json({ ok: false, operation: "reconcile_991" }, {
    status: 403, headers: { "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff" },
  });
}
export const GET = refused;
export const HEAD = refused;
export const OPTIONS = refused;
export const PUT = refused;
export const PATCH = refused;
export const DELETE = refused;

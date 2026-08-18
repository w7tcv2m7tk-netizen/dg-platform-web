import { NextResponse } from "next/server";

/**
 * Lightweight DB reachability probe for outage triage.
 * Does not require auth — returns only ok/fail + latency (no row data).
 */
export async function GET() {
  const started = Date.now();
  if (!process.env.DATABASE_URL) {
    return NextResponse.json(
      {
        ok: false,
        code: "missing_database_url",
        ms: Date.now() - started,
      },
      { status: 503 },
    );
  }

  try {
    const { prisma } = await import("@dg/database");
    await prisma.$queryRaw`SELECT 1`;
    return NextResponse.json({
      ok: true,
      code: "up",
      ms: Date.now() - started,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "database_unreachable";
    const brief = message.split("\n").find((l) => l.trim())?.slice(0, 200) ?? message;
    return NextResponse.json(
      {
        ok: false,
        code: "database_unreachable",
        message: brief,
        ms: Date.now() - started,
      },
      { status: 503 },
    );
  }
}

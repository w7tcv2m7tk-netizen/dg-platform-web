import { timingSafeEqual } from "node:crypto";

/**
 * Shared cron authentication.
 *
 * Previously each cron route carried its own copy of this check, and all six
 * fell back to "any request carrying an `x-vercel-cron` header is authorised"
 * whenever `CRON_SECRET` was unset. That header is attacker-suppliable, so an
 * external caller could drive dunning, email flushes and OTA syncs.
 *
 * `CRON_SECRET` is now mandatory: with no secret configured, every cron route
 * fails closed. The `x-vercel-cron` header is treated as a scheduling hint,
 * never as proof of identity.
 */

function safeEqual(a: string, b: string): boolean {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) return false;
  return timingSafeEqual(bufA, bufB);
}

export type CronAuthResult =
  | { ok: true }
  | { ok: false; code: "cron_not_configured" | "unauthorized"; message: string };

export function authorizeCronRequest(req: Request): CronAuthResult {
  const secret = process.env.CRON_SECRET?.trim();

  if (!secret) {
    return {
      ok: false,
      code: "cron_not_configured",
      message:
        "CRON_SECRET is not configured; scheduled jobs are disabled until it is set",
    };
  }

  const authHeader = req.headers.get("authorization")?.trim() || "";
  const bearer = authHeader.toLowerCase().startsWith("bearer ")
    ? authHeader.slice(7).trim()
    : "";
  const headerSecret = req.headers.get("x-cron-secret")?.trim() || "";

  if (bearer && safeEqual(bearer, secret)) return { ok: true };
  if (headerSecret && safeEqual(headerSecret, secret)) return { ok: true };

  return {
    ok: false,
    code: "unauthorized",
    message: "Invalid cron credentials",
  };
}

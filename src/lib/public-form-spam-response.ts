import { checkFormSpam, type FormSpamCheckInput } from "@dg/platform-core";
import { NextResponse } from "next/server";

/** Run spam guard; return a NextResponse when blocked, otherwise null. */
export function spamGuardResponse(
  req: Request,
  fields: FormSpamCheckInput,
  siteKey: string,
): NextResponse | null {
  const verdict = checkFormSpam({
    ...fields,
    siteKey,
    clientIp:
      fields.clientIp ||
      req.headers.get("cf-connecting-ip")?.trim() ||
      req.headers.get("x-real-ip")?.trim() ||
      req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      "unknown",
  });

  if (verdict.allowed) return null;

  if (verdict.silent) {
    return NextResponse.json({ data: { ok: true } }, { status: 201 });
  }

  const status =
    verdict.code === "rate_limited"
      ? 429
      : verdict.code === "spam_content"
        ? 422
        : 422;
  return NextResponse.json(
    { error: { code: verdict.code, message: verdict.message } },
    { status },
  );
}

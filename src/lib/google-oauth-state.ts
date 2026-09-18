import { createHmac, randomBytes, timingSafeEqual } from "crypto";

export type GoogleOAuthMode = "analytics" | "ads" | "youtube" | "gbp";

type GoogleOAuthStateInner = {
  o: string;
  e: number;
  n: string;
  /** Allowlisted post-OAuth return path (no query). */
  r?: string;
  /** Explicit connector purpose so external OAuth cannot lose intent. */
  m?: GoogleOAuthMode;
};

function signingSecret(): string {
  return (
    process.env.GOOGLE_OAUTH_STATE_SECRET?.trim() ||
    process.env.GOOGLE_CLIENT_SECRET?.trim() ||
    process.env.CLERK_SECRET_KEY?.trim() ||
    ""
  );
}

function b64url(input: Buffer | string): string {
  const buf = typeof input === "string" ? Buffer.from(input, "utf8") : input;
  return buf.toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function fromB64url(input: string): Buffer {
  const pad = input.length % 4 === 0 ? "" : "=".repeat(4 - (input.length % 4));
  return Buffer.from(input.replace(/-/g, "+").replace(/_/g, "/") + pad, "base64");
}

function signPayload(payloadJson: string, secret: string): string {
  return createHmac("sha256", secret).update(payloadJson).digest("hex");
}

function parsedState(payload: GoogleOAuthStateInner) {
  return {
    ok: true as const,
    organisationId: payload.o,
    returnTo: typeof payload.r === "string" ? payload.r : null,
    mode: payload.m === "analytics" ? ("analytics" as const) : payload.m === "ads" ? ("ads" as const) : payload.m === "youtube" ? ("youtube" as const) : ("gbp" as const),
  };
}

/** Single URL-safe token — org id, return path and connector purpose travel with Google. */
export function createGoogleOAuthState(
  organisationId: string,
  options?: { returnTo?: string | null; mode?: GoogleOAuthMode },
): string {
  const secret = signingSecret();
  if (!secret) throw new Error("No secret available to sign Google OAuth state");
  const requested = options?.returnTo?.trim() ?? "";
  const returnTo = requested.startsWith("/") && !requested.startsWith("//")
    ? requested.split("?")[0]?.split("#")[0]
    : undefined;
  const inner: GoogleOAuthStateInner = {
    o: organisationId,
    e: Date.now() + 30 * 60 * 1000,
    n: randomBytes(8).toString("hex"),
    ...(returnTo ? { r: returnTo } : {}),
    ...(options?.mode ? { m: options.mode } : {}),
  };
  const payloadJson = JSON.stringify(inner);
  return b64url(JSON.stringify({ p: payloadJson, s: signPayload(payloadJson, secret) }));
}

export function parseGoogleOAuthState(state: string):
  | { ok: true; organisationId: string; returnTo: string | null; mode: GoogleOAuthMode }
  | { ok: false; message: string } {
  const secret = signingSecret();
  if (!secret) return { ok: false, message: "OAuth state secret not configured" };
  const trimmed = state.trim();
  if (!trimmed) return { ok: false, message: "Empty OAuth state" };
  if (/^[a-f0-9]{32,64}$/i.test(trimmed) && !trimmed.includes(".")) {
    return { ok: false, message: "Stale Connect link — hard refresh Connectors and click Connect Google again" };
  }

  let envelope: { p?: string; s?: string };
  try {
    envelope = JSON.parse(fromB64url(trimmed).toString("utf8")) as { p?: string; s?: string };
  } catch {
    const dot = trimmed.indexOf(".");
    if (dot > 0) {
      try {
        const body = trimmed.slice(0, dot);
        const sig = trimmed.slice(dot + 1);
        const expected = b64url(createHmac("sha256", secret).update(body).digest());
        const a = Buffer.from(sig); const b = Buffer.from(expected);
        if (a.length === b.length && timingSafeEqual(a, b)) {
          const payload = JSON.parse(fromB64url(body).toString("utf8")) as GoogleOAuthStateInner;
          if (payload?.o && typeof payload.e === "number" && Date.now() <= payload.e) return parsedState(payload);
        }
      } catch { /* fall through */ }
    }
    return { ok: false, message: "Malformed OAuth state — hard refresh and click Connect Google again" };
  }

  if (!envelope.p || !envelope.s || typeof envelope.p !== "string") return { ok: false, message: "OAuth state missing payload" };
  const expected = signPayload(envelope.p, secret);
  try {
    const a = Buffer.from(envelope.s); const b = Buffer.from(expected);
    if (a.length !== b.length || !timingSafeEqual(a, b)) return { ok: false, message: "OAuth state signature mismatch" };
  } catch { return { ok: false, message: "OAuth state signature mismatch" }; }

  try {
    const payload = JSON.parse(envelope.p) as GoogleOAuthStateInner;
    if (!payload?.o || typeof payload.o !== "string") return { ok: false, message: "OAuth state missing organisation" };
    if (typeof payload.e !== "number" || Date.now() > payload.e) return { ok: false, message: "OAuth state expired — try Connect Google again" };
    return parsedState(payload);
  } catch { return { ok: false, message: "OAuth state payload invalid" }; }
}

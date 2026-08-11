import { createHmac, timingSafeEqual } from "crypto";

type GoogleOAuthStatePayload = {
  n: string;
  o: string;
  e: number;
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
  return buf
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
}

function fromB64url(input: string): Buffer {
  const pad = input.length % 4 === 0 ? "" : "=".repeat(4 - (input.length % 4));
  const b64 = input.replace(/-/g, "+").replace(/_/g, "/") + pad;
  return Buffer.from(b64, "base64");
}

/** Embed org id in OAuth `state` so callback works even if cookies are dropped. */
export function createGoogleOAuthState(organisationId: string): string {
  const secret = signingSecret();
  if (!secret) {
    throw new Error("No secret available to sign Google OAuth state");
  }
  const payload: GoogleOAuthStatePayload = {
    n: b64url(Buffer.from(`${Date.now()}-${Math.random()}`)),
    o: organisationId,
    e: Date.now() + 30 * 60 * 1000,
  };
  const body = b64url(JSON.stringify(payload));
  const sig = b64url(
    createHmac("sha256", secret).update(body).digest(),
  );
  return `${body}.${sig}`;
}

export function parseGoogleOAuthState(
  state: string,
): { ok: true; organisationId: string } | { ok: false; message: string } {
  const secret = signingSecret();
  if (!secret) {
    return { ok: false, message: "OAuth state secret not configured" };
  }
  const [body, sig] = state.split(".");
  if (!body || !sig) {
    return { ok: false, message: "Malformed OAuth state" };
  }
  const expected = b64url(
    createHmac("sha256", secret).update(body).digest(),
  );
  try {
    const a = Buffer.from(sig);
    const b = Buffer.from(expected);
    if (a.length !== b.length || !timingSafeEqual(a, b)) {
      return { ok: false, message: "OAuth state signature mismatch" };
    }
  } catch {
    return { ok: false, message: "OAuth state signature mismatch" };
  }

  try {
    const payload = JSON.parse(
      fromB64url(body).toString("utf8"),
    ) as GoogleOAuthStatePayload;
    if (!payload?.o || typeof payload.o !== "string") {
      return { ok: false, message: "OAuth state missing organisation" };
    }
    if (typeof payload.e !== "number" || Date.now() > payload.e) {
      return { ok: false, message: "OAuth state expired — try Connect Google again" };
    }
    return { ok: true, organisationId: payload.o };
  } catch {
    return { ok: false, message: "OAuth state payload invalid" };
  }
}

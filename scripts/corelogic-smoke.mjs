#!/usr/bin/env node
/**
 * Cotality / CoreLogic smoke — OAuth token + Address Match (when secret present).
 * Usage: node --env-file=.env.local scripts/corelogic-smoke.mjs
 *    or: dotenv -e .env.local -- node scripts/corelogic-smoke.mjs
 *
 * Never prints client secret or access token.
 */
import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";

function loadEnvLocal() {
  const path = resolve(process.cwd(), ".env.local");
  if (!existsSync(path)) return;
  const text = readFileSync(path, "utf8");
  for (const line of text.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq < 1) continue;
    const key = trimmed.slice(0, eq).trim();
    let val = trimmed.slice(eq + 1).trim();
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1);
    }
    if (!(key in process.env)) process.env[key] = val;
  }
}

loadEnvLocal();

const TOKEN_URL =
  process.env.CORELOGIC_TOKEN_URL?.trim() ||
  "https://api-sbox.corelogic.asia/access/as/token.oauth2";
const SEARCH_BASE =
  process.env.CORELOGIC_SEARCH_BASE?.trim() ||
  process.env.CORELOGIC_API_BASE?.trim() ||
  "https://api-sbox.corelogic.asia/search";
const CLIENT_ID = process.env.CORELOGIC_CLIENT_ID?.trim() || "";
const CLIENT_SECRET = process.env.CORELOGIC_CLIENT_SECRET?.trim() || "";
const CLIENT_NAME =
  process.env.CORELOGIC_CLIENT_NAME?.trim() || "digitalgate-property-data";

function pass(label) {
  console.log(`✓ ${label}`);
}
function fail(label, detail) {
  console.log(`✗ ${label}${detail ? `: ${detail}` : ""}`);
}
function info(label) {
  console.log(`· ${label}`);
}

async function main() {
  console.log("CoreLogic / Cotality smoke\n");
  info(`tokenUrl: ${TOKEN_URL}`);
  info(`searchBase: ${SEARCH_BASE}`);
  info(`clientId set: ${Boolean(CLIENT_ID)}`);
  info(`secret set: ${Boolean(CLIENT_SECRET)}`);

  if (!CLIENT_ID) {
    fail("CORELOGIC_CLIENT_ID missing");
    process.exitCode = 1;
    return;
  }
  pass("CORELOGIC_CLIENT_ID present");

  if (!CLIENT_SECRET) {
    fail(
      "CORELOGIC_CLIENT_SECRET missing",
      "paste full secret into .env.local (gitignored) then re-run",
    );
    info("Code path OK — blocked on secret (no token / match attempted)");
    process.exitCode = 2;
    return;
  }
  pass("CORELOGIC_CLIENT_SECRET present (not printed)");

  const basic = Buffer.from(`${CLIENT_ID}:${CLIENT_SECRET}`).toString("base64");
  const tokenRes = await fetch(TOKEN_URL, {
    method: "POST",
    headers: {
      Authorization: `Basic ${basic}`,
      "Content-Type": "application/x-www-form-urlencoded",
      Accept: "application/json",
    },
    body: new URLSearchParams({ grant_type: "client_credentials" }),
  });
  const tokenText = await tokenRes.text();
  let tokenJson = null;
  try {
    tokenJson = tokenText ? JSON.parse(tokenText) : null;
  } catch {
    tokenJson = null;
  }

  if (!tokenRes.ok || !tokenJson?.access_token) {
    const err =
      tokenJson?.error_description ||
      tokenJson?.error ||
      `HTTP ${tokenRes.status}`;
    fail("Token request", err);
    process.exitCode = 1;
    return;
  }
  pass(`Token OK (expires_in=${tokenJson.expires_in ?? "?"})`);

  // Public-format AU sample known to resolve in Cotality sandbox eval data.
  // (Fake streets like "Aardvark" return matchType M with no propertyId.)
  const sample = "42 Marine Parade Coolangatta QLD 4225";
  const params = new URLSearchParams({
    q: sample,
    clientName: CLIENT_NAME,
    matchProfileId: process.env.CORELOGIC_MATCH_PROFILE_ID?.trim() || "1",
  });
  const matchUrl = `${SEARCH_BASE.replace(/\/$/, "")}/au/matcher/address?${params}`;
  const matchRes = await fetch(matchUrl, {
    headers: {
      Authorization: `Bearer ${tokenJson.access_token}`,
      Accept: "application/json",
    },
  });
  const matchText = await matchRes.text();
  let matchJson = null;
  try {
    matchJson = matchText ? JSON.parse(matchText) : null;
  } catch {
    matchJson = null;
  }

  if (!matchRes.ok) {
    fail("Address Match", `HTTP ${matchRes.status}`);
    info("Token worked; Search base or product access may need adjustment");
    process.exitCode = 1;
    return;
  }

  const propertyId =
    matchJson?.matchDetails?.propertyId ??
    matchJson?.propertyId ??
    matchJson?.match?.propertyId ??
    matchJson?.result?.propertyId ??
    matchJson?.data?.propertyId ??
    null;
  const matchType =
    matchJson?.matchDetails?.matchType ??
    matchJson?.matchType ??
    matchJson?.match?.matchType ??
    matchJson?.result?.matchType ??
    null;

  pass(
    `Address Match HTTP ${matchRes.status} · propertyId=${propertyId ?? "none"} · matchType=${matchType ?? "n/a"}`,
  );
  info("Sample address used; response details not dumped (PII-safe)");

  if (!propertyId) {
    info("Skip Property Details — no propertyId from Address Match");
    return;
  }

  const detailsBase =
    process.env.CORELOGIC_PROPERTY_DETAILS_BASE?.trim() ||
    "https://api-sbox.corelogic.asia/property-details";
  const corePath = `${detailsBase.replace(/\/$/, "")}/au/properties/${propertyId}/attributes/core`;
  const coreRes = await fetch(corePath, {
    headers: {
      Authorization: `Bearer ${tokenJson.access_token}`,
      Accept: "application/json",
    },
  });
  if (!coreRes.ok) {
    fail("Property Details attributes/core", `HTTP ${coreRes.status}`);
    process.exitCode = 1;
    return;
  }
  const coreJson = await coreRes.json().catch(() => null);
  const keys =
    coreJson && typeof coreJson === "object"
      ? Object.keys(coreJson).slice(0, 8).join(",")
      : "";
  pass(`Property Details attributes/core HTTP ${coreRes.status} · keys=${keys || "n/a"}`);

  const lastSalePath = `${detailsBase.replace(/\/$/, "")}/au/properties/${propertyId}/sales/last`;
  const lastSaleRes = await fetch(lastSalePath, {
    headers: {
      Authorization: `Bearer ${tokenJson.access_token}`,
      Accept: "application/json",
    },
  });
  pass(
    `Property Details sales/last HTTP ${lastSaleRes.status}${
      lastSaleRes.ok ? "" : " (honest empty/unavailable OK)"
    }`,
  );

  const salesPath = `${detailsBase.replace(/\/$/, "")}/au/properties/${propertyId}/sales`;
  const salesRes = await fetch(salesPath, {
    headers: {
      Authorization: `Bearer ${tokenJson.access_token}`,
      Accept: "application/json",
    },
  });
  if (salesRes.ok) {
    const salesJson = await salesRes.json().catch(() => null);
    const count = Array.isArray(salesJson?.sales)
      ? salesJson.sales.length
      : Array.isArray(salesJson)
        ? salesJson.length
        : "?";
    pass(`Property Details /sales HTTP ${salesRes.status} · rows=${count}`);
  } else {
    info(
      `Property Details /sales HTTP ${salesRes.status} — Gen 2 falls back to sales/last only (no fake history)`,
    );
  }

  info("AVM / report generation exercised via app UI or POST /api/v1/re/reports");
  info(
    "UI flow: Match → Address panel prefill + sales → Listing details review → REA/Domain",
  );
}

main().catch((err) => {
  fail("Unhandled", err instanceof Error ? err.message : String(err));
  process.exitCode = 1;
});

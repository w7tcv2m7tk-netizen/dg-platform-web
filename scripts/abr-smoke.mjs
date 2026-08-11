#!/usr/bin/env node
/**
 * ABR connector smoke — SearchByABNv202001 when GUID present.
 * Usage: node scripts/abr-smoke.mjs
 *
 * Never prints the authentication GUID.
 */
import { existsSync, readFileSync } from "node:fs";
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

const GUID_KEYS = ["ABN_LOOKUP_GUID", "ABR_GUID", "ABR_AUTHENTICATION_GUID"];
const ABR_BASE =
  "https://abr.business.gov.au/abrxmlsearch/AbrXmlSearch.asmx";
/** Telstra — well-known public ABN for smoke only */
const SAMPLE_ABN = "51824753556";

function pass(label) {
  console.log(`✓ ${label}`);
}
function fail(label, detail) {
  console.log(`✗ ${label}${detail ? `: ${detail}` : ""}`);
}
function info(label) {
  console.log(`· ${label}`);
}

function resolveGuid() {
  for (const key of GUID_KEYS) {
    const v = process.env[key]?.trim();
    if (v) return { key, value: v };
  }
  return null;
}

async function main() {
  console.log("ABR connector smoke\n");
  info("methods: SearchByABNv202001, SearchByASICv201408");
  info(`sample ABN: ${SAMPLE_ABN}`);

  const resolved = resolveGuid();
  if (!resolved) {
    fail(
      "ABR GUID missing",
      "paste ABN_LOOKUP_GUID (or ABR_GUID / ABR_AUTHENTICATION_GUID) into .env.local — never commit it",
    );
    info("Code path OK — blocked on GUID (no ABR call attempted)");
    process.exitCode = 2;
    return;
  }

  pass(`${resolved.key} present (value not printed)`);

  const url = new URL(`${ABR_BASE}/SearchByABNv202001`);
  url.searchParams.set("searchString", SAMPLE_ABN);
  url.searchParams.set("includeHistoricalDetails", "N");
  url.searchParams.set("authenticationGuid", resolved.value);

  let res;
  try {
    res = await fetch(url.toString(), {
      method: "GET",
      signal: AbortSignal.timeout(15_000),
      headers: { Accept: "text/xml" },
    });
  } catch (err) {
    fail("ABR request", err instanceof Error ? err.message : String(err));
    process.exitCode = 1;
    return;
  }

  if (!res.ok) {
    fail("ABR HTTP", String(res.status));
    process.exitCode = 1;
    return;
  }

  const xml = await res.text();
  if (/exceptionDescription/i.test(xml) && /guid|authentication|registered party/i.test(xml)) {
    fail(
      "ABR authentication",
      "GUID rejected — re-check value from abr.business.gov.au registration email",
    );
    process.exitCode = 1;
    return;
  }
  if (/No records found/i.test(xml)) {
    fail("ABR entity", "no records for sample ABN");
    process.exitCode = 1;
    return;
  }
  if (!/businessEntity/i.test(xml) && !/identifierValue/i.test(xml)) {
    fail("ABR parse", "unexpected response shape");
    process.exitCode = 1;
    return;
  }

  pass("SearchByABNv202001 returned entity payload");
  info("Smoke complete — GUID never printed");
}

main();

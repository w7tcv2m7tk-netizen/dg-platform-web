#!/usr/bin/env node
/**
 * List Resend sending domains + status (read-only).
 * Usage: node --env-file=.env.local scripts/diagnose-resend-domains.mjs
 */
import { config } from "dotenv";

config({ path: ".env.local" });

const FOCUS = [
  "mail.digitalgate.com.au",
  "digitalgate.com.au",
  "roerealty.com.au",
  "currumbinvalleyhideaway.com.au",
  "aetherra.com.au",
  "aetheriel.com.au",
];

function mailboxFrom(from) {
  const m = String(from || "").match(/<([^>]+)>/);
  return (m ? m[1] : from || "").trim().toLowerCase();
}

async function main() {
  const apiKey = process.env.RESEND_API_KEY?.trim();
  if (!apiKey) {
    console.error("RESEND_API_KEY not set (.env.local)");
    process.exit(1);
  }

  const fromEnv =
    process.env.RESEND_FROM_EMAIL?.trim() ||
    process.env.EMAIL_FROM?.trim() ||
    "(unset — code default DigitalGate <hello@digitalgate.com.au>)";

  console.log("Platform From:", fromEnv);
  console.log("Platform mailbox:", mailboxFrom(fromEnv) || "(default)");
  console.log("");

  const res = await fetch("https://api.resend.com/domains", {
    headers: { Authorization: `Bearer ${apiKey}` },
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    console.error("Resend /domains failed:", res.status, json.message || json);
    process.exit(1);
  }

  const domains = Array.isArray(json.data) ? json.data : [];
  if (!domains.length) {
    console.log("No domains on this Resend account.");
    process.exit(0);
  }

  console.log(`Resend domains (${domains.length}):`);
  for (const d of domains) {
    const name = String(d.name || "").toLowerCase();
    const status = String(d.status || "unknown");
    const region = d.region || "—";
    console.log(`  ${name.padEnd(40)} ${status.padEnd(12)} region=${region}`);
  }

  console.log("\nFocus check:");
  for (const want of FOCUS) {
    const hit =
      domains.find((d) => String(d.name || "").toLowerCase() === want) ||
      domains.find((d) =>
        String(d.name || "")
          .toLowerCase()
          .endsWith(`.${want}`),
      );
    if (!hit) {
      console.log(`  ${want}: MISSING`);
      continue;
    }
    console.log(
      `  ${want}: ${hit.status} (as ${String(hit.name).toLowerCase()})`,
    );
  }

  const verified = domains.filter((d) =>
    /^(verified|valid)$/i.test(String(d.status || "")),
  );
  console.log(
    `\nVerified count: ${verified.length}/${domains.length}` +
      (verified.length
        ? ` → ${verified.map((d) => d.name).join(", ")}`
        : " → NONE (Prepare/Verify digitalgate.com.au before funnels can send)"),
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

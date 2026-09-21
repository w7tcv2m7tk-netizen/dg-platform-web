/**
 * Lock: DigitalGate Business Audit funnel must use the current public
 * homepage purple system — Inter, #0A0A12, #7c3aed pills — not Sora /
 * Instrument Sans / navy-blue leftovers.
 */
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const capture = readFileSync(
  join(root, "src/components/websites/BusinessAuditCapture.tsx"),
  "utf8",
);

const required = [
  "--bg-main: #0A0A12",
  "--dg-purple: #7c3aed",
  "--dg-purple-light: #a78bfa",
  "linear-gradient(105deg, #7c3aed, #3b82f6)",
  'family=Inter:wght@400;500;600;700;800',
  "border-radius: 50px",
];
const forbidden = [
  "Instrument Sans",
  "Sora,",
  "font-family: Sora",
  'fontFamily: "Sora',
];

const missing = required.filter((token) => !capture.includes(token));
const present = forbidden.filter((token) => capture.includes(token));

if (missing.length || present.length) {
  console.error("Business Audit styling lock failed.");
  if (missing.length) console.error("Missing:", missing.join(" | "));
  if (present.length) console.error("Forbidden leftovers:", present.join(" | "));
  process.exit(1);
}

console.log("Business Audit funnel matches current homepage purple styling.");

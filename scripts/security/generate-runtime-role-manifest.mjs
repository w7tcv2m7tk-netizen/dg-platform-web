import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { buildManifest, manifestStats, renderGrantsSql, renderVerifySql } from "./runtime-role-lib.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const check = process.argv.includes("--check");
const manifest = buildManifest(root);
const outputs = [
  ["scripts/security/runtime-role-manifest.json", `${JSON.stringify(manifest, null, 2)}\n`],
  ["scripts/sql/runtime-role-grants.sql", renderGrantsSql(manifest)],
  ["scripts/sql/runtime-role-verify.sql", renderVerifySql(manifest)],
];
let changed = 0;
for (const [relative, content] of outputs) {
  const full = path.join(root, relative);
  let existing = null;
  try {
    existing = readFileSync(full, "utf8");
  } catch {
    existing = null;
  }
  if (existing === content) continue;
  changed += 1;
  if (check) {
    console.error(`stale generated file: ${relative}`);
    continue;
  }
  mkdirSync(path.dirname(full), { recursive: true });
  writeFileSync(full, content);
  console.log(`wrote ${relative}`);
}
if (check) {
  if (changed > 0) {
    console.error("Runtime role manifest is stale. Run npm run security:runtime-manifest.");
    process.exit(1);
  }
  console.log("Runtime role manifest and generated SQL are current.");
} else {
  const stats = manifestStats(manifest);
  console.log(`manifest tables=${stats.tables} modules=${stats.modules}`);
}

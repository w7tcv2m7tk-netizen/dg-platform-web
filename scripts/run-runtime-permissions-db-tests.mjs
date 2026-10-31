import { existsSync } from "node:fs";
import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const fromPath = spawnSync("sh", ["-c", "command -v pg_config"], { encoding: "utf8" });
const candidates = [
  process.env.DG_PG_BIN,
  "/opt/homebrew/opt/postgresql@18/bin",
  "/usr/local/opt/postgresql@18/bin",
  fromPath.status === 0 ? path.dirname(fromPath.stdout.trim()) : null,
].filter(Boolean);
const pgBin = candidates.find((candidate) => existsSync(path.join(candidate, "postgres"))) ?? candidates[0];
const result = spawnSync(process.execPath, ["scripts/run-checkout-compatibility-db-tests.mjs", pgBin, "permissions"], {
  cwd: root,
  stdio: "inherit",
  env: process.env,
});
process.exit(result.status ?? 1);

/** Reuse the owned, credential-isolated cluster and certified SQL parity checks. */
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
const result = spawnSync(process.execPath, [fileURLToPath(new URL("./run-checkout-compatibility-db-tests.mjs", import.meta.url)), ...process.argv.slice(2), "coordinator"], { stdio: "inherit" });
if (result.error) throw result.error;
process.exitCode = result.status ?? 1;

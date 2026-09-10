import { execFileSync } from "node:child_process";
import { test } from "node:test";

test("final whole-platform canonical unit suite", () => {
  execFileSync("npm", ["run", "test:unit"], {
    cwd: process.cwd(),
    env: process.env,
    stdio: "inherit",
  });
});

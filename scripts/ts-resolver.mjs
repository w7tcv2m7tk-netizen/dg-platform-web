/**
 * Test-only ESM resolve hook.
 *
 * `node --experimental-strip-types` can execute TypeScript, but Node's ESM
 * resolver still requires explicit file extensions. platform-core uses
 * extensionless relative imports ("./roles", "../access/evaluate"), so unit
 * tests could previously only load leaf modules with no relative imports.
 *
 * This hook resolves extensionless relative specifiers to .ts/.tsx/index.ts and
 * maps the @dg/* workspace aliases, matching tsconfig.json paths. Test harness
 * only — not used by the application build.
 */
import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

const ALIASES = [
  ["@dg/platform-core/", path.join(repoRoot, "packages/platform-core/src/")],
  ["@dg/platform-core", path.join(repoRoot, "packages/platform-core/src/index.ts")],
  ["@dg/database", path.join(repoRoot, "packages/database/src/index.ts")],
  ["@dg/ui/", path.join(repoRoot, "packages/ui/src/")],
  ["@dg/ui", path.join(repoRoot, "packages/ui/src/index.ts")],
  ["@/", path.join(repoRoot, "src/")],
];

function withExtension(basePath) {
  if (path.extname(basePath)) {
    return existsSync(basePath) ? basePath : null;
  }
  const candidates = [
    `${basePath}.ts`,
    `${basePath}.tsx`,
    path.join(basePath, "index.ts"),
    path.join(basePath, "index.tsx"),
  ];
  return candidates.find((candidate) => existsSync(candidate)) ?? null;
}

export async function resolve(specifier, context, nextResolve) {
  for (const [prefix, target] of ALIASES) {
    if (specifier === prefix.replace(/\/$/, "") || specifier.startsWith(prefix)) {
      const rest = specifier.startsWith(prefix) ? specifier.slice(prefix.length) : "";
      const candidate = rest ? path.join(target, rest) : target;
      const resolved = withExtension(candidate);
      if (resolved) {
        return { url: pathToFileURL(resolved).href, shortCircuit: true };
      }
    }
  }

  if (specifier.startsWith(".") && context.parentURL?.startsWith("file:")) {
    const parentDir = path.dirname(fileURLToPath(context.parentURL));
    const resolved = withExtension(path.resolve(parentDir, specifier));
    if (resolved) {
      return { url: pathToFileURL(resolved).href, shortCircuit: true };
    }
  }

  return nextResolve(specifier, context);
}

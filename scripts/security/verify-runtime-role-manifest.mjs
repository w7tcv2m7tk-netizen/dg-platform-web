import path from "node:path";
import { fileURLToPath } from "node:url";
import { readManifest, validateManifest } from "./runtime-role-lib.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const manifest = readManifest(root);
const errors = validateManifest(root, manifest);
if (errors.length) {
  for (const error of errors) console.error(error);
  process.exit(1);
}
console.log(`Runtime role manifest verified: ${Object.keys(manifest.tables).length} tables, ${Object.keys(manifest.sequences).length} granted sequences, ${Object.keys(manifest.functions).length} functions.`);

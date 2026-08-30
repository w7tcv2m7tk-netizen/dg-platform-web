/** Test-only: register the TypeScript path/extension resolve hook. */
import { register } from "node:module";

register("./ts-resolver.mjs", import.meta.url);

import "server-only";
import { createHash } from "node:crypto";
import { REVIEWED_REMEDIATION, REVIEWED_CANONICAL_MIGRATION } from "./remediate-991-sql-generated";

export const REMEDIATION_SHA256 = "1c07112091af372cfad73488c822cd98fab271b05896458495369c3b0c8f1b6e";
export const CANONICAL_SHA256 = "55f5aa9294078d52a88a505b5480f41ed15e691f0175c7df1e3f58a0cbe3b70d";

// The only translation is psql attestation -> hashing these embedded verified bytes,
// and BEGIN/COMMIT -> Prisma's interactive transaction. SET LOCAL and DO stay verbatim.
export function reviewedRemediationStatements(): { settings: string[]; body: string } {
  const hash = (value: string) => createHash("sha256").update(value).digest("hex");
  if (hash(REVIEWED_REMEDIATION) !== REMEDIATION_SHA256
    || hash(REVIEWED_CANONICAL_MIGRATION) !== CANONICAL_SHA256) throw new Error("Remediation refused");
  const match = REVIEWED_REMEDIATION.match(/\nBEGIN;\n((?:SET LOCAL [^\n]+;\n){5})(DO \$remediation\$[\s\S]+\n\$remediation\$;)\nCOMMIT;\n$/);
  if (!match) throw new Error("Remediation refused");
  return { settings: match[1].trimEnd().split("\n"), body: match[2] };
}

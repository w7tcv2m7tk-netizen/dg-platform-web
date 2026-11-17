#!/usr/bin/env node
/**
 * Dependency-aware Neon preview-branch cleanup planner.
 * Dry-run is the default. Deletion is opt-in and never allowed for protected,
 * active-alias, branch-bound, child-bearing or unverified branch records.
 */
import { readFile } from "node:fs/promises";

export const PROTECTED_BRANCH_NAMES = Object.freeze([
  "production",
  "development",
  "dg-home-pre-regression-restore (1)",
]);

export function isProtected(branch) {
  return Boolean(branch?.protected) || PROTECTED_BRANCH_NAMES.includes(branch?.name);
}

function blockers(branch) {
  const out = [];
  if (isProtected(branch)) out.push("protected");
  if (branch.decision !== "SAFE") out.push(`decision:${branch.decision ?? "missing"}`);
  if (branch.activeAlias) out.push("active-alias");
  if (branch.activeDeployment || branch.deploymentInProgress) out.push("active-deployment");
  if (branch.branchSpecificEnv) out.push("branch-specific-env");
  if (branch.worktree) out.push("worktree");
  if (branch.scheduledJob) out.push("scheduled-job");
  if (Array.isArray(branch.children) && branch.children.length) out.push("child-branches");
  if (!branch.id) out.push("missing-id");
  if (!branch.dependencyChecked) out.push("dependency-unverified");
  if (!branch.evidencePreserved) out.push("evidence-not-preserved");
  return out;
}

export function planCleanup(branches) {
  return branches.map((branch) => {
    const blockedBy = blockers(branch);
    return { name: branch.name, id: branch.id ?? null, safe: blockedBy.length === 0, blockedBy };
  });
}

export async function applyCleanup(plan, {
  projectId = process.env.NEON_PROJECT_ID,
  apiKey = process.env.NEON_API_KEY,
  fetchImpl = fetch,
  apply = false,
  confirm = "",
} = {}) {
  const selected = plan.filter((item) => item.safe);
  if (!apply) return { dryRun: true, selected, deleted: [] };
  if (!projectId || !apiKey) throw new Error("NEON_PROJECT_ID and NEON_API_KEY are required for --apply");
  if (confirm !== projectId) throw new Error("--confirm must equal the Neon project id");
  const deleted = [];
  for (const item of selected) {
    const response = await fetchImpl(
      `https://console.neon.tech/api/v2/projects/${encodeURIComponent(projectId)}/branches/${encodeURIComponent(item.id)}`,
      { method: "DELETE", headers: { Authorization: `Bearer ${apiKey}`, Accept: "application/json" } },
    );
    if (!response.ok) throw new Error(`Neon branch deletion failed for ${item.name} (HTTP ${response.status})`);
    deleted.push({ name: item.name, id: item.id });
  }
  return { dryRun: false, selected, deleted };
}

async function main(argv) {
  const args = new Set(argv.slice(2));
  const inventoryIndex = argv.indexOf("--inventory");
  if (inventoryIndex < 0 || !argv[inventoryIndex + 1]) throw new Error("Usage: neon-branch-cleanup.mjs --inventory <json> [--dry-run|--apply --confirm <project-id>]");
  const inventory = JSON.parse(await readFile(argv[inventoryIndex + 1], "utf8"));
  const plan = planCleanup(inventory.branches ?? inventory);
  const apply = args.has("--apply") && !args.has("--dry-run");
  const confirmIndex = argv.indexOf("--confirm");
  const result = await applyCleanup(plan, { apply, confirm: confirmIndex >= 0 ? argv[confirmIndex + 1] : "" });
  process.stdout.write(`${JSON.stringify({ project: inventory.project ?? null, ...result }, null, 2)}\n`);
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main(process.argv).catch((error) => {
    process.stderr.write(`${error instanceof Error ? error.message : "cleanup failed"}\n`);
    process.exitCode = 1;
  });
}

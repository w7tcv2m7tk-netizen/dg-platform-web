#!/usr/bin/env node
import { readFile } from "node:fs/promises";

const ISO = /^\d{4}-\d{2}-\d{2}$/;
export function validateEnvironmentRegister(register, now = new Date()) {
  const errors = [];
  if (!Number.isInteger(register.reviewCadenceDays) || register.reviewCadenceDays < 1) errors.push("reviewCadenceDays must be a positive integer");
  for (const project of register.projects ?? []) {
    if (!project.name || !project.owner || !project.classification) errors.push(`project ${project.name ?? "?"} needs name, owner and classification`);
    if (!project.permanent) {
      if (!ISO.test(project.expiresAt ?? "")) errors.push(`temporary project ${project.name} needs an ISO expiry date`);
      else if (new Date(`${project.expiresAt}T23:59:59Z`) < now) errors.push(`temporary project ${project.name} is expired`);
    }
    if (project.reviewAt && !ISO.test(project.reviewAt)) errors.push(`project ${project.name} reviewAt must be ISO date`);
    for (const custom of project.customEnvironments ?? []) {
      if (!custom.slug || !custom.owner || !custom.purpose) errors.push(`custom environment ${custom.slug ?? "?"} needs owner and purpose`);
      if (!ISO.test(custom.expiresAt ?? "")) errors.push(`custom environment ${custom.slug} needs an ISO expiry date`);
      else if (new Date(`${custom.expiresAt}T23:59:59Z`) < now) errors.push(`custom environment ${custom.slug} is expired`);
      if (!custom.cleanupAction) errors.push(`custom environment ${custom.slug} needs a cleanup action`);
    }
  }
  return { ok: errors.length === 0, errors };
}

async function main(argv) {
  const path = argv[2];
  if (!path) throw new Error("Usage: environment-lifecycle.mjs <register.json>");
  const register = JSON.parse(await readFile(path, "utf8"));
  const result = validateEnvironmentRegister(register);
  process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
  if (!result.ok) process.exitCode = 1;
}
if (import.meta.url === `file://${process.argv[1]}`) main(process.argv).catch((error) => { process.stderr.write(`${error instanceof Error ? error.message : "validation failed"}\n`); process.exitCode = 1; });

import assert from "node:assert/strict";
import http from "node:http";
import { chromium } from "playwright";

const enabled = process.env.DG_AUTH_ACCEPTANCE === "1";
const baseUrl = process.env.DG_AUTH_ACCEPTANCE_BASE_URL?.replace(/\/$/, "");
const emailA = process.env.DG_AUTH_ACCEPTANCE_USER_A_EMAIL;
const emailB = process.env.DG_AUTH_ACCEPTANCE_USER_B_EMAIL;
const passwordA = process.env.DG_AUTH_ACCEPTANCE_USER_A_PASSWORD;
const passwordB = process.env.DG_AUTH_ACCEPTANCE_USER_B_PASSWORD;
const orgA = process.env.DG_AUTH_ACCEPTANCE_ORG_A;
const orgB = process.env.DG_AUTH_ACCEPTANCE_ORG_B;
const orgAId = process.env.DG_AUTH_ACCEPTANCE_ORG_A_ID;
const orgBId = process.env.DG_AUTH_ACCEPTANCE_ORG_B_ID;
const clerkUserA = process.env.DG_AUTH_ACCEPTANCE_CLERK_USER_A_ID;
const revokeOrgId = process.env.DG_AUTH_ACCEPTANCE_REVOKE_ORG_ID;
const allowDbMutation = process.env.DG_AUTH_ACCEPTANCE_ALLOW_DB_MUTATION === "1";

function requireIsolation() {
  if (!enabled) throw new Error("Set DG_AUTH_ACCEPTANCE=1 for isolated browser acceptance");
  if (!baseUrl) throw new Error("Set DG_AUTH_ACCEPTANCE_BASE_URL");
  const target = new URL(baseUrl);
  const localHost = target.hostname === "localhost" || target.hostname === "127.0.0.1" || target.hostname.endsWith(".localhost");
  if (!localHost || target.protocol !== "http:") throw new Error("Refusing non-local auth acceptance target");
  for (const [name, value] of Object.entries({
    DG_AUTH_ACCEPTANCE_USER_A_EMAIL: emailA,
    DG_AUTH_ACCEPTANCE_USER_B_EMAIL: emailB,
    DG_AUTH_ACCEPTANCE_USER_A_PASSWORD: passwordA,
    DG_AUTH_ACCEPTANCE_USER_B_PASSWORD: passwordB,
    DG_AUTH_ACCEPTANCE_ORG_A: orgA,
    DG_AUTH_ACCEPTANCE_ORG_B: orgB,
    DG_AUTH_ACCEPTANCE_ORG_A_ID: orgAId,
    DG_AUTH_ACCEPTANCE_ORG_B_ID: orgBId,
  })) {
    if (!value) throw new Error(`Set ${name}`);
  }
}

async function submitClerkLogin(page, email, password) {
  await page.goto(`${baseUrl}/login`, { waitUntil: "domcontentloaded" });
  const identifier = page.locator('input[name="identifier"], input[type="email"]').first();
  await identifier.waitFor({ state: "visible", timeout: 20_000 });
  await identifier.fill(email);
  await page.keyboard.press("Enter");
  const passwordInput = page.locator('input[name="password"], input[type="password"]').first();
  try {
    await passwordInput.waitFor({ state: "visible", timeout: 5_000 });
    await passwordInput.fill(password);
    await page.keyboard.press("Enter");
  } catch {
    await page.locator('button[type="submit"]').first().click();
    await passwordInput.waitFor({ state: "visible", timeout: 10_000 });
    await passwordInput.fill(password);
    await page.keyboard.press("Enter");
  }
  await page.waitForURL(url => !url.pathname.startsWith("/login"), { timeout: 30_000 });
}

async function activeOrgName(page) {
  const button = page.locator('button[aria-haspopup="listbox"]').first();
  await button.waitFor({ state: "visible", timeout: 20_000 });
  return (await button.innerText()).trim();
}

async function switchOrg(page, name) {
  const button = page.locator('button[aria-haspopup="listbox"]').first();
  await button.waitFor({ state: "visible", timeout: 20_000 });
  await button.click();
  const option = page.getByRole("option", { name });
  await option.waitFor({ state: "visible", timeout: 10_000 });
  const responsePromise = page.waitForResponse(
    response => response.url().endsWith("/api/v1/org/switch"),
    { timeout: 20_000 },
  );
  await option.click();
  const response = await responsePromise;
  assert.equal(response.status(), 200, `tenant switch failed with ${response.status()}`);
  await page.waitForURL(url => url.pathname === "/dashboard" || url.pathname === "/command", { timeout: 30_000 });
}

async function readOrgCookie(context) {
  return (await context.cookies()).find(cookie => cookie.name === "dg_active_org")?.value ?? null;
}

async function main() {
  requireIsolation();
  const target = new URL(baseUrl);
  let membershipId = null;
  let prisma = null;
  const browser = await chromium.launch({ headless: true });
  try {
    const context = await browser.newContext();
    const page = await context.newPage();

    await submitClerkLogin(page, emailA, passwordA);
    assert.match(await activeOrgName(page), new RegExp(orgA.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")), "valid login did not land on the expected organisation");
    console.log("PASS valid Clerk login");

    await switchOrg(page, orgB);
    assert.match(await activeOrgName(page), new RegExp(orgB.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")), "same-origin switch did not update the shell");
    assert.equal(await readOrgCookie(context), orgBId);
    console.log("PASS same-origin tenant switching");

    await context.addCookies([{ name: "dg_active_org", value: "stale-auth-acceptance-cookie", domain: target.hostname, path: "/" }]);
    await page.goto(`${baseUrl}/login`, { waitUntil: "domcontentloaded" });
    const staleRecovery = await page.evaluate(async organisationId => {
      const response = await fetch("/api/v1/org/switch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ organisationId }),
      });
      return { status: response.status, body: await response.text() };
    }, orgAId);
    assert.equal(staleRecovery.status, 200, `stale-cookie recovery failed: ${staleRecovery.body}`);
    assert.equal(await readOrgCookie(context), orgAId);
    console.log("PASS stale-cookie recovery");

    if (allowDbMutation && revokeOrgId && clerkUserA) {
      const databaseUrl = process.env.DATABASE_URL;
      if (!databaseUrl) throw new Error("Set DATABASE_URL for isolated membership-revocation acceptance");
      const dbTarget = new URL(databaseUrl);
      if (!["localhost", "127.0.0.1"].includes(dbTarget.hostname)) throw new Error("Refusing non-local membership mutation");
      const database = await import("@dg/database");
      prisma = database.prisma;
      const row = await prisma.membership.findFirst({
        where: { clerkUserId: clerkUserA, organisationId: revokeOrgId, status: "active" },
      });
      if (!row) throw new Error("No isolated active membership available for revocation acceptance");
      membershipId = row.id;
      await prisma.membership.update({ where: { id: membershipId }, data: { status: "revoked" } });
      const before = await readOrgCookie(context);
      const response = await page.evaluate(async organisationId => {
        const result = await fetch("/api/v1/org/switch", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ organisationId }),
        });
        return { status: result.status, body: await result.text() };
      }, revokeOrgId);
      assert.equal(response.status, 403, `revoked membership switch was not denied: ${response.body}`);
      assert.equal(await readOrgCookie(context), before);
      await prisma.membership.update({ where: { id: membershipId }, data: { status: "active" } });
      console.log("PASS revoked membership rejected");
    } else {
      console.log("SKIP revoked membership rejected (enable isolated DB fixture)");
    }

    const pageTwo = await context.newPage();
    await pageTwo.goto(`${baseUrl}/dashboard`, { waitUntil: "domcontentloaded" });
    await switchOrg(page, orgA);
    await pageTwo.reload({ waitUntil: "domcontentloaded" });
    assert.match(await activeOrgName(pageTwo), new RegExp(orgA.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")), "second tab did not observe the shared active tenant");
    await switchOrg(pageTwo, orgB);
    await page.reload({ waitUntil: "domcontentloaded" });
    assert.match(await activeOrgName(page), new RegExp(orgB.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")), "first tab did not observe the shared active tenant");
    await pageTwo.close();
    console.log("PASS multi-tab switching");

    await page.evaluate(async () => {
      const clerk = window.Clerk;
      if (!clerk?.signOut) throw new Error("Clerk client is not available for sign-out");
      await clerk.signOut();
    });
    await page.goto(`${baseUrl}/login`, { waitUntil: "domcontentloaded" });
    await page.locator('input[name="identifier"], input[type="email"]').first().waitFor({ state: "visible", timeout: 20_000 });
    await submitClerkLogin(page, emailA, passwordA);
    console.log("PASS logout/login");

    const crossOriginServer = http.createServer((request, response) => {
      response.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
      response.end(`<form id="cross" method="POST" action="${baseUrl}/api/v1/org/switch"><input name="organisationId" value="${orgB}"></form>`);
    });
    await new Promise((resolve, reject) => {
      crossOriginServer.once("error", reject);
      crossOriginServer.listen(0, "127.0.0.1", resolve);
    });
    const address = crossOriginServer.address();
    const attackerOrigin = `http://127.0.0.1:${address.port}`;
    const cookieBefore = await readOrgCookie(context);
    await page.goto(attackerOrigin, { waitUntil: "domcontentloaded" });
    const crossResponse = page.waitForResponse(
      response => response.url().endsWith("/api/v1/org/switch"),
      { timeout: 20_000 },
    );
    await page.evaluate(() => document.getElementById("cross").submit());
    assert.equal((await crossResponse).status(), 403, "cross-origin switch was not rejected");
    assert.equal(await readOrgCookie(context), cookieBefore);
    await new Promise(resolve => crossOriginServer.close(resolve));
    console.log("PASS cross-origin request rejection");

    await context.close();
  } finally {
    if (prisma && membershipId) {
      await prisma.membership.update({ where: { id: membershipId }, data: { status: "active" } }).catch(() => {});
    }
    await browser.close();
  }
}

main().catch(error => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});

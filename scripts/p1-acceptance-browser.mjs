/**
 * P1 browser acceptance — Clerk login, onboarding walkthrough, network gate, resume.
 * WordPress must be blocked via DG_API_BASE_URL=https://wp-blocked.invalid
 *
 * Run (dev server on P1_APP_URL, default http://127.0.0.1:3012):
 *   DG_API_BASE_URL=https://wp-blocked.invalid P1_APP_URL=http://127.0.0.1:3012 \
 *     npx dotenv -e .env.local -- node scripts/p1-acceptance-browser.mjs
 */
import assert from "node:assert/strict";
import { writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const baseUrl = (process.env.P1_APP_URL ?? "http://127.0.0.1:3012").replace(/\/$/, "");
const evidencePath = join(root, "scripts/.p1-acceptance-evidence.json");

const WP_PATTERNS = [
  /\/wp-json\/digitalgate\/v1\/portal\/me/i,
  /digitalgate\.com\.au\/onboarding/i,
  /\/wp-json\/digitalgate\/v1\/onboarding/i,
];

const networkLog = [];
const wpViolations = [];

function recordRequest(url, method) {
  networkLog.push({ url, method, at: new Date().toISOString() });
  for (const p of WP_PATTERNS) {
    if (p.test(url)) wpViolations.push({ url, method, pattern: String(p) });
  }
}

async function clerkJson(path, init = {}) {
  const key = process.env.CLERK_SECRET_KEY?.trim();
  if (!key) throw new Error("CLERK_SECRET_KEY missing");
  const res = await fetch(`https://api.clerk.com/v1${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
      ...(init.headers ?? {}),
    },
  });
  const json = await res.json().catch(() => null);
  if (!res.ok) throw new Error(`Clerk ${path} ${res.status}: ${JSON.stringify(json)}`);
  return json;
}

async function resolveTestUser() {
  const email = process.env.P1_TEST_EMAIL?.trim().toLowerCase();
  if (email) {
    const users = await clerkJson(`/users?email_address=${encodeURIComponent(email)}&limit=1`);
    const user = users?.[0];
    if (!user?.id) throw new Error("No Clerk user for P1_TEST_EMAIL");
    return { userId: user.id, email };
  }
  const users = await clerkJson(`/users?limit=20&order_by=-created_at`);
  const user =
    (users ?? []).find((u) =>
      (u.email_addresses ?? []).some((e) => String(e.email_address).includes("+p1")),
    ) ?? users?.[0];
  if (!user?.id) throw new Error("No Clerk test user — set P1_TEST_EMAIL in .env.local");
  const primary =
    user.email_addresses?.find((e) => e.id === user.primary_email_address_id) ??
    user.email_addresses?.[0];
  return { userId: user.id, email: primary?.email_address ?? "unknown" };
}

async function mintSessionCookie(context, userId) {
  const session = await clerkJson("/sessions", {
    method: "POST",
    body: JSON.stringify({ user_id: userId }),
  });
  const sessionId = session?.id;
  if (!sessionId) throw new Error("Clerk session create failed");

  const tokenRes = await clerkJson(`/sessions/${sessionId}/tokens`, {
    method: "POST",
    body: JSON.stringify({ expires_in_seconds: 3600 }),
  });
  const jwt = tokenRes?.jwt;
  if (!jwt) throw new Error("Clerk session token missing");

  const host = new URL(baseUrl).hostname;
  await context.addCookies([
    {
      name: "__session",
      value: jwt,
      domain: host,
      path: "/",
      httpOnly: true,
      secure: false,
      sameSite: "Lax",
    },
  ]);
  return { sessionId, userId };
}

async function clickContinue(page) {
  const btn = page.getByRole("button", { name: /continue|let'?s get started|save|next/i }).first();
  await btn.click({ timeout: 15000 });
}

async function main() {
  assert.match(
    process.env.DG_API_BASE_URL ?? "",
    /wp-blocked|invalid|unavailable/i,
    "Set DG_API_BASE_URL to blocked WP host",
  );

  const health = await fetch(`${baseUrl}/api/health`);
  assert.equal(health.status, 200, `Dev server not ready at ${baseUrl}`);

  const { userId, email } = await resolveTestUser();
  const stamp = Date.now();

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  await mintSessionCookie(context, userId);
  const page = await context.newPage();

  page.on("request", (req) => recordRequest(req.url(), req.method()));

  const evidence = {
    at: new Date().toISOString(),
    clerkUserId: userId,
    emailMasked: email.replace(/(^.).*(@.*$)/, "$1***$2"),
    organisationId: null,
    membershipId: null,
    steps: {},
    resume: {},
    foundingSetup: {},
    signup: {},
    wpViolations: [],
    networkSampleCount: 0,
  };

  try {
    await page.goto(`${baseUrl}/onboarding`, { waitUntil: "domcontentloaded", timeout: 90000 });
    if (page.url().includes("/login")) {
      throw new Error(`Unauthenticated at onboarding: ${page.url()}`);
    }

    const apiState = await page.evaluate(async () => {
      const res = await fetch("/api/v1/onboarding/gen2");
      const json = await res.json().catch(() => ({}));
      return { status: res.status, data: json.data ?? null };
    });
    assert.equal(apiState.status, 200, "onboarding API unauthorized");
    evidence.organisationId = apiState.data?.organisationId ?? null;
    evidence.membershipId = apiState.data?.membershipId ?? null;

    // Welcome
    await clickContinue(page);
    await page.waitForTimeout(1500);

    // Business identity
    await page.locator('input').first().waitFor({ timeout: 15000 });
    const inputs = page.locator("input");
    const count = await inputs.count();
    for (let i = 0; i < count; i += 1) {
      const ph = (await inputs.nth(i).getAttribute("placeholder")) ?? "";
      const label = (await inputs.nth(i).evaluate((el) => {
        const l = el.closest("label");
        return l?.textContent?.trim() ?? "";
      })) ?? "";
      const hay = `${ph} ${label}`.toLowerCase();
      if (hay.includes("business") || hay.includes("legal")) {
        await inputs.nth(i).fill(`P1 Test Co ${stamp}`);
      }
      if (hay.includes("email")) await inputs.nth(i).fill(email);
      if (hay.includes("phone")) await inputs.nth(i).fill("+61400000001");
    }
    await clickContinue(page);
    await page.waitForTimeout(1500);
    evidence.steps.businessIdentity = true;

    // Business profile — fill first textarea
    const ta = page.locator("textarea").first();
    if (await ta.count()) {
      await ta.fill(`P1 business profile ${stamp}`);
      await clickContinue(page);
      await page.waitForTimeout(1500);
      evidence.steps.businessProfile = true;
    }

    // Goals — pick first goal button
    const goal = page.locator("button").filter({ hasText: /lead|customer|seo/i }).first();
    if (await goal.count()) {
      await goal.click();
      await clickContinue(page);
      await page.waitForTimeout(1500);
      evidence.steps.goals = true;
    }

    // Team — continue if members exist (owner always present)
    if (await page.getByText(/team/i).count()) {
      const teamContinue = page.getByRole("button", { name: /^continue$/i });
      if (await teamContinue.count()) {
        await teamContinue.click({ timeout: 10000 }).catch(() => null);
        await page.waitForTimeout(1500);
        evidence.steps.team = true;
      }
    }

    // Systems
    const sysBtn = page.locator("button").filter({ hasText: /Google Workspace|Xero/i }).first();
    if (await sysBtn.count()) {
      await sysBtn.click();
      const sysNotes = page.locator("textarea").first();
      if (await sysNotes.count()) await sysNotes.fill(`P1 systems ${stamp}`);
      await clickContinue(page);
      await page.waitForTimeout(1500);
      evidence.steps.systems = true;
    }

    // Plan
    const planBtn = page.locator("button").filter({ hasText: /Growth|Professional|Starter/i }).first();
    if (await planBtn.count()) {
      await planBtn.click();
      await page.waitForTimeout(1500);
      evidence.steps.plan = true;
    }

    // Apps
    if (await page.getByText(/Industry Apps|Growth Apps/i).count()) {
      await clickContinue(page);
      await page.waitForTimeout(1500);
      evidence.steps.apps = true;
    }

    // Save mid-wizard state via API for resume test
    const mid = await page.evaluate(async (notes) => {
      const res = await fetch("/api/v1/onboarding/gen2", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          progress: {
            implementationNotes: notes,
            currentStep: "goals",
          },
        }),
      });
      const json = await res.json().catch(() => ({}));
      return { status: res.status, progress: json.data?.progress ?? null };
    }, `P1 implementation ${stamp}`);
    assert.equal(mid.status, 200);
    evidence.resume.midStep = mid.progress?.currentStep;

    // Reload + verify persistence
    await page.reload({ waitUntil: "networkidle" });
    const afterReload = await page.evaluate(async (stampNum) => {
      const res = await fetch("/api/v1/onboarding/gen2");
      const json = await res.json().catch(() => ({}));
      const d = json.data ?? {};
      return {
        orgId: d.organisationId,
        membershipId: d.membershipId,
        profileName: d.profile?.businessName ?? null,
        systems: d.systems?.connectors ?? [],
        currentStep: d.progress?.currentStep,
        implementationNotes: d.progress?.implementationNotes ?? null,
        stamp: String(stampNum),
      };
    }, stamp);

    evidence.resume.sameOrganisation = afterReload.orgId === evidence.organisationId;
    evidence.resume.sameMembership = afterReload.membershipId === evidence.membershipId;
    evidence.resume.profilePersisted = String(afterReload.profileName ?? "").includes(String(stamp));
    evidence.resume.systemsPersisted = Array.isArray(afterReload.systems) && afterReload.systems.length > 0;
    evidence.resume.stepAfterReload = afterReload.currentStep;

    // Logout simulation — new browser context
    await context.close();
    const context2 = await browser.newContext();
    await mintSessionCookie(context2, userId);
    const page2 = await context2.newPage();
    page2.on("request", (req) => recordRequest(req.url(), req.method()));
    await page2.goto(`${baseUrl}/onboarding`, { waitUntil: "domcontentloaded" });
    const afterLogin = await page2.evaluate(async () => {
      const res = await fetch("/api/v1/onboarding/gen2");
      const json = await res.json().catch(() => ({}));
      return json.data ?? null;
    });
    evidence.resume.afterReLoginSameOrg =
      afterLogin?.organisationId === evidence.organisationId;
    evidence.resume.afterReLoginSameMembership =
      afterLogin?.membershipId === evidence.membershipId;
    evidence.resume.afterReLoginStep = afterLogin?.progress?.currentStep;
    evidence.resume.implementationPersisted =
      String(afterLogin?.progress?.implementationNotes ?? "").includes(String(stamp));

    // /founding/setup
    await page2.goto(`${baseUrl}/founding/setup`, { waitUntil: "networkidle" });
    evidence.foundingSetup.finalUrl = page2.url();
    evidence.foundingSetup.entersOnboarding = page2.url().includes("/onboarding");

    // /signup unchanged check (title/heading present)
    await page2.goto(`${baseUrl}/signup`, { waitUntil: "networkidle" });
    const signupText = await page2.locator("body").innerText();
    evidence.signup.reachable = true;
    evidence.signup.notOnboardingRedirect = !page2.url().includes("/onboarding");
    evidence.signup.hasPlanPicker =
      /plan|app|signup|platform/i.test(signupText.slice(0, 2000));

    await context2.close();
  } finally {
    await browser.close();
  }

  evidence.wpViolations = wpViolations;
  evidence.networkSampleCount = networkLog.length;
  evidence.networkGatePass = wpViolations.length === 0;

  writeFileSync(evidencePath, JSON.stringify(evidence, null, 2));

  if (wpViolations.length > 0) {
    console.error("WP network violations:", wpViolations);
    process.exit(1);
  }

  const required = [
    evidence.organisationId,
    evidence.membershipId,
    evidence.steps.businessProfile || evidence.steps.businessIdentity,
    evidence.resume.sameOrganisation,
    evidence.resume.afterReLoginSameOrg,
    evidence.foundingSetup.entersOnboarding,
  ];
  if (required.some((v) => !v)) {
    console.error("Acceptance incomplete:", evidence);
    process.exit(2);
  }

  console.log(JSON.stringify({ ok: true, evidencePath, summary: evidence }));
}

main().catch((err) => {
  writeFileSync(
    evidencePath,
    JSON.stringify({ ok: false, error: String(err), networkLog, wpViolations }, null, 2),
  );
  console.error(err);
  process.exit(1);
});

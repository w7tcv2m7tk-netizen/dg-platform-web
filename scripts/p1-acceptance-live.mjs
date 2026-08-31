/**
 * P1 live acceptance — Clerk + Neon API walkthrough with WordPress blocked.
 * Does not print secrets. Records org/membership IDs for evidence.
 *
 * Env (via .env.local):
 * - CLERK_SECRET_KEY, DATABASE_URL required
 * - P1_TEST_EMAIL optional — defaults to first Clerk test user
 *
 * Run:
 *   DG_API_BASE_URL=https://wp-blocked.invalid npx dotenv -e .env.local -- node scripts/p1-acceptance-live.mjs
 */
import assert from "node:assert/strict";
import { writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const baseUrl = (process.env.P1_APP_URL ?? "http://127.0.0.1:3011").replace(/\/$/, "");
const outPath = join(root, "scripts/.p1-acceptance-evidence.json");

const wpPatterns = [
  /\/wp-json\/digitalgate\/v1\/portal\/me/i,
  /digitalgate\.com\.au\/onboarding/i,
  /\/wp-json\/digitalgate\/v1\/onboarding/i,
];

const networkLog = [];

async function trackedFetch(url, init = {}) {
  const res = await fetch(url, init);
  const text = await res.text().catch(() => "");
  networkLog.push({ url: String(url), method: init.method ?? "GET", status: res.status });
  for (const p of wpPatterns) {
    if (p.test(String(url))) {
      throw new Error(`WordPress network call detected: ${url}`);
    }
  }
  let json = null;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    json = null;
  }
  return { res, json, text };
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
  if (!res.ok) {
    throw new Error(`Clerk ${path} ${res.status}: ${JSON.stringify(json)}`);
  }
  return json;
}

async function resolveTestUserId() {
  const email = process.env.P1_TEST_EMAIL?.trim().toLowerCase();
  if (email) {
    const users = await clerkJson(
      `/users?email_address=${encodeURIComponent(email)}&limit=1`,
    );
    const user = users?.[0];
    if (!user?.id) throw new Error(`No Clerk user for P1_TEST_EMAIL`);
    return { userId: user.id, email };
  }
  const users = await clerkJson(`/users?limit=5&order_by=-created_at`);
  const testUser = (users ?? []).find((u) =>
    (u.email_addresses ?? []).some((e) =>
      String(e.email_address ?? "").includes("+p1") ||
      String(e.email_address ?? "").endsWith("@digitalgate.com.au"),
    ),
  ) ?? users?.[0];
  if (!testUser?.id) throw new Error("No Clerk test user found — set P1_TEST_EMAIL");
  const primary =
    testUser.email_addresses?.find((e) => e.id === testUser.primary_email_address_id) ??
    testUser.email_addresses?.[0];
  return { userId: testUser.id, email: primary?.email_address ?? "unknown" };
}

async function mintSessionCookie(userId) {
  const token = await clerkJson("/sign_in_tokens", {
    method: "POST",
    body: JSON.stringify({ user_id: userId, expires_in_seconds: 3600 }),
  });
  const ticket = token?.token;
  assert.ok(ticket, "sign_in_token missing");

  // Exchange ticket for session via Clerk FAPI through the app login flow.
  const loginRes = await fetch(`${baseUrl}/login`, {
    redirect: "manual",
    headers: { Cookie: "" },
  });
  const setCookies = loginRes.headers.getSetCookie?.() ?? [];

  const attempt = await fetch(`${baseUrl}/login?__clerk_ticket=${encodeURIComponent(ticket)}`, {
    redirect: "manual",
  });
  const cookies = [
    ...setCookies,
    ...(attempt.headers.getSetCookie?.() ?? []),
  ];
  const sessionCookie = cookies.find((c) => c.startsWith("__session="));
  if (!sessionCookie) {
    // Fallback: use Clerk session API + manual cookie construction is not supported.
    // Use testing endpoint if available.
    const sessions = await clerkJson("/sessions", {
      method: "POST",
      body: JSON.stringify({ user_id: userId }),
    });
    const sessionId = sessions?.id;
    assert.ok(sessionId, "Could not create Clerk session");
    return { mode: "session_id", sessionId, userId, ticket };
  }
  return { mode: "cookie", cookie: sessionCookie.split(";")[0], userId, ticket };
}

function authHeaders(session) {
  if (session.mode === "cookie") {
    return { Cookie: session.cookie };
  }
  return {};
}

async function api(session, path, init = {}) {
  const headers = {
    "Content-Type": "application/json",
    ...authHeaders(session),
    ...(init.headers ?? {}),
  };
  if (session.mode === "session_id") {
    headers["X-P1-Clerk-Session-Id"] = session.sessionId;
  }
  return trackedFetch(`${baseUrl}${path}`, { ...init, headers });
}

async function main() {
  assert.match(process.env.DG_API_BASE_URL ?? "", /wp-blocked|invalid|unavailable/i, "Set DG_API_BASE_URL to blocked WP host");

  const ping = await trackedFetch(`${baseUrl}/api/health`);
  assert.equal(ping.res.status, 200, "health check failed — is dev server running?");

  const { userId, email } = await resolveTestUserId();
  const session = await mintSessionCookie(userId);

  const evidence = {
    at: new Date().toISOString(),
    clerkUserId: userId,
    emailMasked: email.replace(/(^.).*(@.*$)/, "$1***$2"),
    sessionMode: session.mode,
    organisationId: null,
    membershipId: null,
    steps: {},
    resume: {},
    networkLog,
    wpBlockedBase: process.env.DG_API_BASE_URL,
  };

  // Session-id mode cannot hit authenticated routes without browser — fail clearly.
  if (session.mode === "session_id") {
    evidence.blocker = "Could not mint __session cookie — browser Clerk login required for authenticated routes";
    writeFileSync(outPath, JSON.stringify(evidence, null, 2));
    console.error(JSON.stringify({ ok: false, blocker: evidence.blocker, evidencePath: outPath }));
    process.exit(2);
  }

  let get = await api(session, "/api/v1/onboarding/gen2");
  assert.equal(get.res.status, 200, `onboarding GET failed: ${get.text}`);
  evidence.organisationId = get.json?.data?.organisationId ?? null;
  evidence.membershipId = get.json?.data?.membershipId ?? null;

  const stamp = Date.now();
  const profilePatch = {
    markStepComplete: "business_profile",
    profile: {
      businessName: `P1 Test Co ${stamp}`,
      tradingName: `P1 Trading ${stamp}`,
      abn: "53004085616",
      websiteUrl: "https://example.com",
      industryVertical: "services",
      businessPhone: "+61400000001",
      businessEmail: email,
      brandVoice: { services: "P1 acceptance services", targetAudience: "SME owners" },
    },
    progress: { currentStep: "goals" },
  };
  let patch = await api(session, "/api/v1/onboarding/gen2", {
    method: "PATCH",
    body: JSON.stringify(profilePatch),
  });
  assert.equal(patch.res.status, 200, `profile patch failed: ${patch.text}`);
  evidence.steps.businessProfile = patch.json?.data?.progress?.completedSteps?.includes("business_profile");

  patch = await api(session, "/api/v1/onboarding/gen2", {
    method: "PATCH",
    body: JSON.stringify({
      markStepComplete: "goals",
      goals: [{ id: "more_leads", title: "Generate more leads" }],
      progress: { currentStep: "team" },
    }),
  });
  assert.equal(patch.res.status, 200);
  evidence.steps.goals = true;

  patch = await api(session, "/api/v1/onboarding/gen2", {
    method: "PATCH",
    body: JSON.stringify({
      markStepComplete: "team",
      progress: { currentStep: "systems", checklist: { team: true } },
    }),
  });
  assert.equal(patch.res.status, 200);
  evidence.steps.team = true;

  const systemsConnectors = ["google_workspace", "xero"];
  patch = await api(session, "/api/v1/onboarding/gen2", {
    method: "PATCH",
    body: JSON.stringify({
      markStepComplete: "systems",
      systemsConnectors,
      systemsNotes: `P1 systems note ${stamp}`,
      progress: { currentStep: "plan", systemsConnectors, systemsNotes: `P1 systems note ${stamp}` },
    }),
  });
  assert.equal(patch.res.status, 200);
  evidence.steps.systems = true;

  patch = await api(session, "/api/v1/onboarding/gen2", {
    method: "PATCH",
    body: JSON.stringify({
      markStepComplete: "plan",
      progress: { platformTier: "professional", currentStep: "apps" },
    }),
  });
  assert.equal(patch.res.status, 200);
  evidence.steps.plan = true;

  patch = await api(session, "/api/v1/onboarding/gen2", {
    method: "PATCH",
    body: JSON.stringify({
      markStepComplete: "apps",
      progress: {
        industryApps: ["services"],
        premiumApps: ["seo"],
        currentStep: "billing_cadence",
      },
    }),
  });
  assert.equal(patch.res.status, 200);
  evidence.steps.apps = true;

  patch = await api(session, "/api/v1/onboarding/gen2", {
    method: "PATCH",
    body: JSON.stringify({
      progress: {
        implementationNotes: `P1 implementation ${stamp}`,
        currentStep: "goals",
      },
    }),
  });
  assert.equal(patch.res.status, 200);
  evidence.resume.midStep = patch.json?.data?.progress?.currentStep;

  get = await api(session, "/api/v1/onboarding/gen2");
  assert.equal(get.res.status, 200);
  const orgAfter = get.json?.data?.organisationId;
  const membershipAfter = get.json?.data?.membershipId;
  evidence.resume.sameOrganisation = orgAfter === evidence.organisationId;
  evidence.resume.sameMembership = membershipAfter === evidence.membershipId;
  evidence.resume.profilePersisted =
    get.json?.data?.profile?.businessName === `P1 Test Co ${stamp}`;
  evidence.resume.systemsPersisted =
    JSON.stringify(get.json?.data?.systems?.connectors ?? []) ===
    JSON.stringify(systemsConnectors);

  const team = await api(session, "/api/v1/org/team");
  assert.equal(team.res.status, 200);
  const members = team.json?.data?.members ?? [];
  evidence.steps.teamSameOrg = members.every((m) => m.organisationId ? m.organisationId === evidence.organisationId : true);

  writeFileSync(outPath, JSON.stringify(evidence, null, 2));
  console.log(JSON.stringify({ ok: true, evidencePath: outPath, evidence }));
}

main().catch((err) => {
  writeFileSync(outPath, JSON.stringify({ ok: false, error: String(err), networkLog }, null, 2));
  console.error(err);
  process.exit(1);
});

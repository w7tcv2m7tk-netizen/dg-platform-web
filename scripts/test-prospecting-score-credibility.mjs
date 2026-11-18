import assert from "node:assert/strict";
import test from "node:test";

import { runPresenceAudit } from "../packages/platform-core/src/command-centre/growth-engine/presence-audit.ts";
import { computeProspectOpportunityScore } from "../packages/platform-core/src/command-centre/growth-engine/opportunity-engine.ts";

const html = (body = "") => `<!doctype html><html><head><title>Test business</title><meta name="description" content="Test"></head><body>${body}</body></html>`;

function withMockedFetch(response, fn) {
  const original = globalThis.fetch;
  globalThis.fetch = async (url) => new Response(response, { status: 200, url: String(url), headers: { "content-type": "text/html" } });
  return fn().finally(() => { globalThis.fetch = original; });
}

test("missing website is Not Assessed, not a low score or strength", async () => {
  const result = await runPresenceAudit({ businessName: "No Website Pty Ltd", publicPreview: true });
  assert.equal(result.scores.businessHealth, null);
  assert.equal(result.scores.websiteHealth, null);
  assert.equal(result.scores.seo, null);
  assert.equal(result.scores.aiVisibility, null);
  assert.equal(result.scores.reputation, null);
  assert.equal(result.scores.conversionReadiness, null);
  assert.equal(result.scores.socialPresence, null);
  assert.equal(result.scores.assessment?.status, "not_assessed");
  assert.equal(result.scores.assessment?.evidenceCoveragePercent, 0);
  assert.equal(result.strengths.length, 0);
  assert.equal(result.findings.some((finding) => finding.severity === "critical"), false);
  assert.ok(result.findings.some((finding) => finding.evidenceStatus === "unavailable"));
});

test("unavailable website observation is not converted into a confirmed weakness", async () => {
  const original = globalThis.fetch;
  globalThis.fetch = async () => { throw new Error("ENOTFOUND"); };
  try {
    const result = await runPresenceAudit({ businessName: "Provider Offline", websiteUrl: "https://offline.example.test", publicPreview: true });
    assert.equal(result.scores.businessHealth, null);
    assert.equal(result.scores.websiteHealth, null);
    assert.equal(result.scores.seo, null);
    assert.equal(result.scores.assessment?.status, "not_assessed");
    assert.equal(result.findings.some((finding) => finding.evidenceStatus === "unavailable"), true);
    assert.equal(result.strengths.length, 0);
  } finally {
    globalThis.fetch = original;
  }
});

test("partial evidence produces a partial assessment without inventing reputation", async () => {
  await withMockedFetch(html("<h1>Hello</h1>"), async () => {
    const result = await runPresenceAudit({ businessName: "Partial Evidence", websiteUrl: "https://93.184.216.34/", publicPreview: true });
    assert.equal(typeof result.scores.websiteHealth, "number");
    assert.equal(typeof result.scores.seo, "number");
    assert.equal(result.scores.reputation, null);
    assert.equal(result.scores.assessment?.status, "partial");
    assert.ok((result.scores.assessment?.evidenceCoveragePercent ?? 0) >= 50);
    assert.ok(result.findings.some((finding) => finding.evidenceStatus === "confirmed_gap" || finding.severity === "opportunity"));
  });
});

test("genuine observed weaknesses remain scored and are not hidden", async () => {
  await withMockedFetch(html("<p>Generic page without structure</p>"), async () => {
    const result = await runPresenceAudit({ businessName: "Genuine Weakness", websiteUrl: "https://93.184.216.34/", publicPreview: true });
    assert.equal(typeof result.scores.websiteHealth, "number");
    assert.equal(typeof result.scores.seo, "number");
    assert.ok((result.scores.businessHealth ?? 100) < 70);
    assert.ok(result.findings.some((finding) => finding.evidenceStatus === "confirmed_gap"));
  });
});



test("a contact form on a sampled page prevents a website-wide enquiry-form deficiency", async () => {
  const original = globalThis.fetch;
  const home = `<!doctype html><html><head><title>Studio</title></head><body><h1>Creative studio</h1><a href="/contact">Contact us</a></body></html>`;
  const contact = `<!doctype html><html><head><title>Contact</title></head><body><h1>Contact us</h1><form><input name="email"><button>Send enquiry</button></form></body></html>`;
  globalThis.fetch = async (url) => new Response(String(url).includes("/contact") ? contact : home, { status: 200, url: String(url), headers: { "content-type": "text/html" } });
  try {
    const result = await runPresenceAudit({ businessName: "Studio", industry: "Creative services", websiteUrl: "https://93.184.216.34/", publicPreview: true });
    assert.ok(result.probes.pages.some((page) => page.hasForm));
    assert.ok(result.strengths.some((strength) => /contact or enquiry page|conversion path/i.test(strength)));
    assert.equal(result.findings.some((finding) => finding.title === "No enquiry form detected on the homepage"), false);
    assert.ok((result.scores.conversionReadiness ?? 0) >= 65);
  } finally {
    globalThis.fetch = original;
  }
});

test("music artist model avoids local-service assumptions and recognises booking pages", async () => {
  const original = globalThis.fetch;
  const home = `<!doctype html><html><head><title>Aetherra</title></head><body><h1>DJ and producer</h1><a href="/dj-and-event-bookings">DJ and Event Bookings</a><a href="/contact">Contact</a></body></html>`;
  const booking = `<!doctype html><html><head><title>DJ and Event Bookings</title></head><body><h1>Book Aetherra</h1><form><input name="event"><button>Enquire</button></form></body></html>`;
  globalThis.fetch = async (url) => new Response(String(url).includes("bookings") ? booking : home, { status: 200, url: String(url), headers: { "content-type": "text/html" } });
  try {
    const result = await runPresenceAudit({ businessName: "Aetherra", industry: "Music & Creative", websiteUrl: "https://93.184.216.34/", publicPreview: true });
    assert.equal(result.businessModel.type, "music_artist");
    assert.equal(result.scores.reputation, null);
    assert.ok(result.strengths.some((strength) => /booking|event|appointment/i.test(strength)));
    assert.equal(result.findings.some((finding) => /google maps|local visibility/i.test(finding.title)), false);
  } finally {
    globalThis.fetch = original;
  }
});

test("metadata after the first 250k characters is still observed", async () => {
  const padding = `<p>${"x".repeat(300_000)}</p>`;
  const lateHead = `<head><title>Late title</title><meta name="description" content="Late description"><meta name="viewport" content="width=device-width"></head>`;
  await withMockedFetch(`<!doctype html><html>${padding}${lateHead}<body><h1>Observed</h1></body></html>`, async () => {
    const result = await runPresenceAudit({ businessName: "Late Metadata", websiteUrl: "https://93.184.216.34/", publicPreview: true });
    assert.equal(result.probes.title, "Late title");
    assert.equal(result.probes.hasMetaDescription, true);
    assert.equal(result.probes.hasViewport, true);
  });
});

test("unverified audit evidence cannot produce a contact-priority recommendation", () => {
  const score = computeProspectOpportunityScore({
    stage: "qualified",
    updatedAt: new Date(),
    websiteUrl: null,
    contactPhone: "0400000000",
    contactEmail: "owner@example.test",
    industry: "Real Estate",
    metadata: null,
    audit: {
      businessHealth: null,
      aiVisibility: null,
      seoScore: null,
      websiteHealth: null,
      findings: { items: [], digitalGateSolutionMatches: [] },
    },
  });
  assert.equal(score.contactPriority, null);
  assert.equal(score.dailyTop3Eligible, false);
  assert.equal(score.opportunityScore, 0);
});

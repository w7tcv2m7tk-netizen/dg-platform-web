/**
 * GBP OAuth must return to Connected Services, not Overview.
 * Run: node --experimental-strip-types --test scripts/test-oauth-return-path.mjs
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  DEFAULT_GBP_OAUTH_RETURN,
  gbpOAuthReturnPath,
  isDashboardOverviewPath,
  sanitizeOAuthReturnDestination,
  sanitizeOAuthReturnTo,
  withGbpOAuthFlash,
} from "../src/lib/oauth-return-path.ts";
import { resolvePostSignInRedirect } from "../src/lib/login-audience.ts";
import {
  createGoogleOAuthState,
  parseGoogleOAuthState,
} from "../src/lib/google-oauth-state.ts";

describe("OAuth return path allowlist", () => {
  it("defaults GBP return to Connected Services", () => {
    assert.equal(gbpOAuthReturnPath(null), DEFAULT_GBP_OAUTH_RETURN);
    assert.equal(gbpOAuthReturnPath("/dashboard"), DEFAULT_GBP_OAUTH_RETURN);
    assert.equal(gbpOAuthReturnPath("https://evil.example/phish"), DEFAULT_GBP_OAUTH_RETURN);
    assert.equal(
      gbpOAuthReturnPath("/dashboard/settings/connectors"),
      "/dashboard/settings/connectors",
    );
  });

  it("rejects overview and open redirects", () => {
    assert.equal(sanitizeOAuthReturnTo("/dashboard"), null);
    assert.equal(sanitizeOAuthReturnTo("//evil.example"), null);
    assert.equal(sanitizeOAuthReturnDestination("/dashboard?google=connected"), null);
  });

  it("keeps allowlisted destinations with flash query", () => {
    assert.equal(
      withGbpOAuthFlash("/dashboard/settings/connected-services", "connected"),
      "/dashboard/settings/connected-services?google=connected",
    );
    assert.equal(
      sanitizeOAuthReturnDestination(
        "/dashboard/settings/connected-services?google=connected",
      ),
      "/dashboard/settings/connected-services?google=connected",
    );
  });

  it("treats /dashboard as Overview", () => {
    assert.equal(isDashboardOverviewPath("/dashboard"), true);
    assert.equal(isDashboardOverviewPath("/dashboard/settings/connectors"), false);
  });
});

describe("post-sign-in redirect keeps OAuth flash", () => {
  it("preserves query on relative and absolute same-origin URLs", () => {
    assert.equal(
      resolvePostSignInRedirect(
        "/dashboard/settings/connected-services?google=connected",
        "client",
      ),
      "/dashboard/settings/connected-services?google=connected",
    );
    assert.equal(
      resolvePostSignInRedirect(
        "https://app.digitalgate.com.au/dashboard/settings/connectors?google=connected",
        "client",
      ),
      "/dashboard/settings/connectors?google=connected",
    );
  });
});

describe("Google OAuth state carries returnTo", () => {
  it("round-trips an allowlisted return path", () => {
    process.env.GOOGLE_OAUTH_STATE_SECRET = "test-oauth-state-secret";
    const token = createGoogleOAuthState("org-1", {
      returnTo: "/dashboard/settings/connectors",
    });
    const parsed = parseGoogleOAuthState(token);
    assert.equal(parsed.ok, true);
    if (parsed.ok) {
      assert.equal(parsed.organisationId, "org-1");
      assert.equal(parsed.returnTo, "/dashboard/settings/connectors");
    }
  });

  it("callback allowlist maps Overview back to Connected Services", () => {
    process.env.GOOGLE_OAUTH_STATE_SECRET = "test-oauth-state-secret";
    const token = createGoogleOAuthState("org-1", { returnTo: "/dashboard" });
    const parsed = parseGoogleOAuthState(token);
    assert.equal(parsed.ok, true);
    if (parsed.ok) {
      assert.equal(gbpOAuthReturnPath(parsed.returnTo), DEFAULT_GBP_OAUTH_RETURN);
    }
  });
});

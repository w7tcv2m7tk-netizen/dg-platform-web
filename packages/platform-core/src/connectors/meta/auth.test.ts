import assert from "node:assert/strict";
import { afterEach, beforeEach, describe, it } from "node:test";
import { buildMetaAuthorizeUrl } from "./auth";

const metaEnvKeys = [
  "META_APP_ID", "META_APP_SECRET", "META_CONFIG_ID",
  "META_USE_BUSINESS_LOGIN_CONFIG", "META_OAUTH_SCOPES",
] as const;
let originalEnv: Map<string, string | undefined>;

beforeEach(() => {
  originalEnv = new Map(metaEnvKeys.map((key) => [key, process.env[key]]));
  for (const key of metaEnvKeys) delete process.env[key];
});

afterEach(() => {
  for (const [key, value] of originalEnv) {
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  }
});

describe("Meta OAuth authorisation", () => {
  it("uses explicit Page and business scopes by default even when a config id exists", () => {
    process.env.META_APP_ID = "app-id";
    process.env.META_APP_SECRET = "secret";
    process.env.META_CONFIG_ID = "config-id";
    delete process.env.META_USE_BUSINESS_LOGIN_CONFIG;
    const result = buildMetaAuthorizeUrl("state");
    assert.equal(result.ok, true);
    if (!result.ok) return;
    const url = new URL(result.url);
    assert.equal(url.searchParams.get("config_id"), null);
    assert.ok(url.searchParams.get("scope")?.includes("pages_show_list"));
    assert.ok(url.searchParams.get("scope")?.includes("pages_read_engagement"));
    assert.ok(url.searchParams.get("scope")?.includes("business_management"));
  });

  it("uses the Facebook Login for Business configuration only when explicitly enabled", () => {
    process.env.META_APP_ID = "app-id";
    process.env.META_APP_SECRET = "secret";
    process.env.META_CONFIG_ID = "config-id";
    process.env.META_USE_BUSINESS_LOGIN_CONFIG = "true";
    const result = buildMetaAuthorizeUrl("state");
    assert.equal(result.ok, true);
    if (!result.ok) return;
    const url = new URL(result.url);
    assert.equal(url.searchParams.get("config_id"), "config-id");
    assert.equal(url.searchParams.get("scope"), null);
  });
});

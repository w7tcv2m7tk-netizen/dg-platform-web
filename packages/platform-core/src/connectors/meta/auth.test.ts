import { afterEach, describe, expect, it } from "vitest";
import { buildMetaAuthorizeUrl } from "./auth";

const originalEnv = { ...process.env };

afterEach(() => {
  process.env = { ...originalEnv };
});

describe("Meta OAuth authorisation", () => {
  it("uses explicit Page and business scopes by default even when a config id exists", () => {
    process.env.META_APP_ID = "app-id";
    process.env.META_APP_SECRET = "secret";
    process.env.META_CONFIG_ID = "config-id";
    delete process.env.META_USE_BUSINESS_LOGIN_CONFIG;
    const result = buildMetaAuthorizeUrl("state");
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const url = new URL(result.url);
    expect(url.searchParams.get("config_id")).toBeNull();
    expect(url.searchParams.get("scope")).toContain("pages_show_list");
    expect(url.searchParams.get("scope")).toContain("pages_read_engagement");
    expect(url.searchParams.get("scope")).toContain("business_management");
  });

  it("uses the Facebook Login for Business configuration only when explicitly enabled", () => {
    process.env.META_APP_ID = "app-id";
    process.env.META_APP_SECRET = "secret";
    process.env.META_CONFIG_ID = "config-id";
    process.env.META_USE_BUSINESS_LOGIN_CONFIG = "true";
    const result = buildMetaAuthorizeUrl("state");
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const url = new URL(result.url);
    expect(url.searchParams.get("config_id")).toBe("config-id");
    expect(url.searchParams.get("scope")).toBeNull();
  });
});

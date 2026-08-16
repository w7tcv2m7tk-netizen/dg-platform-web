export * from "./types";
export * from "./schema";
export * from "./access";
export * from "./templates";
export * from "./funnels";
export * from "./generate";
export * from "./crud";
export * from "./page-chrome";
export * from "./assist";
export * from "./form-capture";
export * from "./native-health";
export * from "./html-to-components";
export * from "./wp-import";
export * from "./beta";

import type { SiteHealthSnapshot } from "./types";

type WpSiteHealthPayload = {
  site?: string;
  generated_at?: string;
  score?: number;
  pass?: number;
  warn?: number;
  fail?: number;
  checks?: Array<{
    id?: string;
    label?: string;
    status?: string;
    detail?: string;
  }>;
  pagespeed?: {
    mobile?: number | null;
    desktop?: number | null;
    checked_at?: string | null;
  };
  ssl?: {
    enabled?: boolean;
  };
};

export function normalizeSiteHealthSnapshot(
  payload: WpSiteHealthPayload,
): SiteHealthSnapshot {
  return {
    site: payload.site ?? "",
    generatedAt: payload.generated_at ?? new Date().toISOString(),
    score: payload.score ?? 0,
    pass: payload.pass ?? 0,
    warn: payload.warn ?? 0,
    fail: payload.fail ?? 0,
    checks: (payload.checks ?? []).map((check) => ({
      id: check.id ?? "",
      label: check.label ?? "",
      status:
        check.status === "pass" || check.status === "warn" || check.status === "fail"
          ? check.status
          : "warn",
      detail: check.detail ?? "",
    })),
    pagespeed: {
      mobile: payload.pagespeed?.mobile ?? null,
      desktop: payload.pagespeed?.desktop ?? null,
      checkedAt: payload.pagespeed?.checked_at ?? null,
    },
    ssl: {
      enabled: Boolean(payload.ssl?.enabled),
    },
  };
}

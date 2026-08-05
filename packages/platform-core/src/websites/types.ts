export type HealthCheckStatus = "pass" | "warn" | "fail";

export type HealthCheck = {
  id: string;
  label: string;
  status: HealthCheckStatus;
  detail: string;
};

export type SiteHealthSnapshot = {
  site: string;
  generatedAt: string;
  score: number;
  pass: number;
  warn: number;
  fail: number;
  checks: HealthCheck[];
  pagespeed: {
    mobile: number | null;
    desktop: number | null;
    checkedAt: string | null;
  };
  ssl: {
    enabled: boolean;
  };
};

export type SiteHealthFetchErrorCode =
  | "missing_api_key"
  | "auth_failed"
  | "not_found"
  | "upstream_error"
  | "network_error";

export type SiteHealthFetchResult =
  | { ok: true; snapshot: SiteHealthSnapshot }
  | {
      ok: false;
      code: SiteHealthFetchErrorCode;
      message: string;
      status?: number;
    };

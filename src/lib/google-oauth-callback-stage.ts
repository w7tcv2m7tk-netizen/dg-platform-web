export type GoogleOAuthCallbackStage =
  | "oauth_error"
  | "missing_code_state"
  | "invalid_state"
  | "write_blocked"
  | "token_exchange_failed"
  | "missing_analytics_scopes"
  | "token_save_failed";

/**
 * Secret-safe callback diagnostic. Never include the OAuth code, state, access
 * token, refresh token, client secret or raw Google token response in logs.
 */
export function logGoogleOAuthCallbackFailure(
  stage: GoogleOAuthCallbackStage,
  input: { mode?: "analytics" | "gbp"; message?: string } = {},
): void {
  console.error("[google-oauth-callback]", {
    stage,
    mode: input.mode ?? "unknown",
    message: input.message?.slice(0, 300),
  });
}

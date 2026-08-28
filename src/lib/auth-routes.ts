/** Post-auth destinations — keep in sync with Clerk env vars in .env.example */
export const AUTH_SIGN_IN_URL = "/login";
export const AUTH_SIGN_UP_URL = "/signup/account";
/** Returning users land on Overview */
export const AUTH_AFTER_SIGN_IN_URL = "/dashboard";
/** New signups get the guided hub (not Profile-only) */
export const AUTH_AFTER_SIGN_UP_URL = "/onboarding";
export const AUTH_AFTER_SIGN_OUT_URL = "/login";

/** Named login entry points (titles set via ?audience=) */
export const AUTH_CLIENT_LOGIN_URL = "/login?audience=client";
export const AUTH_ACQUISITION_PARTNER_LOGIN_URL = "/login?audience=acquisition";
export const AUTH_DELIVERY_PARTNER_LOGIN_URL = "/login?audience=delivery";

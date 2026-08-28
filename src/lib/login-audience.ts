/**
 * Login page audience — titles change based on who is signing in.
 * Inferred from redirect_url (Clerk protect return path) or explicit ?audience=.
 */

export type LoginAudience = "client" | "acquisition" | "delivery";

export type LoginAudienceCopy = {
  audience: LoginAudience;
  title: string;
  subtitle: string;
  /** Default post-sign-in destination when no redirect_url is present */
  defaultRedirect: string;
};

const COPY: Record<LoginAudience, Omit<LoginAudienceCopy, "audience">> = {
  client: {
    title: "Client login",
    subtitle:
      "Sign in with your email and password to open DigitalGate — CRM, industry apps, websites, and more.",
    defaultRedirect: "/dashboard",
  },
  acquisition: {
    title: "Acquisition Partner login",
    subtitle:
      "Sign in to your Acquisition Partner portal — referrals, commissions, playbook, and partner resources.",
    defaultRedirect: "/acquisition",
  },
  delivery: {
    title: "Delivery Partner login",
    subtitle:
      "Sign in to your Delivery Partner workspace — implementation projects, tasks, customers, and go-live.",
    defaultRedirect: "/delivery",
  },
};

function pathOnly(raw: string | undefined | null): string {
  if (!raw?.trim()) return "";
  try {
    if (raw.startsWith("http://") || raw.startsWith("https://")) {
      return new URL(raw).pathname;
    }
  } catch {
    /* fall through */
  }
  const path = raw.split("?")[0]?.split("#")[0] ?? "";
  return path.startsWith("/") ? path : "";
}

/**
 * Resolve audience from explicit query or return path after protect().
 * Staff `/command/delivery` stays client login — Delivery Partner portal is `/delivery`.
 */
export function resolveLoginAudience(input: {
  audience?: string | null;
  redirectUrl?: string | null;
}): LoginAudience {
  const explicit = input.audience?.trim().toLowerCase();
  if (explicit === "acquisition" || explicit === "acquisition_partner") return "acquisition";
  if (explicit === "delivery" || explicit === "delivery_partner") return "delivery";
  if (explicit === "client" || explicit === "customer") return "client";

  const path = pathOnly(input.redirectUrl);
  if (!path) return "client";

  if (
    path === "/delivery" ||
    path.startsWith("/delivery/") ||
    path === "/partner/delivery" ||
    path.startsWith("/partner/delivery/")
  ) {
    return "delivery";
  }

  if (
    path === "/acquisition" ||
    path.startsWith("/acquisition/") ||
    path === "/partner" ||
    path === "/partner/dashboard" ||
    (path.startsWith("/partner/") && !path.startsWith("/partner/delivery"))
  ) {
    return "acquisition";
  }

  return "client";
}

export function loginAudienceCopy(input: {
  audience?: string | null;
  redirectUrl?: string | null;
}): LoginAudienceCopy {
  const audience = resolveLoginAudience(input);
  return { audience, ...COPY[audience] };
}

/** Safe same-origin redirect path for after sign-in. */
export function resolvePostSignInRedirect(
  redirectUrl: string | undefined | null,
  audience: LoginAudience,
): string {
  const path = pathOnly(redirectUrl);
  if (path && path !== "/login" && !path.startsWith("/login/")) {
    return path;
  }
  return COPY[audience].defaultRedirect;
}

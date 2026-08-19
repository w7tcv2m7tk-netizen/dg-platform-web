/**
 * WordPress / PHP form endpoints left on Gen 2 public sites.
 * Edge-safe — used by middleware rewrites and HTML form interceptors.
 */

function normalizePath(pathname: string): string {
  const trimmed = pathname.replace(/\/+$/, "");
  return (trimmed || "/").toLowerCase();
}

function pathFromAction(action: string): string {
  const raw = action.trim();
  if (!raw || raw === "#" || raw.toLowerCase().startsWith("javascript:")) {
    return "";
  }
  try {
    if (/^https?:\/\//i.test(raw)) {
      return normalizePath(new URL(raw).pathname);
    }
  } catch {
    /* fall through */
  }
  return normalizePath(raw.split("?")[0] || "/");
}

/** True when a request path is a leftover WP / PHP form handler. */
export function isLegacyWordpressFormPath(pathname: string): boolean {
  const path = normalizePath(pathname);

  if (path === "/wp-admin/admin-ajax.php") return true;
  if (path === "/wp-admin/admin-post.php") return true;
  if (path === "/inc/send-dg-enquiry.php") return true;
  if (path === "/inc/send-contact.php") return true;

  if (path.startsWith("/inc/") && path.endsWith(".php")) {
    return /send-|contact|enquiry|booking|form|mail/.test(path);
  }

  if (path.includes("/wp-json/contact-form-7")) return true;
  if (/\/wp-json\/.+\/(feedback|submit|enquire|enquiry|contact)/i.test(path)) {
    return true;
  }

  return false;
}

/** True when a form action still targets a leftover WP / PHP handler. */
export function isLegacyWordpressFormAction(action: string): boolean {
  const path = pathFromAction(action);
  return path ? isLegacyWordpressFormPath(path) : false;
}

/**
 * Whether a stored HTML form should be intercepted and posted to Gen 2.
 * GET navigation (newsletter → /contact) stays as-is.
 */
export function shouldCaptureHtmlForm(opts: {
  method?: string | null;
  action?: string | null;
  formId?: string | null;
}): boolean {
  const id = (opts.formId || "").trim().toLowerCase();
  // Funnel HTML is driven by React captures — skip address-only first steps.
  if (
    id === "rr-address-form" ||
    id === "rr-contact-form" ||
    id === "dg-website-form" ||
    id === "dg-contact-form"
  ) {
    return false;
  }

  const action = (opts.action || "").trim();
  if (isLegacyWordpressFormAction(action)) return true;
  if (/\/api\//i.test(action)) return false;

  const method = (opts.method || "").trim().toLowerCase();
  if (method === "post") return true;
  if (!action || action === "#" || /^javascript:/i.test(action)) return true;
  return false;
}

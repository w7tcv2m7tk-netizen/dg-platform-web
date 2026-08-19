import { WANTD_NAV } from "@dg/platform-core";
import type { WebsiteTheme } from "@dg/platform-core";

import { WantdIcon, WantdWordmark } from "@/components/websites/WantdPublicArt";

function homeHref(basePath: string): string {
  return basePath && basePath !== "/" ? basePath : "/";
}

function resolveHref(href: string, basePath: string): string {
  if (href.startsWith("http") || href.startsWith("#") || href.startsWith("mailto:")) {
    return href;
  }
  if (href === "/" || href === "") return homeHref(basePath);
  const clean = href.replace(/^\//, "");
  if (clean === "home") return homeHref(basePath);
  const root = homeHref(basePath);
  if (root === "/") return `/${clean}`;
  return `${root}/${clean}`;
}

export function WantdSiteHeader({
  theme,
  basePath,
  links,
}: {
  theme: WebsiteTheme;
  basePath: string;
  links?: Array<{ label: string; href: string }>;
}) {
  const logo = (theme.logoUrl || "").trim();
  const nav = (links && links.length ? links : [...WANTD_NAV]).map((link) => ({
    label: link.label,
    href: resolveHref(link.href, basePath),
  }));

  return (
    <header className="wb-wantd-header">
      <a href={homeHref(basePath)} className="wb-wantd-header-brand" aria-label="wantd">
        {logo ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={logo} alt="wantd" className="wb-wantd-header-logo" />
        ) : (
          <WantdWordmark className="wb-wantd-wordmark" />
        )}
      </a>
      <nav className="wb-wantd-header-nav" aria-label="Primary">
        {nav.map((link) => (
          <a key={`${link.href}-${link.label}`} href={link.href}>
            {link.label}
          </a>
        ))}
      </nav>
    </header>
  );
}

export function WantdSiteFooter({
  theme,
  basePath,
  links,
}: {
  theme: WebsiteTheme;
  basePath: string;
  links?: Array<{ label: string; href: string }>;
}) {
  const logo = (theme.logoUrl || "").trim();
  const icon = (theme.iconUrl || "").trim();
  const showUploadedIcon = Boolean(icon && icon !== logo);
  const nav = [
    { label: "Privacy", href: "/privacy" },
    { label: "Terms", href: "/terms" },
    ...(links ?? []),
  ]
    .filter(
      (link, i, all) =>
        all.findIndex((x) => x.href === link.href || x.label === link.label) === i,
    )
    .slice(0, 6)
    .map((link) => ({
      label: link.label,
      href: resolveHref(link.href, basePath),
    }));

  return (
    <footer className="wb-wantd-footer">
      <a href={homeHref(basePath)} className="wb-wantd-footer-icon" aria-label="wantd">
        {showUploadedIcon ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={icon} alt="" />
        ) : (
          <WantdIcon />
        )}
      </a>
      <nav className="wb-wantd-footer-nav" aria-label="Footer">
        {nav.map((link) => (
          <a key={`f-${link.href}-${link.label}`} href={link.href}>
            {link.label}
          </a>
        ))}
      </nav>
      <p>© {new Date().getFullYear()} Wantd</p>
    </footer>
  );
}

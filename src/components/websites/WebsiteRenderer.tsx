"use client";

import { useEffect, useState } from "react";
import type { WebsiteComponent, WebsiteTheme } from "@dg/platform-core";

function asString(v: unknown, fallback = ""): string {
  return typeof v === "string" ? v : fallback;
}

/** Decode common HTML entities from WP excerpts/titles for readable cards. */
function decodeHtmlEntities(input: string): string {
  return input
    .replace(/&#x([0-9a-fA-F]+);/g, (_, hex) =>
      String.fromCharCode(parseInt(hex, 16)),
    )
    .replace(/&#(\d+);/g, (_, num) => String.fromCharCode(Number(num)))
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&rsquo;/g, "\u2019")
    .replace(/&lsquo;/g, "\u2018")
    .replace(/&rdquo;/g, "\u201D")
    .replace(/&ldquo;/g, "\u201C")
    .replace(/&mdash;/g, "\u2014")
    .replace(/&ndash;/g, "\u2013");
}

function asLinks(v: unknown): Array<{ label: string; href: string }> {
  if (!Array.isArray(v)) return [];
  return v
    .map((item) => {
      if (!item || typeof item !== "object") return null;
      const o = item as Record<string, unknown>;
      if (typeof o.label !== "string" || typeof o.href !== "string") return null;
      return { label: o.label, href: o.href };
    })
    .filter((x): x is { label: string; href: string } => x !== null);
}

function asServiceItems(v: unknown): Array<{ title: string; description: string }> {
  if (!Array.isArray(v)) return [];
  return v
    .map((item) => {
      if (!item || typeof item !== "object") return null;
      const o = item as Record<string, unknown>;
      return {
        title: asString(o.title, "Service"),
        description: asString(o.description),
      };
    })
    .filter((x): x is { title: string; description: string } => x !== null);
}

function resolveHref(href: string, basePath: string): string {
  if (href.startsWith("http") || href.startsWith("#") || href.startsWith("mailto:")) {
    return href;
  }
  if (href === "/" || href === "") return basePath;
  const clean = href.replace(/^\//, "");
  if (clean === "home") return basePath;
  return `${basePath}/${clean}`;
}

export function WebsiteContactForm({
  siteSlug,
  pageSlug,
  headline,
  submitLabel,
  successMessage,
  primaryColor,
}: {
  siteSlug: string;
  pageSlug?: string;
  headline?: string;
  submitLabel?: string;
  successMessage?: string;
  primaryColor: string;
}) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [message, setMessage] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "done" | "error">("idle");
  const [error, setError] = useState("");

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus("loading");
    setError("");
    try {
      const res = await fetch(`/api/v1/websites/public/${siteSlug}/form`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, phone, message, pageSlug }),
      });
      const json = (await res.json().catch(() => ({}))) as {
        error?: { message?: string };
      };
      if (!res.ok) {
        setStatus("error");
        setError(json.error?.message || "Could not submit");
        return;
      }
      setStatus("done");
      setName("");
      setEmail("");
      setPhone("");
      setMessage("");
    } catch {
      setStatus("error");
      setError("Network error");
    }
  }

  if (status === "done") {
    return (
      <p className="wb-form-success">
        {successMessage || "Thanks — we’ll be in touch shortly."}
      </p>
    );
  }

  return (
    <form id="contact-form" className="wb-form" onSubmit={onSubmit}>
      {headline ? <h2 className="wb-section-title">{headline}</h2> : null}
      <label>
        Name
        <input value={name} onChange={(e) => setName(e.target.value)} required />
      </label>
      <label>
        Email
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
      </label>
      <label>
        Phone
        <input value={phone} onChange={(e) => setPhone(e.target.value)} />
      </label>
      <label>
        Message
        <textarea
          rows={4}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
        />
      </label>
      {error ? <p className="wb-form-error">{error}</p> : null}
      <button
        type="submit"
        disabled={status === "loading"}
        style={{ background: primaryColor }}
      >
        {status === "loading" ? "Sending…" : submitLabel || "Submit"}
      </button>
    </form>
  );
}

export function WebsiteComponentView({
  component,
  theme,
  basePath,
  siteSlug,
  pageSlug,
}: {
  component: WebsiteComponent;
  theme: WebsiteTheme;
  basePath: string;
  siteSlug: string;
  pageSlug?: string;
}) {
  const primary = theme.primaryColor || "#1e3a5f";
  const accent = theme.accentColor || "#c4a35a";
  const name = theme.businessName || "Business";

  switch (component.type) {
    case "nav": {
      const links = asLinks(component.props.links);
      return (
        <nav className="wb-nav">
          <a className="wb-nav-brand" href={basePath}>
            {theme.logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={theme.logoUrl} alt={name} className="wb-nav-logo" />
            ) : (
              name
            )}
          </a>
          <div className="wb-nav-links">
            {links.map((l) => (
              <a key={l.href + l.label} href={resolveHref(l.href, basePath)}>
                {l.label}
              </a>
            ))}
          </div>
        </nav>
      );
    }
    case "hero":
      return (
        <section className="wb-hero" style={{ ["--wb-primary" as string]: primary }}>
          <div className="wb-hero-inner">
            <h1>{asString(component.props.headline, name)}</h1>
            <p>{asString(component.props.subheadline)}</p>
            {component.props.ctaLabel ? (
              <a
                className="wb-btn"
                href={resolveHref(asString(component.props.ctaHref, "/contact"), basePath)}
                style={{ background: primary }}
              >
                {asString(component.props.ctaLabel)}
              </a>
            ) : null}
          </div>
        </section>
      );
    case "trust": {
      const items = Array.isArray(component.props.items)
        ? component.props.items.map((x) => String(x))
        : [];
      return (
        <section className="wb-trust">
          <ul>
            {items.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </section>
      );
    }
    case "services": {
      const items = asServiceItems(component.props.items);
      return (
        <section className="wb-section">
          <h2 className="wb-section-title">
            {asString(component.props.headline, "Services")}
          </h2>
          <div className="wb-services">
            {items.map((item) => (
              <div key={item.title} className="wb-service">
                <h3 style={{ color: primary }}>{item.title}</h3>
                <p>{item.description}</p>
              </div>
            ))}
          </div>
        </section>
      );
    }
    case "about":
      return (
        <section className="wb-section wb-about">
          <h2 className="wb-section-title">
            {asString(component.props.headline, "About")}
          </h2>
          <p>{asString(component.props.body)}</p>
        </section>
      );
    case "testimonials": {
      const items = Array.isArray(component.props.items)
        ? (component.props.items as Array<{ quote?: string; author?: string }>)
        : [];
      return (
        <section className="wb-section">
          <h2 className="wb-section-title">
            {asString(component.props.headline, "What clients say")}
          </h2>
          <div className="wb-testimonials">
            {items.map((t, i) => (
              <blockquote key={i}>
                <p>“{t.quote}”</p>
                {t.author ? <cite>— {t.author}</cite> : null}
              </blockquote>
            ))}
          </div>
        </section>
      );
    }
    case "cta":
      return (
        <section className="wb-cta" style={{ background: primary }}>
          <h2>{asString(component.props.headline)}</h2>
          <p>{asString(component.props.body)}</p>
          {component.props.buttonLabel ? (
            <a
              className="wb-btn wb-btn-light"
              href={resolveHref(
                asString(component.props.buttonHref, "/contact"),
                basePath,
              )}
            >
              {asString(component.props.buttonLabel)}
            </a>
          ) : null}
        </section>
      );
    case "faq": {
      const items = Array.isArray(component.props.items)
        ? (component.props.items as Array<{ q?: string; a?: string }>)
        : [];
      return (
        <section className="wb-section">
          <h2 className="wb-section-title">
            {asString(component.props.headline, "FAQs")}
          </h2>
          <dl className="wb-faq">
            {items.map((item, i) => (
              <div key={i}>
                <dt>{item.q}</dt>
                <dd>{item.a}</dd>
              </div>
            ))}
          </dl>
        </section>
      );
    }
    case "contact_form":
      return (
        <section className="wb-section">
          <WebsiteContactForm
            siteSlug={siteSlug}
            pageSlug={pageSlug}
            headline={asString(component.props.headline, "Contact")}
            submitLabel={asString(component.props.submitLabel, "Submit")}
            successMessage={asString(component.props.successMessage)}
            primaryColor={primary}
          />
        </section>
      );
    case "footer": {
      const phone = asString(component.props.phone);
      const email = asString(component.props.email);
      return (
        <footer className="wb-footer">
          <p>
            <strong style={{ color: "var(--wb-ink)" }}>
              {asString(component.props.businessName, name)}
            </strong>
            {phone ? (
              <>
                {" · "}
                <a href={`tel:${phone.replace(/\s+/g, "")}`}>{phone}</a>
              </>
            ) : null}
            {email ? (
              <>
                {" · "}
                <a href={`mailto:${email}`}>{email}</a>
              </>
            ) : null}
          </p>
          <p className="wb-footer-meta" style={{ color: accent }}>
            Powered by DigitalGate
          </p>
        </footer>
      );
    }
    case "heading": {
      const level = Math.min(
        6,
        Math.max(1, Number(component.props.level) || 2),
      );
      const text = asString(component.props.text);
      const className = "wb-heading";
      return (
        <section className="wb-section wb-heading-block">
          {level === 1 ? (
            <h1 className={className}>{text}</h1>
          ) : level === 3 ? (
            <h3 className={className}>{text}</h3>
          ) : level === 4 ? (
            <h4 className={className}>{text}</h4>
          ) : level >= 5 ? (
            <h5 className={className}>{text}</h5>
          ) : (
            <h2 className={className}>{text}</h2>
          )}
        </section>
      );
    }
    case "paragraph":
      return (
        <section className="wb-section wb-paragraph-block">
          <p className="wb-paragraph">{asString(component.props.text)}</p>
        </section>
      );
    case "image": {
      const src = asString(component.props.src);
      if (!src) return null;
      return (
        <section className="wb-section wb-image-block">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={src}
            alt={asString(component.props.alt, name)}
            className="wb-content-image"
          />
        </section>
      );
    }
    case "list": {
      const items = Array.isArray(component.props.items)
        ? component.props.items.map((x) => String(x))
        : [];
      const ordered = Boolean(component.props.ordered);
      const ListTag = ordered ? "ol" : "ul";
      return (
        <section className="wb-section">
          <ListTag className="wb-content-list">
            {items.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ListTag>
        </section>
      );
    }
    case "html": {
      const html = asString(component.props.html);
      if (!html) return null;
      return (
        <section
          className="wb-section wb-html-block"
          dangerouslySetInnerHTML={{ __html: html }}
        />
      );
    }
    case "post_grid": {
      const columns = Math.min(3, Math.max(1, Number(component.props.columns) || 2));
      const headline = asString(component.props.headline);
      const postsRaw = Array.isArray(component.props.posts)
        ? component.props.posts
        : [];
      const posts = postsRaw
        .map((item) => {
          if (!item || typeof item !== "object") return null;
          const o = item as Record<string, unknown>;
          const title = asString(o.title);
          const href = asString(o.href);
          if (!title || !href) return null;
          return {
            title: decodeHtmlEntities(title),
            href,
            excerpt: decodeHtmlEntities(asString(o.excerpt)),
            image: asString(o.image),
            date: asString(o.date),
          };
        })
        .filter((x): x is NonNullable<typeof x> => x !== null);
      if (posts.length === 0) return null;
      return (
        <section className="wb-post-grid-wrap">
          {headline ? (
            <h2 className="wb-section-title" style={{ marginBottom: "1.25rem" }}>
              {headline}
            </h2>
          ) : null}
          <div
            className="wb-post-grid"
            style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }}
          >
            {posts.map((post) => (
              <a key={post.href} href={post.href} className="wb-post-card">
                {post.image ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    className="wb-post-card-image"
                    src={post.image}
                    alt=""
                  />
                ) : (
                  <div className="wb-post-card-image" aria-hidden />
                )}
                <div className="wb-post-card-body">
                  {post.date ? (
                    <span className="wb-post-card-meta">{post.date}</span>
                  ) : null}
                  <h3 className="wb-post-card-title">{post.title}</h3>
                  {post.excerpt ? (
                    <p className="wb-post-card-excerpt">{post.excerpt}</p>
                  ) : null}
                  <span className="wb-post-card-cta">Read article →</span>
                </div>
              </a>
            ))}
          </div>
        </section>
      );
    }
    default:
      return null;
  }
}

function isHtmlDominantPage(components: WebsiteComponent[]): boolean {
  if (components.length === 0) return false;
  const soft = new Set(["html", "footer", "nav", "post_grid"]);
  const htmlish = components.filter((c) => soft.has(c.type)).length;
  const other = components.length - htmlish;
  return htmlish > 0 && other === 0;
}

export type WebsiteChrome = {
  headerHtml?: string | null;
  footerHtml?: string | null;
  stylesheets?: string[] | null;
  /** Prefer profile logo chrome when theme.logoUrl is set */
  navLinks?: Array<{ label: string; href: string }> | null;
  businessName?: string | null;
  /** Transparent header over hero (Roe / CVH style) */
  overlayHeader?: boolean | null;
};

function BrandSiteHeader({
  theme,
  basePath,
  links,
  businessName,
  overlay,
}: {
  theme: WebsiteTheme;
  basePath: string;
  links: Array<{ label: string; href: string }>;
  businessName: string;
  overlay?: boolean;
}) {
  const logo = theme.logoUrl || theme.iconUrl;
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    if (!overlay) return;
    const onScroll = () => {
      setScrolled(window.scrollY > 24);
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [overlay]);

  return (
    <header
      className={[
        "wb-brand-chrome",
        "wb-brand-chrome-header",
        overlay ? "wb-brand-chrome-header--overlay" : "",
        overlay && scrolled ? "is-scrolled" : "",
      ]
        .filter(Boolean)
        .join(" ")}
    >
      <div className="wb-brand-chrome-inner">
        <a href={basePath} className="wb-brand-chrome-brand" aria-label={businessName}>
          {logo ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={logo} alt={businessName} className="wb-brand-chrome-logo" />
          ) : (
            <span className="wb-brand-chrome-name">{businessName}</span>
          )}
        </a>
        {links.length ? (
          <nav className="wb-brand-chrome-nav" aria-label="Primary">
            {links.map((link) => (
              <a key={`${link.href}-${link.label}`} href={link.href}>
                {link.label}
              </a>
            ))}
          </nav>
        ) : null}
      </div>
    </header>
  );
}

function BrandSiteFooter({
  theme,
  basePath,
  links,
  businessName,
}: {
  theme: WebsiteTheme;
  basePath: string;
  links: Array<{ label: string; href: string }>;
  businessName: string;
}) {
  const logo = theme.logoUrl || theme.iconUrl;
  return (
    <footer className="wb-brand-chrome wb-brand-chrome-footer">
      <div className="wb-brand-chrome-inner">
        <a href={basePath} className="wb-brand-chrome-brand" aria-label={businessName}>
          {logo ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={logo} alt={businessName} className="wb-brand-chrome-logo" />
          ) : (
            <span className="wb-brand-chrome-name">{businessName}</span>
          )}
        </a>
        {links.length ? (
          <nav className="wb-brand-chrome-nav" aria-label="Footer">
            {links.slice(0, 8).map((link) => (
              <a key={`f-${link.href}-${link.label}`} href={link.href}>
                {link.label}
              </a>
            ))}
          </nav>
        ) : null}
        <p className="wb-brand-chrome-copy">
          © {new Date().getFullYear()} {businessName}
        </p>
      </div>
    </footer>
  );
}

export function WebsitePageRenderer({
  components,
  theme,
  basePath,
  siteSlug,
  pageSlug,
  chrome,
}: {
  components: WebsiteComponent[];
  theme: WebsiteTheme;
  basePath: string;
  siteSlug: string;
  pageSlug?: string;
  chrome?: WebsiteChrome | null;
}) {
  const primary = theme.primaryColor || "#1e3a5f";
  const accent = theme.accentColor || "#c4a35a";
  const bg = theme.backgroundColor || "#0c1222";
  const useBrandHeader = Boolean(theme.logoUrl || theme.iconUrl);
  const headerHtml = !useBrandHeader ? chrome?.headerHtml?.trim() || "" : "";
  const footerHtml = chrome?.footerHtml?.trim() || "";
  const useBrandFooter = useBrandHeader && !footerHtml;
  const overlayHeader = Boolean(chrome?.overlayHeader);
  const hasChrome = Boolean(
    headerHtml || footerHtml || useBrandHeader || useBrandFooter,
  );
  const htmlPage = isHtmlDominantPage(components) || hasChrome;
  const postGridOnly =
    components.length > 0 &&
    components.every((c) => c.type === "post_grid");
  /** Light Insights / listing surfaces for overlay brands (RR / CVH) */
  const lightSurface = overlayHeader && postGridOnly;
  const businessName = chrome?.businessName?.trim() || siteSlug;
  const rawLinks = Array.isArray(chrome?.navLinks) ? chrome!.navLinks! : [];
  const links = rawLinks
    .filter((l) => l && typeof l.label === "string" && typeof l.href === "string")
    .map((l) => {
      const href = l.href.startsWith("http")
        ? l.href
        : l.href.startsWith("/sites/")
          ? l.href
          : `${basePath}${l.href === "/" ? "" : l.href.startsWith("/") ? l.href : `/${l.href}`}`;
      return { label: l.label, href };
    });

  const rootClass = [
    "wb-root",
    htmlPage ? "wb-html-page" : "",
    htmlPage ? "wb-full-bleed" : "",
    overlayHeader ? "wb-chrome-overlay" : "",
    lightSurface ? "wb-surface-light" : "",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div
      className={rootClass}
      style={
        {
          ["--wb-primary"]: primary,
          ["--wb-accent"]: accent,
          ["--wb-bg"]: lightSurface
            ? "#f5f2ef"
            : htmlPage
              ? bg || "#0a0e17"
              : bg,
        } as React.CSSProperties
      }
    >
      {useBrandHeader ? (
        <BrandSiteHeader
          theme={theme}
          basePath={basePath}
          links={links}
          businessName={businessName}
          overlay={overlayHeader}
        />
      ) : headerHtml ? (
        <section
          className="wb-section wb-html-block wb-site-chrome wb-site-chrome-header"
          dangerouslySetInnerHTML={{ __html: headerHtml }}
        />
      ) : null}
      {components.map((c) => (
        <WebsiteComponentView
          key={c.id}
          component={c}
          theme={theme}
          basePath={basePath}
          siteSlug={siteSlug}
          pageSlug={pageSlug}
        />
      ))}
      {footerHtml ? (
        <section
          className="wb-section wb-html-block wb-site-chrome wb-site-chrome-footer"
          dangerouslySetInnerHTML={{ __html: footerHtml }}
        />
      ) : useBrandFooter ? (
        <BrandSiteFooter
          theme={theme}
          basePath={basePath}
          links={links}
          businessName={businessName}
        />
      ) : null}
    </div>
  );
}

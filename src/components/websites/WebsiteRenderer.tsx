"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import type {
  PublicStayUnitPayload,
  WebsiteComponent,
  WebsiteTheme,
} from "@dg/platform-core";

import { CvhStayUnitBooking } from "@/components/websites/CvhStayUnitBooking";
import { BusinessAuditCapture } from "@/components/websites/BusinessAuditCapture";
import {
  HideawayCircleCapture,
  HideawayCircleHomepageCta,
} from "@/components/websites/HideawayCircleCapture";
import { PropertyReportCapture } from "@/components/websites/PropertyReportCapture";
import { RoeBookingCapture } from "@/components/websites/RoeBookingCapture";
import { HtmlWithGallery } from "@/components/websites/HtmlWithGallery";
import { HtmlWithDgForms } from "@/components/websites/HtmlWithDgForms";
import { DgMarketingMotion } from "@/components/websites/DgMarketingMotion";
import { ChromeHeaderHtml } from "@/components/websites/ChromeHeaderHtml";
import { ChromeFooterHtml } from "@/components/websites/ChromeFooterHtml";
import { extractStyleBlocks } from "@/lib/public-chrome";
import { stripCvhFooterExploreColumn } from "@/lib/strip-cvh-footer-explore";
import {
  PRODUCT_FUNNEL_URLS,
  rewriteProductFunnelHref,
  rewriteProductFunnelHtml,
} from "@/lib/product-funnel-links";
import { stripImportedDocumentChrome } from "@/lib/public-html";
import { WantdPropertyWantForm } from "@/components/wantd/WantdPropertyWantForm";
import { WantdSiteFooter, WantdSiteHeader } from "@/components/websites/WantdSiteChrome";
import { WantdWantInput } from "@/components/websites/WantdWantInput";
import { WantdIcon, WantdWordmark } from "@/components/websites/WantdPublicArt";
import { wantdPublicSiteCss } from "@/components/websites/wantd-public-site-css";

function asString(v: unknown, fallback = ""): string {
  return typeof v === "string" ? v : fallback;
}

/** Cream article / marketing pages that should use dark island ink. */
const CREAM_PAGE_BG_RE =
  /background(?:-color)?:\s*#(?:F7F4EE|F7F4EF|F5F2EF|FCF9F5|F8F5F0)\b/i;

/**
 * CVH posts use body { background: #F7F4EE } which missed the seed light
 * detector (it only listed #F5F2EF). Without --light, dark-shell type paints
 * article copy white on cream. Do not apply to DigitalGate navy shells.
 */
function ensureCreamHtmlIsland(html: string): string {
  if (!html || /\bwb-html-island--light\b/.test(html)) return html;
  if (/\b(?:dg-fc|dg-about|dg-contact|dg-legal|dg-app|dg-insights|dg-aiv|dg-ams|dg-lpf|dg-vvs|dg-dbc)\b/.test(html)) return html;
  if (!CREAM_PAGE_BG_RE.test(html)) return html;
  return html.replace(
    /class="([^"]*\bwb-html-island\b[^"]*)"/g,
    (full, cls: string) =>
      /\bwb-html-island--light\b/.test(cls)
        ? full
        : `class="${cls.trim()} wb-html-island--light"`,
  );
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

type PostGridPost = {
  title: string;
  href: string;
  excerpt: string;
  image: string;
  date: string;
};

function buildPostPageHref(page: number): string {
  if (typeof window === "undefined") {
    return page <= 1 ? "?" : `?p=${page}`;
  }
  const url = new URL(window.location.href);
  if (page <= 1) url.searchParams.delete("p");
  else url.searchParams.set("p", String(page));
  const q = url.searchParams.toString();
  return `${url.pathname}${q ? `?${q}` : ""}${url.hash}`;
}

function PostGridSection({
  posts,
  columns,
  headline,
  pageSize,
  page,
}: {
  posts: PostGridPost[];
  columns: number;
  headline: string;
  pageSize: number;
  page: number;
}) {
  const totalPages = Math.max(1, Math.ceil(posts.length / pageSize));
  const safePage = Math.min(totalPages, Math.max(1, page));
  const start = (safePage - 1) * pageSize;
  const visible = posts.slice(start, start + pageSize);
  const showPager = totalPages > 1;

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
        {visible.map((post) => (
          <a key={post.href} href={post.href} className="wb-post-card">
            {post.image ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img className="wb-post-card-image" src={post.image} alt="" />
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
      {showPager ? (
        <nav className="wb-post-pager" aria-label="Insights pages">
          {safePage > 1 ? (
            <a className="wb-post-pager-btn" href={buildPostPageHref(safePage - 1)}>
              ← Previous
            </a>
          ) : (
            <span className="wb-post-pager-btn is-disabled" aria-disabled>
              ← Previous
            </span>
          )}
          <span className="wb-post-pager-status">
            Page {safePage} of {totalPages}
          </span>
          {safePage < totalPages ? (
            <a className="wb-post-pager-btn" href={buildPostPageHref(safePage + 1)}>
              Next page →
            </a>
          ) : (
            <span className="wb-post-pager-btn is-disabled" aria-disabled>
              Next page →
            </span>
          )}
        </nav>
      ) : null}
    </section>
  );
}

function PostGridSectionWithParams(props: {
  posts: PostGridPost[];
  columns: number;
  headline: string;
  pageSize: number;
}) {
  const searchParams = useSearchParams();
  const raw = searchParams.get("p");
  const page = Math.max(1, Number.parseInt(raw || "1", 10) || 1);
  return <PostGridSection {...props} page={page} />;
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

function isLightHex(hex?: string | null): boolean {
  const m = hex?.trim().match(/^#([0-9a-f]{6})$/i);
  if (!m) return false;
  const n = parseInt(m[1], 16);
  const r = (n >> 16) & 255;
  const g = (n >> 8) & 255;
  const b = n & 255;
  return (0.299 * r + 0.587 * g + 0.114 * b) / 255 > 0.62;
}

function isWantdSite(siteSlug: string, businessName?: string | null): boolean {
  return (
    siteSlug.toLowerCase() === "wantd" ||
    /^wantd$/i.test((businessName || "").trim())
  );
}

function resolveHref(href: string, basePath: string): string {
  const funnel = rewriteProductFunnelHref(href);
  if (funnel !== href) return funnel;
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
  const [honeypot, setHoneypot] = useState("");
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
        body: JSON.stringify({ name, email, phone, message, pageSlug, website_hp: honeypot }),
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
      <p
        className={[
          "wb-form-success",
          /roe|realty/i.test(siteSlug) ? "wb-form-success--roe" : "",
        ]
          .filter(Boolean)
          .join(" ")}
      >
        {successMessage || "Thanks — we’ll be in touch shortly."}
      </p>
    );
  }

  const isRoe = /roe|realty/i.test(siteSlug);

  return (
    <form
      id="contact-form"
      className={["wb-form", isRoe ? "wb-form--roe" : ""].filter(Boolean).join(" ")}
      onSubmit={onSubmit}
    >
      {headline ? <h2 className="wb-section-title">{headline}</h2> : null}
      <div aria-hidden style={{ position: "absolute", left: "-9999px" }}>
        <input
          type="text"
          tabIndex={-1}
          autoComplete="off"
          value={honeypot}
          onChange={(e) => setHoneypot(e.target.value)}
        />
      </div>
      {isRoe ? (
        <p className="wb-form-sub">
          Whether you&apos;re buying, selling, or exploring the market — we&apos;d
          love to hear from you.
        </p>
      ) : null}
      {isRoe ? (
        <div className="wb-form-row">
          <label>
            Full Name *
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              placeholder="Your name"
            />
          </label>
          <label>
            Phone
            <input
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="Your phone number"
            />
          </label>
        </div>
      ) : (
        <label>
          Name
          <input value={name} onChange={(e) => setName(e.target.value)} required />
        </label>
      )}
      <label>
        Email{isRoe ? " *" : ""}
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required={isRoe}
          placeholder={isRoe ? "you@example.com" : undefined}
        />
      </label>
      {isRoe ? null : (
        <label>
          Phone
          <input value={phone} onChange={(e) => setPhone(e.target.value)} />
        </label>
      )}
      <label>
        Message{isRoe ? " *" : ""}
        <textarea
          rows={isRoe ? 5 : 4}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          required={isRoe}
          placeholder={isRoe ? "How can Roe Realty help you?" : undefined}
        />
      </label>
      {error ? <p className="wb-form-error">{error}</p> : null}
      <button
        type="submit"
        disabled={status === "loading"}
        style={isRoe ? undefined : { background: primaryColor }}
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
  const wantd = isWantdSite(siteSlug, name);

  switch (component.type) {
    case "nav": {
      const links = asLinks(component.props.links);
      return (
        <nav className="wb-nav">
          <a className="wb-nav-brand" href={basePath}>
            {wantd ? (
              <WantdWordmark className="wb-wantd-wordmark" />
            ) : theme.logoUrl ? (
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
    case "hero": {
      const isHome =
        !pageSlug ||
        pageSlug === "home" ||
        pageSlug === "/" ||
        pageSlug.toLowerCase() === "index";
      if (wantd && isHome) {
        return (
          <section className="wb-hero">
            <div className="wb-hero-inner">
              <h1>What do you want?</h1>
              <p>Looking for property? Start with what you want.</p>
              <WantdWantInput actionHref={resolveHref("/post-a-want", basePath)} />
              <p className="wb-wantd-hero-secondary">
                <a href={resolveHref("/how-it-works", basePath)}>See how it works</a>
              </p>
            </div>
          </section>
        );
      }
      const wantdHeadline =
        wantd && pageSlug === "how-it-works"
          ? "How it works"
          : wantd && pageSlug === "post-a-want"
            ? "Tell us what you want"
            : asString(component.props.headline, name);
      const wantdSub =
        wantd && pageSlug === "how-it-works"
          ? "Tell us what you want. We’ll find it."
          : wantd && pageSlug === "post-a-want"
            ? "Property is live. Say it naturally — we’ll start matching."
            : asString(component.props.subheadline);
      return (
        <section className="wb-hero" style={{ ["--wb-primary" as string]: primary }}>
          <div className="wb-hero-inner">
            <h1>{wantdHeadline}</h1>
            <p>{wantdSub}</p>
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
    }
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
      if (wantd && (pageSlug === "post-a-want" || pageSlug === "tell-us-what-you-want")) {
        return (
          <section className="wb-section">
            <WantdPropertyWantForm />
          </section>
        );
      }
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
          {wantd ? (
            <a href={basePath} className="wb-wantd-footer-icon" aria-label={name}>
              {theme.iconUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={theme.iconUrl} alt="" />
              ) : (
                <WantdIcon />
              )}
            </a>
          ) : null}
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
          {asLinks(component.props.links).length ? (
            <p className="wb-footer-meta">
              {asLinks(component.props.links).map((l, i) => (
                <span key={`${l.href}-${i}`}>
                  {i > 0 ? " · " : null}
                  <a href={resolveHref(l.href, basePath)}>{l.label}</a>
                </span>
              ))}
            </p>
          ) : null}
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
      let html = stripImportedDocumentChrome(asString(component.props.html));
      if (!html) return null;
      // Navy DigitalGate shells must not keep cream-island class from import.
      if (/\b(?:dg-fc|dg-about|dg-contact|dg-legal|dg-app|dg-insights|dg-aiv|dg-ams|dg-lpf|dg-vvs|dg-dbc)\b/.test(html)) {
        html = html.replace(/\bwb-html-island--light\b/g, "").replace(/\s{2,}/g, " ");
      } else {
        html = ensureCreamHtmlIsland(html);
      }
      html = rewriteProductFunnelHtml(html);
      const hasForm = /<form[\s>]/i.test(html);
      if (/gallery-grid|gallery-item/i.test(html)) {
        return (
          <HtmlWithGallery html={html} siteSlug={siteSlug} pageSlug={pageSlug} />
        );
      }
      const needsDgMotion =
        /data-dg-motion-root|dg-journey|dg-layers|dg-reveal/i.test(html);
      if (hasForm) {
        return (
          <>
            <HtmlWithDgForms html={html} siteSlug={siteSlug} pageSlug={pageSlug} />
            {needsDgMotion ? <DgMarketingMotion /> : null}
          </>
        );
      }
      return (
        <>
          <section
            className="wb-section wb-html-block"
            dangerouslySetInnerHTML={{ __html: html }}
          />
          {needsDgMotion ? <DgMarketingMotion /> : null}
        </>
      );
    }
    case "post_grid": {
      const columns = Math.min(3, Math.max(1, Number(component.props.columns) || 2));
      const headline = asString(component.props.headline);
      const pageSizeRaw = Number(component.props.pageSize);
      const pageSize =
        Number.isFinite(pageSizeRaw) && pageSizeRaw > 0
          ? Math.min(24, Math.max(2, Math.floor(pageSizeRaw)))
          : 6;
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
        <Suspense
          fallback={
            <PostGridSection
              posts={posts}
              columns={columns}
              headline={headline}
              pageSize={pageSize}
              page={1}
            />
          }
        >
          <PostGridSectionWithParams
            posts={posts}
            columns={columns}
            headline={headline}
            pageSize={pageSize}
          />
        </Suspense>
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
  /** Brand slogan shown under the footer icon/logo */
  tagline?: string | null;
  /** Transparent header over hero (Roe / CVH style) */
  overlayHeader?: boolean | null;
  /**
   * Brand header composition:
   * - bar (default): logo | nav | CTA in one row
   * - stacked: centered logo on top, nav + CTA underneath (CVH)
   */
  headerLayout?: "bar" | "stacked" | null;
  /** Force cream/light page surface + dark ink */
  lightSurface?: boolean | null;
  /** Primary header CTA (e.g. Get Property Report) */
  headerCta?: {
    label: string;
    href: string;
    /** Optional CTA background (defaults to theme accent) */
    backgroundColor?: string;
  } | null;
};

function homeHref(basePath: string): string {
  return basePath && basePath !== "/" ? basePath : "/";
}

function escapeFooterText(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/**
 * Ensure the business slogan sits directly under the footer icon/logo.
 * Strips every existing slogan/description node, then injects once.
 */
export function ensureFooterSlogan(html: string, slogan: string | null | undefined): string {
  const text = typeof slogan === "string" ? slogan.trim() : "";
  if (!html || !text) return html;
  const block = `<p class="wb-footer-slogan">${escapeFooterText(text)}</p>`;
  const escaped = text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

  // Remove all prior slogan / description nodes (avoids duplicates across brands).
  let cleaned = html.replace(
    /<(?:p|div)\b[^>]*class=["'][^"']*(?:wb-footer-slogan|footer-description|footer-tagline|footer-slogan)[^"']*["'][^>]*>[\s\S]*?<\/(?:p|div)>/gi,
    "",
  );
  // Drop plain paragraphs that already carry the exact slogan text.
  cleaned = cleaned.replace(
    new RegExp(
      `<(?:p|div)\\b[^>]*>\\s*${escaped}\\s*<\\/(?:p|div)>`,
      "gi",
    ),
    "",
  );

  // Aëtherra-style brand column: logo then inject slogan
  let out = cleaned.replace(
    /(<div\b[^>]*class=["'][^"']*footer-brand[^"']*["'][^>]*>[\s\S]*?<\/a>)/i,
    `$1\n        ${block}`,
  );
  if (out !== cleaned) return out;

  // Primary logo anchors (RR / CVH / DG)
  out = cleaned.replace(
    /(<(?:a)\b[^>]*class=["'][^"']*(?:footer-logo|dg-footer-logo)[^"']*["'][^>]*>[\s\S]*?<\/a>)/i,
    `$1\n        ${block}`,
  );
  if (out !== cleaned) return out;

  // Fallback: first footer icon image
  out = cleaned.replace(
    /(<img\b[^>]*class=["'][^"']*(?:rr-icon|footer-profile-icon|dg-gate-icon|footer-logo)[^"']*["'][^>]*>)/i,
    `$1\n        ${block}`,
  );
  if (out !== cleaned) return out;

  // Last resort: first footer column
  out = cleaned.replace(
    /(<div\b[^>]*class=["'][^"']*footer-col[^"']*["'][^>]*>)/i,
    `$1\n        ${block}`,
  );
  return out;
}

const FOOTER_SLOGAN_BY_SLUG: Record<string, string> = {
  "roe-realty": "More Buyer Demand. Better Sale Outcomes. Stronger Results.",
  "currumbin-valley-hideaway": "Retreat Into The Rainforest",
  digitalgate: "The Gateway to Your Digital World™",
  "aetheriel-com-au": "Where Earth Meets Sky Through Sound",
  aetherra: "Where Earth Meets Sky Through Sound",
};

function BrandLockup({
  theme,
  businessName,
  stacked = false,
  showIcon = false,
}: {
  theme: WebsiteTheme;
  businessName: string;
  stacked?: boolean;
  showIcon?: boolean;
}) {
  const icon = (theme.iconUrl || "").trim();
  const wordmark = (theme.logoUrl || "").trim();
  const single = wordmark || icon;
  const lockup =
    showIcon && !stacked && Boolean(icon && wordmark && icon !== wordmark);

  if (lockup) {
    return (
      <>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={icon} alt="" className="wb-brand-chrome-icon" />
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={wordmark} alt={businessName} className="wb-brand-chrome-logo" />
      </>
    );
  }

  if (single) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img src={single} alt={businessName} className="wb-brand-chrome-logo" />
    );
  }

  return <span className="wb-brand-chrome-name">{businessName}</span>;
}

function BrandSiteHeader({
  theme,
  basePath,
  links,
  businessName,
  overlay,
  headerCta,
  layout = "bar",
  showIcon = false,
}: {
  theme: WebsiteTheme;
  basePath: string;
  links: Array<{ label: string; href: string }>;
  businessName: string;
  overlay?: boolean;
  headerCta?: {
    label: string;
    href: string;
    backgroundColor?: string;
  } | null;
  layout?: "bar" | "stacked";
  showIcon?: boolean;
}) {
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const brandHref = homeHref(basePath);
  const stacked = layout === "stacked";
  const ctaStyle = {
    color: "#ffffff",
    ...(headerCta?.backgroundColor
      ? { background: headerCta.backgroundColor }
      : {}),
  };

  useEffect(() => {
    const onScroll = () => {
      setScrolled(window.scrollY > 12);
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    if (!menuOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMenuOpen(false);
    };
    const html = document.documentElement;
    html.classList.add("wb-menu-scroll-lock");
    window.addEventListener("keydown", onKey);
    return () => {
      html.classList.remove("wb-menu-scroll-lock");
      window.removeEventListener("keydown", onKey);
    };
  }, [menuOpen]);

  // Always clear scroll lock on unmount (route changes / remounts)
  useEffect(() => {
    return () => {
      document.documentElement.classList.remove("wb-menu-scroll-lock");
      document.body.style.overflow = "";
    };
  }, []);

  // Close drawer on resize back to desktop
  useEffect(() => {
    const onResize = () => {
      if (window.matchMedia("(min-width: 901px)").matches) setMenuOpen(false);
    };
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  return (
    <header
      className={[
        "wb-brand-chrome",
        "wb-brand-chrome-header",
        stacked ? "wb-brand-chrome-header--stacked" : "",
        showIcon ? "wb-brand-chrome-header--lockup" : "",
        overlay ? "wb-brand-chrome-header--overlay" : "wb-brand-chrome-header--fade",
        scrolled || menuOpen ? "is-scrolled" : "is-top",
        menuOpen ? "is-menu-open" : "",
      ]
        .filter(Boolean)
        .join(" ")}
    >
      <div className="wb-brand-chrome-inner">
        <a href={brandHref} className="wb-brand-chrome-brand" aria-label={businessName}>
          <BrandLockup
            theme={theme}
            businessName={businessName}
            stacked={stacked}
            showIcon={showIcon}
          />
        </a>

        <div className="wb-brand-chrome-below">
          {links.length ? (
            <nav className="wb-brand-chrome-nav wb-brand-chrome-nav--desktop" aria-label="Primary">
              {links.map((link) => (
                <a key={`${link.href}-${link.label}`} href={link.href}>
                  {link.label}
                </a>
              ))}
            </nav>
          ) : null}

          {headerCta?.label && headerCta.href ? (
            <a
              className="wb-brand-chrome-cta wb-brand-chrome-cta--desktop"
              href={headerCta.href}
              style={ctaStyle}
            >
              {headerCta.label}
            </a>
          ) : null}
        </div>

        {(links.length > 0 || headerCta?.label) && (
          <button
            type="button"
            className="wb-brand-chrome-menu-btn"
            aria-label={menuOpen ? "Close menu" : "Open menu"}
            aria-expanded={menuOpen}
            aria-controls="wb-brand-mobile-panel"
            onClick={() => setMenuOpen((o) => !o)}
          >
            <span className="wb-brand-chrome-menu-icon" aria-hidden="true">
              <span />
              <span />
              <span />
            </span>
          </button>
        )}
      </div>

      <div
        className={["wb-brand-chrome-backdrop", menuOpen ? "is-open" : ""]
          .filter(Boolean)
          .join(" ")}
        hidden={!menuOpen}
        onClick={() => setMenuOpen(false)}
      />

      <div
        id="wb-brand-mobile-panel"
        className={["wb-brand-chrome-panel", menuOpen ? "is-open" : ""]
          .filter(Boolean)
          .join(" ")}
        hidden={!menuOpen}
        role="dialog"
        aria-modal="true"
        aria-label="Site menu"
      >
        <nav className="wb-brand-chrome-nav wb-brand-chrome-nav--mobile" aria-label="Mobile">
          {links.map((link) => (
            <a
              key={`m-${link.href}-${link.label}`}
              href={link.href}
              onClick={() => setMenuOpen(false)}
            >
              {link.label}
            </a>
          ))}
        </nav>
        {headerCta?.label && headerCta.href ? (
          <a
            className="wb-brand-chrome-cta wb-brand-chrome-cta--mobile"
            href={headerCta.href}
            style={ctaStyle}
            onClick={() => setMenuOpen(false)}
          >
            {headerCta.label}
          </a>
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
  tagline,
}: {
  theme: WebsiteTheme;
  basePath: string;
  links: Array<{ label: string; href: string }>;
  businessName: string;
  tagline?: string | null;
}) {
  const brandHref = homeHref(basePath);
  const cardHref = resolveHref("/card", basePath);
  const slogan = (tagline || "").trim();
  const hasCardLink = links.some(
    (l) =>
      /\/card\/?$/i.test(l.href) || /digital business card/i.test(l.label),
  );
  // Prefer card early so it survives the nav slice cap.
  const footerLinks = hasCardLink
    ? links
    : [{ label: "Digital Business Card", href: cardHref }, ...links];
  return (
    <footer className="wb-brand-chrome wb-brand-chrome-footer">
      <div className="wb-brand-chrome-inner">
        <div className="wb-brand-chrome-brand-block">
          <a href={brandHref} className="wb-brand-chrome-brand" aria-label={businessName}>
            <BrandLockup theme={theme} businessName={businessName} />
          </a>
          {slogan ? <p className="wb-footer-slogan">{slogan}</p> : null}
        </div>
        <nav className="wb-brand-chrome-nav" aria-label="Footer">
          {footerLinks.slice(0, 8).map((link) => (
            <a key={`f-${link.href}-${link.label}`} href={link.href}>
              {link.label}
            </a>
          ))}
        </nav>
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
  stayUnit,
  showHeader = true,
  showFooter = true,
  funnelTemplate = null,
}: {
  components: WebsiteComponent[];
  theme: WebsiteTheme;
  basePath: string;
  siteSlug: string;
  pageSlug?: string;
  chrome?: WebsiteChrome | null;
  /** Gen 2 bookable stay (Garden Studio / Tiny Home) — replaces thin HTML stubs */
  stayUnit?: PublicStayUnitPayload | null;
  /** When false, site header/nav is omitted (card, legal, Studio override, …) */
  showHeader?: boolean;
  /** When false, site footer is omitted */
  showFooter?: boolean;
  /** Product / Funnel Builder template — mounts dedicated capture apps on home. */
  funnelTemplate?: string | null;
}) {
  const resolvedFunnelTemplate = (() => {
    if (
      funnelTemplate === "property_report" ||
      funnelTemplate === "business_audit" ||
      funnelTemplate === "hideaway_circle" ||
      funnelTemplate === "lead_capture" ||
      funnelTemplate === "appraisal_request" ||
      funnelTemplate === "booking_enquiry"
    ) {
      return funnelTemplate;
    }
    const slug = (siteSlug || "").toLowerCase();
    const page = (pageSlug || "").toLowerCase();
    if (
      slug === "roe-realty-report" ||
      slug.includes("property-report") ||
      page === "property-report" ||
      page.includes("property-report")
    ) {
      return "property_report";
    }
    if (
      slug === "digitalgate-audit" ||
      slug.includes("business-audit") ||
      page === "business-audit" ||
      page.includes("business-audit")
    ) {
      return "business_audit";
    }
    if (
      slug === "currumbin-valley-hideaway-circle" ||
      slug.endsWith("-hideaway-circle") ||
      page === "hideaway-circle"
    ) {
      return "hideaway_circle";
    }
    return null;
  })();
  const isProductFunnel =
    resolvedFunnelTemplate === "property_report" ||
    resolvedFunnelTemplate === "business_audit" ||
    resolvedFunnelTemplate === "hideaway_circle";
  const bookingKind =
    pageSlug === "property-appraisal"
      ? ("appraisal" as const)
      : pageSlug === "buyer-consultation"
        ? ("buyer_consultation" as const)
        : null;
  /** Product subdomain funnels are chromeless capture apps — never render Studio HTML stubs. */
  const renderComponents = isProductFunnel
    ? []
    : bookingKind
      ? components.filter((c) => c.type !== "html" && c.type !== "contact_form")
      : components;
  const primary = theme.primaryColor || "#1e3a5f";
  const accent = theme.accentColor || "#c4a35a";
  const bg = theme.backgroundColor || "#0c1222";
  const isWantd = isWantdSite(
    siteSlug,
    chrome?.businessName || theme.businessName || siteSlug,
  );
  const isWantdHome =
    isWantd &&
    (!pageSlug ||
      pageSlug === "home" ||
      pageSlug === "/" ||
      pageSlug.toLowerCase() === "index");
  const wantdComponents = isWantd
    ? renderComponents.filter((c) => {
        if (c.type === "nav" || c.type === "footer") return false;
        if (isWantdHome && (c.type === "services" || c.type === "about" || c.type === "cta")) {
          return false;
        }
        return true;
      })
    : renderComponents;
  const headerHtmlRaw = chrome?.headerHtml?.trim() || "";
  const headerHtml =
    showHeader && !isProductFunnel
      ? rewriteProductFunnelHtml(headerHtmlRaw)
      : "";
  const hasBrandChromeMeta =
    (Array.isArray(chrome?.navLinks) && chrome!.navLinks!.length > 0) ||
    Boolean(chrome?.headerCta?.label?.trim()) ||
    Boolean(chrome?.businessName?.trim());
  const useBrandHeader =
    showHeader &&
    !isProductFunnel &&
    !headerHtml &&
    (Boolean(theme.logoUrl || theme.iconUrl) || hasBrandChromeMeta);
  const footerHtmlRaw = chrome?.footerHtml?.trim() || "";
  const footerHtmlPrepared =
    /currumbin|hideaway/i.test(siteSlug) && footerHtmlRaw
      ? stripCvhFooterExploreColumn(footerHtmlRaw)
      : footerHtmlRaw;
  const footerSlogan =
    (typeof chrome?.tagline === "string" && chrome.tagline.trim()) ||
    FOOTER_SLOGAN_BY_SLUG[siteSlug] ||
    "";
  const footerHtmlWithSlogan = ensureFooterSlogan(
    footerHtmlPrepared,
    footerSlogan,
  );
  const footerHtml =
    showFooter && !isProductFunnel
      ? rewriteProductFunnelHtml(footerHtmlWithSlogan)
      : "";
  const useBrandFooter =
    showFooter &&
    !isProductFunnel &&
    !footerHtmlPrepared &&
    Boolean(theme.logoUrl || theme.iconUrl);
  const overlayHeader = showHeader && Boolean(chrome?.overlayHeader);
  const hasChrome = Boolean(
    headerHtml || footerHtml || useBrandHeader || useBrandFooter || isWantd,
  );
  const htmlPage =
    (!isProductFunnel && isHtmlDominantPage(components)) ||
    hasChrome ||
    Boolean(stayUnit) ||
    isProductFunnel;
  const postGridOnly =
    renderComponents.length > 0 &&
    renderComponents.every((c) => c.type === "post_grid");
  const hasLightHtml =
    !isProductFunnel &&
    components.some(
      (c) =>
        c.type === "html" &&
        typeof c.props?.html === "string" &&
        /wb-html-island--light|background(?:-color)?:\s*#(?:F5F2EF|F7F4EE|F7F4EF|FCF9F5|F8F5F0)|roe-property-grid/i.test(
          c.props.html,
        ) &&
        /* DigitalGate navy shells (Founding / About / Contact / legal) are intentionally dark */
        !/\b(?:dg-fc|dg-about|dg-contact|dg-legal|dg-app|dg-insights|dg-aiv|dg-ams|dg-lpf|dg-vvs|dg-dbc)\b/.test(c.props.html),
    );
  /** Light Insights / cream listing pages */
  const lightSurface =
    !isProductFunnel &&
    (hasLightHtml ||
      (overlayHeader && postGridOnly) ||
      Boolean(chrome?.lightSurface) ||
      Boolean(stayUnit) ||
      isLightHex(bg));
  const businessName = chrome?.businessName?.trim() || siteSlug;
  const rawLinks = Array.isArray(chrome?.navLinks) ? chrome!.navLinks! : [];
  const links = rawLinks
    .filter((l) => l && typeof l.label === "string" && typeof l.href === "string")
    .map((l) => {
      const mapped = rewriteProductFunnelHref(l.href);
      if (mapped !== l.href) {
        return { label: l.label, href: mapped };
      }
      const href = l.href.startsWith("http")
        ? l.href
        : l.href.startsWith("/sites/")
          ? l.href
          : `${basePath}${l.href === "/" ? "" : l.href.startsWith("/") ? l.href : `/${l.href}`}`;
      return { label: l.label, href: rewriteProductFunnelHref(href) || "/" };
    });
  const rawCta = chrome?.headerCta;
  const headerCta =
    rawCta &&
    typeof rawCta.label === "string" &&
    rawCta.label.trim() &&
    typeof rawCta.href === "string" &&
    rawCta.href.trim()
      ? {
          label: rawCta.label.trim(),
          href: (() => {
            const mapped = rewriteProductFunnelHref(rawCta.href.trim());
            if (mapped !== rawCta.href.trim()) return mapped;
            return rawCta.href.startsWith("http")
              ? rawCta.href
              : `${basePath}${rawCta.href.startsWith("/") ? rawCta.href : `/${rawCta.href}`}` ||
                  "/";
          })(),
          ...(typeof rawCta.backgroundColor === "string" &&
          rawCta.backgroundColor.trim()
            ? { backgroundColor: rawCta.backgroundColor.trim() }
            : {}),
        }
      : null;
  const headerLayout: "bar" | "stacked" =
    chrome?.headerLayout === "stacked" ||
    /currumbin|hideaway/i.test(siteSlug) ||
    /currumbin|hideaway/i.test(businessName)
      ? "stacked"
      : "bar";
  const resolvedHeaderCta =
    headerLayout === "stacked" &&
    /currumbin|hideaway/i.test(siteSlug) &&
    !/hideaway-circle/i.test(siteSlug)
      ? {
          label: "Join the Circle",
          href: PRODUCT_FUNNEL_URLS.hideawayCircle,
          backgroundColor: headerCta?.backgroundColor || "#B9A48A",
        }
      : headerCta;

  const isCvhHome =
    !isProductFunnel &&
    (/currumbin|hideaway/i.test(siteSlug) ||
      /currumbin|hideaway/i.test(businessName)) &&
    !/hideaway-circle/i.test(siteSlug) &&
    (!pageSlug ||
      pageSlug === "home" ||
      pageSlug === "/" ||
      pageSlug.toLowerCase() === "index");

  const rootClass = [
    "wb-root",
    htmlPage ? "wb-html-page" : "",
    htmlPage ? "wb-full-bleed" : "",
    overlayHeader ? "wb-chrome-overlay" : "",
    lightSurface ? "wb-surface-light" : "",
    isProductFunnel ? "wb-product-funnel" : "",
    isWantd ? "wb-wantd" : "",
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
          ...(isLightHex(bg) ? { ["--wb-paper"]: bg } : {}),
          ...(isWantd ? { ["--wb-paper"]: "#F7F5F1", ["--wb-ink"]: "#121212" } : {}),
          ["--wb-bg"]: isProductFunnel
            ? resolvedFunnelTemplate === "property_report"
              ? "#1C2B2A"
              : resolvedFunnelTemplate === "hideaway_circle" ||
                  pageSlug === "hideaway-circle"
                ? "#0c1612"
                : "#0A0E17"
            : isWantd
              ? "#F7F5F1"
              : lightSurface
                ? "#f5f2ef"
                : htmlPage
                  ? bg || "#0a0e17"
                  : bg,
          ...(isProductFunnel
            ? {
                minHeight: "100dvh",
                width: "100%",
                maxWidth: "none",
                margin: 0,
                padding: 0,
                background:
                  resolvedFunnelTemplate === "property_report"
                    ? "#1C2B2A"
                    : resolvedFunnelTemplate === "hideaway_circle" ||
                        pageSlug === "hideaway-circle"
                      ? "#0c1612"
                      : "#0A0E17",
              }
            : {}),
        } as React.CSSProperties
      }
    >
      {isWantd ? (
        <style
          id="wb-wantd-css"
          dangerouslySetInnerHTML={{ __html: wantdPublicSiteCss }}
        />
      ) : null}
      {isWantd && showHeader && !isProductFunnel ? (
        <WantdSiteHeader theme={theme} basePath={basePath} />
      ) : useBrandHeader ? (
        <BrandSiteHeader
          theme={theme}
          basePath={basePath}
          links={links}
          businessName={businessName}
          overlay={overlayHeader}
          headerCta={resolvedHeaderCta}
          layout={headerLayout}
          showIcon={false}
        />
      ) : headerHtml ? (
        <ChromeHeaderHtml html={extractStyleBlocks(headerHtml).html} />
      ) : null}
      {stayUnit ? (
        <CvhStayUnitBooking
          siteSlug={siteSlug}
          unit={stayUnit}
          basePath={basePath}
        />
      ) : (
        <>
          {pageSlug === "property-report" ||
          resolvedFunnelTemplate === "property_report" ? (
            <PropertyReportCapture
              siteSlug={siteSlug}
              basePath={basePath}
              logoUrl={theme.logoUrl || theme.iconUrl}
              variant={
                resolvedFunnelTemplate === "property_report"
                  ? "funnel"
                  : "embedded"
              }
            />
          ) : null}
          {pageSlug === "business-audit" ||
          resolvedFunnelTemplate === "business_audit" ? (
            <BusinessAuditCapture
              siteSlug={siteSlug}
              basePath={basePath}
              logoUrl={theme.logoUrl || theme.iconUrl}
              variant={
                resolvedFunnelTemplate === "business_audit"
                  ? "funnel"
                  : "embedded"
              }
            />
          ) : null}
          {pageSlug === "hideaway-circle" ||
          resolvedFunnelTemplate === "hideaway_circle" ? (
            <HideawayCircleCapture
              siteSlug={siteSlug}
              basePath={basePath}
              logoUrl={theme.logoUrl || theme.iconUrl}
              variant="funnel"
            />
          ) : null}
          {bookingKind ? (
            <RoeBookingCapture
              siteSlug={siteSlug}
              kind={bookingKind}
              logoUrl={theme.logoUrl || theme.iconUrl}
            />
          ) : null}
          {wantdComponents.map((c) => (
            <WebsiteComponentView
              key={c.id}
              component={c}
              theme={theme}
              basePath={basePath}
              siteSlug={siteSlug}
              pageSlug={pageSlug}
            />
          ))}
          {!isProductFunnel && isCvhHome ? (
            <HideawayCircleHomepageCta basePath={basePath} />
          ) : null}
        </>
      )}
      {isWantd && showFooter && !isProductFunnel ? (
        <WantdSiteFooter theme={theme} basePath={basePath} />
      ) : footerHtml ? (
        <ChromeFooterHtml html={extractStyleBlocks(footerHtml).html} />
      ) : useBrandFooter ? (
        <BrandSiteFooter
          theme={theme}
          basePath={basePath}
          links={links}
          businessName={businessName}
          tagline={footerSlogan}
        />
      ) : null}
    </div>
  );
}

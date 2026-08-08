"use client";

import { useState } from "react";
import type { WebsiteComponent, WebsiteTheme } from "@dg/platform-core";

function asString(v: unknown, fallback = ""): string {
  return typeof v === "string" ? v : fallback;
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
    case "footer":
      return (
        <footer className="wb-footer">
          <p>
            {asString(component.props.businessName, name)}
            {component.props.phone ? ` · ${asString(component.props.phone)}` : ""}
            {component.props.email ? ` · ${asString(component.props.email)}` : ""}
          </p>
          <p className="wb-footer-meta" style={{ color: accent }}>
            Powered by DigitalGate
          </p>
        </footer>
      );
    default:
      return null;
  }
}

export function WebsitePageRenderer({
  components,
  theme,
  basePath,
  siteSlug,
  pageSlug,
}: {
  components: WebsiteComponent[];
  theme: WebsiteTheme;
  basePath: string;
  siteSlug: string;
  pageSlug?: string;
}) {
  const primary = theme.primaryColor || "#1e3a5f";
  const accent = theme.accentColor || "#c4a35a";
  const bg = theme.backgroundColor || "#0c1222";

  return (
    <div
      className="wb-root"
      style={
        {
          ["--wb-primary"]: primary,
          ["--wb-accent"]: accent,
          ["--wb-bg"]: bg,
        } as React.CSSProperties
      }
    >
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
    </div>
  );
}

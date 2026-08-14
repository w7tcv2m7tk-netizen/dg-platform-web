/**
 * Flatten WordPress (or builder) HTML into Gen 2 Studio components.
 * Best-effort content import — not a theme/layout clone.
 */

import { component } from "./schema";
import type { WebsiteComponent } from "./types";

const BLOCK_SPLIT =
  /(<\/?(?:h[1-6]|p|ul|ol|li|img|blockquote|figure|picture|figcaption|div|section|article|header|footer|main|br|hr|a)(?:\s[^>]*)?>)/i;

function decodeEntities(input: string): string {
  return input
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/&#(\d+);/g, (_, n) => {
      const code = Number(n);
      return Number.isFinite(code) ? String.fromCharCode(code) : _;
    })
    .replace(/&#x([0-9a-f]+);/gi, (_, h) => {
      const code = parseInt(h, 16);
      return Number.isFinite(code) ? String.fromCharCode(code) : _;
    });
}

export function stripHtmlJunk(html: string): string {
  return html
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, "")
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, "")
    .replace(/<noscript\b[^>]*>[\s\S]*?<\/noscript>/gi, "")
    .replace(/<!--[\s\S]*?-->/g, "")
    .replace(/\s+on\w+\s*=\s*(".*?"|'.*?'|[^\s>]+)/gi, "")
    .replace(/<\/?(?:iframe|object|embed|form|input|button|svg)[^>]*>/gi, "")
    .trim();
}

export function stripTags(html: string): string {
  return decodeEntities(
    html
      .replace(/<br\s*\/?>/gi, "\n")
      .replace(/<\/p>/gi, "\n")
      .replace(/<[^>]+>/g, " ")
      .replace(/[ \t]+\n/g, "\n")
      .replace(/\n{3,}/g, "\n\n")
      .replace(/[ \t]{2,}/g, " ")
      .trim(),
  );
}

function attr(tag: string, name: string): string | null {
  const re = new RegExp(`${name}\\s*=\\s*("([^"]*)"|'([^']*)'|([^\\s>]+))`, "i");
  const m = tag.match(re);
  if (!m) return null;
  return decodeEntities(m[2] ?? m[3] ?? m[4] ?? "");
}

function firstSrcsetUrl(srcset: string | null): string | null {
  if (!srcset) return null;
  const first = srcset.split(",")[0]?.trim().split(/\s+/)[0];
  return first || null;
}

function imageSrcFromTag(tag: string): string | null {
  return (
    attr(tag, "src") ||
    attr(tag, "data-src") ||
    attr(tag, "data-lazy-src") ||
    attr(tag, "data-original") ||
    attr(tag, "data-lazy") ||
    firstSrcsetUrl(attr(tag, "srcset")) ||
    firstSrcsetUrl(attr(tag, "data-srcset"))
  );
}

/** Pre-scan HTML for images builders often hide in lazy-load / backgrounds. */
export function extractImageCandidates(html: string): { src: string; alt: string }[] {
  const out: { src: string; alt: string }[] = [];
  const seen = new Set<string>();

  const push = (raw: string | null | undefined, alt = "") => {
    if (!raw) return;
    let src = raw.trim();
    if (!src || src.startsWith("data:")) return;
    if (src.startsWith("//")) src = `https:${src}`;
    const key = src.split("?")[0].toLowerCase();
    if (seen.has(key)) return;
    seen.add(key);
    out.push({ src, alt: alt.trim() });
  };

  for (const m of html.matchAll(/<img\b[^>]*>/gi)) {
    const tag = m[0];
    push(imageSrcFromTag(tag), attr(tag, "alt") || "");
  }

  for (const m of html.matchAll(/background(?:-image)?\s*:\s*url\(\s*['"]?([^'")\s]+)/gi)) {
    push(m[1], "");
  }

  // Oxygen / Elementor sometimes stash URLs in data-bg / data-settings JSON fragments
  for (const m of html.matchAll(
    /data-(?:bg|background|lazy-bg|src)\s*=\s*("([^"]+)"|'([^']+)')/gi,
  )) {
    const val = decodeEntities(m[2] ?? m[3] ?? "");
    if (/^https?:\/\//i.test(val) || val.startsWith("/") || val.startsWith("//")) {
      push(val, "");
    }
  }

  return out;
}

function isCtaAnchor(tag: string, text: string): boolean {
  const cls = (attr(tag, "class") || "").toLowerCase();
  if (/(btn|button|cta|wp-block-button)/i.test(cls)) return true;
  if (text.length > 0 && text.length <= 48 && !/\s{3,}/.test(text)) {
    if (/book|enquire|contact|get started|learn more|buy|sell|appraisal|availability/i.test(text)) {
      return true;
    }
  }
  return false;
}

function pushParagraph(out: WebsiteComponent[], text: string) {
  const t = text.trim();
  if (!t) return;
  out.push(component("paragraph", { text: t.slice(0, 8000) }));
}

function pushHeading(out: WebsiteComponent[], level: number, text: string) {
  const t = text.trim();
  if (!t) return;
  out.push(component("heading", { level: Math.min(6, Math.max(1, level)), text: t.slice(0, 500) }));
}

function pushImage(out: WebsiteComponent[], src: string, alt: string) {
  if (!src) return;
  out.push(component("image", { src, alt: alt || "" }));
}

function structuredTextLength(components: WebsiteComponent[]): number {
  let n = 0;
  for (const c of components) {
    if (c.type === "html") continue;
    for (const v of Object.values(c.props)) {
      if (typeof v === "string") n += v.length;
      if (Array.isArray(v)) n += v.filter((x) => typeof x === "string").join("").length;
    }
  }
  return n;
}

/**
 * Convert HTML body into typed Studio components.
 */
export function htmlToComponents(
  rawHtml: string,
  options?: {
    pageTitle?: string;
    featuredImage?: string | null;
    preferHero?: boolean;
  },
): WebsiteComponent[] {
  const cleaned = stripHtmlJunk(rawHtml || "");
  const preImages = extractImageCandidates(rawHtml || "");
  const out: WebsiteComponent[] = [];

  if (options?.featuredImage) {
    pushImage(out, options.featuredImage, options.pageTitle || "Featured image");
  }

  if (!cleaned) {
    if (options?.pageTitle) {
      pushHeading(out, 1, options.pageTitle);
    }
    for (const img of preImages.slice(0, 12)) {
      if (img.src === options?.featuredImage) continue;
      pushImage(out, img.src, img.alt);
    }
    return out;
  }

  const parts = cleaned.split(BLOCK_SPLIT).filter((p) => p && p.trim());
  let mode: "none" | "p" | "h" | "ul" | "ol" | "blockquote" | "a" = "none";
  let headingLevel = 1;
  let buffer = "";
  let listItems: string[] = [];
  let anchorHref = "";
  let anchorOpenTag = "";

  const flushBufferAsText = () => {
    const text = stripTags(buffer);
    buffer = "";
    if (!text) return;
    if (mode === "h") {
      pushHeading(out, headingLevel, text);
    } else if (mode === "blockquote") {
      out.push(component("paragraph", { text: `“${text}”` }));
    } else if (mode === "a") {
      if (isCtaAnchor(anchorOpenTag, text)) {
        out.push(
          component("cta", {
            headline: text,
            body: "",
            buttonLabel: text,
            buttonHref: anchorHref || "#",
          }),
        );
      } else {
        pushParagraph(out, text);
      }
    } else {
      // Div-soup: split on blank lines when builders dump long text runs
      if (mode === "none" && /\n{2,}/.test(text)) {
        for (const para of text.split(/\n{2,}/).map((p) => p.trim()).filter(Boolean)) {
          pushParagraph(out, para);
        }
      } else {
        pushParagraph(out, text);
      }
    }
    mode = "none";
  };

  const flushList = () => {
    if (listItems.length) {
      out.push(
        component("list", {
          ordered: mode === "ol",
          items: listItems,
        }),
      );
    }
    listItems = [];
    mode = "none";
  };

  for (const part of parts) {
    const openH = part.match(/^<h([1-6])\b[^>]*>$/i);
    const closeH = part.match(/^<\/h([1-6])>$/i);
    const openP = /^<p\b[^>]*>$/i.test(part);
    const closeP = /^<\/p>$/i.test(part);
    const openUl = /^<ul\b[^>]*>$/i.test(part);
    const openOl = /^<ol\b[^>]*>$/i.test(part);
    const closeList = /^<\/(ul|ol)>$/i.test(part);
    const openLi = /^<li\b[^>]*>$/i.test(part);
    const closeLi = /^<\/li>$/i.test(part);
    const img = part.match(/^<img\b[^>]*>$/i);
    const openA = part.match(/^<a\b([^>]*)>$/i);
    const closeA = /^<\/a>$/i.test(part);
    const openBq = /^<blockquote\b[^>]*>$/i.test(part);
    const closeBq = /^<\/blockquote>$/i.test(part);
    const br = /^<br\s*\/?>$/i.test(part);
    const sectionBoundary =
      /^<\/?(?:div|section|article|header|footer|main|figure|picture|figcaption|hr)\b[^>]*>$/i.test(
        part,
      );

    if (img) {
      flushBufferAsText();
      const src = imageSrcFromTag(part);
      if (src) {
        pushImage(out, src, attr(part, "alt") || options?.pageTitle || "");
      }
      continue;
    }

    if (openH) {
      flushBufferAsText();
      if (mode === "ul" || mode === "ol") flushList();
      mode = "h";
      headingLevel = Number(openH[1]);
      buffer = "";
      continue;
    }
    if (closeH) {
      flushBufferAsText();
      continue;
    }
    if (openP) {
      flushBufferAsText();
      if (mode === "ul" || mode === "ol") flushList();
      mode = "p";
      buffer = "";
      continue;
    }
    if (closeP) {
      flushBufferAsText();
      continue;
    }
    if (openUl || openOl) {
      flushBufferAsText();
      mode = openOl ? "ol" : "ul";
      listItems = [];
      buffer = "";
      continue;
    }
    if (closeList) {
      if (buffer.trim()) {
        const t = stripTags(buffer);
        if (t) listItems.push(t);
        buffer = "";
      }
      flushList();
      continue;
    }
    if (openLi) {
      if (buffer.trim()) {
        const t = stripTags(buffer);
        if (t) listItems.push(t);
      }
      buffer = "";
      continue;
    }
    if (closeLi) {
      const t = stripTags(buffer);
      buffer = "";
      if (t) listItems.push(t);
      continue;
    }
    if (openBq) {
      flushBufferAsText();
      mode = "blockquote";
      buffer = "";
      continue;
    }
    if (closeBq) {
      flushBufferAsText();
      continue;
    }
    if (openA) {
      if (mode === "none" || mode === "p") {
        const href = attr(part, "href") || "#";
        if (mode === "p" && !buffer.trim()) {
          mode = "a";
          anchorHref = href;
          anchorOpenTag = part;
          buffer = "";
          continue;
        }
        if (mode === "none") {
          mode = "a";
          anchorHref = href;
          anchorOpenTag = part;
          buffer = "";
          continue;
        }
      }
      buffer += part;
      continue;
    }
    if (closeA) {
      if (mode === "a") {
        flushBufferAsText();
        continue;
      }
      buffer += part;
      continue;
    }
    if (br) {
      buffer += "\n";
      continue;
    }
    if (sectionBoundary) {
      // Flush accumulated div-soup text at section boundaries so less is lost
      if (mode === "none" && buffer.trim().length > 40) {
        flushBufferAsText();
      }
      continue;
    }
    if (part.startsWith("<")) {
      continue;
    }
    buffer += part;
  }

  if (mode === "ul" || mode === "ol") {
    if (buffer.trim()) {
      const t = stripTags(buffer);
      if (t) listItems.push(t);
    }
    flushList();
  } else {
    flushBufferAsText();
  }

  // Merge pre-scanned images that the tokenizer missed (lazy-load / backgrounds)
  const existingSrc = new Set(
    out
      .filter((c) => c.type === "image")
      .map((c) => String(c.props.src || "").split("?")[0].toLowerCase())
      .filter(Boolean),
  );
  for (const img of preImages) {
    const key = img.src.split("?")[0].toLowerCase();
    if (existingSrc.has(key)) continue;
    if (out.filter((c) => c.type === "image").length >= 24) break;
    pushImage(out, img.src, img.alt);
    existingSrc.add(key);
  }

  const meaningful = out.filter((c) => c.type !== "image" && c.type !== "html").length;
  const textLen = structuredTextLength(out);
  const plain = stripTags(cleaned);

  if (meaningful === 0) {
    if (plain) {
      for (const para of plain.split(/\n{2,}/).map((p) => p.trim()).filter(Boolean)) {
        pushParagraph(out, para.slice(0, 4000));
      }
    }
  }

  // Preserve richer leftover markup when structured extract is thin vs source
  const shouldKeepHtml =
    cleaned.length > 500 &&
    (meaningful < 3 || textLen < Math.min(plain.length, cleaned.length) * 0.4);

  if (shouldKeepHtml) {
    const alreadyHtml = out.some((c) => c.type === "html");
    if (!alreadyHtml) {
      out.push(
        component("html", {
          html: cleaned.slice(0, 80000),
          note: "Preserved WordPress markup — theme/layout CSS is not included; restyle in Studio.",
        }),
      );
    }
  } else if (meaningful < 2 && cleaned.length > 800) {
    out.push(
      component("html", {
        html: cleaned.slice(0, 80000),
        note: "Preserved WordPress markup — theme/layout CSS is not included; restyle in Studio.",
      }),
    );
  }

  // Hero promotion for home / landing-style pages
  if (options?.preferHero) {
    const hIdx = out.findIndex((c) => c.type === "heading" || c.type === "paragraph" || c.type === "hero");
    if (hIdx >= 0 && out[hIdx].type !== "hero") {
      const first = out[hIdx];
      const headline =
        first.type === "heading"
          ? String(first.props.text || options.pageTitle || "")
          : String(options.pageTitle || first.props.text || "");
      let subheadline = "";
      let removeCount = 1;
      if (first.type === "heading" && out[hIdx + 1]?.type === "paragraph") {
        subheadline = String(out[hIdx + 1].props.text || "");
        removeCount = 2;
      } else if (first.type === "paragraph") {
        subheadline = String(first.props.text || "");
      }
      const heroImage =
        out.find((c) => c.type === "image")?.props.src ||
        options.featuredImage ||
        preImages[0]?.src ||
        "";
      const hero = component("hero", {
        headline: headline || options.pageTitle || "Welcome",
        subheadline,
        ctaLabel: "Contact us",
        ctaHref: "/contact",
        ...(heroImage ? { image: String(heroImage) } : {}),
      });
      out.splice(hIdx, removeCount, hero);
    } else if (options.pageTitle && !out.some((c) => c.type === "hero")) {
      out.unshift(
        component("hero", {
          headline: options.pageTitle,
          subheadline: "",
          ctaLabel: "Contact us",
          ctaHref: "/contact",
          ...(options.featuredImage || preImages[0]?.src
            ? { image: String(options.featuredImage || preImages[0]?.src) }
            : {}),
        }),
      );
    }
  }

  return out;
}

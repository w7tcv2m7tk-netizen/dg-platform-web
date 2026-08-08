/**
 * Flatten WordPress (or builder) HTML into Gen 2 Studio components.
 * Best-effort — not a theme/layout clone.
 */

import { component } from "./schema";
import type { WebsiteComponent } from "./types";

const BLOCK_SPLIT =
  /(<\/?(?:h[1-6]|p|ul|ol|li|img|blockquote|figure|div|section|article|header|footer|main|br|hr|a)(?:\s[^>]*)?>)/i;

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
  out.push(component("paragraph", { text: t }));
}

function pushHeading(out: WebsiteComponent[], level: number, text: string) {
  const t = text.trim();
  if (!t) return;
  out.push(component("heading", { level: Math.min(6, Math.max(1, level)), text: t }));
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
  const out: WebsiteComponent[] = [];

  if (options?.featuredImage) {
    out.push(
      component("image", {
        src: options.featuredImage,
        alt: options.pageTitle || "Featured image",
      }),
    );
  }

  if (!cleaned) {
    if (options?.pageTitle) {
      pushHeading(out, 1, options.pageTitle);
    }
    return out;
  }

  // Tokenize roughly on block boundaries
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
      pushParagraph(out, text);
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
    const selfCloseSkip = /^<\/?(?:div|section|article|header|footer|main|figure|hr)\b[^>]*>$/i.test(
      part,
    );

    if (img) {
      flushBufferAsText();
      const src = attr(part, "src");
      if (src) {
        out.push(
          component("image", {
            src,
            alt: attr(part, "alt") || options?.pageTitle || "",
          }),
        );
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
      // Only treat standalone-ish anchors as CTAs when not mid-paragraph
      if (mode === "none" || mode === "p") {
        const href = attr(part, "href") || "#";
        const textGuess = "";
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
          buffer = textGuess;
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
    if (selfCloseSkip) {
      continue;
    }
    if (part.startsWith("<")) {
      // Unknown tag — keep inner later; drop the tag itself
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

  // If builders left mostly empty structured blocks, fall back to sanitized html + plain text
  const meaningful = out.filter((c) => c.type !== "image").length;
  if (meaningful === 0) {
    const plain = stripTags(cleaned);
    if (plain) {
      for (const para of plain.split(/\n{2,}/).map((p) => p.trim()).filter(Boolean)) {
        pushParagraph(out, para.slice(0, 4000));
      }
    } else if (cleaned.length > 40) {
      out.push(component("html", { html: cleaned.slice(0, 50000) }));
    }
  } else if (meaningful < 2 && cleaned.length > 800) {
    // Keep structured bits but also preserve a sanitized leftover html block
    out.push(component("html", { html: cleaned.slice(0, 50000) }));
  }

  // Optional hero promotion for home: first heading + first paragraph → hero
  if (options?.preferHero) {
    const hIdx = out.findIndex((c) => c.type === "heading" || c.type === "paragraph");
    if (hIdx >= 0) {
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
      const hero = component("hero", {
        headline: headline || options.pageTitle || "Welcome",
        subheadline,
        ctaLabel: "Contact us",
        ctaHref: "/contact",
      });
      out.splice(hIdx, removeCount, hero);
    } else if (options.pageTitle) {
      out.unshift(
        component("hero", {
          headline: options.pageTitle,
          subheadline: "",
          ctaLabel: "Contact us",
          ctaHref: "/contact",
        }),
      );
    }
  }

  return out;
}

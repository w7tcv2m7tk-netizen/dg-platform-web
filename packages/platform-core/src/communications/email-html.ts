/**
 * Pretty HTML building blocks for transactional email bodies.
 * Used inside wrapTransactionalEmail() — keep markup table-friendly / inline-styled.
 */

export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

const P =
  'margin:0 0 16px;line-height:1.65;color:#E2E8F0;font-size:16px;';
const MUTED =
  'margin:0 0 16px;line-height:1.65;color:#94A3B8;font-size:14px;';

export function emailKicker(text: string): string {
  return `<p style="margin:0 0 8px;font-size:11px;letter-spacing:0.12em;text-transform:uppercase;font-weight:700;color:#94A3B8;">${escapeHtml(text)}</p>`;
}

export function emailHeading(text: string, level: 1 | 2 = 1): string {
  if (level === 2) {
    return `<h2 style="margin:0 0 14px;font-size:18px;line-height:1.35;font-weight:700;color:#F8FAFC;">${escapeHtml(text)}</h2>`;
  }
  return `<h1 style="margin:0 0 16px;font-size:22px;line-height:1.3;font-weight:700;color:#F8FAFC;letter-spacing:-0.02em;">${escapeHtml(text)}</h1>`;
}

export function emailParagraph(text: string, muted = false): string {
  return `<p style="${muted ? MUTED : P}">${inlineFormat(text)}</p>`;
}

export function emailDivider(accentColor = "#3B82F6"): string {
  return `<hr style="border:none;border-top:1px solid rgba(148,163,184,0.22);margin:8px 0 20px;color:${escapeHtml(accentColor)};">`;
}

export function emailButton(
  label: string,
  href: string,
  accentColor = "#3B82F6",
): string {
  const safeHref = escapeHtml(href.trim());
  const safeLabel = escapeHtml(label.trim());
  return `<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:8px 0 22px;"><tr><td align="left" style="border-radius:999px;background:${escapeHtml(accentColor)};">
<a href="${safeHref}" style="display:inline-block;padding:14px 22px;font-size:15px;font-weight:700;color:#ffffff;text-decoration:none;border-radius:999px;line-height:1.2;">${safeLabel}</a>
</td></tr></table>`;
}

export function emailList(items: string[], ordered = false): string {
  const tag = ordered ? "ol" : "ul";
  const lis = items
    .map(
      (item) =>
        `<li style="margin:0 0 8px;color:#E2E8F0;line-height:1.55;">${inlineFormat(item)}</li>`,
    )
    .join("");
  return `<${tag} style="margin:0 0 18px;padding-left:1.25rem;color:#E2E8F0;">${lis}</${tag}>`;
}

export function emailKeyValueRows(
  rows: Array<{ label: string; value: string }>,
): string {
  const cells = rows
    .map(
      (row) => `<tr>
<td style="padding:10px 12px;border-bottom:1px solid rgba(148,163,184,0.15);color:#94A3B8;font-size:13px;width:38%;vertical-align:top;">${escapeHtml(row.label)}</td>
<td style="padding:10px 12px;border-bottom:1px solid rgba(148,163,184,0.15);color:#F8FAFC;font-size:14px;font-weight:600;vertical-align:top;">${inlineFormat(row.value)}</td>
</tr>`,
    )
    .join("");
  return `<table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="margin:0 0 20px;border-collapse:collapse;background:rgba(15,23,42,0.55);border:1px solid rgba(148,163,184,0.18);border-radius:14px;overflow:hidden;">${cells}</table>`;
}

export function emailScoreCard(input: {
  title: string;
  score: number;
  max?: number;
  accentColor?: string;
  pillars?: Array<{ label: string; score: number }>;
}): string {
  const max = input.max ?? 100;
  const accent = input.accentColor || "#3B82F6";
  const pillars = (input.pillars || [])
    .map((p) => {
      const pct = Math.max(0, Math.min(100, Math.round((p.score / max) * 100)));
      return `<tr>
<td style="padding:8px 0;color:#CBD5E1;font-size:13px;">${escapeHtml(p.label)}</td>
<td style="padding:8px 0 8px 12px;width:55%;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:rgba(148,163,184,0.18);border-radius:999px;"><tr>
<td style="width:${pct}%;background:${escapeHtml(accent)};height:8px;border-radius:999px;font-size:0;line-height:0;">&nbsp;</td>
<td style="font-size:0;line-height:0;">&nbsp;</td>
</tr></table>
</td>
<td style="padding:8px 0 8px 10px;color:#F8FAFC;font-size:13px;font-weight:700;white-space:nowrap;text-align:right;">${p.score}</td>
</tr>`;
    })
    .join("");

  return `<table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="margin:0 0 22px;border-collapse:collapse;background:rgba(15,23,42,0.65);border:1px solid rgba(148,163,184,0.2);border-radius:16px;">
<tr><td style="padding:20px 20px 8px;">
<p style="margin:0 0 4px;font-size:11px;letter-spacing:0.1em;text-transform:uppercase;font-weight:700;color:#94A3B8;">${escapeHtml(input.title)}</p>
<p style="margin:0;font-size:36px;line-height:1.1;font-weight:800;color:#F8FAFC;">${input.score}<span style="font-size:16px;font-weight:600;color:#94A3B8;">/${max}</span></p>
</td></tr>
${
  pillars
    ? `<tr><td style="padding:8px 20px 16px;"><table role="presentation" width="100%" cellpadding="0" cellspacing="0">${pillars}</table></td></tr>`
    : ""
}
</table>`;
}

export function emailHighlight(text: string, accentColor = "#C9A46C"): string {
  return `<table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="margin:0 0 20px;border-collapse:collapse;">
<tr><td style="padding:14px 16px;border-left:3px solid ${escapeHtml(accentColor)};background:rgba(15,23,42,0.55);border-radius:0 12px 12px 0;color:#F8FAFC;font-size:15px;line-height:1.55;font-weight:600;">${inlineFormat(text)}</td></tr>
</table>`;
}

export function emailSignoff(lines: string[]): string {
  const html = lines
    .map(
      (line, i) =>
        `<p style="margin:${i === 0 ? "8px" : "0"} 0 ${i === lines.length - 1 ? "0" : "4px"};line-height:1.5;color:#94A3B8;font-size:14px;">${inlineFormat(line)}</p>`,
    )
    .join("");
  return `<div style="margin-top:8px;">${html}</div>`;
}

/** Bold **segments** and auto-link bare URLs inside a line. */
function inlineFormat(text: string): string {
  const escaped = escapeHtml(text);
  const withBold = escaped.replace(
    /\*\*(.+?)\*\*/g,
    '<strong style="color:#F8FAFC;font-weight:700;">$1</strong>',
  );
  return withBold.replace(
    /(https?:\/\/[^\s<]+)/g,
    '<a href="$1" style="color:#93C5FD;text-decoration:underline;">$1</a>',
  );
}

export type EmailBodyBlock =
  | { type: "kicker"; text: string }
  | { type: "heading"; text: string; level?: 1 | 2 }
  | { type: "paragraph"; text: string; muted?: boolean }
  | { type: "divider" }
  | { type: "button"; label: string; href: string }
  | { type: "list"; items: string[]; ordered?: boolean }
  | { type: "kv"; rows: Array<{ label: string; value: string }> }
  | {
      type: "score";
      title: string;
      score: number;
      max?: number;
      pillars?: Array<{ label: string; score: number }>;
    }
  | { type: "highlight"; text: string }
  | { type: "signoff"; lines: string[] }
  | { type: "html"; html: string };

export function composeEmailBody(
  blocks: EmailBodyBlock[],
  options?: { accentColor?: string },
): string {
  const accent = options?.accentColor || "#3B82F6";
  return blocks
    .map((block) => {
      switch (block.type) {
        case "kicker":
          return emailKicker(block.text);
        case "heading":
          return emailHeading(block.text, block.level ?? 1);
        case "paragraph":
          return emailParagraph(block.text, block.muted);
        case "divider":
          return emailDivider(accent);
        case "button":
          return emailButton(block.label, block.href, accent);
        case "list":
          return emailList(block.items, block.ordered);
        case "kv":
          return emailKeyValueRows(block.rows);
        case "score":
          return emailScoreCard({ ...block, accentColor: accent });
        case "highlight":
          return emailHighlight(block.text, accent);
        case "signoff":
          return emailSignoff(block.lines);
        case "html":
          return block.html;
        default:
          return "";
      }
    })
    .join("");
}

/**
 * Convert plain text into polished email HTML:
 * lone URL lines → buttons, ALL-CAPS lines → kickers, lists, paragraphs.
 */
export function plainTextToEmailHtml(
  text: string,
  options?: { accentColor?: string; ctaLabel?: string },
): string {
  const accent = options?.accentColor || "#3B82F6";
  const ctaLabel = options?.ctaLabel || "Continue";
  const trimmed = text.trim();
  if (!trimmed) return "";

  const blocks = trimmed.split(/\n{2,}/);
  const htmlParts: string[] = [];

  for (const block of blocks) {
    const lines = block.split(/\n/).map((l) => l.trimEnd());
    const joined = lines.join("\n").trim();
    if (!joined) continue;

    // Single-line absolute URL → CTA button
    if (/^https?:\/\/\S+$/i.test(joined)) {
      htmlParts.push(emailButton(ctaLabel, joined, accent));
      continue;
    }

    // ALL CAPS short line (badge / section title)
    if (
      lines.length === 1 &&
      joined.length <= 64 &&
      /[A-Z]/.test(joined) &&
      joined === joined.toUpperCase() &&
      /[A-Z0-9™]/.test(joined)
    ) {
      htmlParts.push(emailKicker(joined));
      continue;
    }

    // Bullet / numbered list block
    const listItems = lines
      .map((l) => l.trim())
      .filter((l) => /^([-*•]|\d+[.)])\s+/.test(l));
    if (listItems.length >= 2 && listItems.length === lines.filter(Boolean).length) {
      const ordered = /^\d+[.)]\s+/.test(listItems[0]!);
      htmlParts.push(
        emailList(
          listItems.map((l) => l.replace(/^([-*•]|\d+[.)])\s+/, "")),
          ordered,
        ),
      );
      continue;
    }

    // Key: value lines
    const kvLines = lines.filter((l) => /^[^:\n]{2,40}:\s+\S/.test(l.trim()));
    if (kvLines.length >= 2 && kvLines.length === lines.filter(Boolean).length) {
      htmlParts.push(
        emailKeyValueRows(
          kvLines.map((l) => {
            const idx = l.indexOf(":");
            return {
              label: l.slice(0, idx).trim(),
              value: l.slice(idx + 1).trim(),
            };
          }),
        ),
      );
      continue;
    }

    // Last line is a URL → paragraph + button
    const last = lines[lines.length - 1]?.trim() || "";
    if (lines.length >= 2 && /^https?:\/\/\S+$/i.test(last)) {
      const prose = lines.slice(0, -1).join("\n");
      htmlParts.push(
        `<p style="${P}">${prose
          .split("\n")
          .map((l) => inlineFormat(l))
          .join("<br>")}</p>`,
      );
      htmlParts.push(emailButton(ctaLabel, last, accent));
      continue;
    }

    htmlParts.push(
      `<p style="${P}">${lines.map((l) => inlineFormat(l)).join("<br>")}</p>`,
    );
  }

  return htmlParts.join("");
}

/** Lightweight markdown → email HTML (headings, bold, lists, links, paragraphs). */
export function markdownToEmailHtml(
  markdown: string,
  options?: { accentColor?: string; ctaLabel?: string },
): string {
  const accent = options?.accentColor || "#3B82F6";
  const ctaLabel = options?.ctaLabel || "Book a free appraisal";
  const lines = markdown.replace(/\r\n/g, "\n").split("\n");
  const parts: string[] = [];
  let i = 0;

  while (i < lines.length) {
    const raw = lines[i] ?? "";
    const line = raw.trimEnd();
    const trimmed = line.trim();

    if (!trimmed) {
      i += 1;
      continue;
    }

    if (/^https?:\/\/\S+$/i.test(trimmed)) {
      parts.push(emailButton(ctaLabel, trimmed, accent));
      i += 1;
      continue;
    }

    const h = trimmed.match(/^(#{1,3})\s+(.+)$/);
    if (h) {
      const level = h[1]!.length === 1 ? 1 : 2;
      parts.push(emailHeading(h[2]!.replace(/\*\*/g, ""), level as 1 | 2));
      i += 1;
      continue;
    }

    if (/^([-*]|\d+[.)])\s+/.test(trimmed)) {
      const items: string[] = [];
      const ordered = /^\d+[.)]\s+/.test(trimmed);
      while (i < lines.length) {
        const t = (lines[i] ?? "").trim();
        if (!/^([-*]|\d+[.)])\s+/.test(t)) break;
        items.push(t.replace(/^([-*]|\d+[.)])\s+/, "").replace(/\*\*/g, ""));
        i += 1;
      }
      parts.push(emailList(items, ordered));
      continue;
    }

    const para: string[] = [];
    while (i < lines.length) {
      const t = (lines[i] ?? "").trimEnd();
      if (!t.trim()) break;
      if (/^#{1,3}\s+/.test(t.trim())) break;
      if (/^([-*]|\d+[.)])\s+/.test(t.trim())) break;
      if (/^https?:\/\/\S+$/i.test(t.trim())) break;
      para.push(t.trim());
      i += 1;
    }
    if (para.length) {
      parts.push(
        `<p style="${P}">${para.map((l) => inlineFormat(l)).join("<br>")}</p>`,
      );
    }
  }

  return parts.join("");
}

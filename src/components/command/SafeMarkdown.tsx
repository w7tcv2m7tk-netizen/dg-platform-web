import type { ReactNode } from "react";

function isSafeHref(href: string): boolean {
  const trimmed = href.trim();
  if (!trimmed) return false;
  if (trimmed.startsWith("#")) return true;
  if (trimmed.startsWith("/")) return !trimmed.startsWith("//");
  if (/^https?:\/\//i.test(trimmed)) return true;
  return false;
}

function renderInline(text: string, keyPrefix: string): ReactNode[] {
  const nodes: ReactNode[] = [];
  const pattern =
    /(`[^`]+`)|(\*\*[^*]+\*\*)|(\*[^*]+\*)|(\[[^\]]+\]\([^)]+\))/g;
  let last = 0;
  let match: RegExpExecArray | null;
  let i = 0;

  while ((match = pattern.exec(text)) !== null) {
    if (match.index > last) {
      nodes.push(text.slice(last, match.index));
    }
    const token = match[0];
    const key = `${keyPrefix}-${i++}`;

    if (token.startsWith("`")) {
      nodes.push(
        <code key={key} className="rounded bg-slate-800 px-1.5 py-0.5 text-[0.85em] text-sky-200">
          {token.slice(1, -1)}
        </code>,
      );
    } else if (token.startsWith("**")) {
      nodes.push(
        <strong key={key} className="font-semibold text-white">
          {renderInline(token.slice(2, -2), key)}
        </strong>,
      );
    } else if (token.startsWith("*")) {
      nodes.push(
        <em key={key} className="italic text-slate-200">
          {renderInline(token.slice(1, -1), key)}
        </em>,
      );
    } else if (token.startsWith("[")) {
      const linkMatch = /^\[([^\]]+)\]\(([^)]+)\)$/.exec(token);
      if (linkMatch) {
        const [, label, href] = linkMatch;
        if (isSafeHref(href)) {
          nodes.push(
            <a
              key={key}
              href={href}
              className="text-sky-400 underline decoration-sky-400/40 underline-offset-2 hover:text-sky-300"
              {...(href.startsWith("http")
                ? { target: "_blank", rel: "noopener noreferrer" }
                : {})}
            >
              {renderInline(label, key)}
            </a>,
          );
        } else {
          nodes.push(
            <span key={key} className="text-slate-300">
              {renderInline(label, key)}
              <span className="ml-1 text-xs text-slate-500">({href})</span>
            </span>,
          );
        }
      }
    }

    last = match.index + token.length;
  }

  if (last < text.length) {
    nodes.push(text.slice(last));
  }

  return nodes;
}

function headingClass(level: number): string {
  switch (level) {
    case 1:
      return "mt-8 mb-3 text-2xl font-bold tracking-tight text-white first:mt-0";
    case 2:
      return "mt-8 mb-3 border-b border-slate-800 pb-2 text-xl font-semibold text-white first:mt-0";
    case 3:
      return "mt-6 mb-2 text-lg font-semibold text-slate-100";
    default:
      return "mt-4 mb-2 text-base font-semibold text-slate-200";
  }
}

/**
 * Escape-first markdown renderer for staff docs.
 * No raw HTML / dangerouslySetInnerHTML — text is React-escaped; only a safe MD subset.
 */
export function SafeMarkdown({ source }: { source: string }) {
  const lines = source.replace(/\r\n/g, "\n").split("\n");
  const blocks: ReactNode[] = [];
  let i = 0;
  let blockId = 0;

  while (i < lines.length) {
    const line = lines[i];

    if (line.startsWith("```")) {
      const lang = line.slice(3).trim();
      const codeLines: string[] = [];
      i += 1;
      while (i < lines.length && !lines[i].startsWith("```")) {
        codeLines.push(lines[i]);
        i += 1;
      }
      i += 1;
      blocks.push(
        <pre
          key={`b-${blockId++}`}
          className="my-4 overflow-x-auto rounded-xl border border-slate-800 bg-slate-950 p-4 text-sm text-slate-300"
          data-lang={lang || undefined}
        >
          <code>{codeLines.join("\n")}</code>
        </pre>,
      );
      continue;
    }

    const heading = /^(#{1,6})\s+(.+)$/.exec(line);
    if (heading) {
      const level = heading[1].length;
      const Tag = `h${level}` as "h1" | "h2" | "h3" | "h4" | "h5" | "h6";
      blocks.push(
        <Tag key={`b-${blockId++}`} className={headingClass(level)}>
          {renderInline(heading[2], `h-${blockId}`)}
        </Tag>,
      );
      i += 1;
      continue;
    }

    if (/^(\*{3,}|-{3,}|_{3,})\s*$/.test(line)) {
      blocks.push(<hr key={`b-${blockId++}`} className="my-8 border-slate-800" />);
      i += 1;
      continue;
    }

    if (/^[-*+]\s+/.test(line)) {
      const items: string[] = [];
      while (i < lines.length && /^[-*+]\s+/.test(lines[i])) {
        items.push(lines[i].replace(/^[-*+]\s+/, ""));
        i += 1;
      }
      const listKey = blockId++;
      blocks.push(
        <ul key={`b-${listKey}`} className="my-3 list-disc space-y-1.5 pl-6 text-slate-300">
          {items.map((item, idx) => (
            <li key={idx}>{renderInline(item, `ul-${listKey}-${idx}`)}</li>
          ))}
        </ul>,
      );
      continue;
    }

    if (/^\d+\.\s+/.test(line)) {
      const items: string[] = [];
      while (i < lines.length && /^\d+\.\s+/.test(lines[i])) {
        items.push(lines[i].replace(/^\d+\.\s+/, ""));
        i += 1;
      }
      const listKey = blockId++;
      blocks.push(
        <ol key={`b-${listKey}`} className="my-3 list-decimal space-y-1.5 pl-6 text-slate-300">
          {items.map((item, idx) => (
            <li key={idx}>{renderInline(item, `ol-${listKey}-${idx}`)}</li>
          ))}
        </ol>,
      );
      continue;
    }

    if (line.includes("|") && i + 1 < lines.length && /^\|?\s*:?-+:?\s*\|/.test(lines[i + 1])) {
      const tableLines: string[] = [];
      while (i < lines.length && lines[i].includes("|")) {
        tableLines.push(lines[i]);
        i += 1;
      }
      const splitRow = (row: string) =>
        row
          .replace(/^\|/, "")
          .replace(/\|$/, "")
          .split("|")
          .map((c) => c.trim());
      const header = splitRow(tableLines[0]);
      const body = tableLines.slice(2).map(splitRow);
      const tableKey = blockId++;
      blocks.push(
        <div key={`b-${tableKey}`} className="my-4 overflow-x-auto rounded-xl border border-slate-800">
          <table className="min-w-full text-left text-sm">
            <thead className="border-b border-slate-800 bg-slate-950/80 text-xs uppercase tracking-wide text-slate-500">
              <tr>
                {header.map((cell, idx) => (
                  <th key={idx} className="px-4 py-3 font-medium">
                    {renderInline(cell, `th-${tableKey}-${idx}`)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/80">
              {body.map((row, rIdx) => (
                <tr key={rIdx} className="bg-slate-950/30">
                  {row.map((cell, cIdx) => (
                    <td key={cIdx} className="px-4 py-3 text-slate-300">
                      {renderInline(cell, `td-${tableKey}-${rIdx}-${cIdx}`)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>,
      );
      continue;
    }

    if (!line.trim()) {
      i += 1;
      continue;
    }

    const para: string[] = [];
    while (i < lines.length && lines[i].trim()) {
      if (
        lines[i].startsWith("```") ||
        /^#{1,6}\s+/.test(lines[i]) ||
        /^(\*{3,}|-{3,}|_{3,})\s*$/.test(lines[i]) ||
        /^[-*+]\s+/.test(lines[i]) ||
        /^\d+\.\s+/.test(lines[i])
      ) {
        break;
      }
      para.push(lines[i]);
      i += 1;
    }
    const paraKey = blockId++;
    blocks.push(
      <p key={`b-${paraKey}`} className="my-3 text-sm leading-relaxed text-slate-300">
        {renderInline(para.join(" "), `p-${paraKey}`)}
      </p>,
    );
  }

  return <div className="dg-safe-markdown max-w-3xl">{blocks}</div>;
}

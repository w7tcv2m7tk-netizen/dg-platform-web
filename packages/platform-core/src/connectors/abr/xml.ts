/** Minimal XML helpers for ABR HTTP GET responses (no GUID logging). */

export function stripNs(xml: string): string {
  return xml.replace(/xmlns(:\w+)?="[^"]*"/g, "");
}

export function textBetween(xml: string, tag: string): string | undefined {
  const re = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)</${tag}>`, "i");
  const m = xml.match(re);
  return m?.[1]?.replace(/<!\[CDATA\[|\]\]>/g, "").trim() || undefined;
}

export function allBlocks(xml: string, tag: string): string[] {
  const re = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)</${tag}>`, "gi");
  const out: string[] = [];
  let m: RegExpExecArray | null;
  while ((m = re.exec(xml))) out.push(m[1]);
  return out;
}

export function firstBlock(xml: string, tags: string[]): string | undefined {
  for (const tag of tags) {
    const blocks = allBlocks(xml, tag);
    if (blocks[0]) return blocks[0];
  }
  return undefined;
}

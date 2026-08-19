/**
 * Public HTML islands (WP/Oxygen imports) can include leftover document
 * chrome. A <title> in the island overrides Next metadata in the browser.
 */
export function stripImportedDocumentChrome(html: string): string {
  if (!html) return html;
  return html
    .replace(/<title[\s\S]*?<\/title>/gi, "")
    .replace(/<meta\b[^>]*>/gi, "")
    .replace(/<\/?(?:html|head|body)\b[^>]*>/gi, "");
}

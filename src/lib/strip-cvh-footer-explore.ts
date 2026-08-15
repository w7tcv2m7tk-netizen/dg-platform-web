/**
 * Remove the CVH footer "Explore" column
 * (Accommodation / Local Attractions / Currumbin Valley Guide).
 */
export function stripCvhFooterExploreColumn(html: string): string {
  if (!html) return html;
  let next = html;

  next = next.replace(
    /<!--\s*=====?\s*COLUMN\s*3:\s*Explore[\s\S]*?<!--\s*=====?\s*COLUMN\s*4:\s*Social\s*=====?\s*-->/i,
    "<!-- ===== COLUMN 4: Social ===== -->",
  );

  next = next.replace(
    /<div\b[^>]*class=["'][^"']*footer-col[^"']*["'][^>]*>\s*<h4[^>]*>\s*Explore\s*<\/h4>[\s\S]*?<\/div>\s*(?=<div\b[^>]*class=["'][^"']*footer-col)/i,
    "",
  );

  next = next.replace(
    /<li>\s*<a\b[^>]*>\s*Local Attractions\s*<\/a>\s*<\/li>/gi,
    "",
  );
  next = next.replace(
    /<li>\s*<a\b[^>]*href=["'][^"']*currumbin-valley-guide[^"']*["'][^>]*>[\s\S]*?<\/a>\s*<\/li>/gi,
    "",
  );

  return next;
}
